import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { useEffect, useState } from "react"
import { Form, data, redirect, useFetcher, useRouteError } from "react-router"
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
import { getBuildings } from "~/services/building.server"
import { checkRoomAvailability } from "~/services/check-room-availability.server"
import { prisma } from "~/services/db.server"
import { getRooms } from "~/services/room.server"
import { getAllUsers } from "~/services/user.server"
import type { Route } from "./+types/new"

export const BooleanStringZod = z.preprocess((val) => val === "true", z.boolean()).default(false)

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
		// Make roomIds accept either a string or an array of strings, and coerce to array
		roomIds: z.preprocess(parseJsonPreprocessor, roomIdsShape),
		bookingCategoryId: z.string().min(1, { message: "Booking category is required" }),
		startDate: z.string().min(1, { message: "Start date is required" }),
		startTime: z.string().min(1, { message: "Start time is required" }),
		endDate: z.string().min(1, { message: "End date is required" }),
		endTime: z.string().min(1, { message: "End time is required" }),
		// Coerce string "true"/"false" to actual boolean values
		isPublic: BooleanStringZod,
		openEnrollment: BooleanStringZod,
		isAfterHours: BooleanStringZod,
		// Accept either strings or arrays for hosts and participants
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

const serverSideBookingSchema = bookingSchema.refine(
	async (data) => {
		const roomConflicts = []
		for (const roomId of data.roomIds) {
			const startDateTime = new Date(`${data.startDate}T${data.startTime}:00`)
			const endDateTime = new Date(`${data.endDate}T${data.endTime}:00`)
			const overlappingBookings = await prisma.booking.findMany({
				where: {
					roomId,
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
	},
	{
		message: "One or more rooms are already booked for the selected time period",
		path: ["roomIds"],
	}
)

export async function loader({ context }: Route.LoaderArgs) {
	// Check if the user is authenticated

	// Fetch buildings, rooms, and booking categories for the form
	const buildings = await getBuildings()
	const rooms = await getRooms()
	const bookingCategories = await getBookingCategories()
	const users = await getAllUsers()

	return {
		user: context.user,
		buildings,
		rooms,
		bookingCategories,
		users,
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser
	if (!user) {
		return redirect("/login")
	}

	// Parse the form data with zod validation
	const formData = await request.formData()
	const intent = formData.get("intent")
	if (intent === "check-room-availability") {
		const roomIds = formData.getAll("roomIds")
		const startDateTime = formData.get("startDateTime")
		const endDateTime = formData.get("endDateTime")
		const availability = await checkRoomAvailability(
			roomIds as string[],
			startDateTime as string,
			endDateTime as string
		)
		return data(availability)
	}
	const submission = await parseWithZod(formData, { schema: serverSideBookingSchema, async: true })

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

	// The date validation is now handled in the schema

	try {
		// Just use the selected booking category ID directly
		// The form should be providing a valid ID from the dropdown
		const selectedCategoryId = bookingCategoryId

		const confirmedStatus = await prisma.bookingStatus.findFirstOrThrow({
			where: { name: "Confirmed" },
		})

		// Get default attendance status for hosts and participants
		const pendingAttendanceStatus = await prisma.attendanceStatus.findFirstOrThrow({
			where: { name: "Pending" },
		})

		// Create bookings for each room in a transaction
		await prisma.$transaction(async (tx) => {
			for (const roomId of roomIds) {
				const booking = await tx.booking.create({
					data: {
						title,
						description,
						notes,
						startTime: startDateTime,
						endTime: endDateTime,
						createdBy: user.id,
						isPublic,
						openEnrollment,
						isAfterHours,
						room: {
							connect: { id: roomId },
						},
						user: {
							connect: { id: user.id },
						},
						status: {
							connect: { id: confirmedStatus.id },
						},
						bookingCategory: {
							connect: { id: selectedCategoryId },
						},
					},
				})

				// Create host associations
				for (const hostId of hostIds) {
					await tx.bookingHost.create({
						data: {
							booking: { connect: { id: booking.id } },
							user: { connect: { id: hostId } },
							status: { connect: { id: pendingAttendanceStatus.id } },
						},
					})
				}

				// Create participant associations
				for (const participantId of participantIds) {
					await tx.bookingParticipant.create({
						data: {
							booking: { connect: { id: booking.id } },
							user: { connect: { id: participantId } },
							status: { connect: { id: pendingAttendanceStatus.id } },
						},
					})
				}
			}
		})

		// Redirect to home page
		throw new Response("Booking created successfully", { status: 302, headers: { Location: "/" } })
	} catch (error) {
		throw data((error as Error).message, { status: 400 })
	}
}

export default function NewBooking({ loaderData, actionData }: Route.ComponentProps) {
	const { buildings, rooms, bookingCategories = [], users = [] } = loaderData
	const [selectedBuildingId, setSelectedBuildingId] = useState<string>("")
	const [startDate, setStartDate] = useState<Date>()
	const [endDate, setEndDate] = useState<Date>()
	const [selectedBookingCategoryId, setSelectedBookingCategoryId] = useState<string>("")
	const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
	const [selectedHostIds, setSelectedHostIds] = useState<string[]>([])
	const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
	const [isPublic, setIsPublic] = useState<boolean>(false)
	const [openEnrollment, setOpenEnrollment] = useState<boolean>(false)
	const [isAfterHours, setIsAfterHours] = useState<boolean>(false)
	const [startTimeValue, setStartTimeValue] = useState<string>("")
	const [endTimeValue, setEndTimeValue] = useState<string>("")
	const [shouldCheckAvailability, setShouldCheckAvailability] = useState<boolean>(false)
	const errors = typeof actionData === "object" && actionData?.submission?.error?.form

	// Create a fetcher to check room availability
	const availabilityFetcher = useFetcher<{
		available: boolean
		conflicts: Array<{ roomId: string; roomName: string; message: string }>
	}>()

	// Effect to monitor input changes and set the shouldCheckAvailability flag
	useEffect(() => {
		if (startDate && endDate && startTimeValue && endTimeValue && selectedRoomIds.length > 0) {
			setShouldCheckAvailability(true)
		}
	}, [startDate, endDate, startTimeValue, endTimeValue, selectedRoomIds])

	// Effect to check room availability when triggered
	useEffect(() => {
		if (
			shouldCheckAvailability &&
			availabilityFetcher.state === "idle" && // Only fetch when not already fetching
			startDate &&
			endDate // Make sure dates are defined
		) {
			const startDateTime = new Date(`${startDate.toISOString().split("T")[0]}T${startTimeValue}:00`)
			const endDateTime = new Date(`${endDate.toISOString().split("T")[0]}T${endTimeValue}:00`)

			// Only check if end date/time is after start date/time
			if (endDateTime > startDateTime) {
				// Fetch the room availability

				availabilityFetcher.submit(
					{
						intent: "check-room-availability",
						roomIds: selectedRoomIds,
						startDateTime: startDateTime.toISOString(),
						endDateTime: endDateTime.toISOString(),
					},
					{
						method: "POST",
					}
				)

				// Reset the flag after initiating the fetch
				setShouldCheckAvailability(false)
			}
		}
	}, [shouldCheckAvailability, availabilityFetcher, startDate, endDate, startTimeValue, endTimeValue, selectedRoomIds])

	// Filter rooms based on selected building
	const filteredRooms = selectedBuildingId ? rooms.filter((room) => room.buildingId === selectedBuildingId) : rooms

	// Convert rooms to multi-select options
	const roomOptions: Option[] = filteredRooms.map((room) => ({
		value: room.id,
		label: `${room.name} (Capacity: ${room.capacity})`,
	}))

	// Convert users to options for hosts and participants
	const userOptions: Option[] = users.map((user) => ({
		value: user.id,
		label: `${user.name} (${user.email})`,
	}))

	// Setup the form with Conform
	const [
		form,
		{
			title,
			description,
			notes,
			roomIds,
			bookingCategoryId,
			startDate: startDateField,
			startTime: startTimeField,
			endDate: endDateField,
			endTime: endTimeField,
			isPublic: isPublicField,
			openEnrollment: openEnrollmentField,
			isAfterHours: isAfterHoursField,
			hostIds,
			participantIds,
		},
	] = useForm({
		id: "booking-form",
		shouldValidate: "onBlur",
		onValidate({ formData }) {
			// Process multi-select fields and boolean values

			// Helper function to handle multi-select fields that now send single JSON arrays
			const processMultiSelect = (fieldName: string): void => {
				// Get the value from formData
				const value = formData.get(fieldName)

				// Remove existing entries
				formData.delete(fieldName)

				if (!value) return

				// Convert to array - handle different possible input formats
				let valuesArray: string[] = []

				if (typeof value === "string") {
					try {
						// Try to parse as JSON first (this is how MultiSelect normally sends data)
						const parsed = JSON.parse(value)
						valuesArray = Array.isArray(parsed) ? parsed : [value]
					} catch {
						// If parsing fails, treat it as a single value
						valuesArray = [value]
					}
				} else {
					// Handle any other case by converting to string
					valuesArray = [String(value)]
				}

				// Add the array as a single entry to formData
				for (const val of valuesArray) {
					if (val) formData.append(fieldName, val)
				}
			}

			// Process each multi-select field
			processMultiSelect("roomIds")
			processMultiSelect("hostIds")
			processMultiSelect("participantIds")

			// Process boolean fields - ensure they're proper string booleans
			const processBooleanField = (fieldName: string): void => {
				const value = formData.get(fieldName)
				const boolValue = value === "true" ? "true" : "false"
				formData.set(fieldName, boolValue)
			}

			processBooleanField("isPublic")
			processBooleanField("openEnrollment")
			processBooleanField("isAfterHours")

			// Parse and validate the form data
			const submission = parseWithZod(formData, { schema: bookingSchema })
			// Log submission for debugging

			return submission
		},
		defaultValue: {
			title: "",
			description: "",
			notes: "",
			roomIds: "",
			bookingCategoryId: "",
			startDate: "",
			startTime: "",
			endDate: "",
			endTime: "",
			isPublic: "false",
			openEnrollment: "false",
			isAfterHours: "false",
			hostIds: "",
			participantIds: "",
		},
	})

	// biome-ignore lint/suspicious/noConsole: <explanation>
	// console.log("Availability from fetcher +=================", availabilityFetcher.data)

	return (
		<div className="container mx-auto py-10">
			<Card className="max-w-2xl mx-auto">
				<CardHeader>
					<CardTitle>Create New Booking</CardTitle>
					<CardDescription>Schedule a room for your meeting or event</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method="post" {...getFormProps(form)} className="space-y-6">
						{form.status === "error" && (
							<div className="bg-red-50 p-4 rounded-md">
								{form.errors?.map((error) => (
									<p key={error} className="text-red-500">
										{error}
									</p>
								))}
							</div>
						)}

						{/* Display room availability warning */}
						{availabilityFetcher.data && !availabilityFetcher.data.available && (
							<div className="bg-amber-50 p-4 rounded-md mb-4">
								<h3 className="text-amber-800 font-medium">Room Availability Conflict</h3>
								<ul className="text-amber-700 mt-2 list-disc pl-5">
									{availabilityFetcher.data.conflicts.map((conflict) => (
										<li key={`${conflict.roomName}-conflict`}>{conflict.message}</li>
									))}
								</ul>
								<p className="text-amber-700 mt-2 text-sm">
									You can still submit this booking, but it may be rejected.
								</p>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor={title.id}>Title</Label>
							<Input
								id={title.id}
								name={title.name}
								placeholder="Meeting title"
								className={title.errors ? "border-red-500" : ""}
								defaultValue={title.initialValue}
								aria-describedby={title.errors ? `${title.id}-error` : undefined}
							/>
							{title.errors && (
								<p id={`${title.id}-error`} className="text-sm font-medium text-destructive">
									{title.errors}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor={description.id}>Description (Optional)</Label>
							<Textarea
								id={description.id}
								name={description.name}
								placeholder="Describe the purpose of this booking"
								className="resize-none"
								defaultValue={description.initialValue}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor={notes.id}>Notes (Optional)</Label>
							<Textarea
								id={notes.id}
								name={notes.name}
								placeholder="Add any additional notes"
								className="resize-none"
								defaultValue={notes.initialValue}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="building">Building</Label>
								<Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
									<SelectTrigger id="building">
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
								<Label htmlFor={roomIds.id}>Rooms</Label>
								<MultiSelect
									id={roomIds.id}
									name={roomIds.name}
									options={roomOptions}
									selected={selectedRoomIds}
									onChange={setSelectedRoomIds}
									placeholder="Select rooms"
									emptyMessage={filteredRooms.length === 0 ? "Select a building first" : "No rooms available"}
								/>
								{roomIds.errors && <p className="text-sm font-medium text-destructive">{roomIds.errors}</p>}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={bookingCategoryId.id}>Booking Category</Label>
							<Select
								name={bookingCategoryId.name}
								value={selectedBookingCategoryId}
								onValueChange={setSelectedBookingCategoryId}
							>
								<SelectTrigger
									id={bookingCategoryId.id}
									className={bookingCategoryId.errors ? "border-red-500" : ""}
									aria-describedby={bookingCategoryId.errors ? `${bookingCategoryId.id}-error` : undefined}
								>
									<SelectValue placeholder="Select a booking category" />
								</SelectTrigger>
								<SelectContent>
									{bookingCategories.map((category) => (
										<SelectItem key={category.id} value={category.id}>
											{category.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{bookingCategoryId.errors && (
								<p id={`${bookingCategoryId.id}-error`} className="text-sm font-medium text-destructive">
									{bookingCategoryId.errors}
								</p>
							)}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<div className="space-y-2">
									<Label htmlFor={startDateField.id}>Start Date</Label>
									<Calendar
										mode="single"
										selected={startDate}
										onSelect={(date) => {
											setStartDate(date || undefined)
											const formattedDate = date ? date.toISOString().split("T")[0] : ""
											const startDateInput = document.getElementById(startDateField.id) as HTMLInputElement
											if (startDateInput) {
												startDateInput.value = formattedDate
											}
										}}
										initialFocus
										className="rounded-md border w-full"
									/>
									<input
										type="hidden"
										id={startDateField.id}
										name={startDateField.name}
										defaultValue={startDateField.initialValue}
										aria-describedby={startDateField.errors ? `${startDateField.id}-error` : undefined}
									/>
									{startDateField.errors && (
										<p id={`${startDateField.id}-error`} className="text-sm font-medium text-destructive">
											{startDateField.errors}
										</p>
									)}
								</div>

								<div className="space-y-2 mt-4">
									<Label htmlFor={startTimeField.id}>Start Time</Label>
									<Input
										id={startTimeField.id}
										type="time"
										name={startTimeField.name}
										defaultValue={startTimeField.initialValue}
										className={startTimeField.errors ? "border-red-500" : ""}
										aria-describedby={startTimeField.errors ? `${startTimeField.id}-error` : undefined}
										onChange={(e) => setStartTimeValue(e.target.value)}
									/>
									{startTimeField.errors && (
										<p id={`${startTimeField.id}-error`} className="text-sm font-medium text-destructive">
											{startTimeField.errors}
										</p>
									)}
								</div>
							</div>

							<div>
								<div className="space-y-2">
									<Label htmlFor={endDateField.id}>End Date</Label>
									<Calendar
										mode="single"
										selected={endDate}
										onSelect={(date) => {
											setEndDate(date || undefined)
											const formattedDate = date ? date.toISOString().split("T")[0] : ""
											const endDateInput = document.getElementById(endDateField.id) as HTMLInputElement
											if (endDateInput) {
												endDateInput.value = formattedDate
											}
										}}
										initialFocus
										className="rounded-md border w-full"
									/>
									<input
										type="hidden"
										id={endDateField.id}
										name={endDateField.name}
										defaultValue={endDateField.initialValue}
										aria-describedby={endDateField.errors ? `${endDateField.id}-error` : undefined}
									/>
									{endDateField.errors && (
										<p id={`${endDateField.id}-error`} className="text-sm font-medium text-destructive">
											{endDateField.errors}
										</p>
									)}
								</div>

								<div className="space-y-2 mt-4">
									<Label htmlFor={endTimeField.id}>End Time</Label>
									<Input
										id={endTimeField.id}
										type="time"
										name={endTimeField.name}
										defaultValue={endTimeField.initialValue}
										className={endTimeField.errors ? "border-red-500" : ""}
										aria-describedby={endTimeField.errors ? `${endTimeField.id}-error` : undefined}
										onChange={(e) => setEndTimeValue(e.target.value)}
									/>
									{endTimeField.errors && (
										<p id={`${endTimeField.id}-error`} className="text-sm font-medium text-destructive">
											{endTimeField.errors}
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="space-y-4 py-4">
							<div className="flex flex-col space-y-6">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor={isPublicField.id}>Public booking</Label>
										<p className="text-muted-foreground text-sm">Make this booking visible to everyone</p>
									</div>
									<Switch
										id={isPublicField.id}
										name={isPublicField.name}
										checked={isPublic}
										onCheckedChange={setIsPublic}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor={openEnrollmentField.id}>Open enrollment</Label>
										<p className="text-muted-foreground text-sm">Allow users to join this booking without approval</p>
									</div>
									<Switch
										id={openEnrollmentField.id}
										name={openEnrollmentField.name}
										checked={openEnrollment}
										onCheckedChange={setOpenEnrollment}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor={isAfterHoursField.id}>After hours</Label>
										<p className="text-muted-foreground text-sm">
											This booking will take place outside of normal hours
										</p>
									</div>
									<Switch
										id={isAfterHoursField.id}
										name={isAfterHoursField.name}
										checked={isAfterHours}
										onCheckedChange={setIsAfterHours}
									/>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={hostIds.id}>Hosts</Label>
							<MultiSelect
								id={hostIds.id}
								name={hostIds.name}
								options={userOptions}
								selected={selectedHostIds}
								onChange={setSelectedHostIds}
								placeholder="Select hosts"
								emptyMessage={users.length === 0 ? "Add a user first" : "No hosts available"}
							/>
							{hostIds.errors && <p className="text-sm font-medium text-destructive">{hostIds.errors}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor={participantIds.id}>Participants</Label>
							<MultiSelect
								id={participantIds.id}
								name={participantIds.name}
								options={userOptions}
								selected={selectedParticipantIds}
								onChange={setSelectedParticipantIds}
								placeholder="Select participants"
								emptyMessage={users.length === 0 ? "Add a user first" : "No participants available"}
							/>
							{participantIds.errors && <p className="text-sm font-medium text-destructive">{participantIds.errors}</p>}
						</div>
					</Form>
				</CardContent>
				<CardFooter className="">
					<div className="grid grid-cols-2 gap-4">
						<Button variant="outline" onClick={() => window.history.back()}>
							Cancel
						</Button>
						<Button
							type="submit"
							form={form.id}
							// Show a different variant if there are conflicts
							variant={availabilityFetcher.data && !availabilityFetcher.data.available ? "destructive" : "default"}
						>
							Create Booking
						</Button>

						{errors && (
							<div className="col-span-2">
								<p className="text-sm font-medium text-destructive">{errors}</p>
							</div>
						)}
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useRouteError()
	// biome-ignore lint/suspicious/noConsole: <explanation>
	console.log("error========", error)

	if (error instanceof Error) {
		return <div>{error.message}</div>
	}

	if (error instanceof Response) {
		return (
			<div>
				{error.status} {error.statusText} <pre>{JSON.stringify(error.data, null, 2)}</pre>
			</div>
		)
	}

	return <div>Unknown error</div>
}
