import { auth } from "@/lib/auth";
import { Env } from "@/types";
import { createMiddleware } from "hono/factory";

// populate session & user in context  - non-blocking -
export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
  // get current session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);

  await next();
});

// requires authenticated user - check logged in only
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized!", code: "UNAUTHORIZED" }, 401);
  }

  await next();
});
