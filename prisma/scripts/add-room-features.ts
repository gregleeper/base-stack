import { PrismaClient } from "@prisma/client"

/**
 * Script to add features to rooms using the new relational model
 */

const prisma = new PrismaClient()

// Define common room features - add or modify as needed
const commonFeatures = [
	"Projector",
	"Whiteboard",
	"Video Conference",
	"Air Conditioning",
	"Natural Light",
	"Wheelchair Accessible",
	"Coffee Machine",
	"WiFi",
	"Ethernet",
	"Standing Desk",
	"TV Screen",
	"Microphone",
	"Speakers",
	"HDMI Connection",
	"USB-C Connection",
	"VGA Connection",
	"Adjustable Lighting",
	"Soundproof",
	"Catering Available",
	"Smart Board",
	"Document Camera",
	"Art Supplies",
	"Science Equipment",
	"Computer Workstations",
	"Musical Instruments",
	"Athletic Equipment",
]

async function createRoomFeatures() {
	try {
		// eslint-disable-next-line no-console
		console.log("Starting to create room features...")

		// Create all the features first
		// eslint-disable-next-line no-console
		console.log("Creating common features...")
		let createdFeatures = 0

		for (const featureName of commonFeatures) {
			// Check if feature already exists
			const existingFeature = await prisma.roomFeature.findUnique({
				where: { name: featureName },
			})

			if (!existingFeature) {
				await prisma.roomFeature.create({
					data: { name: featureName },
				})
				createdFeatures++
				// eslint-disable-next-line no-console
				console.log(`Created feature: ${featureName}`)
			} else {
				// eslint-disable-next-line no-console
				console.log(`Feature already exists: ${featureName}`)
			}
		}

		// Get all rooms
		const rooms = await prisma.room.findMany({
			where: { isDeleted: false },
			select: { id: true, name: true },
		})

		// eslint-disable-next-line no-console
		console.log(`\nFound ${rooms.length} rooms. Now you can assign features to each room.`)

		// Get all features for assignment
		const allFeatures = await prisma.roomFeature.findMany({
			select: { id: true, name: true },
		})

		// eslint-disable-next-line no-console
		console.log("\nAvailable features:")
		allFeatures.forEach((feature, index) => {
			// eslint-disable-next-line no-console
			console.log(`${index + 1}. ${feature.name} (ID: ${feature.id})`)
		})

		// eslint-disable-next-line no-console
		console.log("\nFor each room, you can assign features by using the room ID and feature IDs.")
		// eslint-disable-next-line no-console
		console.log(
			"Example: npx tsx prisma/migrations/scripts/assign-room-features.ts --roomId=room123 --featureIds=feature1,feature2,feature3"
		)

		// eslint-disable-next-line no-console
		console.log("\nAvailable rooms:")
		rooms.forEach((room) => {
			// eslint-disable-next-line no-console
			console.log(`- ${room.name} (ID: ${room.id})`)
		})

		// eslint-disable-next-line no-console
		console.log(`\nCreated ${createdFeatures} new features out of ${commonFeatures.length} common features.`)
		// eslint-disable-next-line no-console
		console.log("You can now use the assign-room-features.ts script to assign features to rooms.")
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error creating room features:", error)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
createRoomFeatures()
