import { PERMISSIONS } from "@/constants/permissions";
import { requireAuth, requirePermission } from "@/middleware";
import { getRoleWithPermissions } from "@/services/permission.service";
import {
  createRole,
  deleteRole,
  getAllRoles,
  getAllRolesPaginated,
  updateRole,
} from "@/services/roles.service";
import { Env } from "@/types";
import { Hono } from "hono";
import { parsePaginationParams } from "@/utils/pagination";
import { zValidator } from "@hono/zod-validator";
import { createRoleSchema, updateRoleSchema } from "@/schemas";

const roles = new Hono<Env>();

roles.use("*", requireAuth);

// GET /api/v1/roles
// fetch roles with permissions (supports pagination via query params)
roles.get("/", requirePermission(PERMISSIONS.ROLES_READ), async (c) => {
  const query = c.req.query();

  if (!query.page && !query.pageSize && !query.search) {
    const roles = await getAllRoles();
    return c.json(roles);
  }

  const params = parsePaginationParams(query);
  const result = await getAllRolesPaginated(params);
  return c.json(result);
});

// GET /api/v1/roles/:id
// get role with permission
roles.get("/:id", requirePermission(PERMISSIONS.ROLES_READ), async (c) => {
  const role = await getRoleWithPermissions(c.req.param("id"));

  if (!role) {
    return c.json({ error: "Role not found" }, 404);
  }

  return c.json(role);
});

// POST /api/v1/roles/
// create new role
roles.post(
  "/",
  requirePermission(PERMISSIONS.ROLES_CREATE),
  zValidator("json", createRoleSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const newRole = await createRole(body);
      return c.json(newRole, 201);
    } catch (error: any) {
      console.error("Failed to create role: ", error);
      return c.json({ error: error.message }, 400);
    }
  }
);

// PATCH /api/v1/roles/:id
// update role by id
roles.patch(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  zValidator("json", updateRoleSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const updatedRole = await updateRole(c.req.param("id"), body);

      if (!updatedRole) {
        return c.json({ error: "Failed to update role" }, 404);
      }

      return c.json(updatedRole);
    } catch (error) {
      console.error("Failed to update role: ", error);
      return c.json({ error: "Failed to update role" }, 500);
    }
  }
);

// DELETE /api/v1/roles/:id
// delete role by id
roles.delete("/:id", requirePermission(PERMISSIONS.ROLES_DELETE), async (c) => {
  try {
    await deleteRole(c.req.param("id"));
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete role:", error);
    return c.json({ error: error.message || "Failed to delete role" }, 400);
  }
});

export { roles as rolesRoute };
