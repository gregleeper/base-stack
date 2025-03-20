import { data } from "react-router"
import { prisma } from "~/services/db.server"

export async function checkRoomAvailability(roomIds: string[], startDateTime: string, endDateTime: string) {
	// Normalize roomIds - handle the case where we get a comma-separated string in an array
	const normalizedRoomIds = roomIds.flatMap(id => {
		if (id.includes(',')) {
			// If a single entry contains commas, split it into multiple IDs
			return id.split(',');
		}
		return id;
	});

	// Return error if any required parameter is missing
	if (!normalizedRoomIds.length || !startDateTime || !endDateTime) {
		return data({ error: "Missing required parameters" }, { status: 400 })
	}

	try {
		// Parse the date strings into Date objects
		const startDate = new Date(startDateTime as string)
		const endDate = new Date(endDateTime as string)

		// Check for conflicts for each room
		const conflicts = []
		console.log("Checking room availability for roomIds:", normalizedRoomIds)
		for (const roomId of normalizedRoomIds) {
			const overlappingBookings = await prisma.booking.findMany({
				where: {
					roomId: roomId as string,
					OR: [
						// Case 1: New booking starts during an existing booking
						{
							startTime: { lte: startDate },
							endTime: { gt: startDate },
						},
						// Case 2: New booking ends during an existing booking
						{
							startTime: { lt: endDate },
							endTime: { gte: endDate },
						},
						// Case 3: New booking completely contains an existing booking
						{
							startTime: { gte: startDate },
							endTime: { lte: endDate },
						},
					],
				},
				include: {
					room: true,
				},
			})

			if (overlappingBookings.length > 0) {
				const room = overlappingBookings[0].room
				conflicts.push({
					roomId,
					roomName: room.name,
					message: `${room.name} is already booked for the selected time period`,
					conflicts: overlappingBookings.map((booking) => ({
						id: booking.id,
						title: booking.title,
						startTime: booking.startTime,
						endTime: booking.endTime,
					})),
				})
			}
		}

		return {
			available: conflicts.length === 0,
			conflicts,
		}
	} catch (error) {
		return data({ error: (error as Error).message }, { status: 500 })
	}
}
