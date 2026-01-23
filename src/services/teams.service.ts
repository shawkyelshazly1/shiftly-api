import { db } from "@/db";
import { team, teamMember, user } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

export type CreateTeamInput = {
  name: string;
  description?: string;
  teamMemberIds?: string[];
};

export type UpdateTeamInput = Partial<CreateTeamInput>;

export type UpdateTeamMembersInput = {
  teamMembersIds: string[];
};

/**
 * Get all teams (excludes soft-deleted)
 */
export const getAllTeams = async () => {
  return await db.query.team.findMany({
    where: isNull(team.deletedAt),
  });
};

/**
 * Get team by id with members (excludes soft-deleted)
 */
export const getTeamById = async (teamId: string) => {
  return await db.query.team.findFirst({
    where: and(eq(team.id, teamId), isNull(team.deletedAt)),
    with: {
      users: true,
    },
  });
};

/**
 * create new team & add users as well
 */

export const createTeam = async (teamData: CreateTeamInput) => {
  const { teamMemberIds, ...teamFields } = teamData;

  // create team
  const [newTeam] = await db
    .insert(team)
    .values({
      name: teamData.name,
      description: teamData.description || "",
    })
    .returning();

  // add users to team
  if (teamMemberIds && teamMemberIds.length > 0) {
    // ensure users in Db
    const foundUsers = await db
      .select()
      .from(user)
      .where(inArray(user.id, teamMemberIds));

    const teamMembers = Array.from(
      foundUsers.map((user) => ({ userId: user.id, teamId: newTeam.id }))
    );

    const addedMembers = await db
      .insert(teamMember)
      .values(teamMembers)
      .returning();

    return {
      ...newTeam,
      addMembersCount: addedMembers.length,
    };
  }

  return {
    ...newTeam,
    addMembersCount: 0,
  };
};

/**
 * Soft delete Team
 */
export const deleteTeam = async (teamId: string) => {
  await db
    .update(team)
    .set({ deletedAt: new Date() })
    .where(eq(team.id, teamId));
};

/**
 * update team
 */
export const updateTeam = async (teamId: string, teamData: UpdateTeamInput) => {
  // Update team fields if any exists

  if (Object.keys(teamData).length < 1)
    throw new Error("Failed to update team");

  return await db
    .update(team)
    .set(teamData)
    .where(eq(team.id, teamId))
    .returning();
};

/**
 * add user / users to team
 */

export const addTeamMembers = async (
  teamId: string,
  teamMembersData: UpdateTeamMembersInput
) => {
  const [targetTeam] = await db.select().from(team).where(eq(team.id, teamId));

  const targetUsers = await db
    .select()
    .from(user)
    .where(inArray(user.id, teamMembersData.teamMembersIds));

  if (!targetTeam || targetUsers.length < 1) {
    throw new Error("Valid team & user/s must be provided");
  }

  const newMembers = Array.from(
    targetUsers.map((user) => ({ userId: user.id, teamId: targetTeam.id }))
  );

  await db.insert(teamMember).values(newMembers).returning();

  return await getTeamById(targetTeam.id);
};

/**
 * remove user / users from team
 * @param teamMembersData
 */
export const removeTeamMembers = async (
  teamId: string,
  teamMembersData: UpdateTeamMembersInput
) => {
  const [targetTeam] = await db.select().from(team).where(eq(team.id, teamId));

  const targetUsers = await db
    .select()
    .from(user)
    .where(inArray(user.id, teamMembersData.teamMembersIds));

  if (!targetTeam || targetUsers.length < 1) {
    throw new Error("Valid team & user/s must be provided");
  }

  const currentUserIds = targetUsers.map((user) => user.id);

  await db.delete(teamMember).where(inArray(teamMember.userId, currentUserIds));
};
