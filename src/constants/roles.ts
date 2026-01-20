/**
 * Role names - must match the seeded roles in db/seed.ts
 */
export const ROLE_NAMES = {
  ADMIN: "Admin",
  SCHEDULER: "Scheduler",
  OPERATIONS_MANAGER: "Operations Manager",
  TEAM_LEAD: "Team Lead",
  EMPLOYEE: "Employee",
} as const;
