import type { Prisma, PrismaClient, User } from "@prisma/client"
import { logger } from "~/utils/logger"
import { prisma } from "./db.server"

/**
 * Process pending notifications that are scheduled to be sent
 * This function will be called by the cron job
 */
export async function processPendingNotifications() {
	logger.info("Processing pending notifications...")

	try {
		// Find notifications that are scheduled to be sent now or in the past,
		// and have not been sent yet (status is PENDING)
		const pendingNotifications = await prisma.notification.findMany({
			where: {
				scheduledFor: {
					lte: new Date(), // less than or equal to current time
				},
				status: {
					name: "PENDING",
				},
				isDeleted: false,
			},
			include: {
				type: true,
				recipients: {
					include: {
						user: true,
						deliveryMethods: {
							include: {
								deliveryMethod: true,
							},
						},
					},
				},
			},
			take: 100, // Process in batches
		})

		logger.info(`Found ${pendingNotifications.length} notifications to process`)

		// Get status IDs for updating
		const sentStatusId = await getStatusId(prisma, "SENT")
		const failedStatusId = await getStatusId(prisma, "FAILED")

		// Process each notification
		for (const notification of pendingNotifications) {
			try {
				// Process the notification based on delivery methods
				await sendNotification(notification)

				// Update notification status to SENT
				await prisma.notification.update({
					where: { id: notification.id },
					data: {
						statusId: sentStatusId,
						sentAt: new Date(),
						updatedBy: "SYSTEM",
					},
				})
			} catch (error) {
				logger.error(`Failed to process notification ${notification.id}:`, error)

				// Update notification status to FAILED or increment retry count
				await prisma.notification.update({
					where: { id: notification.id },
					data: {
						statusId: notification.retryCount >= notification.maxRetries ? failedStatusId : notification.statusId,
						retryCount: { increment: 1 },
						errorMessage: String(error),
						updatedBy: "SYSTEM",
					},
				})
			}
		}

		// Create reminder notifications for upcoming bookings (24h and 1h before)
		await createReminderNotifications()

		return { processed: pendingNotifications.length }
	} catch (error) {
		logger.error("Error processing notifications:", error)
		return { error: String(error) }
	}
}

/**
 * Create reminder notifications for upcoming bookings
 */
async function createReminderNotifications() {
	const now = new Date()
	const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000)
	const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000)

	// Get notification type IDs
	const reminderTypeId = await getNotificationTypeId(prisma, "BOOKING_REMINDER")
	const pendingStatusId = await getStatusId(prisma, "PENDING")
	const normalPriorityId = await getPriorityId(prisma, "NORMAL")

	// Find bookings that start in approximately 24 hours
	const dayReminderBookings = await prisma.booking.findMany({
		where: {
			startTime: {
				gte: new Date(oneDayAhead.getTime() - 5 * 60 * 1000), // 5 min buffer
				lte: new Date(oneDayAhead.getTime() + 5 * 60 * 1000), // 5 min buffer
			},
			isDeleted: false,
			// Ensure no reminder has been sent already for this time frame
			NOT: {
				notifications: {
					some: {
						typeId: reminderTypeId,
						content: { contains: "24 hours" },
					},
				},
			},
		},
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
			participants: {
				include: {
					user: true,
				},
			},
		},
	})

	// Find bookings that start in approximately 1 hour
	const hourReminderBookings = await prisma.booking.findMany({
		where: {
			startTime: {
				gte: new Date(oneHourAhead.getTime() - 5 * 60 * 1000), // 5 min buffer
				lte: new Date(oneHourAhead.getTime() + 5 * 60 * 1000), // 5 min buffer
			},
			isDeleted: false,
			// Ensure no reminder has been sent already for this time frame
			NOT: {
				notifications: {
					some: {
						typeId: reminderTypeId,
						content: { contains: "1 hour" },
					},
				},
			},
		},
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
			participants: {
				include: {
					user: true,
				},
			},
		},
	})

	// Create 24-hour reminders
	for (const booking of dayReminderBookings) {
		try {
			await prisma.notification.create({
				data: {
					title: "Reminder: Booking in 24 hours",
					content: `Your booking for ${booking.room.name} in ${booking.room.building.name} is scheduled to start in 24 hours.`,
					typeId: reminderTypeId,
					statusId: pendingStatusId,
					priorityId: normalPriorityId,
					bookingId: booking.id,
					scheduledFor: new Date(), // Schedule for immediate delivery
					createdBy: "SYSTEM",
					recipients: {
						create: [
							// Add creator
							{
								userId: booking.user.id,
								deliveryStatusId: await getDeliveryStatusId(prisma, "PENDING"),
								// Add delivery methods - this would need to be extended based on user preferences
								deliveryMethods: {
									create: [
										{
											deliveryMethodId: await getDeliveryMethodId(prisma, "IN_APP"),
										},
										{
											deliveryMethodId: await getDeliveryMethodId(prisma, "EMAIL"),
										},
									],
								},
							},
							// Add participants
							...(await Promise.all(
								booking.participants.map(async (participant) => ({
									userId: participant.userId,
									deliveryStatusId: await getDeliveryStatusId(prisma, "PENDING"),
									// Add delivery methods
									deliveryMethods: {
										create: [
											{
												deliveryMethodId: await getDeliveryMethodId(prisma, "IN_APP"),
											},
											{
												deliveryMethodId: await getDeliveryMethodId(prisma, "EMAIL"),
											},
										],
									},
								}))
							)),
						],
					},
				},
			})
		} catch (error) {
			logger.error(`Failed to create 24h reminder for booking ${booking.id}:`, error)
		}
	}

	// Create 1-hour reminders (similar to 24-hour reminders)
	for (const booking of hourReminderBookings) {
		try {
			await prisma.notification.create({
				data: {
					title: "Reminder: Booking in 1 hour",
					content: `Your booking for ${booking.room.name} in ${booking.room.building.name} is scheduled to start in 1 hour.`,
					typeId: reminderTypeId,
					statusId: pendingStatusId,
					priorityId: normalPriorityId,
					bookingId: booking.id,
					scheduledFor: new Date(), // Schedule for immediate delivery
					createdBy: "SYSTEM",
					recipients: {
						create: [
							// Add creator
							{
								userId: booking.user.id,
								deliveryStatusId: await getDeliveryStatusId(prisma, "PENDING"),
								// Add delivery methods
								deliveryMethods: {
									create: [
										{
											deliveryMethodId: await getDeliveryMethodId(prisma, "IN_APP"),
										},
										{
											deliveryMethodId: await getDeliveryMethodId(prisma, "EMAIL"),
										},
									],
								},
							},
							// Add participants
							...(await Promise.all(
								booking.participants.map(async (participant) => ({
									userId: participant.userId,
									deliveryStatusId: await getDeliveryStatusId(prisma, "PENDING"),
									// Add delivery methods
									deliveryMethods: {
										create: [
											{
												deliveryMethodId: await getDeliveryMethodId(prisma, "IN_APP"),
											},
											{
												deliveryMethodId: await getDeliveryMethodId(prisma, "EMAIL"),
											},
										],
									},
								}))
							)),
						],
					},
				},
			})
		} catch (error) {
			logger.error(`Failed to create 1h reminder for booking ${booking.id}:`, error)
		}
	}

	logger.info(
		`Created ${dayReminderBookings.length} 24-hour reminders and ${hourReminderBookings.length} 1-hour reminders`
	)
}

/**
 * Send a notification through all delivery methods
 */
async function sendNotification(
	notification: Prisma.NotificationGetPayload<{
		include: {
			type: true
			recipients: {
				include: {
					user: true
					deliveryMethods: {
						include: {
							deliveryMethod: true
						}
					}
				}
			}
		}
	}>
) {
	for (const recipient of notification.recipients) {
		for (const method of recipient.deliveryMethods) {
			switch (method.deliveryMethod.name) {
				case "EMAIL":
					await sendEmailNotification(notification, recipient.user)
					break
				case "IN_APP":
					// Already stored in database, no additional action needed
					break
				case "PUSH":
					await sendPushNotification(notification, recipient.user)
					break
			}
		}

		// Update recipient delivery status to DELIVERED
		await prisma.notificationRecipient.update({
			where: { id: recipient.id },
			data: {
				deliveryStatusId: await getDeliveryStatusId(prisma, "DELIVERED"),
			},
		})
	}
}

/**
 * Send an email notification
 * This is a placeholder implementation - you would integrate with your email service
 */
async function sendEmailNotification(
	notification: Prisma.NotificationGetPayload<{
		include: {
			type: true
			recipients: {
				include: {
					user: true
					deliveryMethods: {
						include: {
							deliveryMethod: true
						}
					}
				}
			}
		}
	}>,
	user: User
) {
	// In a real implementation, you would:
	// 1. Generate the email content from a template
	// 2. Send the email using your email service
	// 3. Handle any errors and return a success/failure status

	// Customize email content based on notification type
	let emailSubject = notification.title

	// Add specific formatting for different notification types
	if (notification.type.name === "BOOKING_REMINDER") {
		// Add specific reminder formatting/content
		emailSubject = `🔔 ${emailSubject}`
		// HTML content would be used in a real implementation
	} else if (notification.type.name === "BOOKING_UPDATED") {
		// Add specific update notification formatting/content
		emailSubject = `📝 ${emailSubject}`
		// HTML content would be used in a real implementation
	}

	logger.info(`[EMAIL] Sending "${emailSubject}" to ${user.email}`)
	// Simulate email sending delay
	await new Promise((resolve) => setTimeout(resolve, 100))

	return true
}

/**
 * Send a push notification
 * This is a placeholder implementation
 */
async function sendPushNotification(
	notification: Prisma.NotificationGetPayload<{
		include: {
			type: true
			recipients: {
				include: {
					user: true
					deliveryMethods: {
						include: {
							deliveryMethod: true
						}
					}
				}
			}
		}
	}>,
	user: User
) {
	// Customize push notification content based on type
	let pushTitle = notification.title

	// Add icons or specific formatting based on notification type
	if (notification.type.name === "BOOKING_REMINDER") {
		pushTitle = `🔔 ${pushTitle}`
	} else if (notification.type.name === "BOOKING_UPDATED") {
		pushTitle = `📝 ${pushTitle}`
	}

	// Simulate push sending delay
	await new Promise((resolve) => setTimeout(resolve, 50))
	logger.info(`[PUSH] Sending "${pushTitle}" to user ${user.id}`)
	return true
}

// Helper functions to get IDs from lookup tables

/**
 * Get notification type ID by name
 */
async function getNotificationTypeId(prisma: PrismaClient, name: string): Promise<string> {
	const type = await prisma.notificationType.findUnique({
		where: { name },
	})
	if (!type) {
		throw new Error(`Notification type "${name}" not found`)
	}
	return type.id
}

/**
 * Get notification status ID by name
 */
async function getStatusId(prisma: PrismaClient, name: string): Promise<string> {
	const status = await prisma.notificationStatus.findUnique({
		where: { name },
	})
	if (!status) {
		throw new Error(`Notification status "${name}" not found`)
	}
	return status.id
}

/**
 * Get notification priority ID by name
 */
async function getPriorityId(prisma: PrismaClient, name: string): Promise<string> {
	const priority = await prisma.notificationPriority.findUnique({
		where: { name },
	})
	if (!priority) {
		throw new Error(`Notification priority "${name}" not found`)
	}
	return priority.id
}

/**
 * Get delivery method ID by name
 */
async function getDeliveryMethodId(prisma: PrismaClient, name: string): Promise<string> {
	const method = await prisma.deliveryMethod.findUnique({
		where: { name },
	})
	if (!method) {
		throw new Error(`Delivery method "${name}" not found`)
	}
	return method.id
}

/**
 * Get delivery status ID by name
 */
async function getDeliveryStatusId(prisma: PrismaClient, name: string): Promise<string> {
	const status = await prisma.deliveryStatus.findUnique({
		where: { name },
	})
	if (!status) {
		throw new Error(`Delivery status "${name}" not found`)
	}
	return status.id
}
