/**
 * Permission constants for Shiftly
 * Format: "resource:action"
 *
 * This file is the source of truth - keep frontend in sync
 */

export const PERMISSIONS = {
  // Wildcards
  ALL: "*",

  // Users - manage employee accounts
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_ALL: "users:*",

  // Teams - departments, locations, groups
  TEAMS_READ: "teams:read",
  TEAMS_CREATE: "teams:create",
  TEAMS_UPDATE: "teams:update",
  TEAMS_DELETE: "teams:delete",
  TEAMS_ALL: "teams:*",

  // Schedules - create/assign/manage shifts
  SCHEDULES_READ: "schedules:read",
  SCHEDULES_CREATE: "schedules:create",
  SCHEDULES_UPDATE: "schedules:update",
  SCHEDULES_DELETE: "schedules:delete",
  SCHEDULES_PUBLISH: "schedules:publish",
  SCHEDULES_ALL: "schedules:*",

  // Employee self-service
  OWN_SCHEDULE_VIEW: "own-schedule:view",
  OWN_SCHEDULE_REQUEST: "own-schedule:request",

  // Shift swaps between employees
  SWAPS_REQUEST: "swaps:request",
  SWAPS_APPROVE: "swaps:approve",
  SWAPS_ALL: "swaps:*",

  // Roles & Permissions management
  ROLES_READ: "roles:read",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  ROLES_ALL: "roles:*",

  // System settings
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_ALL: "settings:*",

  // Reports & analytics
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",
  REPORTS_ALL: "reports:*",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All permission values as an array (useful for seeding DB) */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
