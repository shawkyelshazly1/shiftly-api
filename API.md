# Shiftly API Reference

Base URL: `/api/v1`

All routes (except `/invitations/accept`) require authentication via session cookie.

---

## Health

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/health` | No | - |

**Response:** `{ status, timestamp, version }`

---

## Permissions

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/permissions` | Yes | - |
| GET | `/permissions/me` | Yes | - |

### GET /permissions
Returns all available permissions (for role/user forms).

**Response:** `Permission[]`

### GET /permissions/me
Returns current user's permissions (for client-side caching).

**Response:**
```ts
{
  permissions: string[]      // Combined permissions
  roleId: string
  rolePermissions: string[]  // From role
  directPermissions: string[] // Assigned directly
}
```

---

## Users

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/users` | Yes | `users:read` |
| GET | `/users/count` | Yes | `users:read` |
| GET | `/users/:id` | Yes | `users:read` |
| POST | `/users` | Yes | `users:create` |
| POST | `/users/bulk` | Yes | `users:create` |
| PATCH | `/users/:id` | Yes | `users:update` |
| DELETE | `/users/:id` | Yes | `users:delete` |

### GET /users
List all users with roles.

**Query Parameters (optional):**
- `page` - Page number
- `pageSize` - Items per page
- `search` - Search term
- `sortBy` - Column to sort by
- `sortOrder` - "asc" or "desc"
- `roleId` - Filter by role ID
- `teamId` - Filter by team ID

**Response:** `User[]` with `{ id, name, email, emailVerified, image, roleId, roleName, invitationStatus, invitationExpiresAt, createdAt, updatedAt }`

When pagination params provided, returns `{ data: User[], pagination: { page, pageSize, total, totalPages } }`

### GET /users/count
Get global user counts.

**Response:** `{ total: number, verified: number }`

### GET /users/:id
Get user by ID with role and direct permissions.

**Response:** User with `directPermissions: Permission[]`

### POST /users
Create single user. Sends invitation email.

**Body:**
```ts
{
  email: string
  name: string
  roleId: string
}
```

**Response:** Created `User` object

### POST /users/bulk
Create multiple users. Sends invitation emails.

**Body:**
```ts
{
  users: Array<{ email: string, name: string, roleId: string }>
}
```

**Response:** `User[]` - Array of created users

### PATCH /users/:id
Update user's role and/or direct permissions.

**Body:**
```ts
{
  roleId?: string
  directPermissionIds?: string[]
}
```

**Response:** Updated `User` with `directPermissions: Permission[]`

### DELETE /users/:id
Soft delete user.

**Response:** `{ success: true }`

---

## Roles

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/roles` | Yes | `roles:read` |
| GET | `/roles/:id` | Yes | `roles:read` |
| POST | `/roles` | Yes | `roles:create` |
| PATCH | `/roles/:id` | Yes | `roles:update` |
| DELETE | `/roles/:id` | Yes | `roles:delete` |

### GET /roles
List all roles with their permissions.

**Response:** `Role[]` with `permissions: Permission[]`

### GET /roles/:id
Get role by ID with permissions.

**Response:** Role with `permissions: Permission[]`

### POST /roles
Create new role.

**Body:**
```ts
{
  name: string
  description: string
  permissionIds?: string[]
  isSystem?: boolean
  isDefault?: boolean
}
```

**Response:** Role with `permissions: Permission[]`

### PATCH /roles/:id
Update role.

**Body:** Same as POST (all fields optional)

**Response:** Updated role with `permissions: Permission[]`

### DELETE /roles/:id
Soft delete role. Cannot delete system roles.

**Response:** `{ success: true }`

---

## Teams

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/teams` | Yes | `teams:read` |
| GET | `/teams/count` | Yes | `teams:read` |
| GET | `/teams/:id` | Yes | `teams:read` + `users:read` |
| POST | `/teams` | Yes | `teams:create` |
| PATCH | `/teams/:id` | Yes | `teams:update` + `users:update` |
| DELETE | `/teams/:id` | Yes | `teams:delete` |
| POST | `/teams/:id/members` | Yes | `teams:update` |
| POST | `/teams/:id/members/remove` | Yes | `teams:update` |

### GET /teams
List all teams.

### GET /teams/count
Get global team count.

**Response:** `{ total: number }`

**Response:** `Team[]`

### GET /teams/:id
Get team by ID with members.

**Response:** Team with `users: TeamMember[]`

### POST /teams
Create new team.

**Body:**
```ts
{
  name: string
  description?: string
  teamMemberIds?: string[]
}
```

**Response:** Team with `addMembersCount: number`

### PATCH /teams/:id
Update team.

**Body:**
```ts
{
  name?: string
  description?: string
}
```

**Response:** Updated `Team[]`

### DELETE /teams/:id
Soft delete team.

**Response:** `{ success: true }`

### POST /teams/:id/members
Add members to team.

**Body:**
```ts
{
  teamMembersIds: string[]
}
```

**Response:** Updated team with members

### POST /teams/:id/members/remove
Remove members from team.

**Body:**
```ts
{
  teamMembersIds: string[]
}
```

**Response:** `{ success: true }`

---

## Invitations

| Method | Endpoint | Auth | Permission |
|--------|----------|------|------------|
| GET | `/invitations` | Yes | `users:*` |
| POST | `/invitations/accept?token=` | No | - |
| POST | `/invitations/:userId/resend` | Yes | `users:*` |
| POST | `/invitations/:userId/cancel` | Yes | `users:*` |

### GET /invitations
List all invitations with role and user data.

**Response:** `Invitation[]` with `role: Role, user: User`

### POST /invitations/accept
Accept invitation (public endpoint).

**Query:** `token` - Invitation token

**Response:** `{ success: true }`

### POST /invitations/:userId/resend
Resend invitation email. Invalidates previous invitation.

**Response:** `{ success: true }`

### POST /invitations/:userId/cancel
Cancel pending invitation.

**Response:** `{ success: true }`

---

## Error Responses

```ts
// Bad request - validation (400)
{ error: "Name & description are required" }
{ error: "Name is required" }

// Unauthorized (401)
{ error: "Unauthorized", code: "UNAUTHORIZED" }

// No role assigned (403)
{ error: "No role assigned", code: "NO_ROLE" }

// Insufficient permissions (403)
{ error: "Forbidden", code: "INSUFFICIENT_PERMISSIONS", required: string[] }
// Or when any permission matches:
{ error: "Forbidden", code: "INSUFFICIENT_PERMISSIONS", requiredAny: string[] }

// Not found (404)
{ error: "User not found" }
{ error: "Role not found" }
{ error: "Team not found" }

// Business logic error (400)
{ error: "Role exists already with same name" }
{ error: "Cannot delete system role" }

// Server error (500)
{ error: "Unable to ...", code?: "INTERNAL_ERROR" }
```
