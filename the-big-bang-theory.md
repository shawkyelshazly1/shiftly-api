# The Big Bang Theory - Full Stack Performance & Quality Overhaul

## Overview
Comprehensive implementation plan for all performance and code quality fixes identified in both backend (shiftly-api) and frontend (shiftly) audits.

---

## PHASE 1: Backend Critical Fixes (shiftly-api)

### 1.1 Fix Team Member Deletion Bug (DATA INTEGRITY - HIGHEST PRIORITY)
- **File**: `src/services/teams.service.ts` (lines 226-228)
- **Issue**: `removeTeamMembers` deletes user from ALL teams instead of specified team
- **Fix**: Add `teamId` filter to WHERE clause
```typescript
await db.delete(teamMember).where(
  and(
    eq(teamMember.teamId, teamId),
    inArray(teamMember.userId, currentUserIds)
  )
);
```

### 1.2 Add Permission Caching
- **File**: `src/middleware/permission.middleware.ts` (lines 44-47, 82-85)
- **Issue**: 2 DB queries per protected request
- **Fix**: Implement in-memory cache with 5-minute TTL, invalidate on role/permission changes

### 1.3 Add Missing Database Indexes
- **File**: `src/db/schema.ts`
- **Indexes to add**:
  - `invitation.token` (for token lookups)
  - `invitation.(userId, status)` (composite for filtered queries)
  - `invitation.createdAt` (for ordering)
  - `role.name` (for name lookups)

### 1.4 Add Zod Validation
- **Files**: All route files in `src/routes/v1/`
- **Fix**: Install `@hono/zod-validator` and add schema validation to all endpoints

---

## PHASE 2: Backend High Severity Fixes

### 2.1 Remove Duplicate Team Validation
- **File**: `src/routes/v1/teams.route.ts` (lines 112-114)
- **Fix**: Use `UPDATE ... RETURNING` pattern, check affected rows

### 2.2 Fix Over-Fetching in Queries
- **File**: `src/services/invitations.service.ts` (lines 77, 107-110, 146)
- **Fix**: Select only needed columns instead of `SELECT *`

### 2.3 Fix Inefficient Invitation Filtering
- **File**: `src/services/invitations.service.ts` (lines 152-179)
- **Fix**: Use SQL filtering instead of fetching all then filtering in JavaScript

---

## PHASE 3: Backend Medium Severity Fixes

### 3.1 Remove Redundant `await` on Sync Operations
- **Files**:
  - `src/routes/v1/users.route.ts` (lines 72, 88, 107)
  - `src/routes/v1/teams.route.ts` (lines 72, 89, 109, 133, 154)
- **Fix**: Remove `await` from `c.req.param()` calls

### 3.2 Parallelize Count/Data Queries
- **Files**:
  - `src/services/users.service.ts` (lines 209-262)
  - `src/services/teams.service.ts` (lines 63-80)
  - `src/services/roles.service.ts` (lines 156-177)
- **Fix**: Use `Promise.all` for count and data queries

### 3.3 Add Connection Pooling Configuration
- **File**: `src/db/index.ts` (lines 1-6)
- **Fix**: Configure explicit pool settings (max connections, timeouts)

### 3.4 Fix Inconsistent Error Status Codes
- **File**: `src/routes/v1/teams.route.ts` (lines 93, 137)
- **Fix**:
  - Line 93: Change 400 to 404 for "not found"
  - Line 137: Change 500 to 400 for validation error

### 3.5 Handle Email Failures Gracefully
- **File**: `src/routes/v1/users.route.ts` (lines 125-127)
- **Fix**: Fire-and-forget for email sending, log errors but don't fail request

---

## PHASE 4: Backend Low Severity Fixes

### 4.1 Replace Magic Numbers with Constants
- **File**: `src/services/invitations.service.ts` (lines 177-178, 218-219, 242)
- **Fix**: Define `INVITATION_VALIDITY_DAYS = 7` and use throughout

### 4.2 Fix Typo
- **File**: `src/routes/v1/teams.route.ts` (line 137)
- **Fix**: "rquired" → "required"

---

## PHASE 5: Frontend Critical Fixes (shiftly)

### 5.1 Use Count Endpoints Instead of Full Data Fetching
- **File**: `src/routes/_authenticated/admin.tsx` (lines 83-86)
- **Issue**: StatsSection fetches entire datasets just to count
- **Fix**: Use `useUsersCount()`, `useTeamsCount()` hooks with count endpoints

### 5.2 Add React.memo to Expensive List Components
- **File**: `src/routes/_authenticated/settings/roles/-components/roles-grid.tsx`
- **Fix**: Memoize grid component

---

## PHASE 6: Frontend Moderate Fixes

### 6.1 Fix Sorting Effect Initial Mount
- **File**: `src/components/ui/data-table/data-table.tsx` (lines 85-90)
- **Fix**: Add ref to skip initial mount

### 6.2 Memoize Row Selection Array
- **File**: `src/components/ui/data-table/data-table.tsx` (lines 111-117)
- **Fix**: Use `useMemo` for selectedRows mapping

### 6.3 Remove Redundant Query Invalidation
- **File**: `src/hooks/useTeams.ts` (lines 53-56)
- **Fix**: Remove duplicate `["teams", "count"]` invalidation

---

## PHASE 7: Frontend Code Quality

### 7.1 Remove Unused Navbar Component
- **File**: `src/components/navbar.tsx` (178 lines)
- **Action**: Delete file entirely

### 7.2 Fix Implicit Any in API Client
- **File**: `src/utils/api-client.ts` (line 13)
- **Fix**: `let queryClientRef: QueryClient | null = null;`

### 7.3 Replace Native confirm() with AlertDialog
- **Files**:
  - `src/routes/_authenticated/settings/users/index.tsx` (line 74)
  - `src/routes/_authenticated/settings/teams/index.tsx` (line 62)
  - `src/routes/_authenticated/settings/roles/index.tsx` (line 83)

### 7.4 Extract Magic Numbers
- **File**: `src/routes/_authenticated/settings/roles/index.tsx` (line 171)
- **Fix**: `const ROLES_PAGE_SIZE = 12;`

---

## PHASE 8: Frontend File Splitting (Large Files)

### 8.1 Split user-form.tsx (374 lines)
Extract to:
- `user-info-header.tsx`
- `role-selector.tsx`
- `role-permissions-preview.tsx`
- `direct-permissions.tsx`
- `permission-picker.tsx`

### 8.2 Split admin.tsx (371 lines)
Extract to:
- `admin/-components/welcome-header.tsx`
- `admin/-components/stats-section.tsx`
- `admin/-components/quick-actions.tsx`
- `admin/-components/recent-activity.tsx`

### 8.3 Split data-table.tsx (271 lines)
Extract to:
- `data-table-mobile.tsx`
- `data-table-skeleton.tsx`

---

## PHASE 9: Sync & Verification

### 9.1 Frontend-Backend Sync
- Ensure all API contract changes are reflected in frontend
- Verify count endpoints are properly consumed
- Test pagination and filtering alignment

### 9.2 Run Full Test Suite
- Backend: `bun test`
- Frontend: `bun test`
- E2E: Integration tests

### 9.3 Database Migration
- Generate migration for new indexes: `bun run db:generate`
- Apply migration: `bun run db:migrate`

---

## Execution Order

```
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL TRACK A                         │
│                    (Backend Agent)                          │
├─────────────────────────────────────────────────────────────┤
│ 1.1 Fix team deletion bug                                   │
│ 1.2 Add permission caching                                  │
│ 1.3 Add database indexes                                    │
│ 1.4 Add Zod validation                                      │
│ 2.x High severity fixes                                     │
│ 3.x Medium severity fixes                                   │
│ 4.x Low severity fixes                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL TRACK B                         │
│                    (Frontend Agent)                         │
├─────────────────────────────────────────────────────────────┤
│ 5.x Critical fixes (count endpoints)                        │
│ 6.x Moderate fixes                                          │
│ 7.x Code quality                                            │
│ 8.x File splitting                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEQUENTIAL                               │
│                    (Sync Agent)                             │
├─────────────────────────────────────────────────────────────┤
│ 9.1 Frontend-Backend sync verification                      │
│ 9.2 Run full test suite                                     │
│ 9.3 Database migration                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FINAL REVIEW                             │
│                    (Engineering Manager)                    │
├─────────────────────────────────────────────────────────────┤
│ Code quality review                                         │
│ Performance validation                                      │
│ Sign-off                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Backend Critical | 4 | P0 |
| Backend High | 3 | P1 |
| Backend Medium | 6 | P2 |
| Backend Low | 2 | P3 |
| Frontend Critical | 2 | P0 |
| Frontend Moderate | 3 | P2 |
| Frontend Code Quality | 4 | P3 |
| Frontend File Splitting | 3 | P4 |
| **Total Issues** | **27** | |

---

## Dependencies

- Backend index changes require migration
- Frontend count hooks depend on backend count endpoints (already exist)
- Sync agent runs after both tracks complete
- Engineering manager review is final gate
