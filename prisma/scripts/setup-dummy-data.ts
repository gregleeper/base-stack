import { execSync } from "node:child_process"
import * as crypto from "node:crypto"
import { PrismaClient } from "@prisma/client"

// Create a single Prisma client instance to be used throughout the script
const prisma = new PrismaClient()

// Console colors for nice output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	blue: "\x1b[34m",
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
	log: (message: string) => process.stdout.write(`${message}\n`),
}

// Function to hash password (simple for demo purposes)
function hashPassword(password: string): string {
	return crypto.createHash("sha256").update(password).digest("hex")
}

// Step 1: Update Prisma client
async function updatePrismaClient(): Promise<void> {
	logger.step("Step 1: Updating Prisma client...")
	try {
		execSync("npx prisma generate", { stdio: "inherit" })
		logger.success("Prisma client updated successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error updating Prisma client:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 2: Create sample buildings and rooms
async function createBuildingsAndRooms(): Promise<void> {
	logger.step("Step 2: Creating sample buildings and rooms...")

	try {
		// Ensure building categories exist
		const buildingCategories = [
			{ id: "ADMINISTRATIVE", name: "Administrative" },
			{ id: "ELEMENTARY", name: "Elementary School" },
			{ id: "JUNIOR_HIGH", name: "Junior High School" },
			{ id: "HIGH_SCHOOL", name: "High School" },
			{ id: "GYMNASIUM", name: "Gymnasium" },
			{ id: "OTHER", name: "Other" },
		]

		// Create building categories if they don't exist
		for (const category of buildingCategories) {
			const existingCategory = await prisma.buildingCategory.findUnique({
				where: { id: category.id },
			})

			if (!existingCategory) {
				await prisma.buildingCategory.create({
					data: category,
				})
				logger.info(`Created building category: ${category.name} (ID: ${category.id})`)
			}
		}

		// Ensure room types exist
		const roomTypes = [
			{ id: "MEETING_ROOM", name: "Meeting Room", description: "Room for meetings and discussions" },
			{ id: "CONFERENCE_ROOM", name: "Conference Room", description: "Large room for conferences and presentations" },
			{ id: "CLASSROOM", name: "Classroom", description: "Standard classroom for teaching" },
			{ id: "COMPUTER_LAB", name: "Computer Lab", description: "Lab with computers for technical work" },
			{ id: "SCIENCE_LAB", name: "Science Lab", description: "Lab for scientific experiments" },
			{ id: "GYMNASIUM", name: "Gymnasium", description: "Large room for physical activities" },
			{ id: "FITNESS_ROOM", name: "Fitness Room", description: "Room with fitness equipment" },
			{ id: "BOARD_ROOM", name: "Board Room", description: "Formal meeting room for executives" },
			{ id: "LECTURE_HALL", name: "Lecture Hall", description: "Large room for lectures" },
			{ id: "AUDITORIUM", name: "Auditorium", description: "Large room for performances or presentations" },
			{ id: "CAFETERIA", name: "Cafeteria", description: "Room for eating and socializing" },
			{ id: "KITCHEN", name: "Kitchen", description: "Room for food preparation" },
			{ id: "SWIMMING_POOL", name: "Swimming Pool", description: "Pool for swimming activities" },
			{ id: "OTHER", name: "Other", description: "Other type of room" },
		]

		// Create room types if they don't exist
		for (const type of roomTypes) {
			const existingType = await prisma.roomType.findUnique({
				where: { id: type.id },
			})

			if (!existingType) {
				await prisma.roomType.create({
					data: type,
				})
				logger.info(`Created room type: ${type.name} (ID: ${type.id})`)
			}
		}

		// Sample buildings with different categories
		const buildings = [
			{
				name: "Main Office Building",
				address: "123 Admin Drive",
				categoryId: "ADMINISTRATIVE",
			},
			{
				name: "Sunshine Elementary School",
				address: "456 Learning Lane",
				categoryId: "ELEMENTARY",
			},
			{
				name: "Westside Junior High",
				address: "789 Student Avenue",
				categoryId: "JUNIOR_HIGH",
			},
			{
				name: "Central High School",
				address: "101 Education Road",
				categoryId: "HIGH_SCHOOL",
			},
			{
				name: "Community Sports Center",
				address: "202 Sports Way",
				categoryId: "GYMNASIUM",
			},
		]

		// Create buildings
		for (const buildingData of buildings) {
			const existingBuilding = await prisma.building.findFirst({
				where: { name: buildingData.name },
			})

			if (!existingBuilding) {
				const building = await prisma.building.create({
					data: {
						name: buildingData.name,
						address: buildingData.address,
						categoryId: buildingData.categoryId,
						createdBy: "system",
					},
				})
				logger.info(`Created building: ${building.name} (ID: ${building.id})`)
			} else {
				logger.info(`Building "${buildingData.name}" already exists, skipping creation.`)
			}
		}

		// Get all buildings to add rooms
		const createdBuildings = await prisma.building.findMany({
			include: {
				category: true,
			},
		})

		// Create rooms for each building
		for (const building of createdBuildings) {
			// Define rooms based on building category
			let rooms: Array<{ name: string; floor: number; capacity: number; typeId: string }> = []

			switch (building.categoryId) {
				case "ADMINISTRATIVE":
					rooms = [
						{ name: "Conference Room A", floor: 1, capacity: 20, typeId: "CONFERENCE_ROOM" },
						{ name: "Conference Room B", floor: 1, capacity: 10, typeId: "CONFERENCE_ROOM" },
						{ name: "Board Room", floor: 2, capacity: 30, typeId: "BOARD_ROOM" },
					]
					break
				case "ELEMENTARY":
					rooms = [
						{ name: "Classroom 101", floor: 1, capacity: 25, typeId: "CLASSROOM" },
						{ name: "Science Lab", floor: 1, capacity: 20, typeId: "SCIENCE_LAB" },
						{ name: "Cafeteria", floor: 1, capacity: 100, typeId: "CAFETERIA" },
					]
					break
				case "JUNIOR_HIGH":
					rooms = [
						{ name: "Classroom 201", floor: 2, capacity: 30, typeId: "CLASSROOM" },
						{ name: "Computer Lab", floor: 2, capacity: 25, typeId: "COMPUTER_LAB" },
						{ name: "Auditorium", floor: 1, capacity: 200, typeId: "AUDITORIUM" },
					]
					break
				case "HIGH_SCHOOL":
					rooms = [
						{ name: "Lecture Hall", floor: 1, capacity: 100, typeId: "LECTURE_HALL" },
						{ name: "Chemistry Lab", floor: 3, capacity: 24, typeId: "SCIENCE_LAB" },
						{ name: "Meeting Room", floor: 2, capacity: 15, typeId: "MEETING_ROOM" },
					]
					break
				case "GYMNASIUM":
					rooms = [
						{ name: "Main Gym", floor: 1, capacity: 200, typeId: "GYMNASIUM" },
						{ name: "Fitness Room", floor: 1, capacity: 30, typeId: "FITNESS_ROOM" },
						{ name: "Pool Area", floor: 1, capacity: 50, typeId: "SWIMMING_POOL" },
					]
					break
				default:
					rooms = []
					break
			}

			// Create rooms
			for (const roomData of rooms) {
				const existingRoom = await prisma.room.findFirst({
					where: {
						name: roomData.name,
						buildingId: building.id,
					},
				})

				if (!existingRoom) {
					const room = await prisma.room.create({
						data: {
							name: roomData.name,
							floor: roomData.floor,
							capacity: roomData.capacity,
							typeId: roomData.typeId,
							buildingId: building.id,
							createdBy: "system",
						},
					})
					logger.info(`Created room: ${room.name} in ${building.name} (ID: ${room.id})`)
				} else {
					logger.info(`Room "${roomData.name}" in building "${building.name}" already exists, skipping.`)
				}
			}
		}

		logger.info("Building and room creation complete!")
		logger.success("Sample buildings and rooms created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating buildings and rooms:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 3: Create room features
async function createRoomFeatures(): Promise<void> {
	logger.step("Step 3: Adding common room features...")

	try {
		// Define common room features
		const features = [
			// Technology
			{ name: "Projector" },
			{ name: "HDMI Connection" },
			{ name: "VGA Connection" },
			{ name: "Smart Board" },
			{ name: "Document Camera" },
			{ name: "Video Conferencing" },
			{ name: "Surround Sound" },
			{ name: "WiFi" },
			{ name: "Ethernet Ports" },

			// Furniture & Equipment
			{ name: "Whiteboard" },
			{ name: "Flip Chart" },
			{ name: "Podium" },
			{ name: "Movable Tables" },
			{ name: "Fixed Tables" },
			{ name: "Ergonomic Chairs" },
			{ name: "Desk Chairs" },
			{ name: "Lounge Seating" },

			// Amenities
			{ name: "Air Conditioning" },
			{ name: "Heating" },
			{ name: "Natural Light" },
			{ name: "Blackout Blinds" },
			{ name: "Coffee Machine" },
			{ name: "Water Dispenser" },

			// Specialized
			{ name: "Lab Equipment" },
			{ name: "Exercise Equipment" },
			{ name: "Swimming Facilities" },
		]

		// Create features
		for (const featureData of features) {
			const existingFeature = await prisma.roomFeature.findFirst({
				where: { name: featureData.name },
			})

			if (!existingFeature) {
				const feature = await prisma.roomFeature.create({
					data: featureData,
				})
				logger.info(`Created feature: ${feature.name} (ID: ${feature.id})`)
			} else {
				logger.info(`Feature "${featureData.name}" already exists, skipping.`)
			}
		}

		// List all available features
		const allFeatures = await prisma.roomFeature.findMany({
			orderBy: { name: "asc" },
		})

		logger.info("\nAvailable features:")
		for (const feature of allFeatures) {
			logger.info(`- ${feature.name} (ID: ${feature.id})`)
		}

		logger.info("Feature creation complete!")
		logger.success("Room features created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating room features:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 4: Assign features to rooms
async function assignFeaturesToRooms(): Promise<void> {
	logger.step("Step 4: Assigning features to rooms...")

	try {
		// Get all rooms
		const rooms = await prisma.room.findMany({
			include: {
				type: true,
				building: true,
				features: true,
			},
		})

		// Get all features
		const features = await prisma.roomFeature.findMany()

		// Define features for each room type
		const roomTypeFeatures: Record<string, string[]> = {
			"Conference Room": [
				"Projector",
				"HDMI Connection",
				"VGA Connection",
				"WiFi",
				"Whiteboard",
				"Video Conferencing",
				"Air Conditioning",
				"Movable Tables",
				"Ergonomic Chairs",
			],
			"Board Room": [
				"Projector",
				"HDMI Connection",
				"Video Conferencing",
				"WiFi",
				"Whiteboard",
				"Air Conditioning",
				"Fixed Tables",
				"Ergonomic Chairs",
				"Coffee Machine",
				"Water Dispenser",
			],
			Classroom: [
				"Projector",
				"HDMI Connection",
				"Smart Board",
				"WiFi",
				"Whiteboard",
				"Air Conditioning",
				"Fixed Tables",
				"Desk Chairs",
			],
			"Lecture Hall": [
				"Projector",
				"HDMI Connection",
				"Surround Sound",
				"WiFi",
				"Fixed Tables",
				"Desk Chairs",
				"Air Conditioning",
				"Podium",
			],
			Auditorium: [
				"Projector",
				"HDMI Connection",
				"Surround Sound",
				"WiFi",
				"Air Conditioning",
				"Podium",
				"Video Conferencing",
			],
			"Meeting Room": [
				"Projector",
				"HDMI Connection",
				"WiFi",
				"Whiteboard",
				"Air Conditioning",
				"Movable Tables",
				"Ergonomic Chairs",
			],
			"Computer Lab": [
				"Projector",
				"HDMI Connection",
				"WiFi",
				"Ethernet Ports",
				"Fixed Tables",
				"Desk Chairs",
				"Air Conditioning",
			],
			"Science Lab": ["Lab Equipment", "Whiteboard", "WiFi", "Fixed Tables", "Desk Chairs", "Air Conditioning"],
			Gymnasium: ["WiFi", "Air Conditioning", "Heating"],
			"Fitness Room": ["Exercise Equipment", "WiFi", "Air Conditioning"],
			"Swimming Pool": ["Swimming Facilities", "Air Conditioning"],
			Cafeteria: ["WiFi", "Air Conditioning", "Movable Tables", "Lounge Seating", "Water Dispenser"],
		}

		// Function to get feature by name
		const getFeatureByName = (name: string) => {
			return features.find((f) => f.name === name)
		}

		// Assign features to each room based on its type
		for (const room of rooms) {
			// Skip if no type mapping
			if (!room.type || !roomTypeFeatures[room.type.name]) {
				continue
			}

			// Get the feature list for this room type
			const featureList = roomTypeFeatures[room.type.name]
			const addedFeatures = []

			// For each feature in the list
			for (const featureName of featureList) {
				const feature = getFeatureByName(featureName)
				if (!feature) {
					logger.info(`Feature "${featureName}" not found, skipping.`)
					continue
				}

				// Check if the room already has this feature
				const existingFeature = room.features.find((f) => f.featureId === feature.id)
				if (existingFeature) {
					logger.info(`Room "${room.name}" already has feature "${featureName}", skipping.`)
					continue
				}

				// Create the new feature association
				await prisma.roomFeatures.create({
					data: {
						roomId: room.id,
						featureId: feature.id,
					},
				})
				addedFeatures.push(featureName)
			}

			if (addedFeatures.length > 0) {
				logger.info(`Added ${addedFeatures.length} features to ${room.name} (${room.type.name})`)
			}
		}

		logger.success("Room features assigned successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error assigning features to rooms:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 5: Create sample users
async function createSampleUsers(): Promise<void> {
	logger.step("Step 5: Creating sample users...")

	try {
		// Ensure user roles exist
		const userRoles = [
			{ id: "ADMIN", name: "Administrator" },
			{ id: "USER", name: "Regular User" },
		]

		// Create user roles if they don't exist
		for (const role of userRoles) {
			const existingRole = await prisma.userRole.findUnique({
				where: { id: role.id },
			})

			if (!existingRole) {
				await prisma.userRole.create({
					data: role,
				})
				logger.info(`Created user roles: ${role.name} (ID: ${role.id})`)
			}
		}

		// Create admin user if not exists
		const adminExists = await prisma.user.findUnique({
			where: { email: "admin@example.com" },
		})

		if (!adminExists) {
			const admin = await prisma.user.create({
				data: {
					email: "admin@example.com",
					name: "System Administrator",
					password: hashPassword("admin123"),
					roleId: "ADMIN",
					createdBy: "system",
				},
			})
			logger.info(`Created admin user: ${admin.name} (ID: ${admin.id})`)
		} else {
			logger.info("Admin user already exists, skipping.")
		}

		// Create regular users
		const regularUsers = [
			{ email: "user1@example.com", name: "John Doe" },
			{ email: "user2@example.com", name: "Jane Smith" },
			{ email: "principal@example.com", name: "Principal Johnson" },
			{ email: "coach@example.com", name: "Coach Williams" },
			{ email: "staff@example.com", name: "Staff Member Garcia" },
			{ email: "teacher@example.com", name: "Teacher Brown" },
		]

		for (const userData of regularUsers) {
			const userExists = await prisma.user.findUnique({
				where: { email: userData.email },
			})

			if (!userExists) {
				const user = await prisma.user.create({
					data: {
						email: userData.email,
						name: userData.name,
						password: hashPassword("password123"),
						roleId: "USER",
						createdBy: "system",
					},
				})
				logger.info(`Created user: ${user.name} (ID: ${user.id})`)
			} else {
				logger.info(`User ${userData.email} already exists, skipping.`)
			}
		}

		logger.info("User creation complete!")
		logger.success("Sample users created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating sample users:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 6: Create booking categories
async function createBookingCategories(): Promise<void> {
	logger.step("Step 5: Creating booking categories...")

	try {
		// Define booking categories
		const bookingCategories = [
			{ name: "Meeting", description: "General meetings and discussions" },
			{ name: "Training", description: "Training sessions and workshops" },
			{ name: "Testing", description: "Testing and assessment activities" },
			{ name: "Athletics", description: "General athletic activities" },
			{ name: "Basketball", description: "Basketball games and practice" },
			{ name: "Volleyball", description: "Volleyball games and practice" },
			{ name: "Soccer", description: "Soccer games and practice" },
			{ name: "Swimming", description: "Swimming lessons and practice" },
			{ name: "Social Event", description: "Social gatherings and celebrations" },
			{ name: "Lecture", description: "Educational lectures and presentations" },
			{ name: "Class", description: "Regular classes and instruction" },
			{ name: "Lab Session", description: "Laboratory work and experiments" },
			{ name: "Conference", description: "Conferences and large meetings" },
			{ name: "Other", description: "Other types of bookings" },
		]

		// Create booking categories if they don't exist
		for (const category of bookingCategories) {
			const existingCategory = await prisma.bookingCategory.findUnique({
				where: { name: category.name },
			})

			if (!existingCategory) {
				await prisma.bookingCategory.create({
					data: category,
				})
				logger.info(`Created booking category: ${category.name}`)
			} else {
				logger.info(`Booking category "${category.name}" already exists, skipping.`)
			}
		}

		logger.success("Booking categories created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating booking categories:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 7: Create sample bookings
async function createSampleBookings(): Promise<void> {
	logger.step("Step 6: Creating sample bookings...")

	try {
		// Ensure booking statuses exist
		const bookingStatuses = [
			{ name: "Pending" },
			{ name: "Confirmed" },
			{ name: "Cancelled" },
			{ name: "Rejected" },
			{ name: "Completed" },
		]

		// Create booking statuses if they don't exist
		for (const status of bookingStatuses) {
			const existingStatus = await prisma.bookingStatus.findUnique({
				where: { name: status.name },
			})

			if (!existingStatus) {
				await prisma.bookingStatus.create({
					data: status,
				})
				logger.info(`Created booking status: ${status.name}`)
			}
		}

		// Get all rooms
		const rooms = await prisma.room.findMany({
			where: { isDeleted: false },
			select: {
				id: true,
				name: true,
				type: true,
				building: {
					select: {
						id: true,
						name: true,
						categoryId: true,
						category: true,
					},
				},
			},
		})

		// Get all users
		const users = await prisma.user.findMany({
			where: { isDeleted: false },
			select: { id: true, name: true, email: true },
		})

		// Get all booking categories
		const bookingCategories = await prisma.bookingCategory.findMany()

		if (rooms.length === 0 || users.length === 0 || bookingCategories.length === 0) {
			logger.info("No rooms, users, or booking categories found. Cannot create bookings.")
			return Promise.resolve()
		}

		// Function to get appropriate booking category based on room type
		const getBookingCategoryForRoomType = (roomType: string) => {
			switch (roomType) {
				case "Meeting Room":
				case "Board Room":
					return bookingCategories.find((c) => c.name === "Meeting") || bookingCategories[0]
				case "Classroom":
					return bookingCategories.find((c) => c.name === "Class") || bookingCategories[0]
				case "Computer Lab":
				case "Science Lab":
					return bookingCategories.find((c) => c.name === "Lab Session") || bookingCategories[0]
				case "Gymnasium": {
					// Randomly choose between different athletic categories
					const athleticCategories = ["Athletics", "Basketball", "Volleyball"]
					const randomIndex = Math.floor(Math.random() * athleticCategories.length)
					return (
						bookingCategories.find((c) => c.name === athleticCategories[randomIndex]) ||
						bookingCategories.find((c) => c.name === "Athletics") ||
						bookingCategories[0]
					)
				}
				case "Fitness Room":
					return bookingCategories.find((c) => c.name === "Training") || bookingCategories[0]
				case "Swimming Pool":
					return bookingCategories.find((c) => c.name === "Swimming") || bookingCategories[0]
				case "Conference Room":
					return bookingCategories.find((c) => c.name === "Conference") || bookingCategories[0]
				case "Lecture Hall":
				case "Auditorium":
					return bookingCategories.find((c) => c.name === "Lecture") || bookingCategories[0]
				case "Cafeteria":
					return bookingCategories.find((c) => c.name === "Social Event") || bookingCategories[0]
				default: {
					// Return a random category for other room types
					const randomCatIndex = Math.floor(Math.random() * bookingCategories.length)
					return bookingCategories[randomCatIndex]
				}
			}
		}

		// Create bookings for the next 7 days
		const today = new Date()

		// For each day, create 2-3 bookings per room
		for (let day = 0; day < 7; day++) {
			const bookingDate = new Date(today)
			bookingDate.setDate(today.getDate() + day)

			// Skip weekends for most buildings except gymnasium
			const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6

			for (const room of rooms) {
				// Skip academic buildings on weekends
				if (isWeekend && room.building.categoryId !== "GYMNASIUM" && room.building.categoryId !== "OTHER") {
					continue
				}

				// Create 2-3 bookings per room per day
				const bookingsPerRoom = Math.floor(Math.random() * 2) + 2 // 2-3 bookings

				for (let i = 0; i < bookingsPerRoom; i++) {
					// Random start hour between 8 AM and 4 PM
					const startHour = Math.floor(Math.random() * 8) + 8
					// Random duration between 1-2 hours
					const durationHours = Math.floor(Math.random() * 2) + 1

					const startTime = new Date(bookingDate)
					startTime.setHours(startHour, 0, 0, 0)

					const endTime = new Date(startTime)
					endTime.setHours(startTime.getHours() + durationHours)

					// Random user
					const randomUserIndex = Math.floor(Math.random() * users.length)
					const user = users[randomUserIndex]

					if (!user || !user.id) {
						logger.info(`Skipping booking creation due to missing user for room: ${room.name}`)
						continue
					}

					// Get appropriate booking category based on room type
					const bookingCategory = getBookingCategoryForRoomType(room.type.name)

					// Create booking titles based on room type and category
					let bookingTitle = `${user.name}'s Meeting`

					// Customize title based on booking category
					switch (bookingCategory.name) {
						case "Class":
							bookingTitle = `${user.name}'s Class`
							break
						case "Lab Session":
							bookingTitle = `${user.name}'s Lab Session`
							break
						case "Athletics":
						case "Basketball":
						case "Volleyball":
						case "Soccer":
						case "Swimming":
							bookingTitle = `${user.name}'s ${bookingCategory.name} Practice`
							break
						case "Conference":
							bookingTitle = `${user.name}'s Conference`
							break
						case "Lecture":
							bookingTitle = `${user.name}'s Lecture`
							break
						case "Training":
							bookingTitle = `${user.name}'s Training Workshop`
							break
						case "Social Event":
							bookingTitle = `${user.name}'s Social Event`
							break
						default:
							bookingTitle = `${user.name}'s ${bookingCategory.name}`
							break
					}

					// Check for overlapping bookings
					const overlappingBookings = await prisma.booking.findMany({
						where: {
							roomId: room.id,
							OR: [
								{
									startTime: { lte: startTime },
									endTime: { gt: startTime },
								},
								{
									startTime: { lt: endTime },
									endTime: { gte: endTime },
								},
								{
									startTime: { gte: startTime },
									endTime: { lte: endTime },
								},
							],
						},
					})

					if (overlappingBookings.length > 0) {
						logger.info(`Skipping overlapping booking for ${room.name} at ${startTime.toLocaleString()}`)
						continue
					}

					// Create the booking
					try {
						// Get the confirmed status
						const confirmedStatus = await prisma.bookingStatus.findUnique({
							where: { name: "Confirmed" },
						})

						if (!confirmedStatus) {
							logger.info(`Skipping booking creation for ${room.name} because status "Confirmed" was not found`)
							continue
						}

						const booking = await prisma.booking.create({
							data: {
								title: bookingTitle,
								description: `${bookingCategory.name} booking for a ${room.type.name.toLowerCase()} created by the setup script`,
								startTime,
								endTime,
								statusId: confirmedStatus.id,
								roomId: room.id,
								userId: user.id,
								createdBy: user.id,
								bookingCategoryId: bookingCategory.id,
							},
						})

						logger.info(
							`Created ${bookingCategory.name} booking: ${booking.title} in ${room.name} (${room.building.name}) at ${startTime.toLocaleString()}`
						)
					} catch (error) {
						// Log error but continue with other bookings
						logger.error(`Error creating booking: ${error}`)
					}
				}
			}
		}

		logger.info("Booking creation complete!")
		logger.success("Sample bookings created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating sample bookings:")
		logger.error(error)
		return Promise.reject(error)
	}
}

// Step 8: Create user groups
async function createUserGroups(): Promise<void> {
	logger.step("Step 8: Creating user groups...")

	try {
		// Define user groups
		const userGroups = [
			{ name: "Administrators", description: "System administrators with full access" },
			{ name: "Teachers", description: "Teaching staff with access to classrooms and meeting rooms" },
			{ name: "Students", description: "Students with limited access to resources" },
			{ name: "Athletic Staff", description: "Coaches and athletic department staff" },
			{ name: "Administrative Staff", description: "Office and administrative staff" },
			{ name: "Maintenance", description: "Maintenance and facilities staff" },
			{ name: "Elementary Department", description: "Staff associated with elementary school" },
			{ name: "Junior High Department", description: "Staff associated with junior high school" },
			{ name: "High School Department", description: "Staff associated with high school" },
		]

		// Create user groups if they don't exist
		for (const group of userGroups) {
			const existingGroup = await prisma.userGroup.findUnique({
				where: { name: group.name },
			})

			if (!existingGroup) {
				const newGroup = await prisma.userGroup.create({
					data: {
						name: group.name,
						description: group.description,
						createdBy: "system",
					},
				})
				logger.info(`Created user group: ${newGroup.name} (ID: ${newGroup.id})`)
			} else {
				logger.info(`User group "${group.name}" already exists, skipping.`)
			}
		}

		logger.success("User groups created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error creating user groups:")
		logger.error(String(error))
		return Promise.reject(error)
	}
}

// Step 9: Assign users to groups
async function assignUsersToGroups(): Promise<void> {
	logger.step("Step 9: Assigning users to groups...")

	try {
		// Get all users
		const users = await prisma.user.findMany()

		// Get all groups
		const groups = await prisma.userGroup.findMany()

		// Find specific users and groups by email/name
		const adminUser = users.find((u) => u.email === "admin@example.com")
		const adminGroup = groups.find((g: any) => g.name === "Administrators")
		const teacherUser = users.find((u) => u.email === "teacher@example.com")
		const teachersGroup = groups.find((g: any) => g.name === "Teachers")
		const principalUser = users.find((u) => u.email === "principal@example.com")
		const administrativeGroup = groups.find((g: any) => g.name === "Administrative Staff")
		const coachUser = users.find((u) => u.email === "coach@example.com")
		const athleticGroup = groups.find((g: any) => g.name === "Athletic Staff")
		const user1 = users.find((u) => u.email === "user1@example.com")
		const user2 = users.find((u) => u.email === "user2@example.com")
		const studentsGroup = groups.find((g: any) => g.name === "Students")
		const staffUser = users.find((u) => u.email === "staff@example.com")
		const maintenanceGroup = groups.find((g: any) => g.name === "Maintenance")

		// Define user-group assignments
		const assignments = [
			// Admin is in the Administrators group
			{ userId: adminUser?.id, groupId: adminGroup?.id },

			// Teacher is in Teachers group and High School Department
			{ userId: teacherUser?.id, groupId: teachersGroup?.id },
			{ userId: teacherUser?.id, groupId: groups.find((g) => g.name === "High School Department")?.id },

			// Principal is in Administrative Staff and all school departments
			{ userId: principalUser?.id, groupId: administrativeGroup?.id },
			{ userId: principalUser?.id, groupId: groups.find((g) => g.name === "Elementary Department")?.id },
			{ userId: principalUser?.id, groupId: groups.find((g) => g.name === "Junior High Department")?.id },
			{ userId: principalUser?.id, groupId: groups.find((g) => g.name === "High School Department")?.id },

			// Coach is in Athletic Staff
			{ userId: coachUser?.id, groupId: athleticGroup?.id },

			// Regular users are in Students group
			{ userId: user1?.id, groupId: studentsGroup?.id },
			{ userId: user2?.id, groupId: studentsGroup?.id },

			// Staff is in Administrative Staff and Maintenance
			{ userId: staffUser?.id, groupId: administrativeGroup?.id },
			{ userId: staffUser?.id, groupId: maintenanceGroup?.id },
		]

		// Create assignments if they don't exist and the user and group exist
		for (const assignment of assignments) {
			if (!assignment.userId || !assignment.groupId) {
				logger.info("Skipping invalid user-group assignment (missing user or group)")
				continue
			}

			const existingAssignment = await prisma.userGroupMember.findUnique({
				where: {
					userId_groupId: {
						userId: assignment.userId,
						groupId: assignment.groupId,
					},
				},
			})

			if (!existingAssignment) {
				await prisma.userGroupMember.create({
					data: {
						userId: assignment.userId,
						groupId: assignment.groupId,
						assignedBy: "system",
					},
				})

				// Get the user and group names for logging
				const user = users.find((u) => u.id === assignment.userId)
				const group = groups.find((g) => g.id === assignment.groupId)
				logger.info(`Assigned user: ${user?.name} to group: ${group?.name}`)
			}
		}

		logger.success("Users assigned to groups successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error assigning users to groups:")
		logger.error(String(error))
		return Promise.reject(error)
	}
}

// Step 10: Set up resource access permissions
async function setupResourceAccess(): Promise<void> {
	logger.step("Step 10: Setting up resource access permissions...")

	try {
		// Get all groups
		const groups = await prisma.userGroup.findMany()

		// Get resources
		const buildings = await prisma.building.findMany()
		const rooms = await prisma.room.findMany()
		const equipment = await prisma.equipment.findMany()

		// Find specific groups
		const adminGroup = groups.find((g) => g.name === "Administrators")
		const teachersGroup = groups.find((g) => g.name === "Teachers")
		const studentsGroup = groups.find((g) => g.name === "Students")
		const athleticGroup = groups.find((g) => g.name === "Athletic Staff")
		const adminStaffGroup = groups.find((g) => g.name === "Administrative Staff")
		const maintenanceGroup = groups.find((g) => g.name === "Maintenance")
		const elementaryGroup = groups.find((g) => g.name === "Elementary Department")
		const juniorHighGroup = groups.find((g) => g.name === "Junior High Department")
		const highSchoolGroup = groups.find((g) => g.name === "High School Department")

		// Define access permissions
		const resourceAccess = [
			// Administrators have full access to everything
			...buildings.map((building) => ({
				userGroupId: adminGroup?.id,
				resourceType: "building",
				resourceId: building.id,
				canView: true,
				canBook: true,
				canApprove: true,
				canManage: true,
			})),
			...rooms.map((room) => ({
				userGroupId: adminGroup?.id,
				resourceType: "room",
				resourceId: room.id,
				canView: true,
				canBook: true,
				canApprove: true,
				canManage: true,
			})),
			...equipment.map((item) => ({
				userGroupId: adminGroup?.id,
				resourceType: "equipment",
				resourceId: item.id,
				canView: true,
				canBook: true,
				canApprove: true,
				canManage: true,
			})),

			// Teachers can view and book most rooms but not manage them
			...rooms.map((room) => ({
				userGroupId: teachersGroup?.id,
				resourceType: "room",
				resourceId: room.id,
				canView: true,
				canBook: true,
				canApprove: false,
				canManage: false,
			})),

			// Students can only view rooms but not book or manage them
			...rooms.map((room) => ({
				userGroupId: studentsGroup?.id,
				resourceType: "room",
				resourceId: room.id,
				canView: true,
				canBook: false,
				canApprove: false,
				canManage: false,
			})),

			// Athletic staff can view, book, and approve athletic facilities
			...rooms
				.filter(
					(room) => room.typeId === "GYMNASIUM" || room.typeId === "FITNESS_ROOM" || room.typeId === "SWIMMING_POOL"
				)
				.map((room) => ({
					userGroupId: athleticGroup?.id,
					resourceType: "room",
					resourceId: room.id,
					canView: true,
					canBook: true,
					canApprove: true,
					canManage: false,
				})),

			// Administrative staff can view and book all resources and approve some
			...rooms.map((room) => ({
				userGroupId: adminStaffGroup?.id,
				resourceType: "room",
				resourceId: room.id,
				canView: true,
				canBook: true,
				canApprove: room.typeId === "MEETING_ROOM" || room.typeId === "CONFERENCE_ROOM" || room.typeId === "BOARD_ROOM",
				canManage: false,
			})),

			// Maintenance staff can view all resources and manage some
			...rooms.map((room) => ({
				userGroupId: maintenanceGroup?.id,
				resourceType: "room",
				resourceId: room.id,
				canView: true,
				canBook: false,
				canApprove: false,
				canManage: true,
			})),
			...equipment.map((item) => ({
				userGroupId: maintenanceGroup?.id,
				resourceType: "equipment",
				resourceId: item.id,
				canView: true,
				canBook: false,
				canApprove: false,
				canManage: true,
			})),

			// Elementary department can book elementary school buildings
			...buildings
				.filter((building) => building.categoryId === "ELEMENTARY")
				.map((building) => ({
					userGroupId: elementaryGroup?.id,
					resourceType: "building",
					resourceId: building.id,
					canView: true,
					canBook: true,
					canApprove: false,
					canManage: false,
				})),

			// Junior High department can book junior high school buildings
			...buildings
				.filter((building) => building.categoryId === "JUNIOR_HIGH")
				.map((building) => ({
					userGroupId: juniorHighGroup?.id,
					resourceType: "building",
					resourceId: building.id,
					canView: true,
					canBook: true,
					canApprove: false,
					canManage: false,
				})),

			// High School department can book high school buildings
			...buildings
				.filter((building) => building.categoryId === "HIGH_SCHOOL")
				.map((building) => ({
					userGroupId: highSchoolGroup?.id,
					resourceType: "building",
					resourceId: building.id,
					canView: true,
					canBook: true,
					canApprove: false,
					canManage: false,
				})),
		]

		// Create resource access entries, filtering out any with missing group IDs
		const validResourceAccess = resourceAccess.filter((access) => access.userGroupId)

		for (const access of validResourceAccess) {
			try {
				await prisma.resourceAccess.create({
					data: {
						...access,
						resourceId: access.resourceId,
						createdBy: "system",
						userGroupId: access.userGroupId as string,
					},
				})
			} catch (err) {
				// Just log and continue if there's an error with one entry
				// (likely due to unique constraint violations)
				logger.info(
					`Skipping duplicate resource access entry: ${access.resourceType}:${access.resourceId} for group ${access.userGroupId}`
				)
			}
		}

		logger.info(`Created ${validResourceAccess.length} resource access permissions`)
		logger.success("Resource access permissions created successfully.\n")
		return Promise.resolve()
	} catch (error) {
		logger.error("Error setting up resource access permissions:")
		logger.error(String(error))
		return Promise.reject(error)
	}
}

// Main function to run all steps in sequence
async function main() {
	try {
		// Run all steps in sequence
		await updatePrismaClient()
		await createBuildingsAndRooms()
		await createRoomFeatures()
		await assignFeaturesToRooms()
		await createSampleUsers()
		await createBookingCategories()
		await createSampleBookings()
		await createUserGroups()
		await assignUsersToGroups()
		await setupResourceAccess()

		// Final summary
		logger.success("===============================================")
		logger.success("Dummy data setup complete!")
		logger.success("===============================================")
		logger.info("The following data has been created:")
		logger.info(
			"- Sample buildings with different categories (Administrative, Elementary, Junior High, High School, etc.)"
		)
		logger.info("- Sample rooms on various floors of each building")
		logger.info("- Room features")
		logger.info("- Feature assignments to rooms based on room type")
		logger.info("- Admin user (admin@example.com / admin123)")
		logger.info("- Regular users (password: password123)")
		logger.info("- Booking categories (Meeting, Training, Athletics, etc.)")
		logger.info("- Sample bookings for the next 7 days with appropriate categories")
		logger.info("- User groups (Administrators, Teachers, Students, etc.)")
		logger.info("- User assignments to groups based on roles")
		logger.info("- Resource access permissions based on group membership")
		logger.info("\nYou can now start using the application with this sample data.")
	} catch (error) {
		logger.error("Setup failed with an error:")
		logger.error(error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
main()
