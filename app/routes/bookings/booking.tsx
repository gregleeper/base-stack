import { format } from "date-fns"
import { Link, useParams } from "react-router"
import { redirect } from "react-router"
import { getBookingById } from "~/services/booking.server"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/booking"

export const meta = () => {
	return [{ title: "Resource Scheduling - Booking Details" }, { name: "description", content: "View booking details" }]
}

export const loader = async ({ params, context }: Route.LoaderArgs) => {
	const user = context.prismaUser
	if (!user) {
		throw redirect("/login")
	}

	const { bookingId } = params
	if (!bookingId) {
		throw redirect("/bookings")
	}

	// Get the booking by ID
	const booking = await getBookingById(bookingId)

	if (!booking) {
		throw new Response("Booking not found", { status: 404 })
	}

	// Check if user is authorized to view this booking
	// User can view if they created the booking or are a participant
	const isCreator = booking.userId === user.id
	const isParticipant = await prisma.bookingParticipant.findFirst({
		where: {
			bookingId,
			userId: user.id,
		},
	})

	const isHost = await prisma.bookingHost.findFirst({
		where: {
			bookingId,
			userId: user.id,
		},
	})

	if (!isCreator && !isParticipant && !isHost && !booking.isPublic) {
		throw new Response("Not authorized to view this booking", { status: 403 })
	}

	// Get booking status name
	const status = await prisma.bookingStatus.findUnique({
		where: { id: booking.statusId },
	})

	// Get the participants of this booking
	const participants = await prisma.bookingParticipant.findMany({
		where: { bookingId },
		include: { user: true },
	})

	// Get the hosts of this booking
	const hosts = await prisma.bookingHost.findMany({
		where: { bookingId },
		include: { user: true },
	})

	// Get the equipment of this booking
	const equipment = await prisma.bookingEquipment.findMany({
		where: { bookingId },
		include: { equipment: true },
	})

	return {
		booking,
		status,
		participants,
		hosts,
		equipment,
		isCreator,
	}
}

export default function BookingDetail({ loaderData }: Route.ComponentProps) {
	const { booking, status, participants, hosts, equipment, isCreator } = loaderData
	const params = useParams()

	if (!booking || !params.bookingId) {
		return (
			<div className="flex items-center justify-center h-full p-6">
				<p className="text-gray-600 dark:text-gray-300">Select a booking to view its details</p>
			</div>
		)
	}

	const formatDateTime = (date: Date) => {
		return format(new Date(date), "MMMM d, yyyy h:mm a")
	}

	return (
		<div className="p-6">
			<div className="mb-6 flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">{booking.title}</h2>
				<span className={`px-3 py-1 rounded-full text-sm ${getStatusClass(status?.name || "Unknown")}`}>
					{status?.name || "Unknown"}
				</span>
			</div>

			{booking.description && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Description</h3>
					<p className="text-gray-700 dark:text-gray-300">{booking.description}</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Location</h3>
					<p className="text-gray-700 dark:text-gray-300">
						{booking.room.building.name} - {booking.room.name}
					</p>
				</div>

				<div>
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Time</h3>
					<p className="text-gray-700 dark:text-gray-300">
						{formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
					</p>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">People</h3>

				{/* Creator */}
				<div className="mb-4">
					<div className="flex items-center mb-2">
						<span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs font-medium px-2 py-0.5 rounded">
							Creator
						</span>
					</div>
					<div className="flex items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
						<div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
							{booking.user.name.substring(0, 1).toUpperCase()}
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-gray-900 dark:text-white">{booking.user.name}</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">{booking.user.email}</p>
						</div>
					</div>
				</div>

				{/* Hosts */}
				{hosts.length > 0 && (
					<div className="mb-4">
						<div className="flex items-center mb-2">
							<span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-xs font-medium px-2 py-0.5 rounded">
								Hosts ({hosts.length})
							</span>
						</div>
						<div className="space-y-2">
							{hosts.map((host) => (
								<div key={host.id} className="flex items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
									<div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-semibold">
										{host.user.name.substring(0, 1).toUpperCase()}
									</div>
									<div className="ml-3">
										<p className="text-sm font-medium text-gray-900 dark:text-white">{host.user.name}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">{host.user.email}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Participants */}
				{participants.length > 0 && (
					<div>
						<div className="flex items-center mb-2">
							<span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs font-medium px-2 py-0.5 rounded">
								Participants ({participants.length})
							</span>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{participants.map((participant) => (
								<div key={participant.id} className="flex items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
									<div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-200 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold">
										{participant.user.name.substring(0, 1).toUpperCase()}
									</div>
									<div className="ml-3 overflow-hidden">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
											{participant.user.name}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{participant.user.email}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{hosts.length === 0 && participants.length === 0 && (
					<p className="text-gray-700 dark:text-gray-300 italic">
						No additional participants or hosts for this booking
					</p>
				)}
			</div>

			{equipment.length > 0 && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Equipment</h3>
					<ul className="list-disc list-inside">
						{equipment.map((item) => (
							<li key={item.equipment.id} className="text-gray-700 dark:text-gray-300">
								{item.equipment.name} - {item.equipment.type}
							</li>
						))}
					</ul>
				</div>
			)}

			{booking.notes && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Notes</h3>
					<p className="text-gray-700 dark:text-gray-300">{booking.notes}</p>
				</div>
			)}

			{isCreator && (
				<div className="flex space-x-4 mt-8">
					<Link
						to={`/bookings/${booking.id}/edit`}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Edit Booking
					</Link>
					<Link
						to={`/bookings/${booking.id}/cancel`}
						className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
					>
						Cancel Booking
					</Link>
				</div>
			)}
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
