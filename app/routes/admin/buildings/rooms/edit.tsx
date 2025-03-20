import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/rooms"

// Define the room schema with Zod
const roomSchema = z.object({
	name: z.string().min(1, { message: "Room name is required" }),
	capacity: z.string().transform((val) => Number.parseInt(val) || 1),
	typeId: z.string().min(1, { message: "Room type is required" }),
})

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { room?: { name: string } } | undefined

	return [
		{
			title: typedData?.room
				? `Edit ${typedData.room.name} | Rooms | Resource Management`
				: "Edit Room | Resource Management",
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
		include: {
			type: true,
		},
	})

	if (!room) {
		throw new Response("Room not found", { status: 404 })
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

	// Get the building name
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

	return { room, roomTypes, building, currentUser: user }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const buildingId = params.buildingId
	const roomId = params.roomId
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		return { success: false, error: "Building ID is required" }
	}

	if (!roomId) {
		return { success: false, error: "Room ID is required" }
	}

	// Parse the form data with zod validation
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: roomSchema })

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return { submission }
	}

	const { name, capacity, typeId } = submission.value

	try {
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
				submission: {
					...submission,
					error: {
						name: "Room name already exists in this building",
					},
				},
			}
		}

		// Update the room
		await prisma.room.update({
			where: {
				id: roomId,
			},
			data: {
				name,
				capacity,
				typeId,
				updatedBy: user.id,
			},
		})

		return redirect(`/admin/buildings/${buildingId}/rooms/${roomId}/view`)
	} catch (error) {
		return {
			submission: {
				...submission,
				error: {
					form: (error as Error).message || "An error occurred while processing your request",
				},
			},
		}
	}
}

export default function EditRoom({ loaderData }: Route.ComponentProps) {
	// Type assertion to help with type inference
	const { room, building, roomTypes } = loaderData as {
		room: { id: string; name: string; capacity: number; typeId: string }
		building: { id: string; name: string }
		roomTypes: ReadonlyArray<{ id: string; name: string }>
		currentUser: Record<string, unknown>
	}

	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	// Setup the form with Conform
	const [form, { name, capacity, typeId }] = useForm({
		id: "edit-room-form",
		// @ts-ignore - Type mismatch between Zod and Conform, but works at runtime
		onValidate(context) {
			return parseWithZod(context.formData, { schema: roomSchema })
		},
		defaultValue: {
			name: room.name,
			capacity: String(room.capacity),
			typeId: room.typeId,
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		// Use this to retrieve the previous submission data
		// @ts-ignore - Type mismatch, but works at runtime
		lastResult: actionData?.submission,
	})

	// Check for form-level errors
	const formError =
		form.errors && form.errors.length > 0 && form.errors[0].includes("form:")
			? form.errors[0].replace("form:", "")
			: undefined

	const isSubmitting = navigation.state === "submitting"

	return (
		<div className="py-4">
			<div className="mb-4 flex items-center gap-2">
				<Button variant="outline" size="sm" asChild className="flex items-center gap-1">
					<Link to={`/admin/buildings/${building.id}/rooms/${room.id}/view`}>
						<ArrowLeftIcon className="h-4 w-4" />
						<span>Back to Room</span>
					</Link>
				</Button>
				<h2 className="text-xl font-semibold">Edit Room: {room.name}</h2>
			</div>

			<div className="border rounded-md p-6 max-w-2xl">
				<Form method="post" {...getFormProps(form)} className="space-y-4">
					{formError && (
						<div className="bg-red-50 p-4 rounded-md">
							<p className="text-red-500">{formError}</p>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor={name.id}>Room Name*</Label>
						<Input
							id={name.id}
							name={name.name}
							defaultValue={name.initialValue}
							className={name.errors ? "border-red-500" : ""}
							aria-describedby={name.errors ? `${name.id}-error` : undefined}
							required
						/>
						{name.errors && (
							<p id={`${name.id}-error`} className="text-sm font-medium text-destructive">
								{name.errors}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor={capacity.id}>Capacity*</Label>
						<Input
							id={capacity.id}
							name={capacity.name}
							type="number"
							min="1"
							defaultValue={capacity.initialValue}
							className={capacity.errors ? "border-red-500" : ""}
							aria-describedby={capacity.errors ? `${capacity.id}-error` : undefined}
							required
						/>
						{capacity.errors && (
							<p id={`${capacity.id}-error`} className="text-sm font-medium text-destructive">
								{capacity.errors}
							</p>
						)}
						<p className="text-xs text-gray-500">Minimum capacity is 1</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor={typeId.id}>Room Type*</Label>
						<Select name={typeId.name} defaultValue={typeId.initialValue}>
							<SelectTrigger id={typeId.id} className={typeId.errors ? "border-red-500" : ""}>
								<SelectValue placeholder="Select a type..." />
							</SelectTrigger>
							<SelectContent>
								{roomTypes.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{typeId.errors && (
							<p id={`${typeId.id}-error`} className="text-sm font-medium text-destructive">
								{typeId.errors}
							</p>
						)}
					</div>

					<div className="flex justify-end pt-4">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Updating..." : "Update Room"}
						</Button>
					</div>
				</Form>
			</div>
		</div>
	)
}
