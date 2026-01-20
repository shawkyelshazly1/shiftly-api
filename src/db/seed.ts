import "dotenv/config";
import { db } from "./index";
import { permission, role, rolePermission } from "./schema";
import { PERMISSIONS } from "@/constants/permissions";

/**
 * Permission definitions with metadata for UI display
 */
const PERMISSION_DEFINITIONS = [
  // Wildcards
  {
    name: PERMISSIONS.ALL,
    resource: "all",
    action: "all",
    description: "Full system access",
  },

  // Users
  {
    name: PERMISSIONS.USERS_ALL,
    resource: "users",
    action: "all",
    description: "Full access to user management",
  },
  {
    name: PERMISSIONS.USERS_READ,
    resource: "users",
    action: "read",
    description: "View employees",
  },
  {
    name: PERMISSIONS.USERS_CREATE,
    resource: "users",
    action: "create",
    description: "Create new employees",
  },
  {
    name: PERMISSIONS.USERS_UPDATE,
    resource: "users",
    action: "update",
    description: "Edit employee profiles",
  },
  {
    name: PERMISSIONS.USERS_DELETE,
    resource: "users",
    action: "delete",
    description: "Deactivate employees",
  },

  // Teams
  {
    name: PERMISSIONS.TEAMS_ALL,
    resource: "teams",
    action: "all",
    description: "Full access to team management",
  },
  {
    name: PERMISSIONS.TEAMS_READ,
    resource: "teams",
    action: "read",
    description: "View teams",
  },
  {
    name: PERMISSIONS.TEAMS_CREATE,
    resource: "teams",
    action: "create",
    description: "Create teams",
  },
  {
    name: PERMISSIONS.TEAMS_UPDATE,
    resource: "teams",
    action: "update",
    description: "Edit teams",
  },
  {
    name: PERMISSIONS.TEAMS_DELETE,
    resource: "teams",
    action: "delete",
    description: "Delete teams",
  },

  // Schedules
  {
    name: PERMISSIONS.SCHEDULES_ALL,
    resource: "schedules",
    action: "all",
    description: "Full access to scheduling",
  },
  {
    name: PERMISSIONS.SCHEDULES_READ,
    resource: "schedules",
    action: "read",
    description: "View schedules",
  },
  {
    name: PERMISSIONS.SCHEDULES_CREATE,
    resource: "schedules",
    action: "create",
    description: "Create shifts",
  },
  {
    name: PERMISSIONS.SCHEDULES_UPDATE,
    resource: "schedules",
    action: "update",
    description: "Edit shifts",
  },
  {
    name: PERMISSIONS.SCHEDULES_DELETE,
    resource: "schedules",
    action: "delete",
    description: "Delete shifts",
  },
  {
    name: PERMISSIONS.SCHEDULES_PUBLISH,
    resource: "schedules",
    action: "publish",
    description: "Publish schedules",
  },

  // Own schedule (employee self-service)
  {
    name: PERMISSIONS.OWN_SCHEDULE_VIEW,
    resource: "own-schedule",
    action: "view",
    description: "View own shifts",
  },
  {
    name: PERMISSIONS.OWN_SCHEDULE_REQUEST,
    resource: "own-schedule",
    action: "request",
    description: "Request availability/time-off",
  },

  // Swaps
  {
    name: PERMISSIONS.SWAPS_ALL,
    resource: "swaps",
    action: "all",
    description: "Full access to shift swaps",
  },
  {
    name: PERMISSIONS.SWAPS_REQUEST,
    resource: "swaps",
    action: "request",
    description: "Request shift swaps",
  },
  {
    name: PERMISSIONS.SWAPS_APPROVE,
    resource: "swaps",
    action: "approve",
    description: "Approve/deny swaps",
  },

  // Roles
  {
    name: PERMISSIONS.ROLES_ALL,
    resource: "roles",
    action: "all",
    description: "Full access to role management",
  },
  {
    name: PERMISSIONS.ROLES_READ,
    resource: "roles",
    action: "read",
    description: "View roles",
  },
  {
    name: PERMISSIONS.ROLES_CREATE,
    resource: "roles",
    action: "create",
    description: "Create roles",
  },
  {
    name: PERMISSIONS.ROLES_UPDATE,
    resource: "roles",
    action: "update",
    description: "Edit roles",
  },
  {
    name: PERMISSIONS.ROLES_DELETE,
    resource: "roles",
    action: "delete",
    description: "Delete roles",
  },

  // Settings
  {
    name: PERMISSIONS.SETTINGS_ALL,
    resource: "settings",
    action: "all",
    description: "Full access to settings",
  },
  {
    name: PERMISSIONS.SETTINGS_READ,
    resource: "settings",
    action: "read",
    description: "View settings",
  },
  {
    name: PERMISSIONS.SETTINGS_UPDATE,
    resource: "settings",
    action: "update",
    description: "Modify settings",
  },

  // Reports
  {
    name: PERMISSIONS.REPORTS_ALL,
    resource: "reports",
    action: "all",
    description: "Full access to reports",
  },
  {
    name: PERMISSIONS.REPORTS_VIEW,
    resource: "reports",
    action: "view",
    description: "View reports",
  },
  {
    name: PERMISSIONS.REPORTS_EXPORT,
    resource: "reports",
    action: "export",
    description: "Export reports",
  },
];

/**
 * Default roles with their permissions
 */
const DEFAULT_ROLES = [
  {
    name: "Admin",
    description: "Full system access",
    isSystem: true,
    isDefault: false,
    permissions: [PERMISSIONS.ALL], // Just the wildcard - covers everything
  },
  {
    name: "Scheduler",
    description: "Manage schedules, teams, and employees",
    isSystem: true,
    isDefault: false,
    permissions: [
      PERMISSIONS.USERS_ALL,
      PERMISSIONS.TEAMS_ALL,
      PERMISSIONS.SCHEDULES_ALL,
      PERMISSIONS.SWAPS_ALL,
      PERMISSIONS.REPORTS_ALL,
    ],
  },
  {
    name: "Operations Manager",
    description: "Manage team schedules and approve swaps",
    isSystem: true,
    isDefault: false,
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.SCHEDULES_READ,
      PERMISSIONS.SCHEDULES_UPDATE,
      PERMISSIONS.SWAPS_APPROVE,
      PERMISSIONS.OWN_SCHEDULE_VIEW,
      PERMISSIONS.OWN_SCHEDULE_REQUEST,
    ],
  },
  {
    name: "Team Lead",
    description: "Manage team schedules and approve swaps",
    isSystem: true,
    isDefault: false,
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.SCHEDULES_READ,
      PERMISSIONS.SWAPS_APPROVE,
      PERMISSIONS.OWN_SCHEDULE_VIEW,
      PERMISSIONS.OWN_SCHEDULE_REQUEST,
    ],
  },
  {
    name: "Employee",
    description: "View own schedule and request changes",
    isSystem: true,
    isDefault: true, // New users get this role
    permissions: [
      PERMISSIONS.OWN_SCHEDULE_VIEW,
      PERMISSIONS.OWN_SCHEDULE_REQUEST,
      PERMISSIONS.SWAPS_REQUEST,
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Seed permissions
  console.log("📝 Creating permissions...");
  const permissionRecords = await db
    .insert(permission)
    .values(PERMISSION_DEFINITIONS)
    .onConflictDoNothing()
    .returning();
  console.log(`   Created ${permissionRecords.length} permissions\n`);

  // Get all permissions for mapping
  const allPermissions = await db.select().from(permission);
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // 2. Seed roles
  console.log("👥 Creating roles...");
  for (const roleDef of DEFAULT_ROLES) {
    const { permissions: rolePerms, ...roleData } = roleDef;

    // Insert role
    const [insertedRole] = await db
      .insert(role)
      .values(roleData)
      .onConflictDoNothing()
      .returning();

    if (!insertedRole) {
      console.log(`   Role "${roleData.name}" already exists, skipping...`);
      continue;
    }

    console.log(`   Created role: ${insertedRole.name}`);

    // Assign permissions to role
    const permissionAssignments = rolePerms
      .map((permName) => {
        const permId = permissionMap.get(permName);
        if (!permId) {
          console.warn(`   ⚠️  Permission "${permName}" not found`);
          return null;
        }
        return { roleId: insertedRole.id, permissionId: permId };
      })
      .filter(Boolean) as { roleId: string; permissionId: string }[];

    if (permissionAssignments.length > 0) {
      await db
        .insert(rolePermission)
        .values(permissionAssignments)
        .onConflictDoNothing();
      console.log(
        `   → Assigned ${permissionAssignments.length} permissions\n`
      );
    }
  }

  console.log("✅ Seeding complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
