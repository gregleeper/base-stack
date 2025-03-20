import type { UserGroup } from "@prisma/client"
import { parseJsonField, prisma, stringifyJsonField } from "./db.server"

/**
 * Room service for handling room operations
 */

export type RoomFeature =
	| "projector"
	| "whiteboard"
	| "videoConference"
	| "wifi"
	| "catering"
	| "airConditioning"
	| "naturalLight"
	| "hdmiPort"
	| "usbPort"
	| "wheelchairAccessible"

export async function getRooms(options?: {
	buildingId?: string
	capacity?: number
	features?: RoomFeature[]
	isActive?: boolean
}) {
	const { buildingId, capacity, features, isActive = true } = options || {}

	const rooms = await prisma.room.findMany({
		where: {
			buildingId: buildingId ? buildingId : undefined,
			capacity: capacity ? { gte: capacity } : undefined,
			isActive,
		},
		include: {
			building: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	// Process the features filter if needed
	if (features && features.length > 0) {
		return rooms.filter((room) => {
			const roomFeatures = parseJsonField<RoomFeature[]>(room.features)
			if (!roomFeatures) return false

			// Check if the room has all the requested features
			return features.every((feature) => roomFeatures.includes(feature))
		})
	}

	return rooms
}

export async function getRoomById(id: string) {
	const room = await prisma.room.findUnique({
		where: { id },
		include: {
			building: true,
		},
	})

	if (!room) return null

	// Parse the features JSON
	const roomWithParsedFeatures = {
		...room,
		features: parseJsonField<RoomFeature[]>(room.features) || [],
	}

	return roomWithParsedFeatures
}

export async function createRoom(data: {
	name: string
	buildingId: string
	floor: number
	capacity: number
	features: RoomFeature[]
	isActive?: boolean
}) {
	// Ensure features is a string and not null
	const featuresJson = stringifyJsonField(data.features) || "[]"

	return prisma.room.create({
		data: {
			...data,
			features: featuresJson,
		},
		include: {
			building: true,
		},
	})
}

export async function updateRoom(
	id: string,
	data: Partial<{
		name: string
		floor: number
		capacity: number
		features: RoomFeature[]
		isActive: boolean
	}>
) {
	// Create a shallow copy of the data object
	const updateData: Record<string, unknown> = { ...data }

	// Handle the features field if it exists
	if (data.features) {
		updateData.features = stringifyJsonField(data.features) || "[]"
	}

	return prisma.room.update({
		where: { id },
		// Type assertion to satisfy the Prisma update type
		data: updateData as any,
		include: {
			building: true,
		},
	})
}

export async function deleteRoom(id: string) {
	return prisma.room.delete({
		where: { id },
	})
}

export async function getRoomsByUserGroups(userGroups: UserGroup[]) {
	const resourceAccess = await prisma.resourceAccess.findMany({
		where: {
			userGroupId: { in: userGroups.map((group) => group.id) },
			resourceType: "room",
		},
	})
	const rooms = await prisma.room.findMany({
		where: { id: { in: resourceAccess.map((access) => access.resourceId) } },
	})
	return rooms
}
