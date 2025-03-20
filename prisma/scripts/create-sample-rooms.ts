import { BuildingCategory, PrismaClient } from "@prisma/client"

/**
 * Script to create sample rooms and buildings for testing
 */

const prisma = new PrismaClient()

async function createSampleRooms() {
	try {
		// eslint-disable-next-line no-console
		console.log("Starting to create sample buildings and rooms...")

		// Create sample buildings
		// eslint-disable-next-line no-console
		console.log("Creating sample buildings...")

		const mainBuilding = await prisma.building.create({
			data: {
				name: "Main Office Building",
				address: "123 Main Street, Anytown, AN 12345",
				floors: 3,
				category: BuildingCategory.ADMINISTRATIVE,
				createdBy: "system",
			},
		})

		const elementarySchool = await prisma.building.create({
			data: {
				name: "Sunshine Elementary School",
				address: "456 Branch Avenue, Anytown, AN 12345",
				floors: 2,
				category: BuildingCategory.ELEMENTARY,
				createdBy: "system",
			},
		})

		const juniorHighSchool = await prisma.building.create({
			data: {
				name: "Lakeside Junior High",
				address: "789 Lake Road, Anytown, AN 12345",
				floors: 3,
				category: BuildingCategory.JUNIOR_HIGH,
				createdBy: "system",
			},
		})

		const highSchool = await prisma.building.create({
			data: {
				name: "Anytown High School",
				address: "101 Education Blvd, Anytown, AN 12345",
				floors: 4,
				category: BuildingCategory.HIGH_SCHOOL,
				createdBy: "system",
			},
		})

		const gymnasium = await prisma.building.create({
			data: {
				name: "Central Gymnasium",
				address: "200 Sports Ave, Anytown, AN 12345",
				floors: 1,
				category: BuildingCategory.GYMNASIUM,
				createdBy: "system",
			},
		})

		// eslint-disable-next-line no-console
		console.log(`Created building: ${mainBuilding.name} (ID: ${mainBuilding.id}) - ${BuildingCategory.ADMINISTRATIVE}`)
		// eslint-disable-next-line no-console
		console.log(
			`Created building: ${elementarySchool.name} (ID: ${elementarySchool.id}) - ${BuildingCategory.ELEMENTARY}`
		)
		// eslint-disable-next-line no-console
		console.log(
			`Created building: ${juniorHighSchool.name} (ID: ${juniorHighSchool.id}) - ${BuildingCategory.JUNIOR_HIGH}`
		)
		// eslint-disable-next-line no-console
		console.log(`Created building: ${highSchool.name} (ID: ${highSchool.id}) - ${BuildingCategory.HIGH_SCHOOL}`)
		// eslint-disable-next-line no-console
		console.log(`Created building: ${gymnasium.name} (ID: ${gymnasium.id}) - ${BuildingCategory.GYMNASIUM}`)

		// Create sample rooms in the main building
		// eslint-disable-next-line no-console
		console.log("\nCreating sample rooms in Main Office Building...")

		const conferenceRoom = await prisma.room.create({
			data: {
				name: "Conference Room A",
				floor: 1,
				capacity: 12,
				buildingId: mainBuilding.id,
				createdBy: "system",
			},
		})

		const boardRoom = await prisma.room.create({
			data: {
				name: "Board Room",
				floor: 3,
				capacity: 20,
				buildingId: mainBuilding.id,
				createdBy: "system",
			},
		})

		const meetingRoom = await prisma.room.create({
			data: {
				name: "Meeting Room 101",
				floor: 1,
				capacity: 8,
				buildingId: mainBuilding.id,
				createdBy: "system",
			},
		})

		// Create sample rooms in the elementary school
		// eslint-disable-next-line no-console
		console.log("\nCreating sample rooms in Elementary School...")

		const classroom1 = await prisma.room.create({
			data: {
				name: "Classroom 101",
				floor: 1,
				capacity: 25,
				buildingId: elementarySchool.id,
				createdBy: "system",
			},
		})

		const classroom2 = await prisma.room.create({
			data: {
				name: "Classroom 102",
				floor: 1,
				capacity: 25,
				buildingId: elementarySchool.id,
				createdBy: "system",
			},
		})

		const artRoom = await prisma.room.create({
			data: {
				name: "Art Room",
				floor: 2,
				capacity: 20,
				buildingId: elementarySchool.id,
				createdBy: "system",
			},
		})

		// Create sample rooms in the junior high school
		// eslint-disable-next-line no-console
		console.log("\nCreating sample rooms in Junior High School...")

		const scienceLab = await prisma.room.create({
			data: {
				name: "Science Lab",
				floor: 2,
				capacity: 30,
				buildingId: juniorHighSchool.id,
				createdBy: "system",
			},
		})

		const computerLab = await prisma.room.create({
			data: {
				name: "Computer Lab",
				floor: 1,
				capacity: 24,
				buildingId: juniorHighSchool.id,
				createdBy: "system",
			},
		})

		// Create sample rooms in the high school
		// eslint-disable-next-line no-console
		console.log("\nCreating sample rooms in High School...")

		const lectureHall = await prisma.room.create({
			data: {
				name: "Lecture Hall",
				floor: 1,
				capacity: 100,
				buildingId: highSchool.id,
				createdBy: "system",
			},
		})

		const physicsLab = await prisma.room.create({
			data: {
				name: "Physics Lab",
				floor: 3,
				capacity: 24,
				buildingId: highSchool.id,
				createdBy: "system",
			},
		})

		// Create sample rooms in the gymnasium
		// eslint-disable-next-line no-console
		console.log("\nCreating sample rooms in Gymnasium...")

		const mainGym = await prisma.room.create({
			data: {
				name: "Main Gymnasium",
				floor: 1,
				capacity: 200,
				buildingId: gymnasium.id,
				createdBy: "system",
			},
		})

		const weightsRoom = await prisma.room.create({
			data: {
				name: "Weights Room",
				floor: 1,
				capacity: 15,
				buildingId: gymnasium.id,
				createdBy: "system",
			},
		})

		// List all created rooms
		// eslint-disable-next-line no-console
		console.log("\nCreated the following rooms:")

		// Administrative Building
		// eslint-disable-next-line no-console
		console.log(`\nIn ${mainBuilding.name} (${BuildingCategory.ADMINISTRATIVE}):`)
		// eslint-disable-next-line no-console
		console.log(`- ${conferenceRoom.name} (Floor: ${conferenceRoom.floor}, ID: ${conferenceRoom.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${boardRoom.name} (Floor: ${boardRoom.floor}, ID: ${boardRoom.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${meetingRoom.name} (Floor: ${meetingRoom.floor}, ID: ${meetingRoom.id})`)

		// Elementary School
		// eslint-disable-next-line no-console
		console.log(`\nIn ${elementarySchool.name} (${BuildingCategory.ELEMENTARY}):`)
		// eslint-disable-next-line no-console
		console.log(`- ${classroom1.name} (Floor: ${classroom1.floor}, ID: ${classroom1.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${classroom2.name} (Floor: ${classroom2.floor}, ID: ${classroom2.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${artRoom.name} (Floor: ${artRoom.floor}, ID: ${artRoom.id})`)

		// Junior High School
		// eslint-disable-next-line no-console
		console.log(`\nIn ${juniorHighSchool.name} (${BuildingCategory.JUNIOR_HIGH}):`)
		// eslint-disable-next-line no-console
		console.log(`- ${scienceLab.name} (Floor: ${scienceLab.floor}, ID: ${scienceLab.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${computerLab.name} (Floor: ${computerLab.floor}, ID: ${computerLab.id})`)

		// High School
		// eslint-disable-next-line no-console
		console.log(`\nIn ${highSchool.name} (${BuildingCategory.HIGH_SCHOOL}):`)
		// eslint-disable-next-line no-console
		console.log(`- ${lectureHall.name} (Floor: ${lectureHall.floor}, ID: ${lectureHall.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${physicsLab.name} (Floor: ${physicsLab.floor}, ID: ${physicsLab.id})`)

		// Gymnasium
		// eslint-disable-next-line no-console
		console.log(`\nIn ${gymnasium.name} (${BuildingCategory.GYMNASIUM}):`)
		// eslint-disable-next-line no-console
		console.log(`- ${mainGym.name} (Floor: ${mainGym.floor}, ID: ${mainGym.id})`)
		// eslint-disable-next-line no-console
		console.log(`- ${weightsRoom.name} (Floor: ${weightsRoom.floor}, ID: ${weightsRoom.id})`)

		// Provide next steps
		// eslint-disable-next-line no-console
		console.log("\nNext steps:")
		// eslint-disable-next-line no-console
		console.log("1. Run the add-room-features.ts script to create features (if not already done)")
		// eslint-disable-next-line no-console
		console.log("2. Assign features to rooms using assign-room-features.ts")
		// eslint-disable-next-line no-console
		console.log(
			"Example: npx tsx prisma/migrations/scripts/assign-room-features.ts --roomId=ROOM_ID --featureIds=FEATURE_ID1,FEATURE_ID2"
		)
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error creating sample rooms:", error)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
createSampleRooms()
