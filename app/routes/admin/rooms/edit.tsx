import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import React from "react"
import { Form, Link, redirect, useActionData, useLocation, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/edit"

// Define the room schema with Zod
const roomSchema = z.object({
	name: z.string().min(1, "Room name is required"),
	capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
	floor: z.coerce.number().min(1, "Floor must be at least 1"),
	typeId: z.string().min(1, "Room type is required"),
	buildingId: z.string().min(1, "Building is required"),
	isActive: z.enum(["true", "false"]),
	featureIds: z.array(z.string()).optional().default([]),
	availability: z
		.array(
			z.object({
				id: z.string().optional(),
				dayOfWeekId: z.string().min(1, "Day of week is required"),
				startTime: z.string().min(1, "Start time is required"),
				endTime: z.string().min(1, "End time is required"),
			})
		)
		.optional()
		.default([]),
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

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!roomId) {
		throw new Response("Room ID is required", { status: 400 })
	}

	// Get the room with its type, building, and features
	const room = await prisma.room.findUnique({
		where: {
			id: roomId,
			isDeleted: false,
		},
		include: {
			type: true,
			building: true,
			features: {
				include: {
					feature: true,
				},
			},
			availabilityHours: {
				include: {
					dayOfWeek: true,
				},
			},
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

	// Get buildings for the dropdown
	const buildings = await prisma.building.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	// Get all available room features
	const features = await prisma.roomFeature.findMany({
		orderBy: {
			name: "asc",
		},
	})

	// Get days of the week for room availability
	const daysOfWeek = await prisma.dayOfWeek.findMany({
		orderBy: {
			value: "asc",
		},
	})

	// Get user groups for resource access
	const userGroups = await prisma.userGroup.findMany({
		where: {
			isDeleted: false,
		},
		orderBy: {
			name: "asc",
		},
	})

	// Get existing resource access for this room
	const resourceAccess = await prisma.resourceAccess.findMany({
		where: {
			resourceType: "room",
			resourceId: roomId,
		},
		include: {
			userGroup: true,
		},
	})

	return {
		room,
		roomTypes,
		buildings,
		features,
		daysOfWeek,
		userGroups,
		resourceAccess,
		currentUser: user,
		// Extract feature IDs for the form
		selectedFeatureIds: room.features?.map((f: { featureId: string }) => f.featureId) || [],
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const roomId = params.roomId
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!roomId) {
		return { success: false, error: "Room ID is required" }
	}

	// Get the form action type
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Handle different form actions
	if (intent === "updateRoom") {
		// Parse the form data with zod validation
		const submission = parseWithZod(formData, { schema: roomSchema })

		// If the form is invalid, return the errors
		if (submission.status !== "success") {
			return { submission }
		}

		const { name, capacity, floor, isActive, typeId, buildingId, featureIds, availability } = submission.value

		try {
			// Check if a room with this name already exists in the building (excluding current room)
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

			// Start a transaction to update room and features
			await prisma.$transaction(async (tx) => {
				// Update the room
				await tx.room.update({
					where: {
						id: roomId,
					},
					data: {
						name,
						capacity,
						floor,
						isActive: isActive === "true",
						typeId,
						buildingId,
						updatedBy: user.id,
					},
				})

				// Delete existing features
				await tx.roomFeatures.deleteMany({
					where: { roomId },
				})

				// Add new features if any are selected
				if (featureIds && featureIds.length > 0) {
					const featureData = featureIds.map((featureId) => ({
						roomId,
						featureId,
					}))

					await tx.roomFeatures.createMany({
						data: featureData,
					})
				}

				// Update room availability
				// First, delete existing availability records
				await tx.roomAvailability.deleteMany({
					where: { roomId },
				})

				// Then add the new availability records
				if (availability && availability.length > 0) {
					const availabilityData = availability.map((avail) => ({
						roomId,
						dayOfWeekId: avail.dayOfWeekId,
						startTime: avail.startTime,
						endTime: avail.endTime,
						createdBy: user.id,
					}))

					await tx.roomAvailability.createMany({
						data: availabilityData,
					})
				}
			})

			return redirect(`/admin/rooms/${roomId}/view`)
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
	} else if (intent === "addAccess") {
		// Add resource access for a user group
		const userGroupId = formData.get("userGroupId")?.toString()
		const canView = formData.has("canView")
		const canBook = formData.has("canBook")
		const canApprove = formData.has("canApprove")
		const canManage = formData.has("canManage")

		if (!userGroupId) {
			return { success: false, error: "User group is required" }
		}

		try {
			// Check if access already exists
			const existingAccess = await prisma.resourceAccess.findUnique({
				where: {
					userGroupId_resourceType_resourceId: {
						userGroupId,
						resourceType: "room",
						resourceId: roomId,
					},
				},
			})

			if (existingAccess) {
				// Update existing access
				await prisma.resourceAccess.update({
					where: {
						id: existingAccess.id,
					},
					data: {
						canView,
						canBook,
						canApprove,
						canManage,
						updatedBy: user.id,
					},
				})
			} else {
				// Create new access
				await prisma.resourceAccess.create({
					data: {
						userGroupId,
						resourceType: "room",
						resourceId: roomId,
						canView,
						canBook,
						canApprove,
						canManage,
						createdBy: user.id,
					},
				})
			}

			return { success: true }
		} catch (error) {
			return { success: false, error: (error as Error).message }
		}
	} else if (intent === "removeAccess") {
		// Remove resource access
		const accessId = formData.get("accessId")?.toString()

		if (!accessId) {
			return { success: false, error: "Access ID is required" }
		}

		try {
			await prisma.resourceAccess.delete({
				where: {
					id: accessId,
				},
			})

			return { success: true }
		} catch (error) {
			return { success: false, error: (error as Error).message }
		}
	}

	return { success: false, error: "Invalid action" }
}

export default function RoomEdit({ loaderData }: Route.ComponentProps) {
	const { room, buildings, roomTypes, features, daysOfWeek } = loaderData
	const selectedFeatureIds = room.features?.map((f: { featureId: string }) => f.featureId) || []

	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"
	const location = useLocation()

	// Convert existing room availability to form format
	const existingAvailability =
		room.availabilityHours?.map(
			(avail: {
				id: string
				dayOfWeekId: string
				startTime: string
				endTime: string
			}) => ({
				id: avail.id,
				dayOfWeekId: avail.dayOfWeekId,
				startTime: avail.startTime,
				endTime: avail.endTime,
			})
		) || []

	const [form, fields] = useForm({
		id: "edit-room-form",
		// @ts-ignore - Type mismatch between Zod and Conform, but works at runtime
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: roomSchema })
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			name: room.name,
			capacity: String(room.capacity),
			floor: String(room.floor),
			typeId: room.typeId,
			buildingId: room.buildingId,
			isActive: String(room.isActive),
			featureIds: selectedFeatureIds,
			availability: existingAvailability,
		},
		// @ts-ignore - Type mismatch, but works at runtime
		lastResult: actionData?.submission,
	})

	const { name, capacity, floor, typeId, buildingId, isActive, featureIds, availability } = fields

	// State for managing dynamic availability slots
	const [availabilitySlots, setAvailabilitySlots] = React.useState<
		Array<{
			id: string
			dayOfWeekId?: string
			startTime?: string
			endTime?: string
		}>
	>(
		existingAvailability.length > 0
			? existingAvailability.map((avail) => ({
					id: avail.id || String(Date.now()),
					dayOfWeekId: avail.dayOfWeekId,
					startTime: avail.startTime,
					endTime: avail.endTime,
				}))
			: [{ id: "1" }]
	)

	// Function to add new availability slot
	const addAvailabilitySlot = () => {
		setAvailabilitySlots([...availabilitySlots, { id: Date.now().toString() }])
	}

	// Function to remove an availability slot
	const removeAvailabilitySlot = (id: string) => {
		setAvailabilitySlots(availabilitySlots.filter((slot) => slot.id !== id))
	}

	// Function to apply "Always Available" preset (24/7)
	const applyAlwaysAvailablePreset = () => {
		// Clear existing slots first
		setAvailabilitySlots([])

		// Create 7 new slots, one for each day of the week
		const newSlots = daysOfWeek.map((day: { id: string; name: string; value: number }) => ({
			id: `always-${day.id}`,
			dayOfWeekId: day.id,
			startTime: "00:00",
			endTime: "23:59",
		}))

		// Update the state with the new slots
		setAvailabilitySlots(newSlots)
	}

	// Function to apply "All Weekdays" preset (Mon-Fri, 7AM-6PM)
	const applyWeekdaysPreset = () => {
		// Clear existing slots first
		setAvailabilitySlots([])

		// Filter for weekdays (assuming days are ordered with value 1-7 for Monday-Sunday)
		const weekdays = daysOfWeek.filter(
			(day: { id: string; name: string; value: number }) => day.value >= 1 && day.value <= 5
		)

		// Create 5 new slots for weekdays
		const newSlots = weekdays.map((day) => ({
			id: `weekday-${day.id}`,
			dayOfWeekId: day.id,
			startTime: "07:00",
			endTime: "18:00",
		}))

		// Update the state with the new slots
		setAvailabilitySlots(newSlots)
	}

	return (
		<div>
			<div className="flex items-center gap-4 mb-6">
				<Link
					to={`/admin/rooms/${room?.id}/view?${location.search}`}
					className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
				>
					<ArrowLeftIcon className="mr-1 h-4 w-4" />
					Back to Room
				</Link>
				<h1 className="text-3xl font-bold tracking-tight">Edit Room</h1>
			</div>
			<ScrollArea className="h-[calc(100vh-8rem)] w-full">
				<ScrollBar orientation="vertical" />
				<div className="max-w-5xl bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-6 mb-10">
					<Form method="post" {...getFormProps(form)} className="space-y-6">
						{/* Hidden intent field */}
						<input type="hidden" name="intent" value="updateRoom" />

						{/* Room name field */}
						<div className="space-y-1">
							<Label htmlFor={name.id} className="block">
								Room Name
							</Label>
							<Input
								id={name.id}
								name={name.name}
								type="text"
								defaultValue={name.initialValue || ""}
								required
								aria-invalid={name.errors ? true : undefined}
								aria-describedby={name.errors ? name.errorId : undefined}
							/>
							{name.errors && (
								<div id={name.errorId} className="text-sm text-red-500">
									{name.errors}
								</div>
							)}
						</div>

						{/* Capacity field */}
						<div className="space-y-1">
							<Label htmlFor={capacity.id} className="block">
								Capacity
							</Label>
							<Input
								id={capacity.id}
								name={capacity.name}
								type="number"
								min={1}
								defaultValue={capacity.initialValue || ""}
								required
								aria-invalid={capacity.errors ? true : undefined}
								aria-describedby={capacity.errors ? capacity.errorId : undefined}
							/>
							{capacity.errors && (
								<div id={capacity.errorId} className="text-sm text-red-500">
									{capacity.errors}
								</div>
							)}
						</div>

						{/* Floor number field */}
						<div className="space-y-1">
							<Label htmlFor={floor.id} className="block">
								Floor Number
							</Label>
							<Input
								id={floor.id}
								name={floor.name}
								type="number"
								defaultValue={floor.initialValue || ""}
								required
								aria-invalid={floor.errors ? true : undefined}
								aria-describedby={floor.errors ? floor.errorId : undefined}
							/>
							{floor.errors && (
								<div id={floor.errorId} className="text-sm text-red-500">
									{floor.errors}
								</div>
							)}
						</div>

						{/* Room Type field */}
						<div className="space-y-1">
							<Label htmlFor={typeId.id} className="block">
								Room Type
							</Label>
							<Select name={typeId.name} defaultValue={typeId.initialValue || ""}>
								<SelectTrigger id={typeId.id}>
									<SelectValue placeholder="Select a room type..." />
								</SelectTrigger>
								<SelectContent>
									{roomTypes.map((type: { id: string; name: string }) => (
										<SelectItem key={type.id} value={type.id}>
											{type.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{typeId.errors && (
								<div id={typeId.errorId} className="text-sm text-red-500">
									{typeId.errors}
								</div>
							)}
						</div>

						{/* Building field */}
						<div className="space-y-1">
							<Label htmlFor={buildingId.id} className="block">
								Building
							</Label>
							<Select name={buildingId.name} defaultValue={buildingId.initialValue || ""}>
								<SelectTrigger id={buildingId.id}>
									<SelectValue placeholder="Select a building..." />
								</SelectTrigger>
								<SelectContent>
									{buildings.map((building: { id: string; name: string }) => (
										<SelectItem key={building.id} value={building.id}>
											{building.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{buildingId.errors && (
								<div id={buildingId.errorId} className="text-sm text-red-500">
									{buildingId.errors}
								</div>
							)}
						</div>

						{/* Active status */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Checkbox
									id={isActive.id}
									defaultChecked={isActive.initialValue === "true"}
									onCheckedChange={(checked) => {
										// Update the hidden input when the checkbox changes
										const hiddenInput = document.getElementById(`${isActive.id}-hidden`) as HTMLInputElement
										if (hiddenInput) {
											hiddenInput.value = checked ? "true" : "false"
										}
									}}
								/>
								{/* Hidden input that will actually be submitted with the correct value */}
								<input
									type="hidden"
									id={`${isActive.id}-hidden`}
									name={isActive.name}
									defaultValue={isActive.initialValue || "false"}
								/>
								<Label htmlFor={isActive.id}>Active (available for booking)</Label>
							</div>
							{isActive.errors && (
								<div id={isActive.errorId} className="text-sm text-red-500">
									{isActive.errors}
								</div>
							)}
						</div>

						{/* Room Features section */}
						<div className="space-y-2 border-t pt-4">
							<Label className="text-base font-medium">Room Features</Label>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
								Select the features available in this room
							</p>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
								{features.map((feature: { id: string; name: string }) => {
									const isChecked = selectedFeatureIds.includes(feature.id)
									return (
										<div key={feature.id} className="flex items-center space-x-2">
											<Checkbox
												id={`feature-${feature.id}`}
												name={`${featureIds?.name}`}
												value={feature.id}
												defaultChecked={isChecked}
											/>
											<Label htmlFor={`feature-${feature.id}`} className="text-sm font-normal dark:text-gray-300">
												{feature.name}
											</Label>
										</div>
									)
								})}
							</div>
						</div>

						{/* Room Availability section */}
						<div className="space-y-4 border-t pt-4">
							<div className="flex justify-between items-center">
								<Label className="text-base font-medium">Room Availability</Label>
								<div className="flex gap-2">
									<Button type="button" variant="outline" size="sm" onClick={applyAlwaysAvailablePreset}>
										Always Available (24/7)
									</Button>
									<Button type="button" variant="outline" size="sm" onClick={applyWeekdaysPreset}>
										Weekdays (7AM-6PM)
									</Button>
									<Button type="button" variant="outline" size="sm" onClick={addAvailabilitySlot}>
										Add Availability
									</Button>
								</div>
							</div>
							<p className="text-sm text-gray-500 mb-3">Define when this room is typically available for booking</p>

							{availabilitySlots.map((slot, index) => {
								const existingSlot = existingAvailability.find((avail) => avail.id === slot.id)

								return (
									<div
										key={slot.id}
										className="border dark:border-gray-800 p-4 rounded-md space-y-3 bg-gray-50 dark:bg-gray-900"
									>
										<div className="flex justify-between items-center">
											<div className="font-medium dark:text-gray-200">Availability #{index + 1}</div>
											{availabilitySlots.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="text-red-500 dark:text-red-400 h-8 px-2 hover:text-red-600 dark:hover:text-red-300"
													onClick={() => removeAvailabilitySlot(slot.id)}
												>
													Remove
												</Button>
											)}
										</div>

										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div className="space-y-2">
												<Label htmlFor={`day-${slot.id}`} className="dark:text-gray-300">
													Day of Week
												</Label>
												<Select
													name={`${availability.name}[${index}].dayOfWeekId`}
													defaultValue={slot.dayOfWeekId || existingSlot?.dayOfWeekId}
												>
													<SelectTrigger id={`day-${slot.id}`}>
														<SelectValue placeholder="Select day..." />
													</SelectTrigger>
													<SelectContent>
														{daysOfWeek.map((day: { id: string; name: string }) => (
															<SelectItem key={day.id} value={day.id}>
																{day.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>

											<div className="space-y-2">
												<Label htmlFor={`start-${slot.id}`} className="dark:text-gray-300">
													Start Time
												</Label>
												<Input
													id={`start-${slot.id}`}
													name={`${availability.name}[${index}].startTime`}
													type="time"
													defaultValue={slot.startTime || existingSlot?.startTime}
													required
												/>
											</div>

											<div className="space-y-2">
												<Label htmlFor={`end-${slot.id}`} className="dark:text-gray-300">
													End Time
												</Label>
												<Input
													id={`end-${slot.id}`}
													name={`${availability.name}[${index}].endTime`}
													type="time"
													defaultValue={slot.endTime || existingSlot?.endTime}
													required
												/>
											</div>

											{/* Hidden ID field for existing records */}
											{existingSlot?.id && (
												<input type="hidden" name={`${availability.name}[${index}].id`} value={existingSlot.id} />
											)}
										</div>
									</div>
								)
							})}
						</div>

						{/* Submit button */}
						<div className="flex justify-end pt-4">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</Form>
				</div>
			</ScrollArea>
		</div>
	)
}
