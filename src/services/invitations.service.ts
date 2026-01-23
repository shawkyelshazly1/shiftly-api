import { db } from "@/db";
import { invitation, type InvitationInput, user } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Get all invitations
 */
export const getAllInvitations = async () => {
  return await db.query.invitation.findMany({
    with: {
      role: true,
      user: true,
    },
  });
};

/**
 * Create invitation
 */
export const createInvitation = async (userId: string, invitedById: string) => {
  // check if user exists
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));

  if (!targetUser) throw new Error("User not found");

  const tokenData = generateInvitationToken();

  const [newInvitation] = await db
    .insert(invitation)
    .values({
      email: targetUser.email,
      name: targetUser.name,
      invitedById,
      roleId: targetUser.roleId,
      userId: targetUser.id,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
    })
    .returning();

  return newInvitation;
};

/**
 * create bulk invitations
 */
export const createBulkInvitations = async (
  userIds: string[],
  invitedById: string
) => {
  // verify users exists
  const usersFound = await db
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  if (usersFound.length < 1) throw new Error("No users found");

  const flattenUsers: InvitationInput[] = Array.from(
    usersFound.map((u) => {
      const tokenData = generateInvitationToken();
      return {
        email: u.email,
        name: u.name,
        userId: u.id,
        roleId: u.roleId,
        expiresAt: tokenData.expiresAt,
        token: tokenData.token,
        invitedById,
      };
    })
  );

  const invitations = await db
    .insert(invitation)
    .values(flattenUsers)
    .returning();

  return invitations;
};

/**
 * resend invitation by userId
 */

export const regenerateInvitation = async (
  userId: string,
  invitedById: string
) => {
  // find user,
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));

  if (!targetUser) throw new Error("User not found");

  // check if user accepted any invitaiton already, else if any still valid get it, else generate new one.

  const userInvitations = await db
    .select()
    .from(invitation)
    .where(eq(invitation.userId, userId));

  if (userInvitations.length === 0)
    return await createInvitation(userId, invitedById);

  const acceptedInvitations = userInvitations.filter(
    (inv) => inv.status === "accepted"
  );

  if (acceptedInvitations.length !== 0)
    throw new Error("User accepted invitation already");

  const validInvitations = userInvitations.find(
    (inv) => inv.expiresAt > new Date(Date.now())
  );

  // invalidate the current invitation
  if (validInvitations)
    await db
      .update(invitation)
      .set({
        status: "expired",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      })
      .where(eq(invitation.userId, userId));

  // generate new invitation
  const tokenData = generateInvitationToken();

  let [newInvitation] = await db
    .insert(invitation)
    .values({
      email: targetUser.email,
      name: targetUser.name,
      userId: targetUser.id,
      roleId: targetUser.roleId,
      expiresAt: tokenData.expiresAt,
      token: tokenData.token,
      invitedById,
    })
    .returning();

  return newInvitation;
};

/**
 * cancel invitation
 */
export const cancelInvitation = async (userId: string) => {
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));

  // target inviation
  const [userActiveInvitation] = await db
    .select()
    .from(invitation)
    .where(
      and(eq(invitation.userId, userId), eq(invitation.status, "pending"))
    );

  if (!userActiveInvitation) throw new Error("No active invitations");

  await db
    .update(invitation)
    .set({
      status: "expired",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    })
    .where(eq(invitation.id, userActiveInvitation.id));
};

/**
 * verify invitation token
 */
export const verifyAcceptInvitation = async (token: string) => {
  const [targetInvitation] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.token, token));

  if (
    !targetInvitation ||
    targetInvitation.expiresAt < new Date(Date.now()) ||
    targetInvitation.status !== "pending"
  )
    throw new Error("Invalid Token");

  await db
    .update(invitation)
    .set({
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      status: "accepted",
    })
    .where(eq(invitation.id, targetInvitation.id));

  return targetInvitation;
};

/**
 * Helper function to generate token
 */

interface InvitationTokenData {
  token: string;
  expiresAt: Date;
}

const generateInvitationToken = (): InvitationTokenData => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Buffer.from(bytes).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    expiresAt,
    token,
  };
};
