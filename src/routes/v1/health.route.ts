import { Hono } from "hono";
import type { Env } from "../../types";

const health = new Hono<Env>();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export { health as healthRoute };
