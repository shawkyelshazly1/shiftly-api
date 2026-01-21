import { Hono } from "hono";
import { Env } from "./types";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { sessionMiddleware } from "./middleware";
import { auth } from "./lib/auth";
import { apiRoutes } from "./routes";

export const createApp = () => {
  const app = new Hono<Env>();

  // global middlewares

  app.use("*", logger());

  app.use(
    "*",
    cors({
      origin: process.env.BETTER_AUTH_URL!,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE", "PATCH"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    })
  );

  // Session middleware (populates user/session in context)
  app.use("*", sessionMiddleware);

  // Better Auth handler
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // API routes (versioned)
  app.route("/api", apiRoutes);

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: "Not Found", code: "NOT_FOUND" }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error("Server error:", err);
    return c.json(
      {
        error: "Internal Server Error",
        code: "INTERNAL_ERROR",
        ...(process.env.NODE_ENV === "development" && { message: err.message }),
      },
      500
    );
  });

  return app;
};
