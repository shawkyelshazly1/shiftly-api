import { db } from "@/db";
import {
  invitation,
  role,
  teamMember,
  user,
  userPermission,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { invalidatePermissionCache } from "@/middleware/permission.middleware";
import {
  buildPaginatedResponse,
  buildSearchCondition,
  buildSortOrder,
  calculateOffset,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PaginationParams,
} from "@/utils/pagination";
import { and, count, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { getDirectUserPermissions } from "./permission.service";

export type newUserInput = {
  email: string;
  name: string;
  password?: string;
  roleId: string;
};

export type bulkUserInput = {
  users: newUserInput[];
};

/**
 * Get global user counts (independent of filters)
 */
export async function getUsersCount() {
  // Combined into single query using conditional count
  const [result] = await db
    .select({
      total: count(),
      verified: sql<number>`COUNT(*) FILTER (WHERE ${user.emailVerified} = true)`,
    })
    .from(user)
    .where(isNull(user.deletedAt));

  return {
    total: result.total,
    verified: result.verified,
  };
}

/**
 * Create single user
 */
export async function createUser(userData: newUserInput) {
  // validate if user exists (including soft-deleted) - only fetch needed columns
  const [userFound] = await db
    .select({ id: user.id, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.email, userData.email));

  if (userFound) {
    if (userFound.deletedAt) {
      throw new Error(
        "This email was previously used by a deactivated account. Contact an administrator to restore it."
      );
    }
    throw new Error("User exists already.");
  }

  // create user
  const { user: newUser } = await auth.api.signUpEmail({
    body: {
      email: userData.email,
      name: userData.name,
      password: generateRandomPassword(),
      roleId: userData.roleId,
    },
  });

  return newUser;
}

export async function createBulkUsers({ users: usersData }: bulkUserInput) {
  const flattenEmails = usersData.map((u) => u.email);

  // check if any exists already (including soft-deleted) - only fetch needed columns
  const existingUsers = await db
    .select({ id: user.id, email: user.email, deletedAt: user.deletedAt })
    .from(user)
    .where(inArray(user.email, flattenEmails));

  // Check for soft-deleted users and throw error
  const softDeletedEmails = existingUsers
    .filter((u) => u.deletedAt !== null)
    .map((u) => u.email);

  if (softDeletedEmails.length > 0) {
    throw new Error(
      `The following emails were previously used by deactivated accounts: ${softDeletedEmails.join(
        ", "
      )}. Contact an administrator to restore them.`
    );
  }

  let existingAlready: string[] = [];
  let newOnes: newUserInput[] = [];

  if (existingUsers.length > 0) {
    existingAlready = existingUsers.map((u) => u.email);
    newOnes = usersData.filter((u) => !existingAlready.includes(u.email));
  } else {
    newOnes = usersData;
  }

  const newUsers = await Promise.all(
    newOnes.map(async (u) => {
      const { user: newUser } = await auth.api.signUpEmail({
        body: {
          email: u.email,
          name: u.name,
          password: generateRandomPassword(),
        },
      });

      return newUser;
    })
  );

  return newUsers;
}

/**
 * Subquery to get the most recent invitation ID for each user
 */
const latestInvitationSubquery = db
  .select({
    userId: invitation.userId,
    maxCreatedAt: max(invitation.createdAt).as("max_created_at"),
  })
  .from(invitation)
  .groupBy(invitation.userId)
  .as("latest_invitation");

/**
 * GET all users with their roles (excludes soft-deleted)
 */
export async function getAllUsers() {
  return await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      roleId: role.id,
      roleName: role.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      invitationStatus: invitation.status,
      invitationExpiresAt: invitation.expiresAt,
    })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id))
    .leftJoin(
      latestInvitationSubquery,
      eq(user.id, latestInvitationSubquery.userId)
    )
    .leftJoin(
      invitation,
      and(
        eq(user.id, invitation.userId),
        eq(invitation.createdAt, latestInvitationSubquery.maxCreatedAt)
      )
    )
    .where(isNull(user.deletedAt));
}

/**
 * GET all users with pagination, search, sorting, and filters
 */
export async function getAllUsersPaginated(params: PaginationParams) {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  // Build search condition
  const searchCondition = buildSearchCondition(params.search, [
    user.name,
    user.email,
  ]);

  // Build filter conditions
  const conditions: ReturnType<typeof and>[] = [isNull(user.deletedAt)];

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  if (params.roleId) {
    conditions.push(eq(user.roleId, params.roleId));
  }

  if (params.teamId) {
    conditions.push(eq(teamMember.teamId, params.teamId));
  }

  const whereConditions = and(...conditions);

  // Build sort order
  const columnMap = {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    roleName: role.name,
  };
  const orderBy = buildSortOrder(
    params.sortBy,
    params.sortOrder,
    columnMap,
    user.createdAt
  );

  // Build base query with optional team join
  const baseCountQuery = db
    .select({ total: count() })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id));

  // Add team member join if filtering by team
  const countQuery = params.teamId
    ? baseCountQuery.innerJoin(teamMember, eq(user.id, teamMember.userId))
    : baseCountQuery;

  // Build data query with optional team join
  // Use subquery to get only the most recent invitation per user
  const baseDataQuery = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      roleId: role.id,
      roleName: role.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      invitationStatus: invitation.status,
      invitationExpiresAt: invitation.expiresAt,
    })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id))
    .leftJoin(
      latestInvitationSubquery,
      eq(user.id, latestInvitationSubquery.userId)
    )
    .leftJoin(
      invitation,
      and(
        eq(user.id, invitation.userId),
        eq(invitation.createdAt, latestInvitationSubquery.maxCreatedAt)
      )
    );

  // Add team member join if filtering by team
  const dataQuery = params.teamId
    ? baseDataQuery.innerJoin(teamMember, eq(user.id, teamMember.userId))
    : baseDataQuery;

  // Run count and data queries in parallel
  const [countResult, data] = await Promise.all([
    countQuery.where(whereConditions),
    dataQuery
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
  ]);

  const [{ total }] = countResult;

  return buildPaginatedResponse(data, total, params);
}

/**
 * Get user by ID with role and direct permissions (excludes soft-deleted)
 */
export async function getUserById(userId: string) {
  const userData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      roleId: user.roleId,
      roleName: role.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .leftJoin(role, eq(role.id, user.roleId))
    .where(and(eq(user.id, userId), isNull(user.deletedAt)))
    .limit(1);

  if (!userData[0]) return null;

  const directPermissions = await getDirectUserPermissions(userId);

  return {
    ...userData[0],
    directPermissions,
  };
}

export interface UpdateUserInput {
  roleId?: string;
  directPermissionIds?: string[];
}

/**
 * Update user's role and/or direct permissions
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  const { roleId, directPermissionIds } = input;

  // Update role if provided
  if (roleId) {
    await db.update(user).set({ roleId }).where(eq(user.id, userId));
  }

  // Update direct permissions if provided
  if (directPermissionIds !== undefined) {
    // Delete existing direct permissions
    await db.delete(userPermission).where(eq(userPermission.userId, userId));

    // Insert new direct permissions
    if (directPermissionIds.length > 0) {
      await db.insert(userPermission).values(
        directPermissionIds.map((permissionId) => ({
          userId,
          permissionId,
        }))
      );
    }
  }

  // Invalidate permission cache if role or permissions changed
  if (roleId || directPermissionIds !== undefined) {
    invalidatePermissionCache(userId);
  }

  return getUserById(userId);
}

/**
 * Soft delete user
 */
export async function deleteUser(userId: string) {
  await db
    .update(user)
    .set({ deletedAt: new Date() })
    .where(eq(user.id, userId));
}

/**
 * helper to generate random password
 */

const generateRandomPassword = (length: number = 10): string => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};
