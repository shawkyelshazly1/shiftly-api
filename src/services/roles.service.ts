import { db } from "@/db";
import { role, rolePermission } from "@/db/schema";
import { eq } from "drizzle-orm";
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
 * Delete a role (only if not system role)
 */
export const deleteRole = async (roleId: string) => {
  // Check if system role
  const existingRole = await db.query.role.findFirst({
    where: eq(role.id, roleId),
  });

  if (!existingRole) {
    throw new Error("Role not found");
  }

  if (existingRole.isSystem) {
    throw new Error("Cannot delete system role");
  }

  // Cascade delete will handle rolePermission via FK
  await db.delete(role).where(eq(role.id, roleId));
};

/**
 * Get all roles
 */
export const getAllRoles = async () => {
  const roles = await db.query.role.findMany({
    with: {
      permissions: {
        with: {
          permission: true,
        },
      },
    },
  });

  // Flatten permissions structure
  return roles.map((role) => ({
    ...role,
    permissions: role.permissions.map((rp) => rp.permission),
  }));
};
