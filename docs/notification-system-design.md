# Notification System Design

This document outlines the design decisions for implementing a notification system in our resource scheduling application.

## Notification Requirements

### Types of Notifications

1. **Booking Notifications**
   - Booking confirmation
   - Booking modification
   - Booking cancellation
   - Booking reminder (24 hours before, 1 hour before)
   - Room change notification

2. **Approval Workflow Notifications**
   - Booking approval request (to approvers)
   - Approval decision notification (to requesters)
   - Approval reminder (if pending for >48 hours)

3. **Participant Notifications**
   - Meeting invitation
   - Participant status updates (when others accept/decline)
   - Participant reminder (24 hours before, 1 hour before)

4. **Resource Notifications**
   - Equipment reservation confirmation
   - Room maintenance alerts
   - Building closure notifications

5. **System Notifications**
   - Account-related notifications
   - System maintenance announcements
   - Policy updates

## Data Model Design

### Notification Model

> **Note**: Since we're planning to migrate to SQL Server in production, we'll use lookup tables instead of enums for better compatibility.

```prisma
// Type lookup models instead of enums (for SQL Server compatibility)
model NotificationType {
  id                      String                      @id @default(uuid())
  name                    String                      @unique
  description             String?

  // Relations
  notifications           Notification[]
  userPreferences         UserNotificationPreference[]
}

model NotificationStatus {
  id                      String                      @id @default(uuid())
  name                    String                      @unique // PENDING, SENT, FAILED, CANCELLED
  description             String?

  // Relations
  notifications           Notification[]
}

model NotificationPriority {
  id                      String                      @id @default(uuid())
  name                    String                      @unique // LOW, NORMAL, HIGH, URGENT
  description             String?

  // Relations
  notifications           Notification[]
}

model DeliveryMethod {
  id                      String                      @id @default(uuid())
  name                    String                      @unique // EMAIL, IN_APP, SMS, PUSH
  description             String?

  // Relations
  recipientMethods        NotificationRecipientMethod[]
  preferenceOptions       UserPreferenceDeliveryMethod[]
}

model DeliveryStatus {
  id                      String                      @id @default(uuid())
  name                    String                      @unique // PENDING, DELIVERED, FAILED, READ
  description             String?

  // Relations
  recipients              NotificationRecipient[]
}

// Main notification models
model Notification {
  id                      String                      @id @default(uuid())
  title                   String
  content                 String                      @db.Text
  createdAt               DateTime                    @default(now())
  scheduledFor            DateTime?                   // When the notification should be sent
  sentAt                  DateTime?                   // When the notification was actually sent

  // Relations using lookup tables instead of enums
  typeId                  String
  type                    NotificationType            @relation(fields: [typeId], references: [id])

  statusId                String
  status                  NotificationStatus          @relation(fields: [statusId], references: [id])

  priorityId              String
  priority                NotificationPriority        @relation(fields: [priorityId], references: [id])

  // Recipients
  recipients              NotificationRecipient[]

  // Related entities (optional relations)
  bookingId               String?
  booking                 Booking?                    @relation(fields: [bookingId], references: [id])

  approvalId              String?
  approval                BookingApproval?            @relation(fields: [approvalId], references: [id])

  // Metadata and tracking
  errorMessage            String?                     @db.Text
  retryCount              Int                         @default(0)
  maxRetries              Int                         @default(3)

  // Audit fields
  createdBy               String
  updatedAt               DateTime                    @updatedAt
  updatedBy               String?
  isDeleted               Boolean                     @default(false)
  deletedAt               DateTime?
}

// Relationship between notifications and users
model NotificationRecipient {
  id                      String                      @id @default(uuid())
  notification            Notification                @relation(fields: [notificationId], references: [id])
  notificationId          String
  user                    User                        @relation(fields: [userId], references: [id])
  userId                  String
  readAt                  DateTime?                   // When the user read the notification

  // Relation to delivery status (replacing enum)
  deliveryStatusId        String
  deliveryStatus          DeliveryStatus              @relation(fields: [deliveryStatusId], references: [id])

  // Delivery methods through junction table
  deliveryMethods         NotificationRecipientMethod[]

  @@unique([notificationId, userId])
}

// Junction table for recipient delivery methods
model NotificationRecipientMethod {
  id                      String                      @id @default(uuid())
  recipient               NotificationRecipient       @relation(fields: [recipientId], references: [id])
  recipientId             String
  deliveryMethod          DeliveryMethod              @relation(fields: [deliveryMethodId], references: [id])
  deliveryMethodId        String

  @@unique([recipientId, deliveryMethodId])
}

// User notification preferences
model UserNotificationPreference {
  id                      String                      @id @default(uuid())
  user                    User                        @relation(fields: [userId], references: [id])
  userId                  String

  // Type relation (replacing enum)
  notificationTypeId      String
  notificationType        NotificationType            @relation(fields: [notificationTypeId], references: [id])

  // Delivery methods through junction table
  deliveryMethods         UserPreferenceDeliveryMethod[]
  enabled                 Boolean                     @default(true)

  @@unique([userId, notificationTypeId])
}

// Junction table for user preference delivery methods
model UserPreferenceDeliveryMethod {
  id                      String                      @id @default(uuid())
  preference              UserNotificationPreference  @relation(fields: [preferenceId], references: [id])
  preferenceId            String
  deliveryMethod          DeliveryMethod              @relation(fields: [deliveryMethodId], references: [id])
  deliveryMethodId        String

  @@unique([preferenceId, deliveryMethodId])
}
```

### Predefined Values for Lookup Tables

For each lookup table, we'll need to seed the database with standard values:

```typescript
// Example seed data for notification types
const notificationTypes = [
  { name: 'BOOKING_CONFIRMATION', description: 'Sent when a booking is confirmed' },
  { name: 'BOOKING_MODIFICATION', description: 'Sent when a booking is modified' },
  { name: 'BOOKING_CANCELLATION', description: 'Sent when a booking is cancelled' },
  { name: 'BOOKING_REMINDER', description: 'Reminder sent before a booking' },
  { name: 'ROOM_CHANGE', description: 'Notification of room change' },
  { name: 'APPROVAL_REQUEST', description: 'Request for booking approval' },
  { name: 'APPROVAL_DECISION', description: 'Decision on approval request' },
  { name: 'APPROVAL_REMINDER', description: 'Reminder for pending approvals' },
  { name: 'MEETING_INVITATION', description: 'Invitation to a meeting' },
  { name: 'PARTICIPANT_UPDATE', description: 'Update on participant status' },
  { name: 'PARTICIPANT_REMINDER', description: 'Reminder for participants' },
  { name: 'EQUIPMENT_RESERVATION', description: 'Equipment reservation confirmation' },
  { name: 'ROOM_MAINTENANCE', description: 'Room maintenance alert' },
  { name: 'BUILDING_CLOSURE', description: 'Building closure notification' },
  { name: 'ACCOUNT_NOTIFICATION', description: 'Account-related notification' },
  { name: 'SYSTEM_MAINTENANCE', description: 'System maintenance announcement' },
  { name: 'POLICY_UPDATE', description: 'Policy update notification' },
];

// Other lookup tables would follow a similar pattern
```

## Background Processing

### Notification Scheduler

A background job system is necessary to process notifications at the appropriate times:

1. **Immediate Notifications**
   - Triggered by events (booking creation, modification, etc.)
   - Created with status PENDING and immediately processed

2. **Scheduled Notifications**
   - Created in advance with future scheduledFor date
   - Processed when the scheduledFor time is reached

3. **Recurring Notifications**
   - Generated by a daily/hourly job that looks for upcoming events
   - Creates reminder notifications as needed

### Implementation Approaches

#### Option 1: Cron Jobs with Database Polling

- A cron job runs at regular intervals (every 1-5 minutes)
- Queries for notifications that need to be sent
- Processes notifications in batches
- Updates status after processing

#### Option 2: Message Queue with Worker Processes

- Notification requests are sent to a message queue (RabbitMQ, Redis, etc.)
- Worker processes consume from the queue and process notifications
- Scheduled notifications are managed by a separate scheduler that enqueues them at the right time

#### Option 3: Serverless Functions with Time Triggers

- Cloud functions triggered on a schedule to process notifications
- Event-driven architecture where booking events trigger notification creation
- Timer-based triggers for scheduled notifications

## Delivery Methods

### Email Notifications

- Use a transactional email service (SendGrid, Mailgun, SES)
- HTML templates with booking details
- Action buttons for responding to invitations
- Configurable templates based on notification type

### In-App Notifications

- Stored in the database
- Displayed in a notification center in the UI
- Marked as read when clicked
- Can include action buttons

### SMS Notifications (Optional)

- Integration with SMS gateway providers
- Brief messages with essential information
- Deep links to the web application

### Push Notifications (Future)

- For mobile applications or browser push
- Service worker registration for web push
- Integration with FCM/APNS for mobile

## Notification Content Generation

### Template-Based Approach

- HTML/text templates for each notification type
- Placeholders for dynamic content
- Localization support for multi-language environments
- Visual design consistency

### Example Template (Booking Confirmation)

```html
<h2>Booking Confirmation</h2>
<p>Your booking for <strong>{{room.name}}</strong> in <strong>{{building.name}}</strong> has been confirmed.</p>
<div class="details">
  <p><strong>Date:</strong> {{booking.startTime | formatDate}}</p>
  <p><strong>Time:</strong> {{booking.startTime | formatTime}} - {{booking.endTime | formatTime}}</p>
  <p><strong>Purpose:</strong> {{booking.title}}</p>
</div>
<p>Add this event to your calendar:</p>
<div class="actions">
  <a href="{{calendarLink}}">Add to Calendar</a>
  <a href="{{bookingDetailsLink}}">View Booking Details</a>
</div>
```

## Error Handling and Resilience

### Retry Mechanisms

- Failed notifications are marked with status FAILED
- Includes error message for debugging
- Automated retry based on retryCount and maxRetries
- Exponential backoff between retry attempts

### Notification Dashboard

- Admin interface for viewing notification status
- Ability to manually trigger failed notifications
- Analytics on delivery rates and common failures
- Audit log of all notification activity

## User Preference Management

### User Settings

- UI for managing notification preferences
- Granular control over notification types
- Ability to select delivery methods per notification type
- Global opt-out option

### Default Preferences

- System-defined defaults based on user role
- Admins and approvers have more notifications enabled by default
- Regular users focus on their own bookings and participation

## Implementation Strategy

### Phase 1: Basic Notification Framework

1. Implement notification and recipient data models
2. Create seed scripts for lookup tables
3. Create basic email delivery service
4. Set up background job for processing
5. Implement immediate notifications for bookings

### Phase 2: Enhanced Features

1. Add user preference management
2. Implement in-app notifications
3. Create reminder notifications system
4. Add approval workflow notifications

### Phase 3: Advanced Features

1. SMS integration (if needed)
2. Push notifications
3. Advanced analytics and reporting
4. Template customization for administrators

## Integration Points

### Booking Service
- `createBooking` triggers booking confirmation notifications
- `updateBooking` triggers modification notifications
- `deleteBooking` triggers cancellation notifications

### Approval Service
- `requestApproval` triggers approval request notifications
- `updateApprovalStatus` triggers approval decision notifications

### Participant Service
- `addParticipant` triggers invitation notifications
- `updateParticipantStatus` triggers status update notifications

### Room/Equipment Service
- `scheduleRoomMaintenance` triggers maintenance notifications
- `reserveEquipment` triggers equipment confirmation

## Helper Functions and Constants

Since we're replacing enums with lookup tables, we'll need helper functions to work with these values:

```typescript
// Helper function to get notification type ID by name
export async function getNotificationTypeId(prisma: PrismaClient, name: string): Promise<string> {
  const type = await prisma.notificationType.findUnique({
    where: { name },
  });
  if (!type) {
    throw new Error(`Notification type "${name}" not found`);
  }
  return type.id;
}

// Similar helper functions for other lookup tables
```

## Security Considerations

1. **Data Privacy**
   - Notification content should not leak sensitive information
   - Consider what data is stored in the notification object
   - When sending to external services, minimize PII

2. **Delivery Authentication**
   - Secure outgoing email/SMS service credentials
   - Validate notification recipients before delivery
   - Protect notification API endpoints

3. **User Control**
   - Always respect user preferences
   - Provide easy unsubscribe options
   - Compliance with privacy regulations (GDPR, etc.)

## Monitoring and Performance

1. **Metrics to Track**
   - Notification delivery rates
   - Average time from creation to delivery
   - Notification read rates
   - Failure types and frequencies

2. **Performance Considerations**
   - Batch processing for efficiency
   - Rate limits with external providers
   - Caching of templates and user preferences
   - Database indexing for notification queries
   - Consider indexing foreign keys for lookup tables

## SQL Server Specific Considerations

1. **Indexing Strategy**
   - Create appropriate indices on lookup table references
   - Consider indexed views for commonly accessed notification data

2. **Query Optimization**
   - Use table hints where appropriate for lookup table joins
   - Consider using stored procedures for complex notification queries

3. **Database Maintenance**
   - Archive old notifications to maintain performance
   - Regular index maintenance on lookup tables

## Conclusion

The notification system design outlined above provides a comprehensive framework for implementing notifications in our resource scheduling application. By implementing this design with lookup tables instead of enums, we ensure SQL Server compatibility while maintaining all the necessary functionality.

The scalable approach with background processing ensures that notifications can be sent reliably even as the system grows. User preferences allow for personalization while the template-based content generation enables consistent and professional communication.