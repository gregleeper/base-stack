# Database Schema Relationships

This document outlines the relationships between models in our room scheduling application's database schema and provides justification for design decisions along with potential improvements.

## Current Model Relationships

### User → UserGroup
- **Relationship Type**: Many-to-Many
- **Implementation**: Users can belong to multiple UserGroups through the UserGroupMember junction table
- **Justification**: This enables role-based access control and organizational grouping of users

### UserGroup → ResourceAccess
- **Relationship Type**: One-to-Many
- **Implementation**: UserGroups can have multiple ResourceAccess entries controlling permissions for different resources
- **Justification**: Allows for granular access control based on group membership rather than individual users

### User → Booking
- **Relationship Type**: One-to-Many
- **Implementation**: A User has many Bookings, referenced by the `userId` field in the Booking model
- **Justification**: Each booking must be associated with a single user who created it, but users can create multiple bookings

### User → BookingParticipant
- **Relationship Type**: One-to-Many
- **Implementation**: A User can participate in many Bookings through the BookingParticipant model
- **Justification**: Users can be participants in multiple bookings, allowing attendance tracking and notifications

### User → RecurringBooking
- **Relationship Type**: One-to-Many
- **Implementation**: A User can create multiple RecurringBookings
- **Justification**: Users need the ability to set up repeating booking patterns

### User → BookingApproval
- **Relationship Type**: One-to-Many
- **Implementation**: A User (approver) can issue multiple booking approvals
- **Justification**: Certain users may have approval authority for booking requests

### Building → Room
- **Relationship Type**: One-to-Many
- **Implementation**: A Building has many Rooms, referenced by the `buildingId` field in the Room model
- **Justification**: Buildings physically contain multiple rooms, and grouping rooms by building helps with organization and filtering

### Building Categories
- **Relationship Type**: Reference Table (replaced enum)
- **Implementation**: Buildings are categorized using a BuildingCategory reference table with categories like ADMINISTRATIVE, ELEMENTARY, etc.
- **Justification**: Categorization helps with organizing buildings by purpose, especially in educational contexts; using reference tables ensures SQL Server compatibility

### RoomType → Room
- **Relationship Type**: One-to-Many
- **Implementation**: A RoomType has many Rooms, referenced by the `typeId` field in the Room model
- **Justification**: Each room has a specific purpose or type (e.g., Gymnasium, Meeting Room, Classroom), and categorizing rooms by type enables better filtering, feature assignment, and reporting

### Room → Booking
- **Relationship Type**: One-to-Many
- **Implementation**: A Room has many Bookings, referenced by the `roomId` field in the Booking model
- **Justification**: A single physical room can be booked multiple times (at different times), but each booking can only be for one room

### Room → RecurringBooking
- **Relationship Type**: One-to-Many
- **Implementation**: A Room can have multiple recurring booking patterns
- **Justification**: Rooms can have regularly scheduled events and meetings

### Room ↔ RoomFeature
- **Relationship Type**: Many-to-Many
- **Implementation**: Implemented through the RoomFeatures junction table connecting Room and RoomFeature models
- **Justification**: Rooms can have multiple features, and features can apply to multiple rooms

### Room ↔ Equipment
- **Relationship Type**: Many-to-Many
- **Implementation**: Implemented through the RoomEquipment junction table connecting Room and Equipment models
- **Justification**: Rooms can have multiple equipment items, and equipment can be available in multiple rooms

### Room → RoomAvailability
- **Relationship Type**: One-to-Many
- **Implementation**: A Room has multiple availability windows defined through the RoomAvailability model
- **Justification**: Different rooms may have different operating hours or availability schedules

### Booking ↔ User
- **Relationship Type**: Many-to-One
- **Implementation**: Many Bookings belong to one User via the `userId` foreign key
- **Justification**: Each booking has a single creator/owner

### Booking ↔ Room
- **Relationship Type**: Many-to-One
- **Implementation**: Many Bookings belong to one Room via the `roomId` foreign key
- **Justification**: A booking applies to exactly one room at a time

### Booking ↔ BookingCategory
- **Relationship Type**: Many-to-One
- **Implementation**: Many Bookings belong to one BookingCategory via the `bookingCategoryId` foreign key
- **Justification**: Each booking is classified into a specific category (e.g., Meeting, Training, Athletics) to enable better organization, filtering, and reporting

### Booking → BookingParticipant
- **Relationship Type**: One-to-Many
- **Implementation**: A Booking can have multiple participants through the BookingParticipant model
- **Justification**: Meetings and events typically have multiple attendees

### Booking ↔ Equipment
- **Relationship Type**: Many-to-Many
- **Implementation**: Implemented through the BookingEquipment junction table
- **Justification**: Bookings can reserve multiple equipment items, and equipment can be used in multiple bookings

### Booking → BookingApproval
- **Relationship Type**: One-to-Many
- **Implementation**: A Booking can have multiple approval records (for audit or multi-level approval)
- **Justification**: Supports approval workflows for room bookings

### RecurringBooking ↔ Room
- **Relationship Type**: Many-to-One
- **Implementation**: A RecurringBooking belongs to a single Room via the `roomId` foreign key
- **Justification**: A recurring booking pattern applies to a specific room

### RecurringBooking ↔ User
- **Relationship Type**: Many-to-One
- **Implementation**: A RecurringBooking belongs to a single User via the `userId` foreign key
- **Justification**: A recurring booking pattern is created by a single user

## Design Justifications

1. **Separation of Buildings and Rooms**:
   - Allows for hierarchical organization of spaces
   - Enables filtering rooms by building
   - Matches real-world organization of physical spaces
   - Supports building categorization through reference tables

2. **Room Type Categorization**:
   - Enables grouping rooms by purpose or functionality (e.g., Gymnasium, Conference Room)
   - Facilitates easier searching and filtering of rooms by type
   - Provides consistent feature assignment based on room type
   - Supports reporting and analytics by room category
   - Uses reference tables for SQL Server compatibility instead of enums

3. **User Ownership of Bookings**:
   - Enables accountability for bookings
   - Allows filtering of bookings by user
   - Provides basic access control (users can manage their own bookings)
   - Supports tracking of who created and last modified records

4. **Room Features as Relational Model**:
   - Implemented as a many-to-many relationship through a junction table
   - Provides better type safety and normalized database design
   - Enables efficient querying and filtering based on features
   - Allows features to be dynamically added without schema changes

5. **Booking Status as Reference Table**:
   - Provides clear lifecycle states (PENDING, CONFIRMED, CANCELLED, COMPLETED)
   - Enables filtering bookings by status
   - Better than boolean flags for representing multiple states
   - Uses lookup tables for SQL Server compatibility instead of enums

6. **Booking Category as Reference Table**:
   - Organizes bookings by purpose or activity type (e.g., Meeting, Training, Athletics)
   - Enables efficient filtering and searching of bookings by category
   - Supports analytics and reporting based on booking types
   - Provides a standardized set of categories for users to select from
   - Uses a reference table for SQL Server compatibility instead of enums

7. **RecurringBooking Pattern**:
   - Properly related to Room and User models for data integrity
   - Stores pattern information without duplicating actual bookings
   - Supports various recurrence frequencies (daily, weekly, monthly)
   - Uses reference tables for recurrence types instead of enums

8. **Database Indexing**:
   - Index on `[roomId, startTime, endTime]` for Booking model optimizes overlap checks
   - Improves performance for the most common query pattern (finding conflicting bookings)
   - Includes appropriate indexes on reference table foreign keys

9. **Soft Delete Implementation**:
   - All major models include `isDeleted` and `deletedAt` fields
   - Enables data preservation and recovery
   - Supports historical analysis and audit requirements

10. **Audit Trail**:
    - Implementation of `createdBy` and `updatedBy` fields across models
    - Creation and update timestamps on all models
    - Provides accountability and tracking for database changes

11. **Approval Workflow**:
    - BookingApproval model supports multi-level approval processes
    - Status tracking for approval states using reference tables (PENDING, APPROVED, REJECTED)
    - Maintains audit history of approval decisions

12. **Equipment Management**:
    - Equipment can be assigned to rooms and reserved with bookings
    - Quantity tracking for equipment reservations
    - Availability status for equipment items using reference tables

13. **Booking Participants**:
    - Many-to-many relationship between Users and Bookings
    - Status tracking for participant responses using reference tables (PENDING, ACCEPTED, DECLINED, TENTATIVE)
    - Enables attendee management and notifications

14. **Room Availability Scheduler**:
    - Defines operating hours for rooms by day of week
    - Supports different availability windows for different spaces
    - Improves booking validation and availability checks

15. **User Group Access Control**:
    - Implements a comprehensive group-based access control system
    - Provides granular permissions (view, book, approve, manage) for resources
    - Supports organizational structure through department-based groups
    - Reduces administrative overhead by managing permissions at the group level
    - Allows for role-based access control with hierarchical permissions

## SQL Server Compatibility

To ensure compatibility with Microsoft SQL Server in production:

1. **Reference Tables Instead of Enums**:
   - All enums have been replaced with reference tables (lookup tables)
   - Each reference table includes an ID, name, and optional description
   - Foreign key relationships replace direct enum assignments
   - Examples include BookingStatus, BuildingCategory, RoomType, ParticipantStatus, BookingCategory

2. **Junction Tables for Arrays**:
   - Arrays are not directly supported in SQL Server
   - Many-to-many relationships use explicit junction tables with unique constraints
   - This approach maintains referential integrity while providing the same functionality

3. **Indexing Strategy**:
   - Foreign keys to reference tables are indexed appropriately
   - Junction tables include appropriate composite indexes
   - This maintains query performance despite the added joins

4. **Helper Functions**:
   - API includes helper functions to simplify working with reference tables
   - These functions allow code to reference items by name rather than ID
   - Example: `getBookingStatusId('CONFIRMED')` returns the appropriate ID

## Implemented Improvements

The schema reflects several key improvements that were previously recommended:

1. **User Groups and Access Control**:
   - Implemented UserGroup and ResourceAccess models to control resource access based on group membership
   - Many-to-many relationship between Users and UserGroups through the UserGroupMember model
   - Granular permission levels (view, book, approve, manage) for different resources
   - Benefits: Enhanced security, departmental isolation, simplified administration, role-based access

2. **RecurringBooking Relations**:
   - Proper Prisma relations have been implemented between RecurringBooking and Room/User models
   - Benefits: Better integrity constraints, easier querying, and includes in query results

3. **Room Features as Native Model**:
   - Features are now implemented as a separate RoomFeature model with a junction table
   - Benefits: Better type safety, normalized database design, easier querying and filtering

4. **Room Type Categorization**:
   - RoomType model properly categorizes rooms by their purpose
   - Benefits: Better organization, consistent feature assignment, improved filtering and reporting

5. **Booking Category Classification**:
   - BookingCategory model provides standardized categorization of bookings by purpose
   - Benefits: Better organization, consistent classification, improved filtering and reporting

6. **Participants in Bookings**:
   - A BookingParticipant model has been added to track meeting attendees
   - Benefits: Track meeting attendees, send notifications, show room utilization

7. **Equipment/Resources**:
   - Equipment model and related junction tables have been implemented
   - Benefits: More comprehensive booking system, resource management

8. **Soft Delete**:
   - `isDeleted` and `deletedAt` fields have been added to all major models
   - Benefits: Data preservation, historical analysis, accidental deletion protection

9. **Audit Trail**:
   - Creation and modification tracking has been added to all models
   - Benefits: Better accountability, activity tracking, security audit compliance

10. **Room Availability Scheduler**:
    - RoomAvailability model defines operating hours for rooms
    - Benefits: Different rooms can have different availability windows

11. **Approval Workflow**:
    - BookingApproval model supports approval processes for bookings
    - Benefits: Support for approval workflows for high-demand rooms or resources

12. **SQL Server Compatibility**:
    - Adoption of reference tables instead of enums
    - Junction tables for many-to-many relationships
    - Appropriate indexing for optimal performance
    - Benefits: Database portability, production readiness

13. **Resource Access Control**:
    - ResourceAccess model provides granular permissions for different resource types
    - Four levels of permissions: view, book, approve, and manage
    - Access control based on user group membership instead of individual users
    - Benefits: Simpler administration, better security, department-based isolation
    - Support for complex organizational hierarchies and permission structures

## Conclusion

The current schema provides a comprehensive foundation for a room scheduling application with detailed relationships between buildings, rooms, users, bookings, features, equipment, and more. The design includes robust support for booking management, resource allocation, participant tracking, and approval workflows.

With the addition of user groups and resource access control, the system now supports more complex organizational structures and security requirements. The group-based access control system enables administrators to manage permissions at scale while providing the appropriate level of access to each user based on their role and department.

This schema supports efficient querying of available rooms, detection of booking conflicts, equipment management, and participant tracking, making it suitable for educational institutions with diverse resource scheduling needs. The SQL Server compatibility measures ensure that the application can be smoothly transitioned to production environments using Microsoft SQL Server.