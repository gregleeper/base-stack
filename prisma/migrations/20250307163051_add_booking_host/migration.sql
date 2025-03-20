-- CreateTable
CREATE TABLE "BookingHost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingHost_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "AttendanceStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "BookingHost_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "statusId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingCategoryId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "openEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "isAfterHours" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Booking_bookingCategoryId_fkey" FOREIGN KEY ("bookingCategoryId") REFERENCES "BookingCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "BookingStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("bookingCategoryId", "createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "statusId", "title", "updatedAt", "updatedBy", "userId") SELECT "bookingCategoryId", "createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "statusId", "title", "updatedAt", "updatedBy", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_roomId_startTime_endTime_idx" ON "Booking"("roomId", "startTime", "endTime");
CREATE INDEX "Booking_statusId_idx" ON "Booking"("statusId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BookingHost_statusId_idx" ON "BookingHost"("statusId");

-- CreateIndex
CREATE INDEX "BookingHost_bookingId_idx" ON "BookingHost"("bookingId");

-- CreateIndex
CREATE INDEX "BookingHost_userId_idx" ON "BookingHost"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingHost_bookingId_userId_key" ON "BookingHost"("bookingId", "userId");
