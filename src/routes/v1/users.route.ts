import { Hono } from "hono";
import type { Env } from "../../types";
import { requireAuth, requirePermission } from "../../middleware";
import { PERMISSIONS } from "@/constants/permissions";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
  UpdateUserInput,
} from "@/services/users.service";

const users = new Hono<Env>();

// All routes require auth
users.use("*", requireAuth);

/**
 * GET /api/v1/users
 * List all users with their roles
 */
users.get("/", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
  const usersList = await getAllUsers();

  return c.json(usersList);
});

/**
 * GET /api/v1/users/:id
 * get user by id with role & direct permissions
 */
users.get("/:id", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
  const userId = await c.req.param("id");
  const userData = await getUserById(userId);

  if (!userData) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(userData);
});

/**
 * PATCH /api/v1/users/:id
 * Update user's role and/or direct permissions
 */

users.patch("/:id", requirePermission(PERMISSIONS.USERS_UPDATE), async (c) => {
  const userId = await c.req.param("id");
  const body: UpdateUserInput = await c.req.json();

  try {
    const updatedUser = await updateUser(userId, body);
    if (!updatedUser) {
      return c.json({ error: "user not found" }, 404);
    }
    return c.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user: ", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
users.delete("/:id", requirePermission(PERMISSIONS.USERS_DELETE), async (c) => {
  const userId = await c.req.param("id");

  try {
    await deleteUser(userId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user: ", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});
export { users as usersRoute };
