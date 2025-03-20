import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import React from "react"
import { Form, Link, redirect, useNavigation } from "react-router"
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

// Define the equipment schema with Zod
const equipmentSchema = z.object({
	name: z.string().min(1, "Equipment name is required"),
	type: z.string().min(1, "Equipment type is required"),
	location: z.string().optional(),
	isAvailable: z.enum(["true", "false"]).default("true"),
})

// Meta function to set the page title
export const meta = () => {
	return [
		{
			title: "Edit Equipment | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const { equipmentId } = params

	if (!equipmentId) {
		throw new Response("Equipment ID is required", { status: 400 })
	}

	// Fetch the equipment details
	const equipment = await prisma.equipment.findUnique({
		where: {
			id: equipmentId,
			isDeleted: false,
		},
	})

	if (!equipment) {
		throw new Response("Equipment not found", { status: 404 })
	}

	// Get rooms for the dropdown (optional location field)
	const rooms = await prisma.room.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			building: {
				select: {
					name: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	return {
		equipment,
		rooms,
		currentUser: user,
	}
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const { equipmentId } = params

	if (!equipmentId) {
		throw new Response("Equipment ID is required", { status: 400 })
	}

	// Get the form data
	const formData = await request.formData()
	formData.append("id", equipmentId)

	// Parse the form data with zod validation
	const submission = parseWithZod(formData, { schema: equipmentSchema })

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return { submission }
	}

	console.log("submission from action ================================================", submission)

	const { name, type, location, isAvailable } = submission.value

	try {
		// Check if equipment with this name already exists (excluding this one)
		const existingEquipment = await prisma.equipment.findFirst({
			where: {
				name,
				id: { not: equipmentId },
				isDeleted: false,
			},
		})

		if (existingEquipment) {
			return {
				submission: {
					...submission,
					error: {
						name: "Equipment name already exists",
					},
				},
			}
		}

		// Update the equipment
		await prisma.equipment.update({
			where: { id: equipmentId },
			data: {
				name,
				type,
				location: location || null,
				isAvailable: isAvailable === "true",
				updatedBy: user.id,
			},
		})

		// Redirect to the equipment view
		return redirect(`/admin/equipment/${equipmentId}/view`)
	} catch {
		// Return error if something went wrong
		return {
			submission: {
				...submission,
				error: {
					form: "Failed to update equipment. Please try again.",
				},
			},
		}
	}
}

export default function EquipmentEdit({ loaderData }: Route.ComponentProps) {
	const { equipment, rooms } = loaderData
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	// Location state
	const [customLocation, setCustomLocation] = React.useState<string>(equipment.location || "")
	const [selectedRoom, setSelectedRoom] = React.useState<string>(
		equipment.location ? equipment.location.split(" - ")[0] : ""
	)
	const [locationValue, setLocationValue] = React.useState<string>(equipment.location || "")
	const [availabilityValue, setAvailabilityValue] = React.useState<string>(equipment.isAvailable ? "true" : "false")
	const [form, fields] = useForm({
		id: "edit-equipment-form",
		onValidate({ formData }) {
			const submission = parseWithZod(formData, { schema: equipmentSchema })
			console.log("submission ================================================", submission)
			return submission
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			name: equipment.name,
			type: equipment.type,
			location: locationValue,
			isAvailable: availabilityValue,
		},
	})
	// Initialize room selection if location matches a room
	React.useEffect(() => {
		if (equipment.location) {
			// Check if location matches a room
			const matchingRoom = rooms.find((room) => equipment.location === `${room.building.name} - ${room.name}`)

			if (matchingRoom) {
				setSelectedRoom(matchingRoom.id)
			} else {
				setCustomLocation(equipment.location)
			}
		}
	}, [equipment.location, rooms])

	// Update location value when room is selected or custom location changes
	React.useEffect(() => {
		if (selectedRoom && selectedRoom !== "none") {
			const room = rooms.find((r) => r.id === selectedRoom)
			if (room) {
				setLocationValue(`${room.building.name} - ${room.name}`)
				// Clear custom location when room is selected
				if (customLocation) setCustomLocation("")
			}
		} else if (customLocation) {
			setLocationValue(customLocation)
		} else {
			setLocationValue("")
		}
	}, [selectedRoom, customLocation, rooms])

	// Check for form-level errors
	const formError =
		form.errors && form.errors.length > 0 && form.errors[0]?.includes("form:")
			? form.errors[0].replace("form:", "")
			: undefined

	const { name, type } = fields

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between pb-4 border-b">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold">Edit Equipment: {equipment.name}</h1>
				</div>
				<Button variant="outline" asChild>
					<Link to={`/admin/equipment/${equipment.id}`}>
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						Back to Details
					</Link>
				</Button>
			</div>

			<ScrollArea className="flex-1 mt-4">
				<div className="max-w-3xl mx-auto">
					<Form method="post" {...getFormProps(form)}>
						<div className="space-y-8">
							{/* Basic Information Section */}
							<div>
								<h2 className="text-lg font-semibold mb-4">Basic Information</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Name Field */}
									<div className="space-y-2">
										<Label htmlFor={name.id}>Equipment Name</Label>
										<Input
											name={name.name}
											defaultValue={name.initialValue}
											placeholder="Enter equipment name"
											disabled={isSubmitting}
											aria-invalid={!!name.errors}
										/>
										{name.errors && <p className="text-sm text-red-500">{name.errors}</p>}
									</div>

									{/* Type Field */}
									<div className="space-y-2">
										<Label htmlFor={type.id}>Equipment Type</Label>
										<Input
											name={type.name}
											defaultValue={type.initialValue}
											placeholder="Enter equipment type (e.g., Laptop, Projector)"
											disabled={isSubmitting}
											aria-invalid={!!type.errors}
										/>
										{type.errors && <p className="text-sm text-red-500">{type.errors}</p>}
									</div>
								</div>
							</div>

							{/* Location Section */}
							<div>
								<h2 className="text-lg font-semibold mb-4">Location Information</h2>
								<div className="grid grid-cols-1 gap-4">
									{/* Select Room for Location */}
									<div className="space-y-2">
										<Label>Room Location (Optional)</Label>
										<Select value={selectedRoom} onValueChange={setSelectedRoom}>
											<SelectTrigger>
												<SelectValue placeholder="Select a room (optional)" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">No room selected</SelectItem>
												{rooms.map((room) => (
													<SelectItem key={room.id} value={room.id}>
														{room.building.name} - {room.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Custom Location */}
									<div className="space-y-2">
										<Label>Custom Location (Optional)</Label>
										<Input
											placeholder="Enter a custom location"
											value={customLocation}
											onChange={(e) => setCustomLocation(e.target.value)}
											disabled={!!selectedRoom && selectedRoom !== "none"}
										/>
									</div>

									{/* Hidden field for the actual location value */}
									<input type="hidden" name="location" value={locationValue} />
								</div>
							</div>

							{/* Availability Section */}
							<div>
								<h2 className="text-lg font-semibold mb-4">Availability</h2>
								<div className="flex items-center gap-2">
									<Checkbox
										id="equipment-available"
										checked={availabilityValue === "true"}
										onCheckedChange={(checked) => {
											setAvailabilityValue(checked ? "true" : "false")
										}}
										disabled={isSubmitting}
									/>
									<Label htmlFor="equipment-available">Equipment is available for booking</Label>
									<input type="hidden" name="isAvailable" value={availabilityValue} />
								</div>
							</div>

							{/* Form Errors */}
							{formError && (
								<div className="p-3 bg-red-100 border border-red-300 rounded-md">
									<p className="text-sm text-red-500">{formError}</p>
								</div>
							)}

							{/* Submit Button */}
							<div className="flex justify-end pt-4">
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Updating..." : "Update Equipment"}
								</Button>
							</div>
						</div>
					</Form>
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	)
}
