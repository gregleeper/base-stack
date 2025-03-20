import { Laptop, SearchIcon, TrashIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Form, Link, Outlet, useSearchParams } from "react-router"
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
import type { Route } from "./+types/equipment"

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

	// Fetch equipment from database with search filters
	const equipment = await prisma.equipment.findMany({
		where: {
			isDeleted: false,
			...(searchQuery
				? {
						OR: [
							{ name: { contains: searchQuery } },
							{ type: { contains: searchQuery } },
							{ location: { contains: searchQuery } },
						],
					}
				: {}),
		},
		orderBy: { name: "asc" },
	})

	return { equipment, searchQuery, currentUser: user }
}

export async function action({ request, context }: Route.ActionArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Process the form data
	const formData = await request.formData()
	const action = formData.get("action")

	if (action === "delete") {
		const equipmentId = formData.get("equipmentId")

		if (!equipmentId || typeof equipmentId !== "string") {
			return { error: "Equipment ID is required" }
		}

		try {
			await prisma.equipment.update({
				where: { id: equipmentId },
				data: { isDeleted: true },
			})

			return { success: "Equipment deleted successfully" }
		} catch {
			return { error: "Failed to delete equipment" }
		}
	}

	return {}
}

export default function EquipmentAdmin({ loaderData }: Route.ComponentProps) {
	const { equipment, searchQuery, currentUser } = loaderData
	const [searchParams, setSearchParams] = useSearchParams()
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null)
	const [search, setSearch] = useState(searchQuery || "")

	// Generate URL with search parameters
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

	// Handle search input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setSearch(value)

		const newSearchParams = new URLSearchParams(searchParams)

		if (value) {
			newSearchParams.set("q", value)
		} else {
			newSearchParams.delete("q")
		}

		setSearchParams(newSearchParams)
	}

	// Clear search
	const handleClearSearch = () => {
		setSearch("")
		const newSearchParams = new URLSearchParams(searchParams)
		newSearchParams.delete("q")
		setSearchParams(newSearchParams)
	}

	// Handle delete equipment
	const handleDeleteClick = (equipmentId: string) => {
		setEquipmentToDelete(equipmentId)
		setShowDeleteDialog(true)
	}

	// Close delete dialog
	const handleCloseDeleteDialog = () => {
		setShowDeleteDialog(false)
		setEquipmentToDelete(null)
	}

	// Check permissions
	const canDeleteEquipment = currentUser.role?.name === "Administrator"

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-screen">
			{/* Left sidebar with equipment list */}
			<div className="lg:col-span-1 flex flex-col border-r border-gray-200 dark:border-gray-800 h-screen overflow-hidden">
				<div className="p-4 border-b flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Laptop className="h-5 w-5" />
							<h1 className="text-xl font-bold">Equipment</h1>
						</div>

						{/* Add Equipment button */}
						<Link to={generateUrlWithSearchParams("/admin/equipment/new")}>
							<Button size="sm">Add Equipment</Button>
						</Link>
					</div>

					{/* Search input */}
					<div className="relative">
						<Input
							type="text"
							placeholder="Search equipment..."
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

				{/* Equipment list with scroll */}
				<div className="overflow-y-auto flex-grow">
					{equipment.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							{search ? "No equipment found matching your search" : "No equipment yet"}
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{equipment.map((equipment) => (
								<div key={equipment.id} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 relative">
									<div className="flex gap-3 items-start">
										<div className="flex-shrink-0 p-1 rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
											<Laptop className="h-5 w-5" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex justify-between items-start">
												<div>
													<p className="font-medium text-sm">{equipment.name}</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Type: {equipment.type}
														{equipment.location && ` • Location: ${equipment.location}`}
													</p>
													<div className="flex items-center mt-1 gap-2">
														{equipment.isAvailable ? (
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300">
																Available
															</span>
														) : (
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300">
																Not Available
															</span>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Button size="sm" variant="outline" className="h-7 text-xs" asChild>
														<Link to={generateUrlWithSearchParams(`/admin/equipment/${equipment.id}/view`)}>View</Link>
													</Button>
													<Button size="sm" variant="outline" className="h-7 text-xs" asChild>
														<Link to={generateUrlWithSearchParams(`/admin/equipment/${equipment.id}/edit`)}>Edit</Link>
													</Button>
													{canDeleteEquipment && (
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 rounded-full text-gray-400 hover:text-red-500"
															onClick={() => handleDeleteClick(equipment.id)}
														>
															<TrashIcon className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Right content area - with padding for content */}
			<div className="lg:col-span-2 p-6">
				<Outlet />
			</div>

			{/* Delete confirmation dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Equipment</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this equipment? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={handleCloseDeleteDialog}>
							Cancel
						</Button>
						<Form method="post">
							<input type="hidden" name="equipmentId" value={equipmentToDelete || ""} />
							<input type="hidden" name="action" value="delete" />
							<Button type="submit" variant="destructive">
								Delete
							</Button>
						</Form>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
