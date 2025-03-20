import { PrismaClient } from "@prisma/client"

/**
 * Script to assign features to a specific room
 * Usage: npx tsx prisma/migrations/scripts/assign-room-features.ts --roomId=<roomId> --featureIds=<featureId1,featureId2,...>
 */

const prisma = new PrismaClient()

async function assignFeaturesToRoom() {
	try {
		// Parse command line arguments
		const args = process.argv.slice(2)
		const roomIdArg = args.find((arg) => arg.startsWith("--roomId="))
		const featureIdsArg = args.find((arg) => arg.startsWith("--featureIds="))

		if (!roomIdArg || !featureIdsArg) {
			// eslint-disable-next-line no-console
			console.error("Error: Missing required arguments.")
			// eslint-disable-next-line no-console
			console.log(
				"Usage: npx tsx prisma/migrations/scripts/assign-room-features.ts --roomId=<roomId> --featureIds=<featureId1,featureId2,...>"
			)
			process.exit(1)
		}

		const roomId = roomIdArg.replace("--roomId=", "")
		const featureIds = featureIdsArg.replace("--featureIds=", "").split(",")

		// Verify room exists
		const room = await prisma.room.findUnique({
			where: { id: roomId },
			select: { id: true, name: true },
		})

		if (!room) {
			// eslint-disable-next-line no-console
			console.error(`Error: Room with ID ${roomId} not found.`)
			process.exit(1)
		}

		// eslint-disable-next-line no-console
		console.log(`Assigning features to room: ${room.name} (ID: ${room.id})`)

		// Verify all features exist
		const features = await prisma.roomFeature.findMany({
			where: { id: { in: featureIds } },
			select: { id: true, name: true },
		})

		if (features.length !== featureIds.length) {
			const foundIds = features.map((f) => f.id)
			const missingIds = featureIds.filter((id) => !foundIds.includes(id))
			// eslint-disable-next-line no-console
			console.error(`Error: Some feature IDs were not found: ${missingIds.join(", ")}`)
			process.exit(1)
		}

		// Create relationships
		let createdCount = 0
		let alreadyExistCount = 0

		for (const featureId of featureIds) {
			// Check if relationship already exists
			const existingRelationship = await prisma.roomFeatures.findUnique({
				where: {
					roomId_featureId: {
						roomId: room.id,
						featureId: featureId,
					},
				},
			})

			if (!existingRelationship) {
				await prisma.roomFeatures.create({
					data: {
						roomId: room.id,
						featureId: featureId,
					},
				})
				createdCount++
			} else {
				alreadyExistCount++
			}
		}

		// eslint-disable-next-line no-console
		console.log(`\nAssignment complete!`)
		// eslint-disable-next-line no-console
		console.log(`- Created ${createdCount} new feature relationships`)
		// eslint-disable-next-line no-console
		console.log(`- ${alreadyExistCount} feature relationships already existed`)

		// Show the assigned features
		// eslint-disable-next-line no-console
		console.log(`\nFeatures assigned to room "${room.name}":`)
		for (const feature of features) {
			// eslint-disable-next-line no-console
			console.log(`- ${feature.name} (ID: ${feature.id})`)
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error assigning features to room:", error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
assignFeaturesToRoom()
