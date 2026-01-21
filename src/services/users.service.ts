import { db } from "@/db";
import { role, user, userPermission } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDirectUserPermissions } from "./permission.service";

/**
 * GET all users with their roles
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
    .leftJoin(role, eq(user.roleId, role.id));
}

/**
 * Get user by ID with role and direct permissions
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
    .where(eq(user.id, userId))
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
 * Delete user
 */
export async function deleteUser(userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}
