-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "typeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "buildingId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Room_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "RoomType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("buildingId", "capacity", "createdAt", "createdBy", "deletedAt", "floor", "id", "isActive", "isDeleted", "name", "typeId", "updatedAt", "updatedBy") SELECT "buildingId", "capacity", "createdAt", "createdBy", "deletedAt", "floor", "id", "isActive", "isDeleted", "name", "typeId", "updatedAt", "updatedBy" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");
CREATE INDEX "Room_typeId_idx" ON "Room"("typeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
