import type { BookingStatus, Building, Room } from "@prisma/client"
import { prisma } from "./db.server"

/**
 * Booking service for managing room bookings
 */

export async function getBookings(options?: {
	roomId?: string
	userId?: string
	status?: BookingStatus
	from?: Date
	to?: Date
}) {
	const { roomId, userId, status, from, to } = options || {}

	return prisma.booking.findMany({
		where: {
			roomId: roomId ? roomId : undefined,
			userId: userId ? userId : undefined,
			status: status ? status : undefined,
			startTime: from ? { gte: from } : undefined,
			endTime: to ? { lte: to } : undefined,
		},
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
		},
		orderBy: {
			startTime: "asc",
		},
	})
}

export async function getBookingById(id: string) {
	return prisma.booking.findUnique({
		where: { id },
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
		},
	})
}

export async function createBooking(data: {
	title: string
	description?: string
	startTime: Date
	endTime: Date
	roomId: string
	userId: string
	statusId?: string
	bookingCategoryId: string
	createdBy: string
}) {
	// Check for overlapping bookings
	const overlappingBookings = await checkForOverlappingBookings({
		roomId: data.roomId,
		startTime: data.startTime,
		endTime: data.endTime,
		excludeBookingId: undefined,
	})

	if (overlappingBookings.length > 0) {
		throw new Error("The room is already booked for the selected time period")
	}

	// Get "PENDING" status as default if not provided
	let statusId = data.statusId
	if (!statusId) {
		const pendingStatus = await prisma.bookingStatus.findFirst({
			where: { name: "Pending" },
		})

		if (!pendingStatus) {
			throw new Error("Cannot find PENDING status for booking")
		}

		statusId = pendingStatus.id
	}

	// Set createdBy to userId if not provided
	const createdBy = data.createdBy || data.userId

	// Create the booking using Prisma's connect pattern
	return prisma.booking.create({
		data: {
			title: data.title,
			description: data.description,
			startTime: data.startTime,
			endTime: data.endTime,
			createdBy: createdBy,
			room: {
				connect: { id: data.roomId },
			},
			user: {
				connect: { id: data.userId },
			},
			status: {
				connect: { id: statusId },
			},
			bookingCategory: {
				connect: { id: data.bookingCategoryId },
			},
		},
	})
}

export async function updateBooking(
	id: string,
	data: Partial<{
		title: string
		description?: string
		startTime: Date
		endTime: Date
		roomId: string
		statusId: string
	}>
) {
	// Check for overlapping bookings if the time or room has changed
	if ((data.startTime || data.endTime || data.roomId) && (await getBookingById(id))) {
		const currentBooking = await getBookingById(id)
		if (!currentBooking) {
			throw new Error(`Booking with ID ${id} not found`)
		}

		const overlappingBookings = await checkForOverlappingBookings({
			roomId: data.roomId || currentBooking.roomId,
			startTime: data.startTime || currentBooking.startTime,
			endTime: data.endTime || currentBooking.endTime,
			excludeBookingId: id,
		})

		if (overlappingBookings.length > 0) {
			throw new Error("The room is already booked for the selected time period")
		}
	}

	return prisma.booking.update({
		where: { id },
		data,
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
		},
	})
}

export async function deleteBooking(id: string) {
	try {
		const deletedBooking = await prisma.booking.delete({
			where: { id },
		})
		console.log("deletedBooking========", deletedBooking)
		return deletedBooking
	} catch (error) {
		console.error("Error deleting booking:", error)
		throw new Error("Failed to delete booking")
	}
}

export async function checkForOverlappingBookings({
	roomId,
	startTime,
	endTime,
	excludeBookingId,
}: {
	roomId: string
	startTime: Date
	endTime: Date
	excludeBookingId?: string
}) {
	// Get the CANCELLED status id
	const cancelledStatus = await prisma.bookingStatus.findFirst({
		where: { name: "CANCELLED" },
	})

	const cancelledStatusId = cancelledStatus?.id

	return prisma.booking.findMany({
		where: {
			roomId,
			id: excludeBookingId ? { not: excludeBookingId } : undefined,
			statusId: cancelledStatusId ? { not: cancelledStatusId } : undefined,
			OR: [
				// Case 1: New booking starts during an existing booking
				{
					startTime: { lte: startTime },
					endTime: { gt: startTime },
				},
				// Case 2: New booking ends during an existing booking
				{
					startTime: { lt: endTime },
					endTime: { gte: endTime },
				},
				// Case 3: New booking completely contains an existing booking
				{
					startTime: { gte: startTime },
					endTime: { lte: endTime },
				},
			],
		},
	})
}

export async function getAvailableTimeSlots({
	roomId,
	date,
	duration = 60, // duration in minutes
}: {
	roomId: string
	date: Date
	duration?: number
}) {
	// Set the start time to the beginning of the day
	const startOfDay = new Date(date)
	startOfDay.setHours(0, 0, 0, 0)

	// Set the end time to the end of the day
	const endOfDay = new Date(date)
	endOfDay.setHours(23, 59, 59, 999)

	// Get the CANCELLED status id
	const cancelledStatus = await prisma.bookingStatus.findFirst({
		where: { name: "CANCELLED" },
	})

	const cancelledStatusId = cancelledStatus?.id

	// Get all bookings for the room on the selected date
	const bookings = await prisma.booking.findMany({
		where: {
			roomId,
			statusId: cancelledStatusId ? { not: cancelledStatusId } : undefined,
			startTime: { gte: startOfDay },
			endTime: { lte: endOfDay },
		},
		orderBy: {
			startTime: "asc",
		},
	})

	// Convert duration from minutes to milliseconds
	const durationMs = duration * 60 * 1000

	// Define business hours (e.g., 8:00 AM to 6:00 PM)
	const businessHoursStart = new Date(date)
	businessHoursStart.setHours(8, 0, 0, 0)

	const businessHoursEnd = new Date(date)
	businessHoursEnd.setHours(18, 0, 0, 0)

	// Initialize available time slots array
	const availableTimeSlots = []

	// If there are no bookings, return the entire business hours as one available slot
	if (bookings.length === 0) {
		availableTimeSlots.push({
			start: businessHoursStart,
			end: businessHoursEnd,
		})
		return availableTimeSlots
	}

	// Check if there's available time before the first booking
	if (bookings[0].startTime > businessHoursStart) {
		const firstSlotEnd = new Date(Math.min(bookings[0].startTime.getTime(), businessHoursEnd.getTime()))
		availableTimeSlots.push({
			start: businessHoursStart,
			end: firstSlotEnd,
		})
	}

	// Check for gaps between bookings
	for (let i = 0; i < bookings.length - 1; i++) {
		const currentBookingEnd = bookings[i].endTime
		const nextBookingStart = bookings[i + 1].startTime

		// If there's a gap between bookings that is at least as long as the requested duration
		if (nextBookingStart.getTime() - currentBookingEnd.getTime() >= durationMs) {
			availableTimeSlots.push({
				start: currentBookingEnd,
				end: nextBookingStart,
			})
		}
	}

	// Check if there's available time after the last booking
	const lastBooking = bookings[bookings.length - 1]
	if (lastBooking.endTime < businessHoursEnd) {
		availableTimeSlots.push({
			start: lastBooking.endTime,
			end: businessHoursEnd,
		})
	}

	return availableTimeSlots
}

export async function getBookingsByBuildings(buildings: Building[]) {
	const buildingsIds = []
	for (const building of buildings) {
		buildingsIds.push(building.id)
	}

	const bookings = await prisma.booking.findMany({
		where: {
			room: {
				buildingId: { in: buildingsIds },
			},
		},
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
		},
		orderBy: {
			startTime: "asc",
		},
	})
	return bookings
}

export async function getBookingsByRooms(rooms: Room[]) {
	const roomsIds = []
	for (const room of rooms) {
		roomsIds.push(room.id)
	}

	const bookings = await prisma.booking.findMany({
		where: {
			roomId: { in: roomsIds },
		},
		include: {
			room: {
				include: {
					building: true,
				},
			},
			user: true,
		},
		orderBy: {
			startTime: "asc",
		},
	})
	return bookings
}
