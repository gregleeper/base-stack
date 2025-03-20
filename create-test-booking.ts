import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
	log: ["query", "info", "warn", "error"],
})

async function createTestBooking() {
	try {
		console.log("Starting test booking creation...")

		// Get the user, room, booking category, and status IDs we want to use
		console.log("Finding user...")
		const user = await prisma.user.findFirst()

		console.log("Finding room...")
		const room = await prisma.room.findFirst()

		console.log("Finding booking category...")
		const category = await prisma.bookingCategory.findFirst({ where: { name: "Conference" } })

		console.log("Finding booking status...")
		const status = await prisma.bookingStatus.findFirst({ where: { name: "Pending" } })

		if (!user) {
			console.error("Could not find any user")
			return
		}
		if (!room) {
			console.error("Could not find any room")
			return
		}
		if (!category) {
			console.error("Could not find Conference booking category")
			return
		}
		if (!status) {
			console.error("Could not find Pending booking status")
			return
		}

		console.log("Using the following entities:")
		console.log("User:", user.id, user.email)
		console.log("Room:", room.id, room.name)
		console.log("Category:", category.id, category.name)
		console.log("Status:", status.id, status.name)

		const startTime = new Date()
		const endTime = new Date(Date.now() + 3600000) // 1 hour from now

		console.log("Creating booking with times:", {
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
		})

		// Create a booking with all fields explicitly set
		const booking = await prisma.booking.create({
			data: {
				title: "Test Booking",
				description: "Test booking description",
				startTime,
				endTime,
				userId: user.id,
				roomId: room.id,
				bookingCategoryId: category.id,
				statusId: status.id,
				createdBy: user.id,
			},
		})

		console.log("Successfully created booking:", booking)
	} catch (error) {
		console.error("Error creating booking:")
		if (error.code) {
			console.error(`Error code: ${error.code}`)
		}
		if (error.meta) {
			console.error("Meta information:", error.meta)
		}
		console.error(error)
	} finally {
		await prisma.$disconnect()
		console.log("Test completed")
	}
}

createTestBooking().catch((error) => {
	console.error("Unhandled error:", error)
	process.exit(1)
})
