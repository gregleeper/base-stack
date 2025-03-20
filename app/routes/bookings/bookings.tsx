import type { Booking, BookingStatus, Building, Room, User } from "@prisma/client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, Outlet, redirect, useNavigate, useSearchParams } from "react-router"
import { Temporal } from "temporal-polyfill"
import { getBookings } from "~/services/booking.server"
import { getBuildings } from "~/services/building.server"
import { prisma } from "~/services/db.server"
import { getRooms } from "~/services/room.server"
import type { Route } from "./+types/bookings"

export const meta = () => {
	return [{ title: "Resource Scheduling - My Bookings" }, { name: "description", content: "View your bookings" }]
}

export const loader = async ({ context, request }: Route.LoaderArgs) => {
	const user = context.prismaUser
	if (!user) {
		throw redirect("/login")
	}

	// Get URL search params
	const url = new URL(request.url)
	const searchParams = new URLSearchParams(url.search)

	// Parse filter parameters
	const searchTerm = searchParams.get("search") || ""
	const buildingId = searchParams.get("buildingId") || undefined
	const roomId = searchParams.get("roomId") || undefined

	// Set appropriate times for date filters using Temporal
	let startDate = undefined
	if (searchParams.get("startDate")) {
		// Parse the date string with Temporal
		const dateStr = searchParams.get("startDate") as string
		startDate = Temporal.PlainDate.from(dateStr)
			.toZonedDateTime({
				timeZone: "UTC",
				plainTime: new Temporal.PlainTime(0, 0, 0, 0),
			})
			.toInstant()
			.toString()
	}

	let endDate = undefined
	if (searchParams.get("endDate")) {
		// Parse the date string with Temporal
		const dateStr = searchParams.get("endDate") as string
		endDate = Temporal.PlainDate.from(dateStr)
			.toZonedDateTime({
				timeZone: "UTC",
				plainTime: new Temporal.PlainTime(23, 59, 59, 999),
			})
			.toInstant()
			.toString()
	}

	// If we have both dates and end date is before start date, swap them
	if (startDate && endDate) {
		const start = Temporal.Instant.from(startDate)
		const end = Temporal.Instant.from(endDate)

		if (Temporal.Instant.compare(end, start) < 0) {
			// Extract dates for comparison (ignoring time)
			const startPlain = start.toZonedDateTimeISO("UTC").toPlainDate()
			const endPlain = end.toZonedDateTimeISO("UTC").toPlainDate()

			if (!startPlain.equals(endPlain)) {
				// Swap dates but keep start at beginning of day and end at end of day
				const temp = startPlain
				startDate = endPlain
					.toZonedDateTime({
						timeZone: "UTC",
						plainTime: new Temporal.PlainTime(0, 0, 0, 0),
					})
					.toInstant()
					.toString()

				endDate = temp
					.toZonedDateTime({
						timeZone: "UTC",
						plainTime: new Temporal.PlainTime(23, 59, 59, 999),
					})
					.toInstant()
					.toString()
			}
		}
	}

	// Get date range for filtering (upcoming bookings within the next month)
	const today = Temporal.Now.plainDateISO()
		.toZonedDateTime({
			timeZone: "UTC",
			plainTime: new Temporal.PlainTime(0, 0, 0, 0),
		})
		.toInstant()
		.toString()

	// Convert dates back to Date objects for Prisma (assuming the booking service still uses Date)
	// This would be temporary until we update the booking service as well
	const fromDate = startDate ? new Date(startDate) : new Date(today)
	const toDate = endDate ? new Date(endDate) : undefined

	// Get user's bookings with filters
	const bookings = await getBookings({
		userId: user.id,
		from: fromDate,
		to: toDate,
		roomId: roomId,
	})

	// If search term is provided, filter bookings by title, description or notes
	const filteredBookings = searchTerm
		? bookings.filter(
				(booking) =>
					booking.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					booking.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					booking.notes?.toLowerCase().includes(searchTerm.toLowerCase())
			)
		: bookings

	// Filter by building if needed
	const buildingFilteredBookings =
		buildingId && !roomId
			? filteredBookings.filter((booking) => booking.room.buildingId === buildingId)
			: filteredBookings

	// Get past bookings separately
	const pastBookings = await getBookings({
		userId: user.id,
		to: new Date(today),
	})

	// Fetch booking statuses for display
	const statusNames = await prisma.bookingStatus.findMany()
	const statusMap = Object.fromEntries(statusNames.map((status: BookingStatus) => [status.id, status.name]))

	// Get all buildings and rooms for filters
	const buildings = await getBuildings()
	const rooms = await getRooms()

	// Format dates for return to the UI
	const startDateStr = startDate
		? Temporal.Instant.from(startDate).toZonedDateTimeISO("UTC").toPlainDate().toString()
		: undefined

	const endDateStr = endDate
		? Temporal.Instant.from(endDate).toZonedDateTimeISO("UTC").toPlainDate().toString()
		: undefined

	return {
		bookings: buildingFilteredBookings,
		pastBookings,
		statusMap,
		buildings,
		rooms,
		filters: {
			search: searchTerm,
			buildingId,
			roomId,
			startDate: startDateStr,
			endDate: endDateStr,
		},
	}
}

export default function Bookings({ loaderData }: Route.ComponentProps) {
	const { bookings, pastBookings, statusMap, buildings, rooms, filters } = loaderData
	const [showPastBookings, setShowPastBookings] = useState(false)
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [debouncedInputs, setDebouncedInputs] = useState({
		search: filters.search || "",
	})

	// Initialize state tracking whether a reset is in progress
	const isResettingRef = useRef(false)

	const formatDateTime = (date: string | Date) => {
		// Handle both string ISO dates and Date objects
		// Get user timezone from browser or fall back to America/Chicago
		const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago"

		return Temporal.Instant.from(date instanceof Date ? date.toISOString() : date)
			.toZonedDateTime({
				timeZone: userTimeZone,
				calendar: "iso8601",
			})
			.toLocaleString(undefined, {
				weekday: "short",
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
				timeZoneName: "short",
			})
	}

	// Debounce function for text inputs
	const debounce = useCallback((func: () => void, delay: number) => {
		let timeoutId: NodeJS.Timeout
		return () => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(func, delay)
		}
	}, [])

	// Handle immediate changes for select inputs
	const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { name, value } = e.target
		if (value) {
			searchParams.set(name, value)
		} else {
			searchParams.delete(name)
		}
		setSearchParams(searchParams)
	}

	// Handle text input changes with debounce
	const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setDebouncedInputs((prev) => ({ ...prev, [name]: value }))
	}

	// Effect to apply debounced search term to URL params
	useEffect(() => {
		// Skip this effect when explicitly resetting filters
		if (isResettingRef.current) {
			return
		}

		const updateSearchParams = () => {
			if (debouncedInputs.search) {
				searchParams.set("search", debouncedInputs.search)
			} else {
				searchParams.delete("search")
			}
			setSearchParams(searchParams)
		}

		const debouncedUpdate = debounce(updateSearchParams, 300)
		debouncedUpdate()

		return () => {
			// Cleanup function to handle component unmount
			clearTimeout(debouncedUpdate as unknown as number)
		}
	}, [debouncedInputs, searchParams, setSearchParams, debounce])

	// Handle date input changes
	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		if (value) {
			// Use Temporal to parse and format the date
			const plainDate = Temporal.PlainDate.from(value)
			// Format in ISO format YYYY-MM-DD
			const formattedDate = plainDate.toString()
			searchParams.set(name, formattedDate)
		} else {
			searchParams.delete(name)
		}
		setSearchParams(searchParams)
	}

	const handleResetFilters = () => {
		// Set the flag to prevent effect from running during reset
		isResettingRef.current = true

		// Reset the debounced inputs state
		setDebouncedInputs({ search: "" })

		// Use a brand new URLSearchParams object instead of mutating the existing one
		setSearchParams(new URLSearchParams())

		// Reset the flag after the operation is complete
		setTimeout(() => {
			isResettingRef.current = false
		}, 0)
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">My Bookings</h1>
				<Link
					to="/bookings/new"
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
				>
					Create New Booking
				</Link>
			</div>

			{/* Filters Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">Filter Bookings</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Search
						</label>
						<input
							type="text"
							id="search"
							name="search"
							value={debouncedInputs.search}
							onChange={handleTextInputChange}
							placeholder="Search by title, description..."
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
						/>
					</div>
					<div>
						<label htmlFor="buildingId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Building
						</label>
						<select
							id="buildingId"
							name="buildingId"
							value={filters.buildingId || ""}
							onChange={handleSelectChange}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
						>
							<option value="">All Buildings</option>
							{buildings.map((building) => (
								<option key={building.id} value={building.id}>
									{building.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Room
						</label>
						<select
							id="roomId"
							name="roomId"
							value={filters.roomId || ""}
							onChange={handleSelectChange}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
						>
							<option value="">All Rooms</option>
							{rooms
								.filter((room) => !filters.buildingId || room.buildingId === filters.buildingId)
								.map((room) => (
									<option key={room.id} value={room.id}>
										{room.name}
									</option>
								))}
						</select>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								From
							</label>
							<input
								type="date"
								id="startDate"
								name="startDate"
								value={filters.startDate || ""}
								onChange={handleDateChange}
								className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
							/>
						</div>
						<div>
							<label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								To
							</label>
							<input
								type="date"
								id="endDate"
								name="endDate"
								value={filters.endDate || ""}
								onChange={handleDateChange}
								className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
							/>
						</div>
					</div>
				</div>
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={handleResetFilters}
						className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
					>
						Reset Filters
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Bookings List Section - 5 columns on large screens */}
				<div className="lg:col-span-5">
					<div className="mb-6">
						<button
							type="button"
							className={`mr-4 pb-2 border-b-2 ${!showPastBookings ? "border-blue-600 font-semibold" : "border-transparent"}`}
							onClick={() => setShowPastBookings(false)}
						>
							Upcoming Bookings ({bookings.length})
						</button>
						<button
							type="button"
							className={`pb-2 border-b-2 ${showPastBookings ? "border-blue-600 font-semibold" : "border-transparent"}`}
							onClick={() => setShowPastBookings(true)}
						>
							Past Bookings ({pastBookings.length})
						</button>
					</div>

					{showPastBookings ? (
						<BookingList
							bookings={pastBookings}
							navigate={navigate}
							formatDateTime={formatDateTime}
							isPast={true}
							statusMap={statusMap}
						/>
					) : (
						<BookingList
							bookings={bookings}
							navigate={navigate}
							formatDateTime={formatDateTime}
							isPast={false}
							statusMap={statusMap}
						/>
					)}
				</div>

				{/* Booking Detail Section - 7 columns on large screens */}
				<div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-lg shadow min-h-[300px]">
					<Outlet />
				</div>
			</div>
		</div>
	)
}

type BookingWithRelations = Booking & {
	room: Room & {
		building: Building
	}
	user: User
}

function BookingList({
	bookings,
	navigate,
	formatDateTime,
	isPast,
	statusMap,
}: {
	bookings: BookingWithRelations[]
	navigate: ReturnType<typeof useNavigate>
	formatDateTime: (date: string | Date) => string
	isPast: boolean
	statusMap: Record<string, string>
}) {
	if (bookings.length === 0) {
		return (
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
				<p className="text-gray-600 dark:text-gray-300 mb-4">
					{isPast ? "No past bookings found." : "You don't have any upcoming bookings."}
				</p>
				{!isPast && (
					<Link
						to="/bookings/new"
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Create Your First Booking
					</Link>
				)}
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-y-auto pr-2">
			{bookings.map((booking) => (
				<button
					key={booking.id}
					className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-left cursor-pointer hover:shadow-md transition-shadow w-full"
					onClick={() => navigate(`/bookings/${booking.id}`)}
					type="button"
				>
					<div className="flex justify-between">
						<h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{booking.title}</h2>
						<span className={`px-3 py-1 rounded-full text-sm ${getStatusClass(statusMap[booking.statusId])}`}>
							{statusMap[booking.statusId]}
						</span>
					</div>
					<p className="text-gray-700 dark:text-gray-300 mb-2">
						{booking.description ? booking.description : "No description provided"}
					</p>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-gray-600 dark:text-gray-400 text-sm">Location</p>
							<p className="font-medium text-gray-800 dark:text-gray-200">
								{booking.room.building.name} - {booking.room.name}
							</p>
						</div>
						<div>
							<p className="text-gray-600 dark:text-gray-400 text-sm">Time</p>
							<p className="font-medium text-gray-800 dark:text-gray-200">
								{formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
							</p>
						</div>
					</div>
				</button>
			))}
		</div>
	)
}

function getStatusClass(status: string): string {
	switch (status?.toLowerCase()) {
		case "confirmed":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
		case "pending":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
		case "cancelled":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
		case "completed":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
		default:
			return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
	}
}
