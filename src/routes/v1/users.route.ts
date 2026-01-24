import { PERMISSIONS } from "@/constants/permissions";
import {
  createBulkUsers,
  createUser,
  deleteUser,
  getAllUsers,
  getAllUsersPaginated,
  getUserById,
  getUsersCount,
  updateUser,
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
import { parsePaginationParams } from "@/utils/pagination";
import { zValidator } from "@hono/zod-validator";
import {
  createUserSchema,
  updateUserSchema,
  bulkCreateUsersSchema,
} from "@/schemas";

const users = new Hono<Env>();

// All routes require auth
users.use("*", requireAuth);

/**
 * GET /api/v1/users
 * List all users with their roles
 * Supports pagination via query params: ?page=1&pageSize=10&search=&sortBy=&sortOrder=
 */
users.get("/", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
  const query = c.req.query();

  // If no pagination params, return all users (backward compatible)
  if (!query.page && !query.pageSize && !query.search && !query.roleId && !query.teamId) {
    const usersList = await getAllUsers();
    return c.json(usersList);
  }

  // Use paginated version
  const params = parsePaginationParams(query);
  const result = await getAllUsersPaginated(params);
  return c.json(result);
});

/**
 * GET /api/v1/users/count
 * Get global user counts (total, verified)
 */
users.get("/count", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
  try {
    const counts = await getUsersCount();
    return c.json(counts);
  } catch (error) {
    console.error("Failed to get user counts: ", error);
    return c.json({ error: "Unable to get user counts" }, 500);
  }
});

/**
 * GET /api/v1/users/:id
 * get user by id with role & direct permissions
 */
users.get("/:id", requirePermission(PERMISSIONS.USERS_READ), async (c) => {
  const userId = c.req.param("id");
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

users.patch(
  "/:id",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  zValidator("json", updateUserSchema),
  async (c) => {
    try {
      const userId = c.req.param("id");
      const body = c.req.valid("json");
      const updatedUser = await updateUser(userId, body);
      if (!updatedUser) {
        return c.json({ error: "user not found" }, 404);
      }
      return c.json(updatedUser);
    } catch (error) {
      console.error("Failed to update user: ", error);
      return c.json({ error: "Unable to update user" }, 500);
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * Delete user
 */
users.delete("/:id", requirePermission(PERMISSIONS.USERS_DELETE), async (c) => {
  try {
    const userId = c.req.param("id");
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

users.post(
  "/",
  requirePermission(PERMISSIONS.USERS_CREATE),
  zValidator("json", createUserSchema),
  async (c) => {
    const user = c.get("user");
    try {
      const body = c.req.valid("json");
      const newUser = await createUser(body);
      const invitation = await createInvitation(newUser.id, user!.id);
      // Fire and forget - log errors but don't fail request
      sendInvitationEmail(invitation).catch((err) => {
        console.error("Failed to send invitation email:", err);
      });
      return c.json(newUser);
    } catch (error) {
      console.error("Failed to create user: ", error);
      return c.json({ error: "Unable to create user" }, 500);
    }
  }
);

/**
 * POST /api/v1/users/bulk
 * create new bulk users
 */

users.post(
  "/bulk",
  requirePermission(PERMISSIONS.USERS_CREATE),
  zValidator("json", bulkCreateUsersSchema),
  async (c) => {
    const user = c.get("user");

    try {
      const body = c.req.valid("json");

      const newUsers = await createBulkUsers(body);
      const invitations = await createBulkInvitations(
        newUsers.map((u) => u.id),
        user!.id
      );

      // Fire and forget - log errors but don't fail request
      sendBulkInvitationEmails(invitations).catch((err) => {
        console.error("Failed to send bulk invitation emails:", err);
      });

      return c.json(newUsers);
    } catch (error) {
      console.error("Failed to create users: ", error);
      return c.json({ error: "Unable to create users" }, 500);
    }
  }
);

export { users as usersRoute };
