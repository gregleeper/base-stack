import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { format } from "date-fns"
import { useEffect, useState } from "react"
import { Form, redirect, useRouteError } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Calendar } from "~/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { MultiSelect, type Option } from "~/components/ui/multi-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import { Textarea } from "~/components/ui/textarea"
import { getBookingCategories } from "~/services/booking-category.server"
import { getBookingById } from "~/services/booking.server"
import { getBuildings } from "~/services/building.server"
import { prisma } from "~/services/db.server"
import { getRooms } from "~/services/room.server"
import { getAllUsers } from "~/services/user.server"
import type { Route } from "./+types/edit"

export const BooleanStringZod = z.preprocess((val) => val === "on", z.boolean()).default(false)

const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
	if (typeof value === "string") {
		try {
			return JSON.parse(value)
		} catch (e) {
			// If parsing fails, treat it as a single value instead of an error
			if (value.trim()) {
				return [value]
			}
			// Only add an issue if it's not an empty string and really can't be parsed
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: (e as Error).message,
			})
		}
	} else if (Array.isArray(value)) {
		// If it's already an array, return it as is
		return value
	}
	return value
}

const hostIdsShape = z.array(z.string())
const participantIdsShape = z.array(z.string())
const roomIdsShape = z.array(z.string())

// Define the booking schema with Zod
const bookingSchema = z
	.object({
		title: z.string().min(1, { message: "Title is required" }),
		description: z.string().optional(),
		notes: z.string().optional(),
		roomIds: z.preprocess(parseJsonPreprocessor, roomIdsShape),
		bookingCategoryId: z.string().min(1, { message: "Booking category is required" }),
		startDate: z.string().min(1, { message: "Start date is required" }),
		startTime: z.string().min(1, { message: "Start time is required" }),
		endDate: z.string().min(1, { message: "End date is required" }),
		endTime: z.string().min(1, { message: "End time is required" }),
		isPublic: BooleanStringZod,
		openEnrollment: BooleanStringZod,
		isAfterHours: BooleanStringZod,
		hostIds: z.preprocess(parseJsonPreprocessor, hostIdsShape),
		participantIds: z.preprocess(parseJsonPreprocessor, participantIdsShape),
	})
	.refine(
		(data) => {
			// Check if end date/time is after start date/time
			const startDateTime = new Date(`${data.startDate}T${data.startTime}:00`)
			const endDateTime = new Date(`${data.endDate}T${data.endTime}:00`)
			return endDateTime > startDateTime
		},
		{
			message: "End date and time must be after start date and time",
			path: ["endDate"], // This shows the error on the endDate field
		}
	)

// Refine function for server-side validation
const checkRoomConflicts = async (data: z.infer<typeof bookingSchema>, bookingId?: string) => {
	const roomConflicts = []
	for (const roomId of data.roomIds) {
		const startDateTime = new Date(`${data.startDate}T${data.startTime}:00`)
		const endDateTime = new Date(`${data.endDate}T${data.endTime}:00`)

		// Find overlapping bookings excluding the current booking being edited
		const overlappingBookings = await prisma.booking.findMany({
			where: {
				roomId,
				id: bookingId ? { not: bookingId } : undefined, // Exclude the current booking if editing
				OR: [
					// Case 1: New booking starts during an existing booking
					{
						startTime: { lte: startDateTime },
						endTime: { gt: startDateTime },
					},
					// Case 2: New booking ends during an existing booking
					{
						startTime: { lt: endDateTime },
						endTime: { gte: endDateTime },
					},
					// Case 3: New booking completely contains an existing booking
					{
						startTime: { gte: startDateTime },
						endTime: { lte: endDateTime },
					},
				],
			},
			include: {
				room: true,
			},
		})

		if (overlappingBookings.length > 0) {
			const room = overlappingBookings[0].room
			roomConflicts.push(`${room.name} is already booked for the selected time period`)
		}
	}

	// If any room has a conflict, return error
	if (roomConflicts.length > 0) {
		return false
	}
	return true
}

// Create a function that returns a schema with bookingId in scope
const createServerSideBookingSchema = (bookingId?: string) => {
	return bookingSchema.superRefine(async (data, ctx) => {
		const isValid = await checkRoomConflicts(data, bookingId)
		if (!isValid) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "One or more rooms are already booked for the selected time period",
				path: ["roomIds"],
			})
			return false
		}
		return true
	})
}

export async function loader({ params, context }: Route.LoaderArgs) {
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

	// Check if user is authorized to edit this booking (must be the creator)
	if (booking.userId !== user.id) {
		throw new Response("Not authorized to edit this booking", { status: 403 })
	}

	// Fetch necessary data for the form
	const buildings = await getBuildings()
	const rooms = await getRooms()
	const bookingCategories = await getBookingCategories()
	const users = await getAllUsers()

	// Get booking hosts and participants
	const hosts = await prisma.bookingHost.findMany({
		where: { bookingId },
		select: { userId: true },
	})

	const participants = await prisma.bookingParticipant.findMany({
		where: { bookingId },
		select: { userId: true },
	})

	const hostIds = hosts.map((host) => host.userId)
	const participantIds = participants.map((participant) => participant.userId)

	return {
		booking,
		buildings,
		rooms,
		bookingCategories,
		users,
		hostIds,
		participantIds,
		user,
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const user = context.prismaUser
	if (!user) {
		throw redirect("/login")
	}

	const { bookingId } = params
	if (!bookingId) {
		throw redirect("/bookings")
	}

	// Check if the booking exists and user is authorized to edit
	const existingBooking = await getBookingById(bookingId)
	if (!existingBooking) {
		throw new Response("Booking not found", { status: 404 })
	}

	if (existingBooking.userId !== user.id) {
		throw new Response("Not authorized to edit this booking", { status: 403 })
	}

	// Parse the form data with zod validation
	const formData = await request.formData()

	// Create a schema with the bookingId in scope
	const serverSideBookingSchema = createServerSideBookingSchema(bookingId)

	// Validate with custom logic for this booking ID
	const submission = await parseWithZod(formData, {
		schema: serverSideBookingSchema,
		async: true,
	})

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	const {
		title,
		description,
		notes,
		roomIds,
		bookingCategoryId,
		startDate,
		startTime,
		endDate,
		endTime,
		isPublic,
		openEnrollment,
		isAfterHours,
		hostIds = [],
		participantIds = [],
	} = submission.value

	// Parse dates
	const startDateTime = new Date(`${startDate}T${startTime}:00`)
	const endDateTime = new Date(`${endDate}T${endTime}:00`)

	try {
		// Get default attendance status for hosts and participants
		const pendingAttendanceStatus = await prisma.attendanceStatus.findFirst({
			where: { name: "Pending" },
		})

		if (!pendingAttendanceStatus) {
			throw new Response("Cannot find Pending attendance status", { status: 500 })
		}

		// Update the booking in a transaction
		await prisma.$transaction(async (tx) => {
			// First, update the main booking
			await tx.booking.update({
				where: { id: bookingId },
				data: {
					title,
					description,
					notes,
					startTime: startDateTime,
					endTime: endDateTime,
					updatedBy: user.id,
					isPublic,
					openEnrollment,
					isAfterHours,
					room: {
						connect: { id: roomIds[0] }, // Using the first room
					},
					bookingCategory: {
						connect: { id: bookingCategoryId },
					},
				},
			})

			// Update hosts - remove all existing and add new ones
			await tx.bookingHost.deleteMany({
				where: { bookingId },
			})

			if (hostIds.length > 0) {
				const hostData = hostIds.map((userId) => ({
					bookingId,
					userId,
					statusId: pendingAttendanceStatus.id,
				}))
				await tx.bookingHost.createMany({
					data: hostData,
				})
			}

			// Update participants - remove all existing and add new ones
			await tx.bookingParticipant.deleteMany({
				where: { bookingId },
			})

			if (participantIds.length > 0) {
				const participantData = participantIds.map((userId) => ({
					bookingId,
					userId,
					statusId: pendingAttendanceStatus.id,
				}))
				await tx.bookingParticipant.createMany({
					data: participantData,
				})
			}

			// Create notification for booking update
			const bookingUpdatedTypeId = await tx.notificationType.findUnique({
				where: { name: "BOOKING_UPDATED" },
			})

			if (!bookingUpdatedTypeId) {
				// If notification type doesn't exist, create it
				await tx.notificationType.create({
					data: {
						name: "BOOKING_UPDATED",
						description: "Sent when a booking is updated",
					},
				})
			}

			// Get notification status and priority IDs
			const pendingStatusId = await tx.notificationStatus.findUnique({
				where: { name: "PENDING" },
			})
			const normalPriorityId = await tx.notificationPriority.findUnique({
				where: { name: "NORMAL" },
			})
			const deliveryStatusId = await tx.deliveryStatus.findUnique({
				where: { name: "PENDING" },
			})
			const inAppMethodId = await tx.deliveryMethod.findUnique({
				where: { name: "IN_APP" },
			})
			const emailMethodId = await tx.deliveryMethod.findUnique({
				where: { name: "EMAIL" },
			})

			// Fetch updated room and building information
			const room = await tx.room.findUnique({
				where: { id: roomIds[0] },
				include: { building: true },
			})

			if (pendingStatusId && normalPriorityId && room) {
				// Get the type ID (either from our earlier query or by fetching it if it was just created)
				const notificationTypeId =
					bookingUpdatedTypeId?.id || (await tx.notificationType.findFirst({ where: { name: "BOOKING_UPDATED" } }))?.id

				// Only proceed if we have a valid notification type ID
				if (notificationTypeId) {
					// Create the notification
					await tx.notification.create({
						data: {
							title: "Booking Updated",
							content: `Booking "${title}" in ${room.name}, ${room.building.name} has been updated for ${format(startDateTime, "MMM d, yyyy h:mm a")} to ${format(endDateTime, "h:mm a")}`,
							typeId: notificationTypeId,
							statusId: pendingStatusId.id,
							priorityId: normalPriorityId.id,
							bookingId,
							scheduledFor: new Date(), // Schedule for immediate delivery
							createdBy: user.id,
							// Create recipients for hosts and participants
							recipients: {
								create: [
									// Add all hosts
									...(await Promise.all(
										hostIds.map(async (userId) => {
											// Get delivery status ID safely
											const deliveryStatusPendingId =
												deliveryStatusId?.id ||
												(await tx.deliveryStatus.findFirst({ where: { name: "PENDING" } }))?.id ||
												""

											// Get delivery method IDs safely
											const inAppDeliveryMethodId =
												inAppMethodId?.id ||
												(await tx.deliveryMethod.findFirst({ where: { name: "IN_APP" } }))?.id ||
												""
											const emailDeliveryMethodId =
												emailMethodId?.id || (await tx.deliveryMethod.findFirst({ where: { name: "EMAIL" } }))?.id || ""

											return {
												userId,
												deliveryStatusId: deliveryStatusPendingId,
												deliveryMethods: {
													create: [
														{ deliveryMethodId: inAppDeliveryMethodId },
														{ deliveryMethodId: emailDeliveryMethodId },
													],
												},
											}
										})
									)),
									// Add all participants
									...(await Promise.all(
										participantIds.map(async (userId) => {
											// Get delivery status ID safely
											const deliveryStatusPendingId =
												deliveryStatusId?.id ||
												(await tx.deliveryStatus.findFirst({ where: { name: "PENDING" } }))?.id ||
												""

											// Get delivery method IDs safely
											const inAppDeliveryMethodId =
												inAppMethodId?.id ||
												(await tx.deliveryMethod.findFirst({ where: { name: "IN_APP" } }))?.id ||
												""
											const emailDeliveryMethodId =
												emailMethodId?.id || (await tx.deliveryMethod.findFirst({ where: { name: "EMAIL" } }))?.id || ""

											return {
												userId,
												deliveryStatusId: deliveryStatusPendingId,
												deliveryMethods: {
													create: [
														{ deliveryMethodId: inAppDeliveryMethodId },
														{ deliveryMethodId: emailDeliveryMethodId },
													],
												},
											}
										})
									)),
								],
							},
						},
					})
				}
			}
		})

		// Redirect to the booking detail page
		return redirect(`/bookings/${bookingId}`)
	} catch (_) {
		return {
			error: "Failed to update booking. Please try again.",
		}
	}
}

export default function EditBooking({ loaderData }: Route.ComponentProps) {
	const {
		booking,
		buildings,
		rooms,
		bookingCategories,
		users,
		hostIds: initialHostIds,
		participantIds: initialParticipantIds,
	} = loaderData

	const [startDate, setStartDate] = useState<Date>()
	const [endDate, setEndDate] = useState<Date>()
	const [selectedBuilding, setSelectedBuilding] = useState<string>("")
	const [filteredRooms, setFilteredRooms] = useState(rooms)
	const [selectedHostIds, setSelectedHostIds] = useState<string[]>(initialHostIds)
	const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(initialParticipantIds)

	// Format dates for form fields
	const formatDateForInput = (date: Date) => format(date, "yyyy-MM-dd")
	const formatTimeForInput = (date: Date) => format(date, "HH:mm")

	// Initialize form
	const [form, fields] = useForm({
		id: "edit-booking-form",
		defaultValue: {
			title: booking.title,
			description: booking.description || "",
			notes: booking.notes || "",
			roomIds: JSON.stringify([booking.roomId]),
			bookingCategoryId: booking.bookingCategoryId,
			startDate: formatDateForInput(new Date(booking.startTime)),
			startTime: formatTimeForInput(new Date(booking.startTime)),
			endDate: formatDateForInput(new Date(booking.endTime)),
			endTime: formatTimeForInput(new Date(booking.endTime)),
			isPublic: booking.isPublic.toString(),
			openEnrollment: booking.openEnrollment.toString(),
			isAfterHours: booking.isAfterHours.toString(),
			hostIds: JSON.stringify(initialHostIds),
			participantIds: JSON.stringify(initialParticipantIds),
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: bookingSchema })
		},
	})

	// Filter rooms by building
	useEffect(() => {
		if (selectedBuilding) {
			const filtered = rooms.filter((room) => room.buildingId === selectedBuilding)
			setFilteredRooms(filtered)
		} else {
			setFilteredRooms(rooms)
		}
	}, [selectedBuilding, rooms])

	// Find current room's building for initial selection
	useEffect(() => {
		const currentRoom = rooms.find((room) => room.id === booking.roomId)
		if (currentRoom) {
			setSelectedBuilding(currentRoom.buildingId)
		}
	}, [booking.roomId, rooms])

	// Set initial dates
	useEffect(() => {
		setStartDate(new Date(booking.startTime))
		setEndDate(new Date(booking.endTime))
	}, [booking.startTime, booking.endTime])

	// Prepare options for multi-select components
	const usersOptions: Option[] = users.map((user) => ({
		label: user.name,
		value: user.id,
	}))

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-6">Edit Booking</h1>

			<Form method="post" {...getFormProps(form)}>
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Enter the basic details for your booking</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4">
							<div className="space-y-2">
								<Label htmlFor={fields.title.id}>Title</Label>
								<Input
									id={fields.title.id}
									name={fields.title.name}
									defaultValue={fields.title.initialValue}
									aria-invalid={Boolean(fields.title.errors?.length)}
									aria-describedby={fields.title.errorId}
								/>
								{fields?.title?.errors && fields.title.errors.length > 0 && (
									<p className="text-sm text-red-500" id={fields.title.errorId}>
										{fields.title.errors[0]}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor={fields.description.id}>Description (Optional)</Label>
								<Textarea
									id={fields.description.id}
									name={fields.description.name}
									defaultValue={fields.description.initialValue}
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor={fields.bookingCategoryId.id}>Booking Category</Label>
								<Select name={fields.bookingCategoryId.name} defaultValue={fields.bookingCategoryId.initialValue}>
									<SelectTrigger>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										{bookingCategories.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{fields?.bookingCategoryId?.errors && fields.bookingCategoryId.errors.length > 0 && (
									<p className="text-sm text-red-500" id={fields.bookingCategoryId.errorId}>
										{fields.bookingCategoryId.errors[0]}
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Location</CardTitle>
						<CardDescription>Select where your booking will take place</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4">
							<div className="space-y-2">
								<Label>Building</Label>
								<Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
									<SelectTrigger>
										<SelectValue placeholder="Select a building" />
									</SelectTrigger>
									<SelectContent>
										{buildings.map((building) => (
											<SelectItem key={building.id} value={building.id}>
												{building.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor={fields.roomIds.id}>Room</Label>
								<Select name={fields.roomIds.name} defaultValue={booking.roomId}>
									<SelectTrigger>
										<SelectValue placeholder="Select a room" />
									</SelectTrigger>
									<SelectContent>
										{filteredRooms.map((room) => (
											<SelectItem key={room.id} value={room.id}>
												{room.name} (Capacity: {room.capacity})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{fields?.roomIds?.errors && fields.roomIds.errors.length > 0 && (
									<p className="text-sm text-red-500" id={fields.roomIds.errorId}>
										{fields.roomIds.errors[0]}
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Date and Time</CardTitle>
						<CardDescription>When will your booking take place?</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<Label className="block mb-2">Start Date</Label>
								<div className="space-y-4">
									<Calendar
										mode="single"
										selected={startDate}
										onSelect={setStartDate}
										disabled={{ before: new Date() }}
										className="rounded-md border"
									/>
									<input
										type="hidden"
										name={fields.startDate.name}
										value={startDate ? formatDateForInput(startDate) : fields.startDate.initialValue}
									/>
									{fields?.startDate?.errors && fields.startDate.errors.length > 0 && (
										<p className="text-sm text-red-500" id={fields.startDate.errorId}>
											{fields.startDate.errors[0]}
										</p>
									)}
								</div>

								<div className="mt-4">
									<Label htmlFor={fields.startTime.id}>Start Time</Label>
									<Input
										id={fields.startTime.id}
										name={fields.startTime.name}
										type="time"
										defaultValue={fields.startTime.initialValue}
									/>
									{fields?.startTime?.errors && fields.startTime.errors.length > 0 && (
										<p className="text-sm text-red-500" id={fields.startTime.errorId}>
											{fields.startTime.errors[0]}
										</p>
									)}
								</div>
							</div>

							<div>
								<Label className="block mb-2">End Date</Label>
								<div className="space-y-4">
									<Calendar
										mode="single"
										selected={endDate}
										onSelect={setEndDate}
										disabled={{ before: startDate || new Date() }}
										className="rounded-md border"
									/>
									<input
										type="hidden"
										name={fields.endDate.name}
										value={endDate ? formatDateForInput(endDate) : fields.endDate.initialValue}
									/>
									{fields?.endDate?.errors && fields.endDate.errors.length > 0 && (
										<p className="text-sm text-red-500" id={fields.endDate.errorId}>
											{fields.endDate.errors[0]}
										</p>
									)}
								</div>

								<div className="mt-4">
									<Label htmlFor={fields.endTime.id}>End Time</Label>
									<Input
										id={fields.endTime.id}
										name={fields.endTime.name}
										type="time"
										defaultValue={fields.endTime.initialValue}
									/>
									{fields?.endTime?.errors && fields.endTime.errors.length > 0 && (
										<p className="text-sm text-red-500" id={fields.endTime.errorId}>
											{fields.endTime.errors[0]}
										</p>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>People</CardTitle>
						<CardDescription>Manage hosts and participants for your booking</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Hosts (Optional)</Label>
								<MultiSelect
									name={fields.hostIds.name}
									options={usersOptions}
									selected={selectedHostIds}
									onChange={setSelectedHostIds}
									placeholder="Select hosts for the booking"
								/>
							</div>

							<div className="space-y-2">
								<Label>Participants (Optional)</Label>
								<MultiSelect
									name={fields.participantIds.name}
									options={usersOptions}
									selected={selectedParticipantIds}
									onChange={setSelectedParticipantIds}
									placeholder="Select participants for the booking"
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Options</CardTitle>
						<CardDescription>Additional booking options</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center space-x-2">
							<Switch id={fields.isPublic.id} name={fields.isPublic.name} defaultChecked={booking.isPublic} />
							<Label htmlFor={fields.isPublic.id}>Public Booking (visible to all users)</Label>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id={fields.openEnrollment.id}
								name={fields.openEnrollment.name}
								defaultChecked={booking.openEnrollment}
							/>
							<Label htmlFor={fields.openEnrollment.id}>Open Enrollment (anyone can join)</Label>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id={fields.isAfterHours.id}
								name={fields.isAfterHours.name}
								defaultChecked={booking.isAfterHours}
							/>
							<Label htmlFor={fields.isAfterHours.id}>After Hours Booking</Label>
						</div>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Additional Notes</CardTitle>
						<CardDescription>Any other information about this booking</CardDescription>
					</CardHeader>
					<CardContent>
						<Textarea
							id={fields.notes.id}
							name={fields.notes.name}
							defaultValue={fields.notes.initialValue}
							rows={4}
							placeholder="Enter any additional notes or information here..."
						/>
					</CardContent>
				</Card>

				<CardFooter className="flex justify-between">
					<Button variant="outline" type="button" onClick={() => window.history.back()}>
						Cancel
					</Button>
					<Button type="submit">Update Booking</Button>
				</CardFooter>
			</Form>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useRouteError()
	return (
		<div className="p-6 text-center">
			<h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
			<p className="text-gray-700 dark:text-gray-300 mb-4">
				{error instanceof Error
					? error.message
					: error instanceof Response
						? `${error.status} ${error.statusText}`
						: "An unexpected error occurred"}
			</p>
			<Button variant="outline" onClick={() => window.history.back()} className="mt-4">
				Go Back
			</Button>
		</div>
	)
}
