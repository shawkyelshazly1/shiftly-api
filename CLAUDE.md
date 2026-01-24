# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Development server (hot reload)
bun run dev

# Database commands
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Run migrations
bun run db:seed        # Seed default roles and permissions
bun run db:studio      # Open Drizzle Studio GUI
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `BETTER_AUTH_SECRET` - Secret key for better-auth
- `BETTER_AUTH_URL` - Base URL of the app (used for CORS)
- `RESEND_API_KEY` - API key for Resend email service (invitations)

## Architecture

### Tech Stack
- **Runtime**: Bun
- **Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: better-auth library with session-based authentication

### Project Structure
- `src/app.ts` - Main Hono app setup with global middleware
- `src/lib/auth.ts` - better-auth configuration with database hooks
- `src/db/schema.ts` - Drizzle schema definitions and relations
- `src/routes/v1/` - Versioned API routes
- `src/services/` - Business logic layer
- `src/middleware/` - Auth and permission middleware
- `src/constants/` - Permission and role constants
- `src/utils/pagination.ts` - Pagination utilities

### API Routes Overview
All routes are under `/api/v1/`:
- `health` - Health check endpoint
- `permissions` - List permissions, get current user's permissions
- `users` - User CRUD, bulk creation, pagination support
- `roles` - Role CRUD with permission assignment, pagination support
- `teams` - Team CRUD, member management, pagination support
- `invitations` - Email invitations, accept/resend/cancel, pagination support

See `API.md` for detailed endpoint documentation.

### Authentication Flow
1. `sessionMiddleware` runs on all routes, populating `c.get("user")` and `c.get("session")`
2. Auth endpoints at `/api/auth/*` are handled by better-auth
3. Protected routes use `requireAuth` middleware
4. Permission-based routes use `requirePermission(PERMISSIONS.X)` middleware
5. Routes requiring any of multiple permissions use `requireAnyPermission(PERMISSIONS.X, PERMISSIONS.Y)`

### Permission System
Permissions follow the `resource:action` format (e.g., `users:read`, `schedules:create`). Wildcards are supported:
- `*` - Global admin access
- `users:*` - All actions on users resource

Permissions are defined in `src/constants/permissions.ts`. Users get permissions through:
1. Their assigned role (via `role_permission` table)
2. Direct user permissions (via `user_permission` table)

### Pagination Support

All list endpoints support optional pagination via query parameters:

```
GET /v1/users?page=1&pageSize=10&search=john&sortBy=name&sortOrder=asc
```

**Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10, max: 100)
- `search` - Search term (searches relevant text fields)
- `sortBy` - Column to sort by
- `sortOrder` - "asc" or "desc" (default: asc)

**Response format (when pagination params provided):**
```typescript
{
  data: T[],
  pagination: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number
  }
}
```

**Backward compatibility:** If no pagination params are provided, endpoints return a plain array for backward compatibility.

**Pagination utilities** (`src/utils/pagination.ts`):
- `parsePaginationParams()` - Parse and validate query params
- `buildPaginatedResponse()` - Build standardized response
- `buildSearchCondition()` - Build SQL LIKE conditions
- `buildSortOrder()` - Build ORDER BY clause
- `calculateOffset()` - Calculate SQL offset

### Database Schema
Key tables: `user`, `role`, `permission`, `team`, `team_member`, `invitation`
- Users have a single role (`roleId`)
- Roles have many permissions via `role_permission` junction
- Users can have additional direct permissions via `user_permission`
- Teams link to users via `team_member` junction (many-to-many)
- Invitations track user onboarding with token, status, and expiration
- Soft deletes use `deletedAt` column

### Teams
Teams group users together. Implemented in `src/services/teams.service.ts`:
- CRUD operations with soft delete support
- Member management (add/remove users)
- Team details include member list with user info
- Pagination support via `getAllTeamsPaginated()`

### Invitations
User onboarding via email invitations. Implemented in `src/services/invitation.service.ts`:
- Email sent via Resend when users are created
- Token-based acceptance (7-day expiry)
- Bulk invitation support via `POST /users/bulk`
- Resend invalidates previous token and sends new email
- Cancel marks invitation as cancelled
- Pagination support via `getAllInvitationsPaginated()`

### Hono Environment Type
Routes use `Hono<Env>` where `Env` provides typed context variables:
```typescript
type Env = {
  Variables: {
    user: User | null;
    session: Session | null;
  };
};
```

### First User Behavior
The first user to sign up is automatically assigned the Admin role. Subsequent users are created by admins via the API and assigned a specific role. This is handled in `src/lib/auth.ts` database hooks.

### Soft Delete Handling
Users have a `deletedAt` field for soft deletes. When a soft-deleted user attempts to login, they receive an error directing them to contact an admin. Creating a user with an email that was previously used (including soft-deleted accounts) is blocked.

### Service Layer Pattern

Services follow a consistent pattern:
```typescript
// Get all (no pagination - backward compatible)
export const getAllItems = async () => { ... }

// Get all with pagination
export const getAllItemsPaginated = async (params: PaginationParams) => {
  const page = params.page || DEFAULT_PAGE;
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  const searchCondition = buildSearchCondition(params.search, [columns...]);
  const orderBy = buildSortOrder(params.sortBy, params.sortOrder, columnMap, defaultColumn);

  // Get total count
  const [{ total }] = await db.select({ total: count() }).from(table).where(whereConditions);

  // Get paginated data
  const data = await db.select().from(table).where(whereConditions).orderBy(orderBy).limit(pageSize).offset(offset);

  return buildPaginatedResponse(data, total, params);
}
```

### Count Endpoints

Global count endpoints provide aggregate statistics without pagination:
- `GET /v1/users/count` - Returns `{ total, verified }` user counts
- `GET /v1/teams/count` - Returns `{ total }` team count

### Filter Parameters

The users pagination endpoint supports additional filter parameters:
```
GET /v1/users?page=1&pageSize=10&roleId=xxx&teamId=yyy
```

These filters are applied server-side and combined with search/sort parameters.

### User Invitation Data

The users endpoint now returns invitation-related fields:
- `invitationStatus` - Status of the user's invitation (`pending`, `accepted`, `expired`, `cancelled`)
- `invitationExpiresAt` - Expiration timestamp for pending invitations

This allows the frontend to display invitation status and enable resend actions for pending/expired invitations.
