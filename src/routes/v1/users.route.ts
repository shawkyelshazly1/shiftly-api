import { PERMISSIONS } from "@/constants/permissions";
import {
  bulkUserInput,
  createBulkUsers,
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  newUserInput,
  updateUser,
  UpdateUserInput,
} from "@/services/users.service";
import { Hono } from "hono";
import { requireAuth, requirePermission } from "../../middleware";
import type { Env } from "../../types";
import {
  createBulkInvitations,
  createInvitation,
} from "@/services/invitations.service";
import {
  sendBulkInvitationEmails,
  sendInvitationEmail,
} from "@/services/email.service";

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
  try {
    const userId = await c.req.param("id");
    const body: UpdateUserInput = await c.req.json();
    const updatedUser = await updateUser(userId, body);
    if (!updatedUser) {
      return c.json({ error: "user not found" }, 404);
    }
    return c.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user: ", error);
    return c.json({ error: "Unable to update user" }, 500);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
users.delete("/:id", requirePermission(PERMISSIONS.USERS_DELETE), async (c) => {
  try {
    const userId = await c.req.param("id");
    await deleteUser(userId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user: ", error);
    return c.json({ error: "Unable to delete user" }, 500);
  }
});

/**
 * POST /api/v1/users
 * create new user
 */

users.post("/", requirePermission(PERMISSIONS.USERS_CREATE), async (c) => {
  const user = await c.get("user");
  try {
    const body: newUserInput = await c.req.json();
    const newUser = await createUser(body);
    const invitation = await createInvitation(newUser.id, user!.id);
    await sendInvitationEmail(invitation);
    return c.json(newUser);
  } catch (error) {
    console.error("Failed to create user: ", error);
    return c.json({ error: "Unable to create user" }, 500);
  }
});

/**
 * POST /api/v1/users/bulk
 * create new bulk users
 */

users.post("/bulk", requirePermission(PERMISSIONS.USERS_CREATE), async (c) => {
  const user = await c.get("user");

  try {
    const body: bulkUserInput = await c.req.json();

    const newUsers = await createBulkUsers(body);
    const invitations = await createBulkInvitations(
      newUsers.map((u) => u.id),
      user!.id
    );

    await sendBulkInvitationEmails(invitations);

    return c.json(newUsers);
  } catch (error) {
    console.error("Failed to create user: ", error);
    return c.json({ error: "Unable to create user" }, 500);
  }
});

export { users as usersRoute };
