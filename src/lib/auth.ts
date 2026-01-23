import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { getAdminRoleId } from "@/utils/roles";
import { createAuthMiddleware } from "better-auth/api";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 5,
  },
  user: {
    additionalFields: {
      roleId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Block soft-deleted users from signing in
      if (ctx.path === "/sign-in/email" && ctx.body?.email) {
        const [existingUser] = await db
          .select()
          .from(schema.user)
          .where(
            and(
              eq(schema.user.email, ctx.body.email),
              isNotNull(schema.user.deletedAt)
            )
          );

        if (existingUser) {
          throw new APIError("FORBIDDEN", {
            message:
              "This account has been deactivated. Please contact an administrator to restore access.",
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if first user to assign admin role
          const existingUsers = await db.query.user.findMany({ limit: 1 });
          const isFirstUser = existingUsers.length === 0;

          if (isFirstUser) {
            const adminRoleId = await getAdminRoleId();
            if (!adminRoleId) {
              throw new Error(
                `Admin role not found. Please run "pnpm db:seed" to create default roles.`
              );
            }
            return {
              data: {
                ...user,
                roleId: adminRoleId,
              },
            };
          }

          // Subsequent users must have roleId provided by admin
          if (!user.roleId) {
            throw new Error("Role ID is required for new users.");
          }

          return { data: user };
        },
      },
    },
  },
  session: {
    cookieCache: {
      maxAge: 5 * 60,
      enabled: true,
      strategy: "compact",
    },
  },
});
