import { db } from "../db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { ROLES } from "@/utils/constants";

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
        required: true,
        input: false,
        defaultValue: ROLES.USER,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // check if first user to assign admin role
          const existingUsers = await db.query.user.findMany({ limit: 1 });
          const isFirstUser = existingUsers.length === 0;

          return {
            data: {
              ...user,
              roleId: isFirstUser ? ROLES.ADMIN : ROLES.USER,
            },
          };
        },
      },
    },
  },
});
