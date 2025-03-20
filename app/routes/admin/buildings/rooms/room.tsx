import { PencilIcon, TrashIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Label } from "~/components/ui/label"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/room"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	return [
		{
			title: data?.room ? `${data?.room.name} | Rooms | Resource Management` : "Room Details | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get room ID from params
	const roomId = params.roomId
	const buildingId = params.buildingId

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!roomId) {
		throw new Response("Room ID is required", { status: 400 })
	}

	// Get the room with its type
	const room = await prisma.room.findUnique({
		where: {
			id: roomId,
			buildingId,
			isDeleted: false,
		},
		include: {
			type: true,
		},
	})

	if (!room) {
		throw new Response("Room not found", { status: 404 })
	}

	return { room, currentUser: user }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const buildingId = params.buildingId
	const roomId = params.roomId
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		return { error: "Building ID is required" }
	}

	if (!roomId) {
		return { error: "Room ID is required" }
	}

	try {
		// Update room
		if (intent === "update") {
			const name = formData.get("name")?.toString()
			const capacity = formData.get("capacity")?.toString()
			const typeId = formData.get("typeId")?.toString()

			if (!name) {
				return {
					error: "Room name is required",
					fields: {
						id: roomId,
						name,
						capacity,
						typeId,
					},
				}
			}

			// Check if a room with this name already exists in the same building (excluding current room)
			const existingRoom = await prisma.room.findFirst({
				where: {
					name,
					buildingId,
					id: {
						not: roomId,
					},
					isDeleted: false,
				},
			})

			if (existingRoom) {
				return {
					error: "Room name already exists in this building",
					fields: {
						id: roomId,
						name,
						capacity,
						typeId,
					},
				}
			}

			// Parse capacity to number
			let capacityNumber = null
			if (capacity) {
				const parsed = Number.parseInt(capacity, 10)
				if (!Number.isNaN(parsed)) {
					capacityNumber = parsed
				}
			}

			// Update the room
			await prisma.room.update({
				where: {
					id: roomId,
				},
				data: {
					name,
					capacity: capacityNumber || undefined,
					typeId: typeId || undefined,
				},
			})

			return { success: "Room updated successfully" }
		}

		return { error: "Invalid intent" }
	} catch (_) {
		return { error: "An error occurred while processing your request" }
	}
}

export default function RoomDetails({ loaderData }: Route.ComponentProps) {
	const { room } = loaderData

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Room: {room.name}</CardTitle>
				<div className="flex gap-2">
					<Button size="sm" variant="outline" className="flex items-center gap-1" asChild>
						<Link to={`/admin/buildings/${room.buildingId}/rooms/${room.id}/edit`}>
							<PencilIcon className="h-4 w-4" />
							<span>Edit</span>
						</Link>
					</Button>
					<Button size="sm" variant="destructive" className="flex items-center gap-1" asChild>
						<Link to={`/admin/buildings/${room.buildingId}/rooms/${room.id}/delete`}>
							<TrashIcon className="h-4 w-4" />
							<span>Delete</span>
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label>Room Number</Label>
						<p className="text-sm">{room.name || "N/A"}</p>
					</div>
					<div>
						<Label>Room Type</Label>
						<p className="text-sm">{room.type.name}</p>
					</div>
					<div>
						<Label>Capacity</Label>
						<p className="text-sm">{room.capacity || "Not specified"}</p>
					</div>
					<div>
						<Label>Description</Label>
						<p className="text-sm">{room.type.description || "No description"}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
