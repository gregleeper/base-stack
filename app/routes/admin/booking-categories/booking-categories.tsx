import type { BookingCategory } from "@prisma/client"
import { PlusCircle, SearchIcon, TrashIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Form, Link, Outlet, useNavigation, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/booking-categories"

export async function loader({ request, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get search query from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get("q") || ""

	// Get user with role for access control
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	// Fetch categories from database with search filter
	const bookingCategories = await prisma.bookingCategory.findMany({
		where: {
			...(searchQuery
				? {
						OR: [{ name: { contains: searchQuery } }, { description: { contains: searchQuery } }],
					}
				: {}),
		},
		orderBy: {
			name: "asc",
		},
	})

	return { bookingCategories, currentUser: userWithRole, searchQuery }
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	try {
		// Delete a booking category
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Booking Category ID is required" }
			}

			// Check if the category is used in any active bookings
			const bookingsCount = await prisma.booking.count({
				where: {
					bookingCategoryId: id,
					isDeleted: false,
				},
			})

			if (bookingsCount > 0) {
				return {
					error: `Cannot delete category because it is used in ${bookingsCount} active bookings.`,
				}
			}

			// Hard delete the booking category since it doesn't have soft delete fields
			await prisma.bookingCategory.delete({
				where: {
					id,
				},
			})

			return { success: "Booking Category deleted successfully" }
		}

		return { error: "Invalid action" }
	} catch (_) {
		// Error occurred during booking category operation
		return { error: "An error occurred while processing your request" }
	}
}

export default function BookingCategoriesAdmin({ loaderData, actionData }: Route.ComponentProps) {
	const { bookingCategories, currentUser, searchQuery } = loaderData
	const navigation = useNavigation()
	const [searchParams, setSearchParams] = useSearchParams()

	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null)
	const [search, setSearch] = useState(searchQuery || "")
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Function to generate URLs with current search parameters
	const generateUrlWithSearchParams = (baseUrl: string) => {
		// Create a new URLSearchParams object with current search params
		const params = new URLSearchParams(searchParams)

		// Return the URL with search parameters
		const queryString = params.toString()
		if (queryString) {
			return `${baseUrl}?${queryString}`
		}
		return baseUrl
	}

	// Reset form when navigation state changes
	useEffect(() => {
		if (navigation.state === "idle" && actionData?.success) {
			setShowDeleteDialog(false)
		}
	}, [navigation.state, actionData])

	// Update search input when searchQuery changes
	useEffect(() => {
		setSearch(searchQuery || "")
	}, [searchQuery])

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setSearch(value)

		if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
		searchTimeoutRef.current = setTimeout(() => {
			const newSearchParams = new URLSearchParams(searchParams)

			// Update search query
			if (value) {
				newSearchParams.set("q", value)
			} else {
				newSearchParams.delete("q")
			}

			setSearchParams(newSearchParams)
		}, 300)
	}

	const handleClearSearch = () => {
		setSearch("")
		const newSearchParams = new URLSearchParams(searchParams)
		newSearchParams.delete("q")
		setSearchParams(newSearchParams)
	}

	const isSubmitting = navigation.state === "submitting"

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-screen">
			{/* Left sidebar with category list */}
			<div className="lg:col-span-1 flex flex-col border-r border-gray-200 dark:border-gray-800 h-screen overflow-hidden">
				<div className="p-4 border-b flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h1 className="text-xl font-bold">Booking Categories</h1>

						<Link to={generateUrlWithSearchParams("/admin/booking-categories/new")}>
							<Button size="sm" className="flex items-center gap-1">
								<PlusCircle className="h-4 w-4" />
								<span>Add New</span>
							</Button>
						</Link>
					</div>

					{/* Search input */}
					<div className="relative">
						<Input
							type="text"
							placeholder="Search categories..."
							value={search}
							onChange={handleSearchChange}
							className="pr-8"
						/>
						{search ? (
							<button
								type="button"
								onClick={handleClearSearch}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								<XIcon className="h-4 w-4" />
							</button>
						) : (
							<SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						)}
					</div>
				</div>

				{/* Category list */}
				<div className="overflow-y-auto flex-1">
					{bookingCategories.length === 0 ? (
						<div className="p-4 text-center text-gray-500 dark:text-gray-400">
							{searchQuery ? "No categories match your search." : "No booking categories found."}
						</div>
					) : (
						<nav className="space-y-1 p-2">
							{bookingCategories.map((category: BookingCategory) => (
								<Link
									key={category.id}
									to={generateUrlWithSearchParams(`/admin/booking-categories/${category.id}/view`)}
									className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100">
											{category.name}
										</div>
										{category.description && (
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{category.description}</p>
										)}
									</div>
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											setSelectedCategory({ id: category.id, name: category.name })
											setShowDeleteDialog(true)
										}}
										className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
									>
										<TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-500" />
									</button>
								</Link>
							))}
						</nav>
					)}
				</div>
			</div>

			{/* Right content area - outlet for nested routes */}
			<div className="lg:col-span-2 flex-1  p-6">
				<Outlet />
			</div>

			{/* Delete confirmation dialog */}
			{showDeleteDialog && selectedCategory && (
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Booking Category</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete the category "{selectedCategory.name}"? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<Form method="post">
							<input type="hidden" name="intent" value="delete" />
							<input type="hidden" name="id" value={selectedCategory.id} />
							{actionData?.error && (
								<div className="bg-red-50 p-3 rounded-md mb-4">
									<p className="text-sm text-red-600">{actionData.error}</p>
								</div>
							)}
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowDeleteDialog(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button type="submit" variant="destructive" disabled={isSubmitting}>
									{isSubmitting ? "Deleting..." : "Delete"}
								</Button>
							</DialogFooter>
						</Form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
