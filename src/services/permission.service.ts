import { db } from "@/db";
import {
  type Role,
  type Permission,
  permission,
  rolePermission,
  role,
  userPermission,
} from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetches direct permissions assigned to a user (not from role)
 */
export async function getDirectUserPermissions(
  userId: string
): Promise<Omit<Permission, "createdAt">[]> {
  const results = await db
    .select({
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })
    .from(userPermission)
    .innerJoin(permission, eq(userPermission.permissionId, permission.id))
    .where(eq(userPermission.userId, userId));

  return results;
}

/**
 * get all user  permissions ( role + custom)
 */
export async function getAllUserPermissions(
  userId: string,
  roleId: string
): Promise<{
  all: string[];
  rolePermissions: string[];
  directPermissions: string[];
}> {
  const [rolePerms, directPerms] = await Promise.all([
    getPermissionsByRoleId(roleId),
    getDirectUserPermissions(userId),
  ]);

  const rolePermissionNames = rolePerms.map((p) => p.name);
  const directPermissionNames = directPerms.map((p) => p.name);

  const all = Array.from(
    new Set([...rolePermissionNames, ...directPermissionNames])
  );

  return {
    all,
    rolePermissions: rolePermissionNames,
    directPermissions: directPermissionNames,
  };
}

/**
 * Fetches permissions for a role from DB
 * Replace with your actual DB query
 */
export async function getPermissionsByRoleId(
  roleId: string
): Promise<Omit<Permission, "createdAt">[]> {
  const results = await db
    .select({
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })
    .from(rolePermission)
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(rolePermission.roleId, roleId));

  return results;
}

/**
 * Get all permissions (for UI dropdowns)
 */
export async function getAllPermissions(): Promise<Permission[]> {
  return db
    .select()
    .from(permission)
    .orderBy(permission.resource, permission.action);
}

/**
 * Get role with permissions
 */
export async function getRoleWithPermissions(
  roleId: string
): Promise<(Role & { permissions: Permission[] }) | null> {
  const roleData = await db.query.role.findFirst({
    where: eq(role.id, roleId),
    with: {
      permissions: {
        with: {
          permission: true,
        },
      },
    },
  });

  if (!roleData) return null;

  return {
    ...roleData,
    permissions: roleData.permissions.map((rp) => rp.permission),
  };
}

export async function getDefaultRole() {
  return db.query.role.findFirst({
    where: eq(role.isDefault, true),
  });
}

/**
 * Get all permissions for a user (for client-side caching)
 */
export async function getUserPermissions(roleId: string): Promise<string[]> {
  const permissions = await getPermissionsByRoleId(roleId);

  return permissions.map((p) => p.name);
}
