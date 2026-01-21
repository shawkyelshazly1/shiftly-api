import { requireAuth } from "@/middleware";
import { getUserPermissions } from "@/services/permission.service";
import { Env } from "@/types";
import { Hono } from "hono";

const permissions = new Hono<Env>();

//  GET /api/v1/permissions/me
//  Returns current user's permissions (for client-side UI caching)

permissions.get("/me", requireAuth, async (c) => {
  const user = c.get("user");

  if (!user?.roleId) {
    return c.json({ permissions: [], role: null });
  }

  const userPermissions = await getUserPermissions(user.roleId);

  return c.json({ permissions: userPermissions, roleId: user.roleId });
});

export { permissions as permissionsRoute };
