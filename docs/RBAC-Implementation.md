# RBAC Implementation Guide

This document explains the Role-Based Access Control (RBAC) system implemented in this application, based on the Epic Stack's permissions model.

## Overview

The RBAC system consists of three main components:

1. **Roles**: Represent a group of permissions (e.g., "admin", "user", "moderator")
2. **Permissions**: Fine-grained control over actions on entities (e.g., "create:user", "read:note:own")
3. **User-Role Relationships**: Users are assigned roles that determine their permissions

## Schema Changes

The following models have been added to the Prisma schema:

### Permission Model

```prisma
model Permission {
  id          String             @id @default(uuid())
  action      String             // create, read, update, delete
  entity      String             // user, note, etc.
  access      String             // own, any, etc.
  description String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  roles       RoleToPermission[]

  @@unique([action, entity, access])
  @@index([action, entity, access])
}
```

### RoleToPermission Model (Many-to-Many)

```prisma
model RoleToPermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String
  role         UserRole   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}
```

### Updated UserRole Model

```prisma
model UserRole {
  id          String             @id @default(uuid())
  name        String             @unique
  description String?
  users       User[]
  permissions RoleToPermission[]

  @@index([name])
}
```

## Permission Format

Permissions follow this format: `action:entity[:access]`

- **action**: What the user is trying to do (create, read, update, delete)
- **entity**: What the user is trying to act on (user, note, etc.)
- **access** (optional): The scope of access (own, any)

Examples:
- `create:user:any` - Create any user
- `read:note:own` - Read own notes
- `update:user:own` - Update own user profile
- `delete:note:any` - Delete any note

## Migration Steps

To implement the RBAC system:

1. Apply the schema changes:
   ```bash
   npx prisma migrate dev --name add-rbac
   ```

2. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

3. Update the permissions.server.ts file:
   - Remove the commented code
   - Uncomment the seedPermissions function

4. Run the seed function to create default permissions and roles:
   ```bash
   npx prisma db seed
   ```

## API

The following functions are available for permission checks:

### Client-Side

```typescript
import { userHasPermission, userHasRole } from '~/utils/user';

// Check if user has permission
if (userHasPermission(user, 'read:note:own')) {
  // User can read their own notes
}

// Check if user has role
if (userHasRole(user, 'admin')) {
  // User is an admin
}
```

### Server-Side

```typescript
import { requireUserPermission, userHasPermission, userHasRole } from '~/utils/permissions.server';

// Require permission or throw error
await requireUserPermission(user, 'update:user:own');

// Check if user has permission
const canDeleteAnyUser = await userHasPermission(user, 'delete:user:any');

// Check if user has role
const isAdmin = await userHasRole(user, 'admin');
```

## Best Practices

1. **Always check permissions** before performing sensitive operations
2. Use the most restrictive permission needed for the task
3. Prefer checking permissions over checking roles
4. Create custom entities and actions as needed for your application

## Resources

- [Epic Stack Permissions Documentation](https://github.com/epicweb-dev/epic-stack/blob/main/docs/decisions/028-permissions-rbac.md)
- [RBAC vs. ABAC](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)