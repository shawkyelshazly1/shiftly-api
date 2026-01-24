import { PERMISSIONS } from "@/constants/permissions";
import { requireAuth, requirePermission } from "@/middleware";
import {
  addTeamMembers,
  createTeam,
  deleteTeam,
  getAllTeams,
  getAllTeamsPaginated,
  getTeamById,
  getTeamsCount,
  removeTeamMembers,
  updateTeam,
} from "@/services/teams.service";
import { Env } from "@/types";
import { Hono } from "hono";
import { parsePaginationParams } from "@/utils/pagination";
import { zValidator } from "@hono/zod-validator";
import {
  createTeamSchema,
  updateTeamSchema,
  updateTeamMembersSchema,
} from "@/schemas";

const teams = new Hono<Env>();

teams.use("*", requireAuth);

// GET /api/v1/teams
// fetch all teams (supports pagination via query params)
teams.get("/", requirePermission(PERMISSIONS.TEAMS_READ), async (c) => {
  const query = c.req.query();

  if (!query.page && !query.pageSize && !query.search) {
    const teams = await getAllTeams();
    return c.json(teams);
  }

  const params = parsePaginationParams(query);
  const result = await getAllTeamsPaginated(params);
  return c.json(result);
});

// POST /api/v1/teams
// create new team
teams.post(
  "/",
  requirePermission(PERMISSIONS.TEAMS_CREATE),
  zValidator("json", createTeamSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const newTeam = await createTeam(body);
      return c.json(newTeam, 201);
    } catch (error) {
      console.error("Failed to create team: ", error);
      return c.json({ error: "Unable to create team" }, 500);
    }
  }
);

// GET /api/v1/teams/count
// Get global team count
teams.get("/count", requirePermission(PERMISSIONS.TEAMS_READ), async (c) => {
  try {
    const counts = await getTeamsCount();
    return c.json(counts);
  } catch (error) {
    console.error("Failed to get team counts: ", error);
    return c.json({ error: "Unable to get team counts" }, 500);
  }
});

// DELETE /api/v1/teams/:id
// delete team by id
teams.delete("/:id", requirePermission(PERMISSIONS.TEAMS_DELETE), async (c) => {
  const teamId = c.req.param("id");

  try {
    await deleteTeam(teamId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team: ", error);
    return c.json({ error: "Unable to delete team" }, 500);
  }
});

// GET /api/v1/teams/:id
// get team by id & it's members
teams.get(
  "/:id",
  requirePermission(PERMISSIONS.TEAMS_READ, PERMISSIONS.USERS_READ),
  async (c) => {
    const teamId = c.req.param("id");
    try {
      const team = await getTeamById(teamId);

      if (!team) return c.json({ error: "Team not found" }, 404);

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
  zValidator("json", updateTeamSchema),
  async (c) => {
    const teamId = c.req.param("id");
    const body = c.req.valid("json");
    try {
      const updatedTeam = await updateTeam(teamId, body);

      if (!updatedTeam || updatedTeam.length === 0) {
        return c.json({ error: "Team not found" }, 404);
      }

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
  zValidator("json", updateTeamMembersSchema),
  async (c) => {
    try {
      const teamId = c.req.param("id");
      const body = c.req.valid("json");

      const updatedTeam = await addTeamMembers(teamId, body);
      return c.json(updatedTeam);
    } catch (error) {
      console.error("Failed to add team members: ", error);
      return c.json({ error: "Unable to add team members" }, 500);
    }
  }
);

// DELETE /api/v1/teams/:id/members/remove
// remove team members
teams.post(
  "/:id/members/remove",
  requirePermission(PERMISSIONS.TEAMS_UPDATE),
  zValidator("json", updateTeamMembersSchema),
  async (c) => {
    const teamId = c.req.param("id");
    const body = c.req.valid("json");

    try {
      await removeTeamMembers(teamId, body);
      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to remove team members: ", error);
      return c.json({ error: "Unable to remove team members" }, 500);
    }
  }
);

export { teams as teamsRoute };
