# Setting Up the Improved Schema

This guide walks through the steps to set up the enhanced database schema with all eight improvements implemented.

## Prerequisites

- Node.js and npm/pnpm installed
- Prisma CLI (`pnpm add -D prisma`)
- Existing project with the basic schema

## Step 1: Update Schema

The schema has been updated to include all eight improvements:
1. RecurringBooking Relations
2. Room Features as Native Model
3. Participants in Bookings
4. Equipment/Resources
5. Soft Delete
6. Audit Trail
7. Room Availability Scheduler
8. Approval Workflow

The updated schema is in `prisma/schema.prisma`.

## Step 2: Generate Prisma Client

After updating the schema, you need to regenerate the Prisma client:

```bash
npx prisma generate
```

This will create TypeScript types for the new models and relationships.

## Step 3: Run Database Migrations

Create and run a migration to update your database structure:

```bash
npx prisma migrate dev --name implement_schema_improvements
```

This will:
1. Create a migration file in the `prisma/migrations` directory
2. Apply the migration to your development database
3. Regenerate the Prisma client with the updated models

## Step 4: Run Data Migration Script

Since we've changed the room features from a JSON string to a relational model, we need to migrate the existing data:

1. Create a data migration script at `prisma/migrations/scripts/migrate-room-features.ts`
2. Run the script with:
   ```bash
   npx ts-node prisma/migrations/scripts/migrate-room-features.ts
   ```

## Step 5: Update Service Files

The service files have been updated to work with the new schema:
- `app/services/room.server.ts` - Updated to use Room Features as a relation
- `app/services/booking.server.ts` - Added participant, equipment, and approval functionality
- `app/services/equipment.server.ts` - New service for managing equipment

## Step 6: Testing

Test the new functionality:

1. Create some test equipment items
2. Update some rooms with the new features and equipment
3. Create a booking with participants and equipment
4. Test the approval workflow

## Common Issues and Solutions

### Prisma Client Not Updated

If you encounter TypeScript errors about properties not existing on Prisma Client:

```
Property 'equipment' does not exist on type 'PrismaClient'
```

Solution: Regenerate the Prisma client:

```bash
npx prisma generate
```

### Migration Issues

If you encounter errors during migration:

1. Check for any constraint violations in your existing data
2. You may need to drop the database and start fresh in development:
   ```bash
   npx prisma migrate reset
   ```

### Data Migration

If the room features migration script fails:

1. Check that the JSON data in your room features is valid
2. Consider adding error handling for individual rooms:
   ```typescript
   try {
     const featureNames = parseJsonField<string[]>(room.features) || [];
     // migration code...
   } catch (error) {
     console.error(`Error migrating room ${room.id}:`, error);
   }
   ```

## SQL Server Compatibility

Our application has been designed to be compatible with Microsoft SQL Server for production deployments. Prisma has limitations with SQL Server, particularly with enum types which aren't natively supported. Here's how to ensure your implementation works correctly with SQL Server:

### Schema Considerations

1. **Reference Tables Instead of Enums**:
   - All enums have been replaced with reference tables
   - For example, `BookingStatus` is now a model instead of an enum
   - Junction tables are used for many-to-many relationships

2. **Testing with SQL Server**:
   - If you want to test with SQL Server locally, you can use Docker:
     ```bash
     docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=StrongPassword123" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2019-latest
     ```
   - Update your Prisma database URL:
     ```
     DATABASE_URL="sqlserver://localhost:1433;database=resource_scheduling;user=sa;password=StrongPassword123;trustServerCertificate=true"
     ```

### Setup Steps for SQL Server

1. **Update Prisma Configuration**:
   Add a new provider section to your `schema.prisma`:
   ```prisma
   generator client {
     provider = "prisma-client-js"
     previewFeatures = ["microsoftSqlServer"]
   }

   datasource db {
     provider = "sqlserver"  // Change from postgresql
     url      = env("DATABASE_URL")
   }
   ```

2. **Seeding Reference Tables**:
   Create a seed script to populate all reference tables:
   ```bash
   npx prisma db seed
   ```

   Add to your `package.json`:
   ```json
   "prisma": {
     "seed": "ts-node prisma/seed.ts"
   }
   ```

3. **Create the Seed Script**:
   Create `prisma/seed.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client';

   const prisma = new PrismaClient();

   async function main() {
     // Seed BookingStatus
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

     // Seed other reference tables...
     console.log('Reference tables seeded successfully');
   }

   main()
     .catch(e => {
       console.error(e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });
   ```

### Helper Functions

Create helper functions in `app/services/db.server.ts` to make working with reference tables easier:

```typescript
// Helper function to get a status ID by name
export async function getBookingStatusId(name: string): Promise<string> {
  const status = await prisma.bookingStatus.findUnique({
    where: { name }
  });

  if (!status) {
    throw new Error(`Booking status "${name}" not found`);
  }

  return status.id;
}

// Similar helpers for other reference tables...
```

### Migration from PostgreSQL to SQL Server

If you're migrating an existing PostgreSQL database to SQL Server:

1. **Export Data**:
   ```bash
   npx prisma migrate diff --from-schema-datamodel=./old-schema.prisma --to-schema-datamodel=./new-schema.prisma --script > migration.sql
   ```

2. **Adapt the Script**:
   - Update SQL syntax for SQL Server compatibility
   - Handle any PostgreSQL-specific functions

3. **Seed Reference Tables**:
   - Run the seed script to create reference tables
   - Map enum values to their corresponding reference IDs

4. **Validate Data**:
   - Run validation queries to ensure data consistency
   - Check foreign key relationships

### Testing Considerations

1. **Performance Testing**:
   - Test queries with large datasets
   - Monitor join performance
   - Add indexes where necessary

2. **Transaction Testing**:
   - Ensure transactions work correctly
   - Test rollback scenarios

3. **Connection Pooling**:
   - Adjust connection pool settings for SQL Server

## Next Steps

After setting up the improved schema:

1. Update your frontend components to take advantage of the new features
2. Add UI for managing equipment
3. Implement the approval workflow in your application
4. Add participant management to the booking process