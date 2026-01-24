import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  primaryKey,
  varchar,
} from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("user_roleId_idx").on(table.roleId),
    index("user_deletedAt_idx").on(table.deletedAt),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const role = pgTable(
  "role",
  {
    id: text("id")
      .primaryKey()
      .$default(() => uuidv4()),
    name: text("name").notNull().unique(),
    description: text("description"),
    // Prevent deletion/modification of system roles
    isSystem: boolean("is_system").notNull().default(false),

    // Default role assigned to new users
    isDefault: boolean("is_default").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("role_deletedAt_idx").on(table.deletedAt),
    index("role_name_idx").on(table.name),
  ]
);

export const permission = pgTable("permission", {
  id: text("id")
    .primaryKey()
    .$default(() => uuidv4()),

  // Format: "resource:action" e.g., "users:read", "posts:delete"
  name: text("name").notNull().unique(),

  description: text("description"),

  // Group permissions in UI (e.g., "Users", "Posts", "Settings")
  resource: text("resource").notNull(), // e.g., "users", "posts"
  action: text("action").notNull(), // e.g., "read", "create", "update", "delete"

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const team = pgTable(
  "team",
  {
    id: text("id")
      .primaryKey()
      .$default(() => uuidv4()),
    name: text("name").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("team_deletedAt_idx").on(table.deletedAt)]
);

//  many to many relation ( team <> user )
export const teamMember = pgTable(
  "team_member",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index("teamMember_userId_idx").on(table.userId),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id")
      .primaryKey()
      .$default(() => uuidv4())
      .notNull(),

    email: varchar("email", { length: 255 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, accepted, expired
    expiresAt: timestamp("expires_at").notNull(),
    invitedById: text("invited_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("invitation_email_idx").on(table.email),
    index("invitation_status_idx").on(table.status),
    index("invitation_invitedById_idx").on(table.invitedById),
    index("invitation_userId_idx").on(table.userId),
    index("invitation_token_idx").on(table.token),
    index("invitation_userId_status_idx").on(table.userId, table.status),
    index("invitation_createdAt_idx").on(table.createdAt),
  ]
);

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),

    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: text("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("rolePermission_permissionId_idx").on(table.permissionId),
  ]
);

export const userPermission = pgTable(
  "user_permission",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: text("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.permissionId] }),
    index("userPermission_permissionId_idx").on(table.permissionId),
  ]
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  role: one(role, {
    fields: [user.roleId],
    references: [role.id],
  }),
  teams: many(teamMember),
  permissions: many(userPermission),
  invitationsReceived: many(invitation, { relationName: "invitedUser" }),
  invitationsSent: many(invitation, { relationName: "inviter" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const roleRelations = relations(role, ({ many }) => ({
  users: many(user),
  permissions: many(rolePermission),
  invitations: many(invitation),
}));

export const permissionRelations = relations(permission, ({ many }) => ({
  roles: many(rolePermission),
  users: many(userPermission),
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, {
    fields: [rolePermission.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}));

export const teamRelations = relations(team, ({ many }) => ({
  users: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  user: one(user, {
    fields: [invitation.userId],
    references: [user.id],
    relationName: "InvitedUser",
  }),
  role: one(role, {
    fields: [invitation.roleId],
    references: [role.id],
  }),
  invitedBy: one(user, {
    fields: [invitation.invitedById],
    references: [user.id],
    relationName: "inviter",
  }),
}));

export const userPermissionRelations = relations(userPermission, ({ one }) => ({
  user: one(user, {
    fields: [userPermission.userId],
    references: [user.id],
  }),
  permission: one(permission, {
    fields: [userPermission.permissionId],
    references: [permission.id],
  }),
}));

export type Role = typeof role.$inferSelect;
export type Permission = typeof permission.$inferSelect;
export type Team = typeof team.$inferSelect;
export type Invitation = typeof invitation.$inferSelect;
export type InvitationInput = typeof invitation.$inferInsert;
