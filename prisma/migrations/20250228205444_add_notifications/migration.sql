/*
  Warnings:

  - You are about to drop the column `status` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `BookingApproval` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `BookingParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Building` table. All the data in the column will be lost.
  - You are about to drop the column `dayOfWeek` on the `RecurringBooking` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `RecurringBooking` table. All the data in the column will be lost.
  - You are about to drop the column `dayOfWeek` on the `RoomAvailability` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `statusId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `BookingApproval` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `BookingParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Building` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequencyId` to the `RecurringBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dayOfWeekId` to the `RoomAvailability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "BuildingCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "DayOfWeek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "AttendanceStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "ApprovalStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "BookingStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "RecurringBookingDay" (
    "recurringBookingId" TEXT NOT NULL,
    "dayOfWeekId" TEXT NOT NULL,

    PRIMARY KEY ("recurringBookingId", "dayOfWeekId"),
    CONSTRAINT "RecurringBookingDay_recurringBookingId_fkey" FOREIGN KEY ("recurringBookingId") REFERENCES "RecurringBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringBookingDay_dayOfWeekId_fkey" FOREIGN KEY ("dayOfWeekId") REFERENCES "DayOfWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringFrequency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "NotificationType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "NotificationStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "NotificationPriority" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "DeliveryMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "DeliveryStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" DATETIME,
    "sentAt" DATETIME,
    "typeId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "priorityId" TEXT NOT NULL,
    "bookingId" TEXT,
    "approvalId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Notification_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "NotificationType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "NotificationStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "NotificationPriority" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Notification_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "BookingApproval" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME,
    "deliveryStatusId" TEXT NOT NULL,
    CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "NotificationRecipient_deliveryStatusId_fkey" FOREIGN KEY ("deliveryStatusId") REFERENCES "DeliveryStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationRecipientMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "deliveryMethodId" TEXT NOT NULL,
    CONSTRAINT "NotificationRecipientMethod_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "NotificationRecipient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationRecipientMethod_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "notificationTypeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "UserNotificationPreference_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "NotificationType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreferenceDeliveryMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferenceId" TEXT NOT NULL,
    "deliveryMethodId" TEXT NOT NULL,
    CONSTRAINT "UserPreferenceDeliveryMethod_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "UserNotificationPreference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPreferenceDeliveryMethod_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Booking_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "BookingStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "title", "updatedAt", "updatedBy", "userId") SELECT "createdAt", "createdBy", "deletedAt", "description", "endTime", "id", "isDeleted", "roomId", "startTime", "title", "updatedAt", "updatedBy", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_roomId_startTime_endTime_idx" ON "Booking"("roomId", "startTime", "endTime");
CREATE INDEX "Booking_statusId_idx" ON "Booking"("statusId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE TABLE "new_BookingApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingApproval_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "BookingApproval_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ApprovalStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BookingApproval" ("approverId", "bookingId", "createdAt", "id", "notes", "updatedAt") SELECT "approverId", "bookingId", "createdAt", "id", "notes", "updatedAt" FROM "BookingApproval";
DROP TABLE "BookingApproval";
ALTER TABLE "new_BookingApproval" RENAME TO "BookingApproval";
CREATE INDEX "BookingApproval_bookingId_idx" ON "BookingApproval"("bookingId");
CREATE INDEX "BookingApproval_approverId_idx" ON "BookingApproval"("approverId");
CREATE INDEX "BookingApproval_statusId_idx" ON "BookingApproval"("statusId");
CREATE TABLE "new_BookingEquipment" (
    "bookingId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("bookingId", "equipmentId"),
    CONSTRAINT "BookingEquipment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BookingEquipment" ("bookingId", "createdAt", "equipmentId", "quantity", "updatedAt") SELECT "bookingId", "createdAt", "equipmentId", "quantity", "updatedAt" FROM "BookingEquipment";
DROP TABLE "BookingEquipment";
ALTER TABLE "new_BookingEquipment" RENAME TO "BookingEquipment";
CREATE INDEX "BookingEquipment_bookingId_idx" ON "BookingEquipment"("bookingId");
CREATE INDEX "BookingEquipment_equipmentId_idx" ON "BookingEquipment"("equipmentId");
CREATE TABLE "new_BookingParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "BookingParticipant_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "AttendanceStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BookingParticipant" ("bookingId", "createdAt", "id", "updatedAt", "userId") SELECT "bookingId", "createdAt", "id", "updatedAt", "userId" FROM "BookingParticipant";
DROP TABLE "BookingParticipant";
ALTER TABLE "new_BookingParticipant" RENAME TO "BookingParticipant";
CREATE INDEX "BookingParticipant_statusId_idx" ON "BookingParticipant"("statusId");
CREATE INDEX "BookingParticipant_bookingId_idx" ON "BookingParticipant"("bookingId");
CREATE INDEX "BookingParticipant_userId_idx" ON "BookingParticipant"("userId");
CREATE UNIQUE INDEX "BookingParticipant_bookingId_userId_key" ON "BookingParticipant"("bookingId", "userId");
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "floors" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Building_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BuildingCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Building" ("address", "createdAt", "createdBy", "deletedAt", "floors", "id", "isDeleted", "name", "updatedAt", "updatedBy") SELECT "address", "createdAt", "createdBy", "deletedAt", "floors", "id", "isDeleted", "name", "updatedAt", "updatedBy" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
CREATE INDEX "Building_categoryId_idx" ON "Building"("categoryId");
CREATE TABLE "new_RecurringBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "frequencyId" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "RecurringBooking_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "RecurringFrequency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RecurringBooking" ("createdAt", "createdBy", "deletedAt", "description", "endDate", "endTime", "id", "interval", "isDeleted", "roomId", "startDate", "startTime", "title", "updatedAt", "updatedBy", "userId") SELECT "createdAt", "createdBy", "deletedAt", "description", "endDate", "endTime", "id", "interval", "isDeleted", "roomId", "startDate", "startTime", "title", "updatedAt", "updatedBy", "userId" FROM "RecurringBooking";
DROP TABLE "RecurringBooking";
ALTER TABLE "new_RecurringBooking" RENAME TO "RecurringBooking";
CREATE INDEX "RecurringBooking_roomId_idx" ON "RecurringBooking"("roomId");
CREATE INDEX "RecurringBooking_userId_idx" ON "RecurringBooking"("userId");
CREATE INDEX "RecurringBooking_frequencyId_idx" ON "RecurringBooking"("frequencyId");
CREATE TABLE "new_RoomAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "dayOfWeekId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "RoomAvailability_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomAvailability_dayOfWeekId_fkey" FOREIGN KEY ("dayOfWeekId") REFERENCES "DayOfWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RoomAvailability" ("createdAt", "createdBy", "endTime", "id", "roomId", "startTime", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "endTime", "id", "roomId", "startTime", "updatedAt", "updatedBy" FROM "RoomAvailability";
DROP TABLE "RoomAvailability";
ALTER TABLE "new_RoomAvailability" RENAME TO "RoomAvailability";
CREATE INDEX "RoomAvailability_roomId_idx" ON "RoomAvailability"("roomId");
CREATE INDEX "RoomAvailability_dayOfWeekId_idx" ON "RoomAvailability"("dayOfWeekId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "UserRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "createdBy", "deletedAt", "email", "id", "isDeleted", "name", "password", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "deletedAt", "email", "id", "isDeleted", "name", "password", "updatedAt", "updatedBy" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_name_key" ON "UserRole"("name");

-- CreateIndex
CREATE INDEX "UserRole_name_idx" ON "UserRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BuildingCategory_name_key" ON "BuildingCategory"("name");

-- CreateIndex
CREATE INDEX "BuildingCategory_name_idx" ON "BuildingCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeek_name_key" ON "DayOfWeek"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeek_value_key" ON "DayOfWeek"("value");

-- CreateIndex
CREATE INDEX "DayOfWeek_name_idx" ON "DayOfWeek"("name");

-- CreateIndex
CREATE INDEX "DayOfWeek_value_idx" ON "DayOfWeek"("value");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceStatus_name_key" ON "AttendanceStatus"("name");

-- CreateIndex
CREATE INDEX "AttendanceStatus_name_idx" ON "AttendanceStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStatus_name_key" ON "ApprovalStatus"("name");

-- CreateIndex
CREATE INDEX "ApprovalStatus_name_idx" ON "ApprovalStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BookingStatus_name_key" ON "BookingStatus"("name");

-- CreateIndex
CREATE INDEX "BookingStatus_name_idx" ON "BookingStatus"("name");

-- CreateIndex
CREATE INDEX "RecurringBookingDay_recurringBookingId_idx" ON "RecurringBookingDay"("recurringBookingId");

-- CreateIndex
CREATE INDEX "RecurringBookingDay_dayOfWeekId_idx" ON "RecurringBookingDay"("dayOfWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringFrequency_name_key" ON "RecurringFrequency"("name");

-- CreateIndex
CREATE INDEX "RecurringFrequency_name_idx" ON "RecurringFrequency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationType_name_key" ON "NotificationType"("name");

-- CreateIndex
CREATE INDEX "NotificationType_name_idx" ON "NotificationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationStatus_name_key" ON "NotificationStatus"("name");

-- CreateIndex
CREATE INDEX "NotificationStatus_name_idx" ON "NotificationStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPriority_name_key" ON "NotificationPriority"("name");

-- CreateIndex
CREATE INDEX "NotificationPriority_name_idx" ON "NotificationPriority"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryMethod_name_key" ON "DeliveryMethod"("name");

-- CreateIndex
CREATE INDEX "DeliveryMethod_name_idx" ON "DeliveryMethod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStatus_name_key" ON "DeliveryStatus"("name");

-- CreateIndex
CREATE INDEX "DeliveryStatus_name_idx" ON "DeliveryStatus"("name");

-- CreateIndex
CREATE INDEX "Notification_typeId_idx" ON "Notification"("typeId");

-- CreateIndex
CREATE INDEX "Notification_statusId_idx" ON "Notification"("statusId");

-- CreateIndex
CREATE INDEX "Notification_priorityId_idx" ON "Notification"("priorityId");

-- CreateIndex
CREATE INDEX "Notification_bookingId_idx" ON "Notification"("bookingId");

-- CreateIndex
CREATE INDEX "Notification_approvalId_idx" ON "Notification"("approvalId");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_idx" ON "NotificationRecipient"("userId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_deliveryStatusId_idx" ON "NotificationRecipient"("deliveryStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "NotificationRecipientMethod_recipientId_idx" ON "NotificationRecipientMethod"("recipientId");

-- CreateIndex
CREATE INDEX "NotificationRecipientMethod_deliveryMethodId_idx" ON "NotificationRecipientMethod"("deliveryMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipientMethod_recipientId_deliveryMethodId_key" ON "NotificationRecipientMethod"("recipientId", "deliveryMethodId");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_notificationTypeId_idx" ON "UserNotificationPreference"("notificationTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_notificationTypeId_key" ON "UserNotificationPreference"("userId", "notificationTypeId");

-- CreateIndex
CREATE INDEX "UserPreferenceDeliveryMethod_preferenceId_idx" ON "UserPreferenceDeliveryMethod"("preferenceId");

-- CreateIndex
CREATE INDEX "UserPreferenceDeliveryMethod_deliveryMethodId_idx" ON "UserPreferenceDeliveryMethod"("deliveryMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceDeliveryMethod_preferenceId_deliveryMethodId_key" ON "UserPreferenceDeliveryMethod"("preferenceId", "deliveryMethodId");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE INDEX "RoomEquipment_roomId_idx" ON "RoomEquipment"("roomId");

-- CreateIndex
CREATE INDEX "RoomEquipment_equipmentId_idx" ON "RoomEquipment"("equipmentId");

-- CreateIndex
CREATE INDEX "RoomFeatures_roomId_idx" ON "RoomFeatures"("roomId");

-- CreateIndex
CREATE INDEX "RoomFeatures_featureId_idx" ON "RoomFeatures"("featureId");
