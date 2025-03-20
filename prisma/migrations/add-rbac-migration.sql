-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoleToPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoleToPermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "UserRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleToPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE INDEX "Permission_action_entity_access_idx" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE UNIQUE INDEX "RoleToPermission_roleId_permissionId_key" ON "RoleToPermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "RoleToPermission_roleId_idx" ON "RoleToPermission"("roleId");

-- CreateIndex
CREATE INDEX "RoleToPermission_permissionId_idx" ON "RoleToPermission"("permissionId");