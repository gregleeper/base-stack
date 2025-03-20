import { format } from "date-fns"
import { useState } from "react"
import { Form, Link, useNavigate } from "react-router"
import { redirect } from "react-router"
import { ResourceFilters } from "~/components/ResourceFilters"
import { type CalendarEvent, WeekCalendar } from "~/components/ui/week-calendar"
import { getBookingsByBuildings, getBookingsByRooms } from "~/services/booking.server"
import { getBuildingsByUserGroups } from "~/services/building.server"
import { getRoomsByUserGroups } from "~/services/room.server"
import { getUserGroupsForUser } from "~/services/user.server"
import { convertDateToUserTz } from "~/utils/dates"
import type { Route } from "./+types/home"

// Simple metadata for the page
export const meta = () => {
	return [{ title: "Resource Scheduling - Home" }, { name: "description", content: "Manage your room bookings" }]
}

export const loader = async ({ request, context }: Route.LoaderArgs) => {
	const timezoneDate = convertDateToUserTz(new Date(), request)

	// Get current date for filtering
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const oneMonthFromNow = new Date()
	oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
	oneMonthFromNow.setHours(23, 59, 59, 999)
	const user = context.user
	if (!user) {
		throw redirect("/login")
	}

	const userGroups = await getUserGroupsForUser(user.id)

	// Fetch buildings, rooms, and upcoming bookings
	const buildings = await getBuildingsByUserGroups(userGroups)

	const rooms = await getRoomsByUserGroups(userGroups)
	const bookings = await getBookingsByBuildings(buildings)
	const bookingsByRooms = await getBookingsByRooms(rooms)

	// Keep the flat array for filtering in the component
	// Deduplicate bookings based on ID to prevent React key errors
	const bookingSet = new Map()

	// Add all bookings to the map, with ID as the key to ensure uniqueness
	for (const booking of [...bookings, ...bookingsByRooms]) {
		bookingSet.set(booking.id, booking)
	}

	// Convert back to array
	const allBookings = Array.from(bookingSet.values())

	// Create a structured map for the WeekCalendar component
	const structuredBookings: Record<string, Record<string, unknown[]>> = allBookings.reduce(
		(acc, booking) => {
			// Ensure the booking has the needed fields
			if (!booking.room?.buildingId || !booking.roomId) return acc

			const buildingId = booking.room.buildingId
			const roomId = booking.roomId

			// Initialize the building entry if it doesn't exist
			if (!acc[buildingId]) {
				acc[buildingId] = {}
			}

			// Initialize the room entry if it doesn't exist
			if (!acc[buildingId][roomId]) {
				acc[buildingId][roomId] = []
			}

			// Add the booking to the appropriate room array
			acc[buildingId][roomId].push(booking)

			return acc
		},
		{} as Record<string, Record<string, unknown[]>>
	)

	// For debugging, uncomment the next line when needed
	// console.log("Structured bookings:", structuredBookings)

	return {
		timezoneDate: timezoneDate.toTimeString(),
		buildings,
		rooms,
		bookingsByBuildingsAndRooms: structuredBookings,
		allBookings, // Add the flat array to the loader data
		user,
	}
}

// Add a function to generate consistent colors based on string IDs
const getColorForId = (id: string): string => {
	// List of distinct, visually appealing colors for our calendar
	const colors = [
		"#3b82f6", // Blue
		"#ef4444", // Red
		"#10b981", // Green
		"#f59e0b", // Amber
		"#8b5cf6", // Purple
		"#ec4899", // Pink
		"#06b6d4", // Cyan
		"#f97316", // Orange
		"#14b8a6", // Teal
		"#6366f1", // Indigo
	]

	// Get a consistent index based on the ID string
	// This ensures the same ID always gets the same color
	let hash = 0
	for (let i = 0; i < id.length; i++) {
		hash = (hash << 5) - hash + id.charCodeAt(i)
		hash = hash & hash // Convert to 32bit integer
	}

	// Use the absolute value of hash modulo the number of colors
	const colorIndex = Math.abs(hash) % colors.length
	return colors[colorIndex]
}

export default function Index({ loaderData }: Route.ComponentProps) {
	const { buildings, rooms, bookingsByBuildingsAndRooms, allBookings, user } = loaderData
	const navigate = useNavigate()

	// State for filters
	const [selectedBuildingId, setSelectedBuildingId] = useState("")
	const [selectedRoomId, setSelectedRoomId] = useState("")

	// Filter rooms based on selected building
	const filteredRooms = selectedBuildingId ? rooms.filter((room) => room.buildingId === selectedBuildingId) : rooms

	// Filter bookings based on selected building and room
	const filteredBookings = allBookings.filter((booking) => {
		if (selectedBuildingId && booking.room.buildingId !== selectedBuildingId) return false
		if (selectedRoomId && booking.roomId !== selectedRoomId) return false
		return true
	})

	// Handle building selection
	const handleBuildingChange = (buildingId: string) => {
		setSelectedBuildingId(buildingId)

		// If the building changes, clear the room selection if it doesn't belong to this building
		if (selectedRoomId) {
			const roomBelongsToBuildingOrEmpty =
				!buildingId || rooms.some((room) => room.id === selectedRoomId && room.buildingId === buildingId)

			if (!roomBelongsToBuildingOrEmpty) {
				setSelectedRoomId("")
			}
		}
	}

	// Handle room selection
	const handleRoomChange = (roomId: string) => {
		setSelectedRoomId(roomId)
	}

	// Format date for display
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
	}

	return (
		<div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-blue-950 dark:to-blue-900 dark:text-white p-6">
			<div className="max-w-7xl mx-auto">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold">Resource Scheduling</h1>

					<div className="flex items-center space-x-4">
						{user ? (
							<>
								<span className="text-sm">Welcome, {user.name}</span>
								<Link to="/bookings/new" className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
									Create Booking
								</Link>
								{user.role === "ADMIN" && (
									<Link to="/admin" className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">
										Admin
									</Link>
								)}
								<Link to="/protected" className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
									Protected
								</Link>
								<Form method="post" action="/logout">
									<button type="submit" className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
										Logout
									</button>
								</Form>
							</>
						) : (
							<Link to="/login" className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
								Login
							</Link>
						)}
					</div>
				</div>

				{/* Filters and Actions */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
					<div className="flex flex-col gap-4">
						{/* Resource Filters */}
						<ResourceFilters
							buildings={buildings}
							rooms={rooms}
							selectedBuildingId={selectedBuildingId}
							selectedRoomId={selectedRoomId}
							onBuildingChange={handleBuildingChange}
							onRoomChange={handleRoomChange}
						/>

						{/* Action buttons */}
						<div className="flex justify-end">
							<Link
								to="/bookings/new"
								className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								Create New Booking
							</Link>
						</div>
					</div>
				</div>

				{/* Week Calendar View */}
				<div className="mb-6">
					{/* Room Color Legend */}
					{filteredRooms.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 flex flex-wrap gap-2">
							<span className="text-sm font-medium mr-2">Room Colors:</span>
							{filteredRooms.map((room: { id: string; name: string }) => (
								<div key={room.id} className="flex items-center gap-1">
									<div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorForId(room.id) }} />
									<span className="text-xs">{room.name}</span>
								</div>
							))}
						</div>
					)}

					<WeekCalendar
						events={buildings
							.filter((building) => !selectedBuildingId || building.id === selectedBuildingId)
							.flatMap((building) =>
								building.rooms
									.filter((room) => !selectedRoomId || room.id === selectedRoomId)
									.flatMap((room) => {
										// Access the bookings from our structured data with proper type casting
										const buildingData = (bookingsByBuildingsAndRooms as Record<string, Record<string, unknown[]>>)[
											building.id
										]
										if (!buildingData) return []

										// Get this room's bookings from the building data
										const roomData = buildingData[room.id]
										if (!roomData) return []

										// Define the structure we expect for booking data
										interface BookingData {
											id: string
											startTime: string | Date
											endTime: string | Date
											user?: { name: string }
										}

										// Transform the bookings into calendar events
										return roomData.map((booking) => {
											const typedBooking = booking as BookingData

											// Get colors based on room ID (for consistent color per room)
											const roomColor = getColorForId(room.id)

											return {
												// Create a compound key to ensure uniqueness
												id: `${typedBooking.id}-${room.id}`,
												// Store the original booking ID for navigation
												bookingId: typedBooking.id,
												title: `${room.name} - ${typedBooking.user?.name || "Unknown"}`,
												start: new Date(typedBooking.startTime),
												end: new Date(typedBooking.endTime),
												// Use room-based colors
												color: roomColor,
											}
										})
									})
							)}
						onEventClick={(event: CalendarEvent) => {
							// Handle event click - navigate to booking details using the original booking ID
							navigate(`/bookings/${event.bookingId || event.id}`)
						}}
						onDayClick={(date: Date) => {
							// Handle day click - e.g., open booking form for that day
							navigate(`/bookings/new?date=${format(date, "yyyy-MM-dd")}`)
						}}
					/>
				</div>

				{/* Bookings Table */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
						<h3 className="text-lg leading-6 font-medium">Upcoming Bookings</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{filteredBookings.length} bookings found</p>
					</div>

					{filteredBookings.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead className="bg-gray-50 dark:bg-gray-900">
									<tr>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											Title
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											Location
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											Start Time
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											End Time
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											Status
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
									{filteredBookings.map((booking) => (
										<tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{booking.title}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												{booking.room.building.name}, {booking.room.name}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												{formatDate(booking.startTime.toString())}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(booking.endTime.toString())}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span
													className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
													${
														booking.statusId === "CONFIRMED"
															? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
															: booking.statusId === "PENDING"
																? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
																: booking.statusId === "CANCELLED"
																	? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
																	: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
													}`}
												>
													{booking.statusId}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<Link
													to={`/bookings/${booking.id}`}
													className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
												>
													View
												</Link>
												<Link
													to={`/bookings/${booking.id}/edit`}
													className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
												>
													Edit
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							No bookings found. {selectedBuildingId || selectedRoomId ? "Try changing your filters or " : ""}
							<Link to="/bookings/new" className="text-blue-600 dark:text-blue-400 hover:underline">
								create a new booking
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
