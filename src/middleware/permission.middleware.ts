import { Permission } from "@/constants/permissions";
import { getAllUserPermissions } from "@/services/permission.service";
import { Env } from "@/types";
import { createMiddleware } from "hono/factory";

/**
 * Check if user has permission, supporting wildcards
 * Examples:
 *   - "*" matches everything
 *   - "users:*" matches "users:read", "users:create", etc.
 *   - "users:read" matches exactly "users:read"
 */
function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Direct match
  if (userPermissions.includes(requiredPermission)) return true;

  // Global wildcard (admin)
  if (userPermissions.includes("*")) return true;

  // Resource wildcard (e.g., "users:*" matches "users:read")
  const [resource] = requiredPermission.split(":");
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
}

// require permissions middleware , always check DB no client trust
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    // get permossions from DB always
    const { all: permissionNames } = await getAllUserPermissions(
      user.id,
      user.roleId
    );

    //check if user has required permissions
    const hasAllRequiredPermissions = requiredPermissions.every((perm) =>
      hasPermission(permissionNames, perm)
    );

    if (!hasAllRequiredPermissions) {
      return c.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          required: requiredPermissions,
        },
        403
      );
    }

    await next();
  });
};

//   Requires at least one of the specified permissions
export const requireAnyPermission = (...permissions: Permission[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    const { all: permissionNames } = await getAllUserPermissions(
      user.id,
      user.roleId
    );

    const hasAnyPermission = permissions.some((perm) =>
      hasPermission(permissionNames, perm)
    );

    if (!hasAnyPermission) {
      return c.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          requiredAny: permissions,
        },
        403
      );
    }

    await next();
  });
};
