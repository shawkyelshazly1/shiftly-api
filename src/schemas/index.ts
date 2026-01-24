import { z } from "zod";

// User schemas
export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  roleId: z.string().uuid("Invalid role ID"),
  password: z.string().min(5).optional(),
});

export const updateUserSchema = z.object({
  roleId: z.string().uuid("Invalid role ID").optional(),
  directPermissionIds: z.array(z.string().uuid()).optional(),
});

export const bulkCreateUsersSchema = z.object({
  users: z.array(createUserSchema).min(1, "At least one user is required"),
});

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  permissionIds: z.array(z.string().uuid()).optional(),
  isSystem: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
  isSystem: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  teamMemberIds: z.array(z.string().uuid()).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  teamMemberIds: z.array(z.string().uuid()).optional(),
});

export const updateTeamMembersSchema = z.object({
  teamMembersIds: z.array(z.string().uuid()).min(1, "At least one member ID is required"),
});

// Invitation schemas
export const acceptInvitationSchema = z.object({
  password: z.string().min(5, "Password must be at least 5 characters"),
});

export const resendInvitationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// Param schemas
export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const tokenParamSchema = z.object({
  token: z.string().min(1, "Token is required"),
});
