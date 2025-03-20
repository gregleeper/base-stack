import { prisma } from "~/services/db.server"

/**
 * Get all building categories
 * @returns Array of building categories
 */
export async function getBuildingCategories() {
	return prisma.buildingCategory.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	})
}

/**
 * Get a building category by ID
 * @param id The category ID
 * @returns The category or null if not found
 */
export async function getBuildingCategory(id: string) {
	return prisma.buildingCategory.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
		},
	})
}
