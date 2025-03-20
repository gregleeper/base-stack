/*
  Warnings:

  - Added the required column `bookingCategoryId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "BookingCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "statusId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingCategoryId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Booking_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "BookingStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookingCategoryId_fkey" FOREIGN KEY ("bookingCategoryId") REFERENCES "BookingCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "statusId", "title", "updatedAt", "updatedBy", "userId") SELECT "createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "statusId", "title", "updatedAt", "updatedBy", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_roomId_startTime_endTime_idx" ON "Booking"("roomId", "startTime", "endTime");
CREATE INDEX "Booking_statusId_idx" ON "Booking"("statusId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BookingCategory_name_key" ON "BookingCategory"("name");
