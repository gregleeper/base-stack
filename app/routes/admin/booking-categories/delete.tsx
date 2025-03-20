import { ArrowLeftIcon, TrashIcon } from "lucide-react"
import { redirect } from "react-router"
import { Form, Link, useActionData, useNavigation } from "react-router"
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
import type { Route } from "./+types/delete"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { bookingCategory?: { name: string } } | undefined

	return [
		{
			title: typedData?.bookingCategory
				? `Delete ${typedData.bookingCategory.name} | Booking Categories | Resource Management`
				: "Delete Booking Category | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get category ID from params
	const bookingCategoryId = params.bookingCategoryId

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check user role permissions
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	if (!userWithRole?.roles.some((role) => role.name === "Administrator" || role.name === "Manager")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!bookingCategoryId) {
		throw new Response("Booking Category ID is required", { status: 400 })
	}

	// Get the booking category
	const bookingCategory = await prisma.bookingCategory.findUnique({
		where: {
			id: bookingCategoryId,
		},
	})

	if (!bookingCategory) {
		throw new Response("Booking Category not found", { status: 404 })
	}

	return { bookingCategory, currentUser: userWithRole }
}

export async function action({ params, context }: Route.ActionArgs) {
	const bookingCategoryId = params.bookingCategoryId
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check user role permissions
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	if (!userWithRole?.roles.some((role) => role.name === "Administrator" || role.name === "Manager")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!bookingCategoryId) {
		return { success: false, error: "Booking Category ID is required" }
	}

	try {
		// First check if the category exists
		const bookingCategory = await prisma.bookingCategory.findUnique({
			where: {
				id: bookingCategoryId,
			},
		})

		if (!bookingCategory) {
			return { success: false, error: "Booking Category not found" }
		}

		// Check if there are any active bookings for this category
		const bookingsCount = await prisma.booking.count({
			where: {
				bookingCategoryId,
				isDeleted: false,
			},
		})

		if (bookingsCount > 0) {
			return {
				success: false,
				error: `Cannot delete category because it has ${bookingsCount} active bookings.`,
			}
		}

		// Hard delete the category
		await prisma.bookingCategory.delete({
			where: {
				id: bookingCategoryId,
			},
		})

		return redirect("/admin/booking-categories")
	} catch (error) {
		// Include the error message in the return but don't expose internal details
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		return {
			success: false,
			error: `An error occurred while deleting the booking category: ${errorMessage}`,
		}
	}
}

export default function DeleteBookingCategory({ loaderData }: Route.ComponentProps) {
	// Use type assertion with unknown to avoid type mismatch error
	const { bookingCategory } = loaderData as unknown as {
		bookingCategory: {
			id: string
			name: string
			description: string | null
		}
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
						Delete Booking Category
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this booking category? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="mb-4">
						<p className="font-medium">{bookingCategory.name}</p>
						{bookingCategory.description && <p className="text-sm text-gray-500">{bookingCategory.description}</p>}
					</div>

					<div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
						<p className="text-sm text-amber-700">
							Deleting this category will remove it from the system and prevent future bookings from using it.
							Historical booking data may be affected.
						</p>
					</div>
				</div>

				{actionData?.error && (
					<div className="bg-red-50 p-3 rounded-md">
						<p className="text-sm text-red-600">{actionData.error}</p>
					</div>
				)}

				<DialogFooter>
					<Link to={`/admin/booking-categories/${bookingCategory.id}/view`}>
						<Button type="button" variant="outline" className="flex items-center gap-1">
							<ArrowLeftIcon className="h-4 w-4" />
							Cancel
						</Button>
					</Link>
					<Form method="post">
						<Button type="submit" variant="destructive" disabled={isSubmitting}>
							{isSubmitting ? "Deleting..." : "Delete Category"}
						</Button>
					</Form>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
