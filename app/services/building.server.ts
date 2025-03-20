import type { UserGroup } from "@prisma/client"
import { prisma } from "./db.server"

/**
 * Building service for managing buildings
 */

export async function getBuildings() {
	return prisma.building.findMany({
		orderBy: {
			name: "asc",
		},
		include: {
			rooms: true,
		},
	})
}

export async function getBuildingsByUserGroups(userGroups: UserGroup[]) {
	const resourceAccess = await prisma.resourceAccess.findMany({
		where: {
			userGroupId: { in: userGroups.map((group) => group.id) },
			resourceType: "building",
		},
	})
	const buildings = await prisma.building.findMany({
		where: {
			id: { in: resourceAccess.map((access) => access.resourceId) },
		},
		include: {
			rooms: true,
		},
	})
	return buildings
}

export async function getBuildingById(id: string) {
	return prisma.building.findUnique({
		where: { id },
		include: {
			rooms: true,
		},
	})
}

export async function createBuilding(data: {
	name: string
	address: string
	floors: number
	categoryId: string
}) {
	return prisma.building.create({
		data,
	})
}

export async function updateBuilding(
	id: string,
	data: Partial<{
		name: string
		address: string
		floors: number
		categoryId: string
	}>
) {
	return prisma.building.update({
		where: { id },
		data,
	})
}

export async function deleteBuilding(id: string) {
	// First check if there are any rooms in this building
	const roomCount = await prisma.room.count({
		where: { buildingId: id },
	})

	if (roomCount > 0) {
		throw new Error(
			`Cannot delete building with ID ${id} because it contains ${roomCount} rooms. Please delete the rooms first.`
		)
	}

	return prisma.building.delete({
		where: { id },
	})
}
