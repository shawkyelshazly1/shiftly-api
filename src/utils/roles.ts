import { ROLE_NAMES } from "@/constants/roles";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

/** Cache role IDs to avoid repeated DB lookups */
let roleIdCache: { admin?: string; employee?: string } = {};

export async function getRoleId(roleName: string): Promise<string | undefined> {
  const result = await db.query.role.findFirst({
    where: eq(schema.role.name, roleName),
  });
  return result?.id;
}

export async function getAdminRoleId(): Promise<string | undefined> {
  if (!roleIdCache.admin) {
    roleIdCache.admin = await getRoleId(ROLE_NAMES.ADMIN);
  }
  return roleIdCache.admin;
}

export async function getEmployeeRoleId(): Promise<string | undefined> {
  if (!roleIdCache.employee) {
    roleIdCache.employee = await getRoleId(ROLE_NAMES.EMPLOYEE);
  }
  return roleIdCache.employee;
}
