# Schema Improvements Implementation Guide

This document explains how we've implemented all the suggested improvements from our schema analysis and provides guidance on migration and service updates.

## Implemented Improvements

We've successfully implemented all eight suggested improvements to our database schema:

1. **RecurringBooking Relations** ✅
   - Added proper relations between RecurringBooking and the Room/User models
   - Rooms can now easily access all recurring bookings

2. **Room Features as Native Model** ✅
   - Created a dedicated `RoomFeature` model instead of using JSON strings
   - Implemented a many-to-many relationship with the `RoomFeatures` join table

3. **Participants in Bookings** ✅
   - Added a `BookingParticipant` model for tracking meeting attendees
   - Includes status (PENDING, ACCEPTED, DECLINED, TENTATIVE)

4. **Equipment/Resources** ✅
   - Added an `Equipment` model for bookable resources
   - Created relationships to both rooms and bookings

5. **Soft Delete** ✅
   - Added `isDeleted` boolean and `deletedAt` timestamp to all major models
   - Allows for data preservation and recovery

6. **Audit Trail** ✅
   - Added `createdBy` and `updatedBy` fields to track user actions
   - Applies to all major models for complete accountability

7. **Room Availability Scheduler** ✅
   - Added a `RoomAvailability` model for room-specific operating hours
   - Supports different availability by day of week

8. **Approval Workflow** ✅
   - Added a `BookingApproval` model with approval status tracking
   - Supports notes for approval/rejection reasons

## Migration Steps

To migrate your existing data to the new schema, you'll need to run several steps:

1. **Create Migration**:
   ```bash
   npx prisma migrate dev --name implement_schema_improvements
   ```

2. **Data Migration Considerations**:
   - The `features` field in the `Room` model has changed from a JSON string to a relation
   - You'll need a data migration script to:
     - Parse existing JSON features
     - Create corresponding `RoomFeature` records
     - Create `RoomFeatures` join records

3. **Sample Migration Script**:
   ```typescript
   // migrations/scripts/migrate-room-features.ts
   import { PrismaClient } from '@prisma/client';
   import { parseJsonField } from '../../app/services/db.server';

   const prisma = new PrismaClient();

   async function migrateRoomFeatures() {
     // Get all rooms with their features
     const rooms = await prisma.room.findMany();

     // Process each room
     for (const room of rooms) {
       const featureNames = parseJsonField<string[]>(room.features) || [];

       // For each feature, ensure it exists in the RoomFeature table
       for (const name of featureNames) {
         // Create feature if it doesn't exist
         let feature = await prisma.roomFeature.findUnique({
           where: { name }
         });

         if (!feature) {
           feature = await prisma.roomFeature.create({
             data: { name }
           });
         }

         // Create the relationship
         await prisma.roomFeatures.create({
           data: {
             roomId: room.id,
             featureId: feature.id
           }
         });
       }
     }

     console.log('Room features migration completed!');
   }

   migrateRoomFeatures()
     .catch(e => {
       console.error('Error during migration:', e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });
   ```

## Service Updates

With these schema changes, you'll need to update your services. Here are key changes required:

### Room Service Updates

```typescript
// Update to room.server.ts to work with the new schema

import { prisma } from './db.server';
import type { RoomFeature } from '@prisma/client';

export async function getRooms(options?: {
  buildingId?: string;
  capacity?: number;
  features?: string[]; // Now taking feature names instead of enum
  isActive?: boolean;
  includeDeleted?: boolean;
}) {
  const { buildingId, capacity, features, isActive = true, includeDeleted = false } = options || {};

  // Base query
  const whereClause: any = {
    buildingId: buildingId ? buildingId : undefined,
    capacity: capacity ? { gte: capacity } : undefined,
    isActive,
  };

  // Handle soft delete
  if (!includeDeleted) {
    whereClause.isDeleted = false;
  }

  // If features are requested, use a different approach
  if (features && features.length > 0) {
    return prisma.room.findMany({
      where: {
        ...whereClause,
        features: {
          some: {
            feature: {
              name: {
                in: features
              }
            }
          }
        }
      },
      include: {
        building: true,
        features: {
          include: {
            feature: true
          }
        },
        equipment: {
          include: {
            equipment: true
          }
        },
        availabilityHours: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Standard query without feature filtering
  return prisma.room.findMany({
    where: whereClause,
    include: {
      building: true,
      features: {
        include: {
          feature: true
        }
      },
      equipment: {
        include: {
          equipment: true
        }
      },
      availabilityHours: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function getRoomById(id: string, includeDeleted = false) {
  return prisma.room.findFirst({
    where: {
      id,
      isDeleted: includeDeleted ? undefined : false
    },
    include: {
      building: true,
      features: {
        include: {
          feature: true
        }
      },
      equipment: {
        include: {
          equipment: true
        }
      },
      availabilityHours: true,
    },
  });
}

export async function createRoom(data: {
  name: string;
  buildingId: string;
  floor: number;
  capacity: number;
  features: string[]; // Feature names
  equipment?: string[]; // Equipment IDs
  isActive?: boolean;
  createdBy: string; // User ID who's creating
}) {
  const { features, equipment, ...roomData } = data;

  // Find or create features
  const featureConnections = await Promise.all(
    features.map(async (featureName) => {
      let feature = await prisma.roomFeature.findUnique({
        where: { name: featureName }
      });

      if (!feature) {
        feature = await prisma.roomFeature.create({
          data: { name: featureName }
        });
      }

      return { featureId: feature.id };
    })
  );

  // Create equipment connections if provided
  const equipmentConnections = equipment
    ? equipment.map(equipmentId => ({ equipmentId }))
    : [];

  // Create the room with all connections
  return prisma.room.create({
    data: {
      ...roomData,
      features: {
        create: featureConnections
      },
      equipment: {
        create: equipmentConnections
      }
    },
    include: {
      building: true,
      features: {
        include: {
          feature: true
        }
      },
      equipment: {
        include: {
          equipment: true
        }
      }
    },
  });
}

export async function updateRoom(
  id: string,
  data: Partial<{
    name: string;
    floor: number;
    capacity: number;
    features: string[]; // Feature names
    equipment: string[]; // Equipment IDs
    isActive: boolean;
    updatedBy: string; // User ID who's updating
  }>
) {
  const { features, equipment, ...roomData } = data;

  // Start a transaction to handle the complex update
  return prisma.$transaction(async (tx) => {
    // Update the basic room data
    const updatedRoom = await tx.room.update({
      where: { id },
      data: {
        ...roomData,
        updatedAt: new Date()
      }
    });

    // If features are provided, update them
    if (features) {
      // Remove existing features
      await tx.roomFeatures.deleteMany({
        where: { roomId: id }
      });

      // Add the new features
      for (const featureName of features) {
        let feature = await tx.roomFeature.findUnique({
          where: { name: featureName }
        });

        if (!feature) {
          feature = await tx.roomFeature.create({
            data: { name: featureName }
          });
        }

        await tx.roomFeatures.create({
          data: {
            roomId: id,
            featureId: feature.id
          }
        });
      }
    }

    // If equipment is provided, update it
    if (equipment) {
      // Remove existing equipment
      await tx.roomEquipment.deleteMany({
        where: { roomId: id }
      });

      // Add the new equipment
      for (const equipmentId of equipment) {
        await tx.roomEquipment.create({
          data: {
            roomId: id,
            equipmentId
          }
        });
      }
    }

    // Return the updated room with all relations
    return tx.room.findUnique({
      where: { id },
      include: {
        building: true,
        features: {
          include: {
            feature: true
          }
        },
        equipment: {
          include: {
            equipment: true
          }
        },
        availabilityHours: true,
      }
    });
  });
}

export async function deleteRoom(id: string, userId: string, hardDelete = false) {
  if (hardDelete) {
    // Hard delete - completely remove the room
    return prisma.room.delete({
      where: { id },
    });
  } else {
    // Soft delete - mark as deleted
    return prisma.room.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: userId
      }
    });
  }
}

// New methods for features and equipment

export async function getAllRoomFeatures() {
  return prisma.roomFeature.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function getRoomAvailability(roomId: string) {
  return prisma.roomAvailability.findMany({
    where: { roomId },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
}

export async function setRoomAvailability(
  roomId: string,
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    // Remove existing schedules
    await tx.roomAvailability.deleteMany({
      where: { roomId }
    });

    // Add new schedules
    for (const schedule of schedules) {
      await tx.roomAvailability.create({
        data: {
          roomId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          createdBy: userId
        }
      });
    }

    return tx.roomAvailability.findMany({
      where: { roomId }
    });
  });
}
```

### Booking Service Updates

```typescript
// Sample updates for booking.server.ts

// Add a function to manage booking participants
export async function addParticipantToBooking(
  bookingId: string,
  userId: string,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' = 'PENDING'
) {
  return prisma.bookingParticipant.upsert({
    where: {
      bookingId_userId: {
        bookingId,
        userId
      }
    },
    update: {
      status
    },
    create: {
      bookingId,
      userId,
      status
    }
  });
}

// Add a function to handle booking approvals
export async function submitBookingApproval(
  bookingId: string,
  approverId: string,
  status: 'APPROVED' | 'REJECTED',
  notes?: string
) {
  const approval = await prisma.bookingApproval.create({
    data: {
      bookingId,
      approverId,
      status,
      notes
    }
  });

  // If approved or rejected, update the booking status
  if (status === 'APPROVED') {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' }
    });
  } else if (status === 'REJECTED') {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' }
    });
  }

  return approval;
}

// Add a function to handle equipment booking
export async function addEquipmentToBooking(
  bookingId: string,
  equipmentId: string,
  quantity: number = 1
) {
  return prisma.bookingEquipment.upsert({
    where: {
      bookingId_equipmentId: {
        bookingId,
        equipmentId
      }
    },
    update: {
      quantity
    },
    create: {
      bookingId,
      equipmentId,
      quantity
    }
  });
}
```

## SQL Server Compatibility

Since our production environment will use Microsoft SQL Server, which doesn't support Prisma enums natively, we need to update our schema to use reference tables instead. This section outlines the changes required for SQL Server compatibility.

### Converting Enums to Reference Tables

For each enum in our schema, we'll create a corresponding reference table:

```prisma
// BEFORE: Using enum for BookingStatus
enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

// AFTER: Using reference table for BookingStatus
model BookingStatus {
  id          String    @id @default(uuid())
  name        String    @unique // PENDING, CONFIRMED, CANCELLED, COMPLETED
  description String?

  // Relations
  bookings    Booking[]
}
```

### Updating Related Models

Models that previously used enums will need to be updated to reference these tables:

```prisma
// BEFORE: Using enum directly
model Booking {
  id        String        @id @default(uuid())
  status    BookingStatus // Enum reference
  // ...other fields
}

// AFTER: Using reference table
model Booking {
  id        String    @id @default(uuid())
  statusId  String
  status    BookingStatus @relation(fields: [statusId], references: [id])
  // ...other fields
}
```

### Seeding Reference Tables

We'll need to seed these reference tables with predefined values:

```typescript
// Example seed data script
async function seedReferenceData() {
  // BookingStatus
  const bookingStatuses = [
    { name: 'PENDING', description: 'Booking is awaiting confirmation' },
    { name: 'CONFIRMED', description: 'Booking has been confirmed' },
    { name: 'CANCELLED', description: 'Booking has been cancelled' },
    { name: 'COMPLETED', description: 'Booking has been completed' }
  ];

  for (const status of bookingStatuses) {
    await prisma.bookingStatus.upsert({
      where: { name: status.name },
      update: status,
      create: status
    });
  }

  // Similarly for other reference tables...
}
```

### Helper Functions

To make working with reference tables as easy as working with enums, we'll create helper functions:

```typescript
// Helper to get status ID by name
export async function getBookingStatusId(prisma, name) {
  const status = await prisma.bookingStatus.findUnique({
    where: { name }
  });

  if (!status) {
    throw new Error(`Booking status "${name}" not found`);
  }

  return status.id;
}

// Helper to create a booking with status by name
export async function createBookingWithStatus(prisma, data, statusName = 'PENDING') {
  const statusId = await getBookingStatusId(prisma, statusName);

  return prisma.booking.create({
    data: {
      ...data,
      statusId
    }
  });
}
```

### Performance Considerations

Since using reference tables requires additional joins compared to enums, we need to ensure proper indexing:

```prisma
model Booking {
  id        String    @id @default(uuid())
  statusId  String
  status    BookingStatus @relation(fields: [statusId], references: [id])

  // Add index for better join performance
  @@index([statusId])
}
```

### Complete List of Converted Enums

We'll convert the following enums to reference tables:

1. **UserRole** → UserRole model (ADMIN, USER)
2. **BuildingCategory** → BuildingCategory model (ADMINISTRATIVE, ELEMENTARY, etc.)
3. **AttendanceStatus** → AttendanceStatus model (PENDING, ACCEPTED, DECLINED, TENTATIVE)
4. **ApprovalStatus** → ApprovalStatus model (PENDING, APPROVED, REJECTED)
5. **BookingStatus** → BookingStatus model (PENDING, CONFIRMED, CANCELLED, COMPLETED)
6. **RecurringFrequency** → RecurringFrequency model (DAILY, WEEKLY, MONTHLY)

## Front-End Considerations

## Next Steps

1. **Run the Migration**:
   ```bash
   npx prisma migrate dev --name implement_schema_improvements
   ```

2. **Update Service Files**:
   - Modify all service files to work with the new schema
   - Pay special attention to the room features which changed from JSON to relations

3. **Update Frontend Components**:
   - Modify components to handle the new data structures
   - Add UI for the new features (participant management, equipment booking, etc.)

4. **Test Thoroughly**:
   - Test all CRUD operations with the new schema
   - Verify that soft delete works correctly
   - Test the booking approval workflow

By implementing these improvements, your room scheduling application now has a more robust, scalable, and feature-rich data model that will better support complex business requirements.