import { Hono } from "hono";
import type { Env } from "../../types";
import { requireAuth, requirePermission } from "../../middleware";

const users = new Hono<Env>();

// All routes require auth
users.use("*", requireAuth);

/**
 * GET /api/v1/users
 * List all users - requires 'users:read' permission
 */
users.get("/", requirePermission("users:read"), async (c) => {
  // TODO: Fetch users from DB
  return c.json({ users: [] });
});

/**
 * GET /api/v1/users/:id
 */
users.get("/:id", requirePermission("users:read"), async (c) => {
  const id = c.req.param("id");
  // TODO: Fetch user from DB
  return c.json({ user: { id } });
});

/**
 * DELETE /api/v1/users/:id
 * Requires 'users:delete' permission
 */
users.delete("/:id", requirePermission("users:delete"), async (c) => {
  const id = c.req.param("id");
  // TODO: Delete user
  return c.json({ deleted: id });
});

export { users as usersRoute };
