import { requireAuth } from "@/middleware";
import {
  getAllPermissions,
  getAllUserPermissions,
  getUserPermissions,
} from "@/services/permission.service";
import { Env } from "@/types";
import { Hono } from "hono";

const permissions = new Hono<Env>();

permissions.use("*", requireAuth);

//  GET /api/v1/permissions/me
//  Returns current user's permissions (for client-side UI caching)

permissions.get("/me", async (c) => {
  const user = c.get("user");

  if (!user?.roleId) {
    return c.json({
      permissions: [],
      role: null,
      rolePermissions: [],
      directPermissions: [],
    });
  }

  const { all, directPermissions, rolePermissions } =
    await getAllUserPermissions(user.id, user.roleId);

  return c.json({
    permissions: all,
    roleId: user.roleId,
    rolePermissions,
    directPermissions,
  });
});

// GET /api/v1/permissions
// List all permissions (for role/user forms)
permissions.get("/", async (c) => {
  const allPermissions = await getAllPermissions();
  return c.json(allPermissions);
});

export { permissions as permissionsRoute };
