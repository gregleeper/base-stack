import { Edit, Tag, Trash2 } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/booking-category"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const { bookingCategoryId } = params

	if (!bookingCategoryId) {
		throw new Response("Booking Category ID is required", { status: 400 })
	}

	// Get user with role for access control
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	if (!userWithRole) {
		throw new Response("User not found", { status: 404 })
	}

	// Fetch the category details
	const bookingCategory = await prisma.bookingCategory.findUnique({
		where: {
			id: bookingCategoryId,
		},
		include: {
			bookings: {
				where: {
					isDeleted: false,
				},
				take: 5,
				orderBy: {
					startTime: "desc",
				},
				include: {
					room: true,
					user: true,
					status: true,
				},
			},
		},
	})

	if (!bookingCategory) {
		throw new Response("Booking Category not found", { status: 404 })
	}

	// Count total bookings for this category
	const totalBookings = await prisma.booking.count({
		where: {
			bookingCategoryId: bookingCategoryId,
			isDeleted: false,
		},
	})

	return { bookingCategory, totalBookings, currentUser: userWithRole }
}

export default function BookingCategoryDetails({ loaderData }: Route.ComponentProps) {
	const { bookingCategory, totalBookings, currentUser } = loaderData
	const isAdmin = currentUser.roles.some((role) => role.name === "Administrator" || role.name === "Manager")
	const location = useLocation()

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full relative pr-8">
				<div className="flex justify-between items-start mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
							<Tag className="h-6 w-6 text-blue-600 dark:text-blue-300" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold">{bookingCategory.name}</h1>
						</div>
					</div>
					{isAdmin && (
						<div className="flex gap-2">
							<Button asChild variant="outline" size="sm" className="flex items-center gap-1">
								<Link to={`/admin/booking-categories/${bookingCategory.id}/edit`}>
									<Edit className="h-4 w-4" />
									<span>Edit</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="sm"
								className="flex items-center gap-1 text-destructive hover:text-destructive"
							>
								<Link to={`/admin/booking-categories/${bookingCategory.id}/delete`}>
									<Trash2 className="h-4 w-4" />
									<span>Delete</span>
								</Link>
							</Button>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
					<div>
						<h2 className="text-lg font-medium mb-3">Category Details</h2>
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Name</span>
								<span className="font-medium">{bookingCategory.name}</span>
							</div>
							{bookingCategory.description && (
								<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
									<span className="text-gray-600 dark:text-gray-300">Description</span>
									<span className="font-medium">{bookingCategory.description}</span>
								</div>
							)}
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Total Bookings</span>
								<span className="font-medium">{totalBookings}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Recent Bookings Section */}
				<div>
					<h2 className="text-lg font-medium mb-3">Recent Bookings</h2>
					{bookingCategory.bookings.length === 0 ? (
						<p className="text-gray-500 dark:text-gray-400">No bookings found for this category.</p>
					) : (
						<div className="space-y-3">
							{bookingCategory.bookings.map((booking) => (
								<div key={booking.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
									<div className="flex justify-between">
										<div className="font-medium">{booking.title}</div>
										<div className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
											{booking.status.name}
										</div>
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
										{new Date(booking.startTime).toLocaleDateString()} | {booking.room.name}
									</div>
									<div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Booked by: {booking.user.name}</div>
								</div>
							))}
						</div>
					)}
					{totalBookings > bookingCategory.bookings.length && (
						<div className="mt-3 text-center">
							<span className="text-sm text-gray-500 dark:text-gray-400">Showing 5 of {totalBookings} bookings</span>
						</div>
					)}
				</div>

				{/* Actions Section at bottom */}
				<div className="mt-8 pt-4 border-t flex justify-between">
					<Button variant="outline" asChild>
						<Link to={`/admin/booking-categories${location.search}`}>Back to Categories</Link>
					</Button>

					{isAdmin && (
						<div className="flex gap-2">
							<Button variant="destructive" size="sm" className="flex items-center gap-1" asChild>
								<Link to={`/admin/booking-categories/${bookingCategory.id}/delete`}>
									<Trash2 className="h-4 w-4" />
									<span>Delete Category</span>
								</Link>
							</Button>
						</div>
					)}
				</div>

				<ScrollBar orientation="vertical" />
			</ScrollArea>
		</div>
	)
}
