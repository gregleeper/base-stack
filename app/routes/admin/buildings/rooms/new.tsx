import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/rooms"

// Meta function to set the page title
export const meta = () => {
	return [
		{
			title: "Add New Room | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get building ID from params
	const buildingId = params.buildingId

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		throw new Response("Building ID is required", { status: 400 })
	}

	// Get the building
	const building = await prisma.building.findUnique({
		where: {
			id: buildingId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
		},
	})

	if (!building) {
		throw new Response("Building not found", { status: 404 })
	}

	// Get room types for the dropdown
	const roomTypes = await prisma.roomType.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	return { building, roomTypes, currentUser: user }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const buildingId = params.buildingId
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		return { success: false, error: "Building ID is required" }
	}

	// Parse form data
	const formData = await request.formData()

	const name = formData.get("name")?.toString().trim()
	const typeId = formData.get("typeId")?.toString().trim()

	// Parse capacity - ensure it's a valid number
	const capacityValue = formData.get("capacity")?.toString().trim()
	// Default to 1 if no capacity provided or if it's not a valid number
	const capacity = capacityValue ? Number.parseInt(capacityValue, 10) || 1 : 1

	// Validate form data
	if (!name) {
		return {
			success: false,
			error: "Room name is required",
			fields: { name, capacity: capacityValue, typeId },
		}
	}

	if (!typeId) {
		return {
			success: false,
			error: "Room type is required",
			fields: { name, capacity: capacityValue, typeId },
		}
	}

	// Create room in database
	try {
		// Create the room and use its id in the redirect
		const { id } = await prisma.room.create({
			data: {
				name,
				capacity,
				typeId,
				buildingId,
				createdBy: user.id,
			},
			select: {
				id: true,
			},
		})

		return redirect(`/admin/buildings/${buildingId}/rooms/${id}`)
	} catch (error) {
		// We don't need to log the error here as Remix will log it for us

		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return {
			success: false,
			error: "Failed to create room. Please try again.",
			fields: { name, capacity: capacityValue, typeId },
		}
	}
}

export default function NewRoom({ loaderData }: Route.ComponentProps) {
	// Type assertion to help with type inference
	const { building, roomTypes } = loaderData as {
		building: { id: string; name: string }
		roomTypes: ReadonlyArray<{ id: string; name: string }>
		currentUser: Record<string, unknown>
	}
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [capacityValue, setCapacityValue] = useState(actionData?.fields?.capacity || "1")

	const isSubmitting = navigation.state === "submitting"

	return (
		<div className="py-4">
			<div className="mb-4 flex items-center gap-2">
				<Button variant="outline" size="sm" asChild className="flex items-center gap-1">
					<Link to={`/admin/buildings/${building.id}/rooms`}>
						<ArrowLeftIcon className="h-4 w-4" />
						<span>Back to Rooms</span>
					</Link>
				</Button>
				<h2 className="text-xl font-semibold">Create New Room</h2>
			</div>

			<div className="border rounded-md p-6 max-w-2xl">
				<Form method="post" className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Room Name*</Label>
						<Input id="name" name="name" defaultValue={actionData?.fields?.name || ""} required />
					</div>

					<div className="space-y-2">
						<Label htmlFor="capacity">Capacity*</Label>
						<Input
							id="capacity"
							name="capacity"
							type="number"
							min="1"
							value={capacityValue}
							onChange={(e) => setCapacityValue(e.target.value)}
							required
						/>
						<p className="text-xs text-gray-500">Minimum capacity is 1</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="typeId">Room Type*</Label>
						<select
							id="typeId"
							name="typeId"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							defaultValue={actionData?.fields?.typeId || ""}
							required
						>
							<option value="">Select a type...</option>
							{roomTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					{actionData?.error && <div className="text-sm text-red-500">{actionData.error}</div>}

					<div className="flex justify-end pt-4">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Room"}
						</Button>
					</div>
				</Form>
			</div>
		</div>
	)
}
