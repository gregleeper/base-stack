/*
  Warnings:

  - You are about to drop the column `resourceId` on the `ResourceAccess` table. All the data in the column will be lost.
  - Added the required column `roomId` to the `ResourceAccess` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResourceAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userGroupId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canBook" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "ResourceAccess_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceAccess_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ResourceAccess" ("canApprove", "canBook", "canManage", "canView", "createdAt", "createdBy", "id", "resourceType", "updatedAt", "updatedBy", "userGroupId") SELECT "canApprove", "canBook", "canManage", "canView", "createdAt", "createdBy", "id", "resourceType", "updatedAt", "updatedBy", "userGroupId" FROM "ResourceAccess";
DROP TABLE "ResourceAccess";
ALTER TABLE "new_ResourceAccess" RENAME TO "ResourceAccess";
CREATE INDEX "ResourceAccess_userGroupId_idx" ON "ResourceAccess"("userGroupId");
CREATE INDEX "ResourceAccess_resourceType_roomId_idx" ON "ResourceAccess"("resourceType", "roomId");
CREATE UNIQUE INDEX "ResourceAccess_userGroupId_resourceType_roomId_key" ON "ResourceAccess"("userGroupId", "resourceType", "roomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
