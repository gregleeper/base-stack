import { PrismaClient } from "@prisma/client"
import type { Action, Entity } from "../../app/utils/user"

// Create a Prisma client instance
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
	step: (message: string) => process.stdout.write(`${colors.blue}${message}${colors.reset}\n`),
	success: (message: string) => process.stdout.write(`${colors.green}${message}${colors.reset}\n`),
	warning: (message: string) => process.stdout.write(`${colors.yellow}${message}${colors.reset}\n`),
	error: (message: string | unknown) => {
		process.stdout.write(`${colors.red}${message}${colors.reset}\n`)
		if (message instanceof Error) {
			process.stdout.write(`${colors.red}${message.stack || message.message}${colors.reset}\n`)
		}
	},
	info: (message: string) => process.stdout.write(`\x1b[34m${message}\x1b[0m\n`),
	log: (message: string) => process.stdout.write(`${message}\n`),
}

// Define all available actions, entities, and access types
const ACTIONS: Action[] = ["create", "read", "update", "delete"]

const ENTITIES: Entity[] = [
	"user",
	"note",
	"booking",
	"booking-category",
	"role",
	"permission",
	"building",
	"room",
	"room-type",
	"room-feature",
	"equipment",
	"booking-equipment",
	"booking-approval",
	"approval-status",
	"booking-status",
	"recurring-booking",
	"recurring-frequency",
	"notification-type",
	"notification",
	"notification-recipient",
	"notification-recipient-method",
	"notification-preference",
	"user-preference-delivery-method",
	"user-group",
	"user-group-member",
	"resource-access",
]
// Get all user groups and combine with standard access types
const userGroups = await prisma.userGroup.findMany({
	select: { name: true },
})

const ACCESS_TYPES = ["own", "any", "own,any", "any,own", ...userGroups.map((group) => group.name)]

/**
 * Generate permission descriptions based on the action, entity, and access
 */
function generatePermissionDescription(action: Action, entity: Entity, access: string): string {
	// Format entity for readability (replace hyphens with spaces)
	const formattedEntity = entity.replace(/-/g, " ")

	// For special cases like 'any,own' and 'own,any'
	if (access === "own,any" || access === "any,own") {
		return `Can ${action} both own and any ${formattedEntity}`
	}

	// For user groups (treat them specially)
	if (access !== "own" && access !== "any") {
		// If it's not a standard access type, it might be a user group name
		return `Can ${action} ${formattedEntity} for users in ${access} group`
	}

	// Standard format
	return `Can ${action} ${access === "own" ? "their own" : "any"} ${formattedEntity}`
}

/**
 * Seed all standard permission combinations
 */
async function seedStandardPermissions(): Promise<void> {
	logger.step("Seeding standard permissions (action × entity × access)...")

	// Count for statistics
	let created = 0
	let skipped = 0

	for (const action of ACTIONS) {
		for (const entity of ENTITIES) {
			for (const access of ACCESS_TYPES) {
				// Generate description
				const description = generatePermissionDescription(action, entity, access)

				try {
					// Check if permission already exists
					const existingPermission = await prisma.permission.findUnique({
						where: {
							action_entity_access: {
								action,
								entity,
								access,
							},
						},
					})

					if (!existingPermission) {
						// Create the permission
						await prisma.permission.create({
							data: {
								action,
								entity,
								access,
								description,
							},
						})
						created++

						// Log every 100 created permissions to avoid too much output
						if (created % 100 === 0) {
							logger.info(`Created ${created} permissions...`)
						}
					} else {
						skipped++
					}
				} catch (error) {
					logger.error(`Error creating permission ${action}:${entity}:${access}`)
					logger.error(error)
				}
			}
		}
	}

	logger.success(`Completed! Created ${created} new permissions, skipped ${skipped} existing permissions.`)
}

/**
 * Seed user group specific permissions
 * This function creates permissions that are specific to user groups
 */
async function seedUserGroupPermissions(): Promise<void> {
	logger.step("Seeding user group specific permissions...")

	try {
		// Get all user groups from the database
		const userGroups = await prisma.userGroup.findMany({
			where: { isDeleted: false },
			select: { id: true, name: true },
		})

		if (userGroups.length === 0) {
			logger.warning("No user groups found. Skipping user group specific permissions.")
			return
		}

		logger.info(`Found ${userGroups.length} user groups. Creating permissions for each group...`)

		let created = 0
		let skipped = 0

		// Loop through all actions, entities, and user groups
		for (const action of ACTIONS) {
			for (const entity of ENTITIES) {
				for (const group of userGroups) {
					const access = group.name // Use the group name as the access

					// Generate description
					const description = generatePermissionDescription(action, entity, access)

					try {
						// Check if permission already exists
						const existingPermission = await prisma.permission.findUnique({
							where: {
								action_entity_access: {
									action,
									entity,
									access,
								},
							},
						})

						if (!existingPermission) {
							// Create the permission
							await prisma.permission.create({
								data: {
									action,
									entity,
									access,
									description,
								},
							})
							created++

							// Log every 100 created permissions to avoid too much output
							if (created % 100 === 0) {
								logger.info(`Created ${created} user group permissions...`)
							}
						} else {
							skipped++
						}
					} catch (error) {
						logger.error(`Error creating permission ${action}:${entity}:${access}`)
						logger.error(error)
					}
				}
			}
		}

		logger.success(`Completed! Created ${created} new user group permissions, skipped ${skipped} existing permissions.`)
	} catch (error) {
		logger.error("Error seeding user group permissions:")
		logger.error(String(error))
	}
}

/**
 * Main function to run the permission seeding process
 */
async function main() {
	logger.step("Starting permission seeding process...")

	try {
		// First, seed all standard permissions
		await seedStandardPermissions()

		// Then, seed user group-specific permissions
		await seedUserGroupPermissions()

		// Count total permissions in the database
		const totalPermissions = await prisma.permission.count()
		logger.success(`Done! Total permissions in database: ${totalPermissions}`)
	} catch (error) {
		logger.error("Error in permission seeding process:")
		logger.error(String(error))
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the main function
main().catch((e) => {
	logger.error("Unhandled error in main function:")
	logger.error(e)
	process.exit(1)
})
