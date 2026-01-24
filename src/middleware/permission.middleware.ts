import { Permission } from "@/constants/permissions";
import { getAllUserPermissions } from "@/services/permission.service";
import { Env } from "@/types";
import { createMiddleware } from "hono/factory";

// Permission cache with TTL (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  permissions: string[];
  expiresAt: number;
};

const permissionCache = new Map<string, CacheEntry>();

function getCacheKey(userId: string, roleId: string): string {
  return `${userId}:${roleId}`;
}

function getCachedPermissions(userId: string, roleId: string): string[] | null {
  const key = getCacheKey(userId, roleId);
  const entry = permissionCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    permissionCache.delete(key);
    return null;
  }

  return entry.permissions;
}

function setCachedPermissions(userId: string, roleId: string, permissions: string[]): void {
  const key = getCacheKey(userId, roleId);
  permissionCache.set(key, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate permission cache for a user (call when permissions change)
 */
export function invalidatePermissionCache(userId?: string): void {
  if (userId) {
    // Invalidate all entries for this user (across all roles)
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        permissionCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    permissionCache.clear();
  }
}

/**
 * Check if user has permission, supporting wildcards
 * Examples:
 *   - "*" matches everything
 *   - "users:*" matches "users:read", "users:create", etc.
 *   - "users:read" matches exactly "users:read"
 */
function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Direct match
  if (userPermissions.includes(requiredPermission)) return true;

  // Global wildcard (admin)
  if (userPermissions.includes("*")) return true;

  // Resource wildcard (e.g., "users:*" matches "users:read")
  const [resource] = requiredPermission.split(":");
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
}

// require permissions middleware , always check DB no client trust
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    // Check cache first, then DB
    let permissionNames = getCachedPermissions(user.id, user.roleId);

    if (!permissionNames) {
      const { all } = await getAllUserPermissions(user.id, user.roleId);
      permissionNames = all;
      setCachedPermissions(user.id, user.roleId, permissionNames);
    }

    //check if user has required permissions
    const hasAllRequiredPermissions = requiredPermissions.every((perm) =>
      hasPermission(permissionNames, perm)
    );

    if (!hasAllRequiredPermissions) {
      return c.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          required: requiredPermissions,
        },
        403
      );
    }

    await next();
  });
};

//   Requires at least one of the specified permissions
export const requireAnyPermission = (...permissions: Permission[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    if (!user.roleId) {
      return c.json({ error: "No role assigned", code: "NO_ROLE" }, 403);
    }

    // Check cache first, then DB
    let permissionNames = getCachedPermissions(user.id, user.roleId);

    if (!permissionNames) {
      const { all } = await getAllUserPermissions(user.id, user.roleId);
      permissionNames = all;
      setCachedPermissions(user.id, user.roleId, permissionNames);
    }

    const hasAnyPermission = permissions.some((perm) =>
      hasPermission(permissionNames, perm)
    );

    if (!hasAnyPermission) {
      return c.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          requiredAny: permissions,
        },
        403
      );
    }

    await next();
  });
};
