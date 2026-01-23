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

### Authentication Flow
1. `sessionMiddleware` runs on all routes, populating `c.get("user")` and `c.get("session")`
2. Auth endpoints at `/api/auth/*` are handled by better-auth
3. Protected routes use `requireAuth` middleware
4. Permission-based routes use `requirePermission(PERMISSIONS.X)` middleware

### Permission System
Permissions follow the `resource:action` format (e.g., `users:read`, `schedules:create`). Wildcards are supported:
- `*` - Global admin access
- `users:*` - All actions on users resource

Permissions are defined in `src/constants/permissions.ts`. Users get permissions through:
1. Their assigned role (via `role_permission` table)
2. Direct user permissions (via `user_permission` table)

### Database Schema
Key tables: `user`, `role`, `permission`, `team`, `invitation`
- Users have a single role (`roleId`)
- Roles have many permissions via `role_permission` junction
- Users can have additional direct permissions via `user_permission`
- Teams link to users via `team_member` junction
- Soft deletes use `deletedAt` column

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
