import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { useParams } from "react-router"
import { Form, redirect, useRouteError } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { getBookingById } from "~/services/booking.server"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/cancel"

export const meta = () => {
	return [
		{ title: "Resource Scheduling - Cancel Booking" },
		{ name: "description", content: "Cancel an existing booking" },
	]
}

// Define a simple schema for the cancellation form
const cancelSchema = z.object({
	confirmCancel: z.literal("true", {
		invalid_type_error: "You must confirm cancellation",
	}),
})

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

	// Check if user is authorized to cancel this booking
	// Only the creator can cancel the booking
	if (booking.userId !== user.id) {
		throw new Response("Not authorized to cancel this booking", { status: 403 })
	}

	return { booking }
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

	console.log("bookingId========", bookingId)

	// Check if the booking exists and user is authorized to cancel
	const booking = await getBookingById(bookingId)
	if (!booking) {
		throw new Response("Booking not found", { status: 404 })
	}

	if (booking.userId !== user.id) {
		throw new Response("Not authorized to cancel this booking", { status: 403 })
	}

	// Parse the form data with zod validation
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: cancelSchema,
	})

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	console.log("submission========", submission)

	try {
		// Find the CANCELLED status
		const cancelledStatus = await prisma.bookingStatus.findFirstOrThrow({
			where: { name: "Cancelled" },
		})

		if (!cancelledStatus) {
			throw new Error("CANCELLED booking status not found")
		}

		// Use a transaction to ensure both operations succeed or fail together
		await prisma.$transaction(async (tx) => {
			// 1. Mark the booking as cancelled (soft delete)
			const canceledBooking = await tx.booking.update({
				where: { id: bookingId },
				data: {
					isDeleted: true,
					deletedAt: new Date(),
					statusId: cancelledStatus.id, // Set status to CANCELLED
					updatedBy: user.id,
				},
			})

			console.log("canceledBooking========", canceledBooking)

			// 2. Mark any pending notifications for this booking as deleted
			try {
				// Find the pending status
				const pendingStatus = await tx.notificationStatus.findFirst({
					where: { name: "PENDING" },
				})
				console.log("pendingStatus========", pendingStatus)
				if (pendingStatus) {
					await tx.notification.updateMany({
						where: {
							bookingId,
							statusId: pendingStatus.id,
							isDeleted: false,
						},
						data: {
							isDeleted: true,
							deletedAt: new Date(),
							updatedBy: user.id,
						},
					})
				}
			} catch (_notificationError) {
				// Notification errors shouldn't block the main booking cancellation
			}
		})

		// Redirect to the bookings list
		return redirect("/bookings")
	} catch (_error) {
		// Return a user-friendly error message
		return {
			error: "Failed to cancel booking. Please try again.",
		}
	}
}

export default function CancelBooking({ loaderData }: Route.ComponentProps) {
	const { booking } = loaderData
	const params = useParams()

	const [form, { confirmCancel }] = useForm({
		id: "cancel-booking-form",
		defaultValue: {
			confirmCancel: "false",
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: cancelSchema })
		},
	})

	if (!booking || !params.bookingId) {
		return (
			<div className="flex items-center justify-center h-full p-6">
				<p className="text-gray-300">Booking not found</p>
			</div>
		)
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		})
	}

	const formatTime = (date: Date) => {
		return new Date(date).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "numeric",
			hour12: true,
		})
	}

	return (
		<div className="flex items-center justify-center h-full bg-gray-900">
			<div className="w-full max-w-md">
				{/* Header with pink/red background */}
				<div className="bg-red-100 p-4 rounded-t-md">
					<h2 className="text-xl font-bold text-red-600">Cancel Booking</h2>
					<p className="text-red-600/80 text-sm">
						Are you sure you want to cancel this booking? This action cannot be undone.
					</p>
				</div>

				{/* Content with dark background */}
				<div className="bg-gray-900 p-6 rounded-b-md text-white">
					{/* Title and description */}
					<div className="mb-6">
						<h3 className="text-xl font-bold text-white">{booking.title}</h3>
						<p className="text-gray-400 text-sm mt-1">
							{booking.description || "Social Event booking for a cafeteria created by the setup script"}
						</p>
					</div>

					{/* Details */}
					<div className="space-y-3 mb-6">
						<div>
							<span className="text-gray-400">Location:</span>{" "}
							<span className="text-gray-200">
								{booking.room.building.name} - {booking.room.name}
							</span>
						</div>
						<div>
							<span className="text-gray-400">Start:</span>{" "}
							<span className="text-gray-200">
								{formatDate(booking.startTime)} at {formatTime(booking.startTime)}
							</span>
						</div>
						<div>
							<span className="text-gray-400">End:</span>{" "}
							<span className="text-gray-200">
								{formatDate(booking.endTime)} at {formatTime(booking.endTime)}
							</span>
						</div>
					</div>

					{/* Confirmation checkbox */}
					<Form method="post" {...getFormProps(form)} className="w-full">
						<div className="space-y-6">
							<div className="flex items-center">
								<input
									type="checkbox"
									id="confirmCancel"
									name="confirmCancel"
									value="true"
									className="h-4 w-4 rounded border-gray-700 text-red-500 bg-gray-800 focus:ring-red-500"
								/>
								<label htmlFor="confirmCancel" className="ml-2 block text-sm text-gray-300">
									I confirm I want to cancel this booking
								</label>
							</div>
							{confirmCancel.errors && confirmCancel.errors.length > 0 && (
								<p className="text-red-400 text-sm">{confirmCancel.errors[0]}</p>
							)}

							{/* Buttons */}
							<div className="flex space-x-4 pt-2">
								<button
									type="button"
									onClick={() => window.history.back()}
									className="flex-1 py-2 bg-gray-800 text-white border border-gray-700 rounded hover:bg-gray-700 transition-colors text-center"
								>
									Go Back
								</button>
								<button
									type="submit"
									className="flex-1 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors text-center"
								>
									Cancel Booking
								</button>
							</div>
						</div>
					</Form>
				</div>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useRouteError()
	return (
		<div className="p-6 text-center bg-gray-900 text-white h-full">
			<div className="mb-4 text-red-400">
				<h2 className="text-lg font-bold">Error</h2>
				<p>{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
			</div>
			<Button
				type="button"
				variant="outline"
				className="border-gray-700 text-white hover:bg-gray-800"
				onClick={() => window.history.back()}
			>
				Go Back
			</Button>
		</div>
	)
}
