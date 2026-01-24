import { db } from "@/db";
import { invitation, type InvitationInput, user } from "@/db/schema";
import { and, eq, inArray, count, gt } from "drizzle-orm";
import {
  PaginationParams,
  buildPaginatedResponse,
  buildSearchCondition,
  buildSortOrder,
  calculateOffset,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from "@/utils/pagination";

// Constants for invitation expiry
const INVITATION_VALIDITY_DAYS = 7;
const INVITATION_VALIDITY_MS = INVITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Get all invitations
 */
export const getAllInvitations = async () => {
  return await db.query.invitation.findMany({
    with: {
      role: true,
      user: true,
    },
  });
};

/**
 * Get paginated invitations
 */
export const getAllInvitationsPaginated = async (params: PaginationParams) => {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  const searchCondition = buildSearchCondition(params.search, [
    invitation.email,
    invitation.name,
  ]);

  const columnMap: Record<string, typeof invitation.createdAt | typeof invitation.name | typeof invitation.email | typeof invitation.status> = {
    name: invitation.name,
    email: invitation.email,
    status: invitation.status,
    createdAt: invitation.createdAt,
  };

  const orderBy = buildSortOrder(
    params.sortBy,
    params.sortOrder,
    columnMap,
    invitation.createdAt
  );

  const [totalResult] = await db
    .select({ count: count() })
    .from(invitation)
    .where(searchCondition);

  const invitations = await db.query.invitation.findMany({
    with: {
      role: true,
      user: true,
    },
    where: searchCondition,
    orderBy: [orderBy],
    limit: pageSize,
    offset,
  });

  return buildPaginatedResponse(invitations, totalResult.count, params);
};

/**
 * Create invitation
 */
export const createInvitation = async (userId: string, invitedById: string) => {
  // check if user exists - only fetch needed columns
  const [targetUser] = await db
    .select({ id: user.id, email: user.email, name: user.name, roleId: user.roleId })
    .from(user)
    .where(eq(user.id, userId));

  if (!targetUser) throw new Error("User not found");

  const tokenData = generateInvitationToken();

  const [newInvitation] = await db
    .insert(invitation)
    .values({
      email: targetUser.email,
      name: targetUser.name,
      invitedById,
      roleId: targetUser.roleId,
      userId: targetUser.id,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
    })
    .returning();

  return newInvitation;
};

/**
 * create bulk invitations
 */
export const createBulkInvitations = async (
  userIds: string[],
  invitedById: string
) => {
  // verify users exists - only fetch needed columns
  const usersFound = await db
    .select({ id: user.id, email: user.email, name: user.name, roleId: user.roleId })
    .from(user)
    .where(inArray(user.id, userIds));

  if (usersFound.length < 1) throw new Error("No users found");

  const flattenUsers: InvitationInput[] = Array.from(
    usersFound.map((u) => {
      const tokenData = generateInvitationToken();
      return {
        email: u.email,
        name: u.name,
        userId: u.id,
        roleId: u.roleId,
        expiresAt: tokenData.expiresAt,
        token: tokenData.token,
        invitedById,
      };
    })
  );

  const invitations = await db
    .insert(invitation)
    .values(flattenUsers)
    .returning();

  return invitations;
};

/**
 * resend invitation by userId
 */

export const regenerateInvitation = async (
  userId: string,
  invitedById: string
) => {
  // find user - only fetch needed columns
  const [targetUser] = await db
    .select({ id: user.id, email: user.email, name: user.name, roleId: user.roleId })
    .from(user)
    .where(eq(user.id, userId));

  if (!targetUser) throw new Error("User not found");

  // Check if user has accepted any invitation (SQL filtered)
  const [acceptedInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.userId, userId), eq(invitation.status, "accepted")))
    .limit(1);

  if (acceptedInvitation) throw new Error("User accepted invitation already");

  // Check for any valid (non-expired, pending) invitation
  const [validInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.userId, userId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date())
      )
    )
    .limit(1);

  // Invalidate any pending invitations for this user
  await db
    .update(invitation)
    .set({
      status: "expired",
      expiresAt: new Date(Date.now() - ONE_HOUR_MS),
    })
    .where(and(eq(invitation.userId, userId), eq(invitation.status, "pending")));

  // generate new invitation
  const tokenData = generateInvitationToken();

  const [newInvitation] = await db
    .insert(invitation)
    .values({
      email: targetUser.email,
      name: targetUser.name,
      userId: targetUser.id,
      roleId: targetUser.roleId,
      expiresAt: tokenData.expiresAt,
      token: tokenData.token,
      invitedById,
    })
    .returning();

  return newInvitation;
};

/**
 * cancel invitation
 */
export const cancelInvitation = async (userId: string) => {
  // target invitation - only fetch needed columns
  const [userActiveInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(eq(invitation.userId, userId), eq(invitation.status, "pending"))
    );

  if (!userActiveInvitation) throw new Error("No active invitations");

  await db
    .update(invitation)
    .set({
      status: "cancelled",
      expiresAt: new Date(Date.now() - ONE_HOUR_MS),
    })
    .where(eq(invitation.id, userActiveInvitation.id));
};

/**
 * verify invitation token
 */
export const verifyAcceptInvitation = async (token: string) => {
  const [targetInvitation] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.token, token));

  if (
    !targetInvitation ||
    targetInvitation.expiresAt < new Date() ||
    targetInvitation.status !== "pending"
  )
    throw new Error("Invalid Token");

  await db
    .update(invitation)
    .set({
      expiresAt: new Date(Date.now() - ONE_HOUR_MS),
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(invitation.id, targetInvitation.id));

  return targetInvitation;
};

/**
 * Helper function to generate token
 */

interface InvitationTokenData {
  token: string;
  expiresAt: Date;
}

const generateInvitationToken = (): InvitationTokenData => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Buffer.from(bytes).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_VALIDITY_MS);

  return {
    expiresAt,
    token,
  };
};
