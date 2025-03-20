import { TrashIcon } from "lucide-react"
import { redirect } from "react-router"
import { Form, useActionData, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/rooms"

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

	if (!buildingId) {
		throw new Response("Building ID is required", { status: 400 })
	}

	// Get the room with its type
	const room = await prisma.room.findUnique({
		where: {
			id: roomId,
			buildingId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			buildingId: true,
			type: {
				select: {
					name: true,
				},
			},
		},
	})

	if (!room) {
		throw new Response("Room not found", { status: 404 })
	}

	return { room, currentUser: user }
}

export async function action({ params, context }: Route.ActionArgs) {
	const roomId = params.roomId
	const buildingId = params.buildingId
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!roomId) {
		return { success: false, error: "Room ID is required" }
	}

	if (!buildingId) {
		return { success: false, error: "Building ID is required" }
	}

	try {
		// First check if the room exists
		const roomExists = await prisma.room.findUnique({
			where: {
				id: roomId,
				buildingId,
				isDeleted: false,
			},
		})

		if (!roomExists) {
			return { success: false, error: "Room not found" }
		}

		// Check if there are any active bookings for this room
		const bookingsCount = await prisma.booking.count({
			where: {
				roomId,
				isDeleted: false,
				// Only check future bookings
				startTime: {
					gte: new Date(),
				},
			},
		})

		if (bookingsCount > 0) {
			return {
				success: false,
				error: `Cannot delete room because it has ${bookingsCount} active or upcoming bookings.`,
			}
		}

		// Soft delete the room instead of hard delete
		await prisma.room.update({
			where: {
				id: roomId,
			},
			data: {
				isDeleted: true,
				deletedAt: new Date(),
				updatedBy: user.id,
			},
		})

		return redirect(`/admin/buildings/${buildingId}/rooms`)
	} catch (error) {
		// Include the error message in the return but don't expose internal details
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		return {
			success: false,
			error: `An error occurred while deleting the room: ${errorMessage}`,
		}
	}
}

export default function DeleteRoom({ loaderData }: Route.ComponentProps) {
	// Use type assertion with unknown to avoid type mismatch error
	const { room } = loaderData as unknown as {
		room: { id: string; name: string; buildingId: string; type: { name: string } }
	}
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	return (
		<Dialog defaultOpen={true}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TrashIcon className="h-5 w-5 text-destructive" />
						Delete Room
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this room? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="mb-4">
						<p className="font-medium">{room.name}</p>
						<p className="text-sm text-gray-500">Type: {room.type.name}</p>
					</div>

					<div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
						<p className="text-sm text-amber-700">
							Deleting this room will remove it from the system and prevent future bookings. Any historical booking data
							will be preserved.
						</p>
					</div>
				</div>

				{actionData?.error && (
					<div className="bg-red-50 p-3 rounded-md">
						<p className="text-sm text-red-600">{actionData.error}</p>
					</div>
				)}

				<DialogFooter>
					<Form method="GET" action={`/admin/buildings/${room.buildingId}/rooms/${room.id}/view`}>
						<Button type="submit" variant="outline">
							Cancel
						</Button>
					</Form>
					<Form method="post">
						<Button type="submit" variant="destructive" disabled={isSubmitting}>
							{isSubmitting ? "Deleting..." : "Delete Room"}
						</Button>
					</Form>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
