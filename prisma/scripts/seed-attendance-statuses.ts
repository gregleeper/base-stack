import { PrismaClient } from "@prisma/client"

/**
 * Script to seed attendance statuses into the database
 * These status values are used for both hosts and participants in bookings
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

async function seedAttendanceStatuses() {
	try {
		logger.step("Starting to seed attendance statuses...")

		// Define attendance statuses
		const attendanceStatuses = [
			{
				name: "Pending",
				description: "Invitation has been sent but not yet responded to",
			},
			{
				name: "Accepted",
				description: "Person has accepted the invitation to attend",
			},
			{
				name: "Declined",
				description: "Person has declined the invitation to attend",
			},
			{
				name: "Tentative",
				description: "Person has tentatively accepted the invitation",
			},
			{
				name: "No Response",
				description: "Person has not responded to the invitation",
			},
			{
				name: "Confirmed",
				description: "Attendance has been confirmed",
			},
			{
				name: "Cancelled",
				description: "Person cancelled their attendance",
			},
			{
				name: "No Show",
				description: "Person did not attend despite accepting",
			},
			{
				name: "Present",
				description: "Person attended the event",
			},
		]

		// Track how many statuses were created and how many already existed
		let created = 0
		let existing = 0

		// Create each status if it doesn't already exist
		for (const status of attendanceStatuses) {
			const existing_status = await prisma.attendanceStatus.findUnique({
				where: { name: status.name },
			})

			if (!existing_status) {
				await prisma.attendanceStatus.create({
					data: {
						name: status.name,
						description: status.description,
					},
				})
				logger.success(`Created attendance status: ${status.name}`)
				created++
			} else {
				logger.warning(`Attendance status already exists: ${status.name}`)
				existing++
			}
		}

		logger.info(`\nAttendance statuses seeding completed:`)
		logger.info(`- Created ${created} new attendance statuses`)
		logger.info(`- Found ${existing} existing attendance statuses`)
		logger.info(`- Total: ${attendanceStatuses.length} attendance statuses\n`)
	} catch (error) {
		logger.error("An error occurred while seeding attendance statuses:")
		logger.error(error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the seed function
seedAttendanceStatuses().catch((error) => {
	logger.error("Failed to seed attendance statuses:")
	logger.error(error)
	process.exit(1)
})
