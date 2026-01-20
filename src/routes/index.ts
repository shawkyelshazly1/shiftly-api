import { Env } from "@/types";
import { Hono } from "hono";
import { v1Routes } from "./v1";

const routes = new Hono<Env>();

// API Versioning
routes.route("/v1", v1Routes);

// default fall back to selected version below
routes.route("/", v1Routes);

export { routes as apiRoutes };
