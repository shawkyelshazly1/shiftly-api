import { db } from "@/db";
import { role, rolePermission } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getRoleWithPermissions } from "./permission.service";

export type CreateRoleInput = {
  name: string;
  description: string;
  permissionIds?: string[]; // Optional: assign permissions on creation
  isSystem?: boolean;
  isDefault?: boolean;
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

/**
 * create new role & assign permissions if passed
 */
export const createRole = async (roleData: CreateRoleInput) => {
  const { permissionIds, ...roleFields } = roleData;

  //insert role
  const [newRole] = await db
    .insert(role)
    .values({
      name: roleFields.name,
      description: roleFields.description,
      isSystem: roleFields.isSystem ?? false,
      isDefault: roleFields.isDefault ?? false,
    })
    .returning();

  // assign permissions if provided
  if (permissionIds && permissionIds.length > 0) {
    await db.insert(rolePermission).values(
      permissionIds.map((permissionId) => ({
        roleId: newRole.id,
        permissionId,
      }))
    );
  }

  return getRoleWithPermissions(newRole.id);
};

/**
 * Update existing role
 * @param roleId : string
 * @param roleData : UpdateRoleInput
 */
export const updateRole = async (roleId: string, roleData: UpdateRoleInput) => {
  const { permissionIds, ...roleFields } = roleData;

  // update any passed fields
  if (Object.keys(roleFields).length > 0) {
    await db.update(role).set(roleFields).where(eq(role.id, roleId));
  }

  // Update permissions if provided
  if (permissionIds !== undefined) {
    // Remove existing permissions
    await db.delete(rolePermission).where(eq(rolePermission.roleId, roleId));

    // Add new permissions
    if (permissionIds.length > 0) {
      await db.insert(rolePermission).values(
        permissionIds.map((permissionId) => ({
          roleId: roleId,
          permissionId,
        }))
      );
    }
  }

  return getRoleWithPermissions(roleId);
};

/**
 * Soft delete a role (only if not system role)
 */
export const deleteRole = async (roleId: string) => {
  // Check if system role
  const existingRole = await db.query.role.findFirst({
    where: and(eq(role.id, roleId), isNull(role.deletedAt)),
  });

  if (!existingRole) {
    throw new Error("Role not found");
  }

  if (existingRole.isSystem) {
    throw new Error("Cannot delete system role");
  }

  await db
    .update(role)
    .set({ deletedAt: new Date() })
    .where(eq(role.id, roleId));
};

/**
 * Get all roles (excludes soft-deleted)
 */
export const getAllRoles = async () => {
  const roles = await db.query.role.findMany({
    where: isNull(role.deletedAt),
    with: {
      permissions: {
        with: {
          permission: true,
        },
      },
    },
  });

  // Flatten permissions structure
  return roles.map((r) => ({
    ...r,
    permissions: r.permissions.map((rp) => rp.permission),
  }));
};
