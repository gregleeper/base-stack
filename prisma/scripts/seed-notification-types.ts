import { PrismaClient } from "@prisma/client"

/**
 * Script to seed notification types into the database
 */

const prisma = new PrismaClient()

// Console colors for nice output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
	yellow: "\x1b[33m",
}

// Custom logger with colors
const logger = {
	step: (message: string) => console.log(`${colors.blue}${message}${colors.reset}`),
	success: (message: string) => console.log(`${colors.green}${message}${colors.reset}`),
	error: (message: string | unknown) => {
		console.log(`${colors.red}${message}${colors.reset}`)
		if (message instanceof Error) {
			console.log(`${colors.red}${message.stack || message.message}${colors.reset}`)
		}
	},
	info: (message: string) => process.stdout.write(`\x1b[34m${message}\x1b[0m\n`),
	warning: (message: string) => console.log(`${colors.yellow}${message}${colors.reset}`),
	log: (message: string) => process.stdout.write(`${message}\n`),
}

async function seedNotificationTypes() {
	try {
		logger.step("Starting to seed notification types...")

		// Define notification types
		const notificationTypes = [
			{
				id: "BOOKING_CREATED",
				name: "BOOKING_CREATED",
				description: "Sent when a new booking is created"
			},
			{
				id: "BOOKING_UPDATED",
				name: "BOOKING_UPDATED",
				description: "Sent when a booking is updated"
			},
			{
				id: "BOOKING_CANCELLED",
				name: "BOOKING_CANCELLED",
				description: "Sent when a booking is cancelled"
			},
			{
				id: "BOOKING_APPROVED",
				name: "BOOKING_APPROVED",
				description: "Sent when a booking is approved"
			},
			{
				id: "BOOKING_REJECTED",
				name: "BOOKING_REJECTED",
				description: "Sent when a booking is rejected"
			},
			{
				id: "BOOKING_REMINDER",
				name: "BOOKING_REMINDER",
				description: "Reminder for upcoming bookings"
			},
			{
				id: "ROOM_MAINTENANCE",
				name: "ROOM_MAINTENANCE",
				description: "Notification about room maintenance"
			},
			{
				id: "SYSTEM_ANNOUNCEMENT",
				name: "SYSTEM_ANNOUNCEMENT",
				description: "System-wide announcements"
			},
			{
				id: "USER_MENTIONED",
				name: "USER_MENTIONED",
				description: "Notification when a user is mentioned"
			},
			{
				id: "RESOURCE_CONFLICT",
				name: "RESOURCE_CONFLICT",
				description: "Notification about resource booking conflicts"
			}
		]

		// Define notification statuses
		const notificationStatuses = [
			{
				id: "PENDING",
				name: "PENDING",
				description: "Notification is pending delivery"
			},
			{
				id: "SENT",
				name: "SENT",
				description: "Notification has been sent"
			},
			{
				id: "DELIVERED",
				name: "DELIVERED",
				description: "Notification has been delivered"
			},
			{
				id: "READ",
				name: "READ",
				description: "Notification has been read by the recipient"
			},
			{
				id: "FAILED",
				name: "FAILED",
				description: "Notification delivery failed"
			}
		]

		// Define notification priorities
		const notificationPriorities = [
			{
				id: "LOW",
				name: "LOW",
				description: "Low priority notification"
			},
			{
				id: "NORMAL",
				name: "NORMAL",
				description: "Normal priority notification"
			},
			{
				id: "HIGH",
				name: "HIGH",
				description: "High priority notification"
			},
			{
				id: "URGENT",
				name: "URGENT",
				description: "Urgent notification"
			}
		]

		// Define delivery methods
		const deliveryMethods = [
			{
				id: "EMAIL",
				name: "EMAIL",
				description: "Deliver notification via email"
			},
			{
				id: "IN_APP",
				name: "IN_APP",
				description: "Deliver notification in-app"
			},
			{
				id: "PUSH",
				name: "PUSH",
				description: "Deliver notification via push notification"
			},
			{
				id: "SMS",
				name: "SMS",
				description: "Deliver notification via SMS"
			}
		]

		// Define delivery statuses
		const deliveryStatuses = [
			{
				id: "PENDING",
				name: "PENDING",
				description: "Delivery is pending"
			},
			{
				id: "DELIVERED",
				name: "DELIVERED",
				description: "Successfully delivered"
			},
			{
				id: "FAILED",
				name: "FAILED",
				description: "Delivery failed"
			},
			{
				id: "READ",
				name: "READ",
				description: "Notification was read by recipient"
			}
		]

		// Create notification types
		logger.info("Creating notification types...")
		let createdTypes = 0
		let skippedTypes = 0

		for (const type of notificationTypes) {
			const existingType = await prisma.notificationType.findUnique({
				where: { id: type.id }
			})

			if (!existingType) {
				await prisma.notificationType.create({
					data: type
				})
				createdTypes++
				logger.info(`Created notification type: ${type.name}`)
			} else {
				skippedTypes++
				logger.info(`Notification type already exists: ${type.name}`)
			}
		}

		// Create notification statuses
		logger.info("\nCreating notification statuses...")
		let createdStatuses = 0
		let skippedStatuses = 0

		for (const status of notificationStatuses) {
			const existingStatus = await prisma.notificationStatus.findUnique({
				where: { id: status.id }
			})

			if (!existingStatus) {
				await prisma.notificationStatus.create({
					data: status
				})
				createdStatuses++
				logger.info(`Created notification status: ${status.name}`)
			} else {
				skippedStatuses++
				logger.info(`Notification status already exists: ${status.name}`)
			}
		}

		// Create notification priorities
		logger.info("\nCreating notification priorities...")
		let createdPriorities = 0
		let skippedPriorities = 0

		for (const priority of notificationPriorities) {
			const existingPriority = await prisma.notificationPriority.findUnique({
				where: { id: priority.id }
			})

			if (!existingPriority) {
				await prisma.notificationPriority.create({
					data: priority
				})
				createdPriorities++
				logger.info(`Created notification priority: ${priority.name}`)
			} else {
				skippedPriorities++
				logger.info(`Notification priority already exists: ${priority.name}`)
			}
		}

		// Create delivery methods
		logger.info("\nCreating delivery methods...")
		let createdMethods = 0
		let skippedMethods = 0

		for (const method of deliveryMethods) {
			const existingMethod = await prisma.deliveryMethod.findUnique({
				where: { id: method.id }
			})

			if (!existingMethod) {
				await prisma.deliveryMethod.create({
					data: method
				})
				createdMethods++
				logger.info(`Created delivery method: ${method.name}`)
			} else {
				skippedMethods++
				logger.info(`Delivery method already exists: ${method.name}`)
			}
		}

		// Create delivery statuses
		logger.info("\nCreating delivery statuses...")
		let createdDeliveryStatuses = 0
		let skippedDeliveryStatuses = 0

		for (const status of deliveryStatuses) {
			const existingStatus = await prisma.deliveryStatus.findUnique({
				where: { id: status.id }
			})

			if (!existingStatus) {
				await prisma.deliveryStatus.create({
					data: status
				})
				createdDeliveryStatuses++
				logger.info(`Created delivery status: ${status.name}`)
			} else {
				skippedDeliveryStatuses++
				logger.info(`Delivery status already exists: ${status.name}`)
			}
		}

		// Summary
		logger.success("\nNotification configuration seeding complete!")
		logger.success(`Created ${createdTypes} notification types (${skippedTypes} already existed)`)
		logger.success(`Created ${createdStatuses} notification statuses (${skippedStatuses} already existed)`)
		logger.success(`Created ${createdPriorities} notification priorities (${skippedPriorities} already existed)`)
		logger.success(`Created ${createdMethods} delivery methods (${skippedMethods} already existed)`)
		logger.success(`Created ${createdDeliveryStatuses} delivery statuses (${skippedDeliveryStatuses} already existed)`)

	} catch (error) {
		logger.error("Error seeding notification types:")
		logger.error(error)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
seedNotificationTypes()