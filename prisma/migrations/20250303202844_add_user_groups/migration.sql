-- CreateTable
CREATE TABLE "UserGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "UserGroupMember" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    PRIMARY KEY ("userId", "groupId"),
    CONSTRAINT "UserGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userGroupId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canBook" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "ResourceAccess_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_name_key" ON "UserGroup"("name");

-- CreateIndex
CREATE INDEX "UserGroup_name_idx" ON "UserGroup"("name");

-- CreateIndex
CREATE INDEX "UserGroupMember_userId_idx" ON "UserGroupMember"("userId");

-- CreateIndex
CREATE INDEX "UserGroupMember_groupId_idx" ON "UserGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "ResourceAccess_userGroupId_idx" ON "ResourceAccess"("userGroupId");

-- CreateIndex
CREATE INDEX "ResourceAccess_resourceType_resourceId_idx" ON "ResourceAccess"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccess_userGroupId_resourceType_resourceId_key" ON "ResourceAccess"("userGroupId", "resourceType", "resourceId");
