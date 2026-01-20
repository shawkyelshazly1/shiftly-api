import { eq } from "drizzle-orm";
import { db } from "../db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { ROLE_NAMES } from "@/constants/roles";
import { getAdminRoleId, getEmployeeRoleId } from "@/utils/roles";

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
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if first user to assign admin role
          const existingUsers = await db.query.user.findMany({ limit: 1 });
          const isFirstUser = existingUsers.length === 0;

          const roleId = isFirstUser
            ? await getAdminRoleId()
            : await getEmployeeRoleId();

          if (!roleId) {
            throw new Error(
              `Role not found. Please run "pnpm db:seed" to create default roles.`
            );
          }

          return {
            data: {
              ...user,
              roleId,
            },
          };
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
