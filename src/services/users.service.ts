import { db } from "@/db";
import { role, user, userPermission } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDirectUserPermissions } from "./permission.service";
import { auth } from "@/lib/auth";

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
 * Create single user
 */
export async function createUser(userData: newUserInput) {
  // validate if user exists (including soft-deleted)
  const [userFound] = await db
    .select()
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

  // check if any exists already (including soft-deleted)
  const existingUsers = await db
    .select()
    .from(user)
    .where(inArray(user.email, flattenEmails));

  // Check for soft-deleted users and throw error
  const softDeletedEmails = existingUsers
    .filter((u) => u.deletedAt !== null)
    .map((u) => u.email);

  if (softDeletedEmails.length > 0) {
    throw new Error(
      `The following emails were previously used by deactivated accounts: ${softDeletedEmails.join(", ")}. Contact an administrator to restore them.`
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
    })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id))
    .where(isNull(user.deletedAt));
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
