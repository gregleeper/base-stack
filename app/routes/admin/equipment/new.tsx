import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import React from "react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/new"

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
			title: "New Equipment | Resource Management",
		},
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
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
		rooms,
		currentUser: user,
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get the form data
	const formData = await request.formData()

	// Parse the form data with zod validation
	const submission = parseWithZod(formData, { schema: equipmentSchema })

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return { submission }
	}

	const { name, type, location, isAvailable } = submission.value

	try {
		// Check if equipment with this name already exists
		const existingEquipment = await prisma.equipment.findFirst({
			where: {
				name,
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

		// Create the equipment
		await prisma.equipment.create({
			data: {
				name,
				type,
				location: location || null,
				isAvailable: isAvailable === "true",
				createdBy: user.id,
			},
		})

		// Redirect to the equipment list
		return redirect("/admin/equipment")
	} catch {
		// Return error if something went wrong
		return {
			submission: {
				...submission,
				error: {
					form: "Failed to create equipment. Please try again.",
				},
			},
		}
	}
}

export default function EquipmentNew({ loaderData }: Route.ComponentProps) {
	const { rooms } = loaderData
	const navigation = useNavigation()
	const actionData = useActionData<typeof action>()
	const isSubmitting = navigation.state === "submitting"

	// Custom location state
	const [customLocation, setCustomLocation] = React.useState<string>("")
	const [selectedRoom, setSelectedRoom] = React.useState<string>("")
	const [locationValue, setLocationValue] = React.useState<string>("")
	const [availabilityValue, setAvailabilityValue] = React.useState<string>("true")

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

	const [form, fields] = useForm({
		id: "new-equipment-form",
		// @ts-ignore - Type mismatch between Zod and Conform, but works at runtime
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: equipmentSchema })
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			name: "",
			type: "",
			location: locationValue,
			isAvailable: availabilityValue,
		},
		// @ts-ignore - Type mismatch, but works at runtime
		lastResult: actionData?.submission,
	})

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
					<h1 className="text-2xl font-bold">Add New Equipment</h1>
				</div>
				<Button variant="outline" asChild>
					<Link to="/admin/equipment">
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						Back to List
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
											placeholder="Enter equipment name"
											disabled={isSubmitting}
											aria-invalid={!!name.errors}
											name={name.name}
										/>
										{name.errors && <p className="text-sm text-red-500">{name.errors}</p>}
									</div>

									{/* Type Field */}
									<div className="space-y-2">
										<Label htmlFor={type.id}>Equipment Type</Label>
										<Input
											placeholder="Enter equipment type (e.g., Laptop, Projector)"
											disabled={isSubmitting}
											aria-invalid={!!type.errors}
											name={type.name}
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
									{isSubmitting ? "Creating..." : "Create Equipment"}
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
