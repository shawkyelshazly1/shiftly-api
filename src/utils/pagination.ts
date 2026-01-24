import { SQL, sql, asc, desc, like, or } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  roleId?: string;
  teamId?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(params: Record<string, string | undefined>): PaginationParams {
  const page = Math.max(1, parseInt(params.page || String(DEFAULT_PAGE), 10));
  const rawPageSize = parseInt(params.pageSize || String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);
  const sortOrder = params.sortOrder === "desc" ? "desc" : "asc";

  return {
    page,
    pageSize,
    search: params.search?.trim() || undefined,
    sortBy: params.sortBy,
    sortOrder,
    roleId: params.roleId || undefined,
    teamId: params.teamId || undefined,
  };
}

export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function buildSearchCondition(
  searchTerm: string | undefined,
  columns: PgColumn[]
): SQL | undefined {
  if (!searchTerm || columns.length === 0) return undefined;

  const searchPattern = `%${searchTerm.toLowerCase()}%`;
  const conditions = columns.map((col) =>
    sql`LOWER(${col}) LIKE ${searchPattern}`
  );

  if (conditions.length === 1) return conditions[0];
  return or(...conditions);
}

export function buildSortOrder(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc" | undefined,
  columnMap: Record<string, PgColumn>,
  defaultColumn: PgColumn
): SQL {
  const column = sortBy && columnMap[sortBy] ? columnMap[sortBy] : defaultColumn;
  return sortOrder === "desc" ? desc(column) : asc(column);
}
