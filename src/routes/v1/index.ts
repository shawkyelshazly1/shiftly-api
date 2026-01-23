import { Env } from "@/types";
import { Hono } from "hono";
import { permissionsRoute } from "./permissions.route";
import { healthRoute } from "./health.route";
import { usersRoute } from "./users.route";
import { rolesRoute } from "./roles.route";
import { teamsRoute } from "./teams.route";
import { invitationsRoute } from "./invitations.route";

const v1 = new Hono<Env>();

v1.route("/permissions", permissionsRoute);
v1.route("/health", healthRoute);
v1.route("/users", usersRoute);
v1.route("/roles", rolesRoute);
v1.route("/teams", teamsRoute);
v1.route("/invitations", invitationsRoute);

export { v1 as v1Routes };
