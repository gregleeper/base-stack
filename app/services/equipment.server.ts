import { prisma } from "./db.server"

/**
 * Equipment service for managing equipment resources
 */

export async function getEquipment(options?: {
	type?: string
	isAvailable?: boolean
	includeDeleted?: boolean
}) {
	const { type, isAvailable = true, includeDeleted = false } = options || {}

	return prisma.equipment.findMany({
		where: {
			type: type ? type : undefined,
			isAvailable,
			isDeleted: includeDeleted ? undefined : false,
		},
		orderBy: {
			name: "asc",
		},
	})
}

export async function getEquipmentById(id: string, includeDeleted = false) {
	return prisma.equipment.findFirst({
		where: {
			id,
			isDeleted: includeDeleted ? undefined : false,
		},
	})
}

export async function createEquipment(data: {
	name: string
	type: string
	location?: string
	isAvailable?: boolean
	createdBy: string // User ID who's creating
}) {
	return prisma.equipment.create({
		data,
	})
}

export async function updateEquipment(
	id: string,
	data: Partial<{
		name: string
		type: string
		location: string
		isAvailable: boolean
		updatedBy: string // User ID who's updating
	}>
) {
	return prisma.equipment.update({
		where: { id },
		data: {
			...data,
			updatedAt: new Date(),
		},
	})
}

export async function deleteEquipment(id: string, userId: string, hardDelete = false) {
	if (hardDelete) {
		// Hard delete - completely remove the equipment
		return prisma.equipment.delete({
			where: { id },
		})
	} else {
		// Soft delete - mark as deleted
		return prisma.equipment.update({
			where: { id },
			data: {
				isDeleted: true,
				deletedAt: new Date(),
				updatedBy: userId,
			},
		})
	}
}

// Get equipment assigned to a specific room
export async function getEquipmentForRoom(roomId: string) {
	return prisma.roomEquipment.findMany({
		where: { roomId },
		include: {
			equipment: true,
		},
	})
}

// Add equipment to a room
export async function addEquipmentToRoom(roomId: string, equipmentId: string) {
	return prisma.roomEquipment.upsert({
		where: {
			roomId_equipmentId: {
				roomId,
				equipmentId,
			},
		},
		update: {}, // No updates needed, just ensure it exists
		create: {
			roomId,
			equipmentId,
		},
	})
}

// Remove equipment from a room
export async function removeEquipmentFromRoom(roomId: string, equipmentId: string) {
	return prisma.roomEquipment.delete({
		where: {
			roomId_equipmentId: {
				roomId,
				equipmentId,
			},
		},
	})
}

// Get equipment booked for a specific booking
export async function getEquipmentForBooking(bookingId: string) {
	return prisma.bookingEquipment.findMany({
		where: { bookingId },
		include: {
			equipment: true,
		},
	})
}

// Get types of equipment (distinct)
export async function getEquipmentTypes() {
	const equipment = await prisma.equipment.findMany({
		select: {
			type: true,
		},
		distinct: ["type"],
		orderBy: {
			type: "asc",
		},
	})

	return equipment.map((item) => item.type)
}
