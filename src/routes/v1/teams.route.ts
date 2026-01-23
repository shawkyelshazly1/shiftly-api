import { PERMISSIONS } from "@/constants/permissions";
import { requireAuth, requirePermission } from "@/middleware";
import {
  addTeamMembers,
  createTeam,
  CreateTeamInput,
  deleteTeam,
  getAllTeams,
  getTeamById,
  removeTeamMembers,
  updateTeam,
  UpdateTeamInput,
  UpdateTeamMembersInput,
} from "@/services/teams.service";
import { Env } from "@/types";
import { Hono } from "hono";

const teams = new Hono<Env>();

teams.use("*", requireAuth);

// GET /api/v1/teams
// fetch all teams
teams.get("/", requirePermission(PERMISSIONS.TEAMS_READ), async (c) => {
  const teams = await getAllTeams();
  return c.json(teams);
});

// POST /api/v1/teams
// create new team
teams.post("/", requirePermission(PERMISSIONS.TEAMS_CREATE), async (c) => {
  try {
    const body: CreateTeamInput = await c.req.json();

    if (!body.name) {
      return c.json({ error: "Name is required" }, 400);
    }
    const newTeam = await createTeam(body);
    return c.json(newTeam, 201);
  } catch (error) {
    console.error("Failed to create team: ", error);
    return c.json({ error: "Unable to create team" }, 500);
  }
});

// DELETE /api/v1/teams/:id
// delete team by id
teams.delete("/:id", requirePermission(PERMISSIONS.TEAMS_DELETE), async (c) => {
  const teamId = await c.req.param("id");

  try {
    await deleteTeam(teamId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team: ", error);
    return c.json({ error: "Unable to delete team" }, 400);
  }
});

// GET /api/v1/teams/:id
// get team by id & it's members
teams.get(
  "/:id",
  requirePermission(PERMISSIONS.TEAMS_READ, PERMISSIONS.USERS_READ),
  async (c) => {
    const teamId = await c.req.param("id");
    try {
      const team = await getTeamById(teamId);

      if (!team) return c.json({ error: "Team not found" }, 400);

      return c.json(team);
    } catch (error) {
      console.error("Failed to get team by id: ", error);
      return c.json({ error: "Unable to get team & members" }, 500);
    }
  }
);

// PATCH /api/v1/teams/:id
// update team
teams.patch(
  "/:id",
  requirePermission(PERMISSIONS.TEAMS_UPDATE, PERMISSIONS.USERS_UPDATE),
  async (c) => {
    const teamId = await c.req.param("id");
    const body: UpdateTeamInput = await c.req.json();
    try {
      const team = await getTeamById(teamId);

      if (!team) return c.json({ error: "Team not found" }, 400);

      const updatedTeam = await updateTeam(teamId, body);

      return c.json(updatedTeam);
    } catch (error) {
      console.error("Failed to update team ", error);
      return c.json({ error: "Unable to update team" }, 500);
    }
  }
);

// POST /api/v1/teams/:id/members
// Add team members
teams.post(
  "/:id/members",
  requirePermission(PERMISSIONS.TEAMS_UPDATE),
  async (c) => {
    try {
      const teamId = await c.req.param("id");
      const body: UpdateTeamMembersInput = await c.req.json();

      if (!body.teamMembersIds || body.teamMembersIds.length === 0)
        return c.json({ error: "Members Ids are rquired!" }, 500);

      let updatedTeam = await addTeamMembers(teamId, body);
      return c.json(updatedTeam);
    } catch (error) {
      console.error("Failed to add team members: ", error);
      return c.json({ error: "unable to add team members" }, 500);
    }
  }
);

// DELETE /api/v1/teams/:id/members
// remove team members
teams.delete(
  "/:id/members",
  requirePermission(PERMISSIONS.TEAMS_UPDATE),
  async (c) => {
    const teamId = await c.req.param("id");
    const body: UpdateTeamMembersInput = await c.req.json();

    try {
      await removeTeamMembers(teamId, body);
      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to remove team members: ", error);
      return c.json({ error: "unable to remove team members" }, 500);
    }
  }
);

export { teams as teamsRoute };
