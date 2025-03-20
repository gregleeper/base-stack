/*
  Warnings:

  - Added the required column `typeId` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- Insert default room types
INSERT INTO "RoomType" ("id", "name", "description")
VALUES
    ('OTHER', 'Other', 'Default room type for existing rooms'),
    ('MEETING_ROOM', 'Meeting Room', 'Room for meetings and discussions'),
    ('CONFERENCE_ROOM', 'Conference Room', 'Large room for conferences and presentations'),
    ('CLASSROOM', 'Classroom', 'Standard classroom for teaching'),
    ('COMPUTER_LAB', 'Computer Lab', 'Lab with computers for technical work'),
    ('SCIENCE_LAB', 'Science Lab', 'Lab for scientific experiments'),
    ('GYMNASIUM', 'Gymnasium', 'Large room for physical activities'),
    ('FITNESS_ROOM', 'Fitness Room', 'Room with fitness equipment'),
    ('BOARD_ROOM', 'Board Room', 'Formal meeting room for executives'),
    ('LECTURE_HALL', 'Lecture Hall', 'Large room for lectures'),
    ('AUDITORIUM', 'Auditorium', 'Large room for performances or presentations'),
    ('CAFETERIA', 'Cafeteria', 'Room for eating and socializing'),
    ('KITCHEN', 'Kitchen', 'Room for food preparation'),
    ('SWIMMING_POOL', 'Swimming Pool', 'Pool for swimming activities');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "typeId" TEXT NOT NULL DEFAULT 'OTHER',
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
INSERT INTO "new_Room" ("buildingId", "capacity", "createdAt", "createdBy", "deletedAt", "floor", "id", "isActive", "isDeleted", "name", "updatedAt", "updatedBy") SELECT "buildingId", "capacity", "createdAt", "createdBy", "deletedAt", "floor", "id", "isActive", "isDeleted", "name", "updatedAt", "updatedBy" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");
CREATE INDEX "Room_typeId_idx" ON "Room"("typeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_name_key" ON "RoomType"("name");

-- CreateIndex
CREATE INDEX "RoomType_name_idx" ON "RoomType"("name");
