import { db } from "@/db";
import { team, teamMember, user } from "@/db/schema";
import { and, eq, inArray, isNull, count } from "drizzle-orm";
import {
  PaginationParams,
  buildPaginatedResponse,
  buildSearchCondition,
  buildSortOrder,
  calculateOffset,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from "@/utils/pagination";

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
 * Get global team count (independent of filters)
 */
export const getTeamsCount = async () => {
  const [result] = await db
    .select({ total: count() })
    .from(team)
    .where(isNull(team.deletedAt));

  return { total: result.total };
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
 * Get all teams with pagination
 */
export const getAllTeamsPaginated = async (params: PaginationParams) => {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  const searchCondition = buildSearchCondition(params.search, [team.name, team.description]);
  const whereConditions = searchCondition
    ? and(isNull(team.deletedAt), searchCondition)
    : isNull(team.deletedAt);

  const columnMap = { name: team.name, createdAt: team.createdAt };
  const orderBy = buildSortOrder(params.sortBy, params.sortOrder, columnMap, team.createdAt);

  // Run count and data queries in parallel
  const [countResult, data] = await Promise.all([
    db.select({ total: count() }).from(team).where(whereConditions),
    db
      .select({
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      })
      .from(team)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
  ]);

  const [{ total }] = countResult;

  return buildPaginatedResponse(data, total, params);
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

  // Normalize team name: lowercase and trim
  const normalizedName = teamData.name.trim().toLowerCase();

  // create team
  const [newTeam] = await db
    .insert(team)
    .values({
      name: normalizedName,
      description: teamData.description || "",
    })
    .returning();

  // add users to team
  if (teamMemberIds && teamMemberIds.length > 0) {
    // ensure users in Db - only fetch needed columns
    const foundUsers = await db
      .select({ id: user.id })
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

  // Normalize team name if provided
  const normalizedData = {
    ...teamData,
    ...(teamData.name && { name: teamData.name.trim().toLowerCase() }),
  };

  return await db
    .update(team)
    .set(normalizedData)
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
  // Only fetch needed columns for validation
  const [targetTeam] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));

  const targetUsers = await db
    .select({ id: user.id })
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
  // Only fetch needed columns for validation
  const [targetTeam] = await db.select({ id: team.id }).from(team).where(eq(team.id, teamId));

  const targetUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.id, teamMembersData.teamMembersIds));

  if (!targetTeam || targetUsers.length < 1) {
    throw new Error("Valid team & user/s must be provided");
  }

  const currentUserIds = targetUsers.map((user) => user.id);

  await db.delete(teamMember).where(
    and(
      eq(teamMember.teamId, teamId),
      inArray(teamMember.userId, currentUserIds)
    )
  );
};
