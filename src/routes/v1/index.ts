import { Env } from "@/types";
import { Hono } from "hono";
import { permissionsRoute } from "./permissions.route";
import { healthRoute } from "./health.route";
import { usersRoute } from "./users.route";
import { rolesRoute } from "./roles.route";

const v1 = new Hono<Env>();

v1.route("/permissions", permissionsRoute);
v1.route("/health", healthRoute);
v1.route("/users", usersRoute);
v1.route("/roles", rolesRoute);

export { v1 as v1Routes };
