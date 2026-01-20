import { getPermissionsByRoleId } from "@/services/permission.service";
import { Env } from "@/types";
import { createMiddleware } from "hono/factory";

// require permissions middleware , always check DB no client trust
export const requirePermission = (...requiredPermissions: string[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    // get permossions from DB always
    const userPermissions = await getPermissionsByRoleId(user.roleId);
    const permissionNames = userPermissions.map((p) => p.name);

    //check if user has required permissions
    const hasAllRequiredPermissions = requiredPermissions.every((perm) =>
      permissionNames.includes(perm)
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
export const requireAnyPermission = (...permissions: string[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    const userPermissions = await getPermissionsByRoleId(user.roleId);
    const permissionNames = userPermissions.map((p) => p.name);

    const hasAnyPermission = permissions.some((perm) =>
      permissionNames.includes(perm)
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
