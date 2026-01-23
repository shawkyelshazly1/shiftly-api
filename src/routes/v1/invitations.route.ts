import { PERMISSIONS } from "@/constants/permissions";
import { requireAuth, requirePermission } from "@/middleware";
import { sendInvitationEmail } from "@/services/email.service";
import {
  cancelInvitation,
  getAllInvitations,
  regenerateInvitation,
  verifyAcceptInvitation,
} from "@/services/invitations.service";
import { Env } from "@/types";
import { Hono } from "hono";

const invitations = new Hono<Env>();

// POST /api/v1/invitations/accept?token=""
// accept invitation
invitations.post("/accept", async (c) => {
  const { token } = c.req.query();

  try {
    await verifyAcceptInvitation(token);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to accept invitation: ", error);
    return c.json(
      { error: error.message || "Unable to accept invitation" },
      500
    );
  }
});

// GET /api/v1/invitations
// get all invtations
invitations.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_ALL),
  async (c) => {
    const invitations = await getAllInvitations();

    return c.json(invitations);
  }
);

// POST /api/v1/invitation/:id/resend
// resend Invitation by userId
invitations.post(
  "/:userId/resend",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_ALL),
  async (c) => {
    const userId = c.req.param("userId");
    const user = c.get("user");

    try {
      const newInvitation = await regenerateInvitation(userId, user!.id);
      await sendInvitationEmail(newInvitation);
      return c.json({ success: true }, 201);
    } catch (error: any) {
      console.error("Failed to resend invitation: ", error);
      return c.json(
        { error: error.message || "Unable to resend invitation" },
        500
      );
    }
  }
);

// POST /api/v1/invitations/:id/cancel
// cancel invitation by userId
invitations.post(
  "/:userId/cancel",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_ALL),
  async (c) => {
    const userId = c.req.param("userId");

    try {
      await cancelInvitation(userId);
    } catch (error: any) {
      console.error("Failed to resend invitation: ", error);
      return c.json(
        { error: error.message || "Unable to resend invitation" },
        500
      );
    }
  }
);

export { invitations as invitationsRoute };
