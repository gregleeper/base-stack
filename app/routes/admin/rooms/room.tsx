import { DoorOpen, Edit, ShieldAlert, Trash2 } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/room"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const { roomId } = params

	if (!roomId) {
		throw new Response("Room ID is required", { status: 400 })
	}

	// Fetch the room details
	const room = await prisma.room.findUnique({
		where: {
			id: roomId,
			isDeleted: false,
		},
		include: {
			building: true,
			type: true,
			features: {
				include: {
					feature: true,
				},
			},
			equipment: {
				include: {
					equipment: true,
				},
			},
		},
	})

	if (!room) {
		throw new Response("Room not found", { status: 404 })
	}

	return { room, currentUser: user }
}

export default function RoomDetails({ loaderData }: Route.ComponentProps) {
	const { room, currentUser } = loaderData
	const isAdmin = currentUser.role === "Administrator"
	const location = useLocation()

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full">
				<ScrollBar orientation="vertical" />
				<div className="flex justify-between items-start mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
							<DoorOpen className="h-6 w-6 text-blue-600 dark:text-blue-300" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold">{room.name}</h1>
							<p className="text-gray-500 dark:text-gray-400">
								{room.building.name}, Floor {room.floor}
							</p>
						</div>
					</div>
					{isAdmin && (
						<div className="flex gap-2">
							<Button asChild variant="outline" size="sm" className="flex items-center gap-1">
								<Link to={`/admin/rooms/${room.id}/edit`}>
									<Edit className="h-4 w-4" />
									<span>Edit</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="sm"
								className="flex items-center gap-1 text-destructive hover:text-destructive"
							>
								<Link to={`/admin/rooms/${room.id}/delete`}>
									<Trash2 className="h-4 w-4" />
									<span>Delete</span>
								</Link>
							</Button>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					<div>
						<h2 className="text-lg font-medium mb-3">Room Details</h2>
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Type</span>
								<span className="font-medium">{room.type.name}</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Capacity</span>
								<span className="font-medium">{room.capacity} people</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Status</span>
								<span className={`font-medium ${room.isActive ? "text-green-600" : "text-red-600"}`}>
									{room.isActive ? "Active" : "Inactive"}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Created</span>
								<span className="font-medium">{new Date(room.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>

					<div>
						<h2 className="text-lg font-medium mb-3">Building</h2>
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Name</span>
								<span className="font-medium">{room.building.name}</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Address</span>
								<span className="font-medium">{room.building.address}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Features Section */}
				<div className="mb-8">
					<h2 className="text-lg font-medium mb-3">Features</h2>
					{room.features.length === 0 ? (
						<p className="text-gray-500 dark:text-gray-400">No features available for this room.</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{room.features.map((featureItem) => (
								<span
									key={featureItem.featureId}
									className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
								>
									{featureItem.feature.name}
								</span>
							))}
						</div>
					)}
				</div>

				{/* Equipment Section */}
				<div>
					<h2 className="text-lg font-medium mb-3">Equipment</h2>
					{room.equipment.length === 0 ? (
						<p className="text-gray-500 dark:text-gray-400">No equipment available in this room.</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{room.equipment.map((equipmentItem) => (
								<div key={equipmentItem.equipmentId} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
									<div className="font-medium">{equipmentItem.equipment.name}</div>
									<div className="text-sm text-gray-500 dark:text-gray-400">{equipmentItem.equipment.type}</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Actions Section at bottom */}
				<div className="mt-8 pt-4 border-t flex justify-between">
					<Button variant="outline" asChild>
						<Link to={`/admin/rooms${location.search}`}>Back to Rooms</Link>
					</Button>

					{isAdmin && (
						<div className="flex gap-2">
							<Button variant="destructive" size="sm" className="flex items-center gap-1" asChild>
								<Link to={`/admin/rooms/${room.id}/delete`}>
									<ShieldAlert className="h-4 w-4" />
									<span>Delete Room</span>
								</Link>
							</Button>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
