import { Building2, PlusCircleIcon, SearchIcon, TrashIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Form, Link, Outlet, useActionData, useLocation, useNavigation, useSubmit } from "react-router"
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
import type { Route } from "./+types/buildings"

// Define TypeScript interface for a building
interface Building {
	id: string
	name: string
	address: string
	createdAt: string
	updatedAt: string
	_count?: {
		rooms: number
	}
}

interface ActionData {
	error?: string
	success?: string
	fields?: {
		id?: string
		name?: string
		address?: string
	}
}

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

	// Fetch buildings from database with search filter
	const buildings = (await prisma.building.findMany({
		where: {
			isDeleted: false,
			...(searchQuery
				? {
						OR: [{ name: { contains: searchQuery } }, { address: { contains: searchQuery } }],
					}
				: {}),
		},
		include: {
			_count: {
				select: {
					rooms: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})) as unknown as Building[]

	return { buildings, currentUser: user, searchQuery }
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
		// Delete a building
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Building ID is required" }
			}

			// Soft delete the building
			await prisma.building.update({
				where: {
					id,
				},
				data: {
					isDeleted: true,
					deletedAt: new Date(),
				},
			})

			return { success: "Building deleted successfully" }
		}

		return { error: "Invalid action" }
	} catch (_) {
		// Error occurred during building operation
		return { error: "An error occurred while processing your request" }
	}
}

export default function BuildingsAdmin({ loaderData }: Route.ComponentProps) {
	const { buildings, currentUser, searchQuery } = loaderData
	const actionData = useActionData<ActionData>()
	const location = useLocation()
	const navigation = useNavigation()
	const submit = useSubmit()

	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
	const [search, setSearch] = useState(searchQuery || "")
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
			submit({ q: value }, { method: "get" })
		}, 300)
	}

	const handleClearSearch = () => {
		setSearch("")
		submit({ q: "" }, { method: "get" })
	}

	const isSubmitting = navigation.state === "submitting"
	const canDeleteBuildings = currentUser.role?.name === "Administrator"

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full max-h-full overflow-hidden">
			{/* Left sidebar with building list */}
			<div className="lg:col-span-1 flex flex-col border rounded-lg shadow-sm h-full max-h-full bg-white dark:bg-gray-950">
				<div className="p-4 border-b flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h2 className="text-lg font-semibold">Buildings</h2>
						<Button size="sm" className="flex items-center gap-1" asChild>
							<Link to="/admin/buildings/new">
								<PlusCircleIcon className="h-4 w-4" />
								<span>New</span>
							</Link>
						</Button>
					</div>

					<div className="relative">
						<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
						<Input
							type="search"
							placeholder="Search buildings..."
							className="pl-10 pr-10"
							value={search}
							onChange={handleSearchChange}
						/>
						{search && (
							<button
								type="button"
								onClick={handleClearSearch}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								<XIcon className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				<div className="overflow-y-auto flex-1 relative">
					{navigation.state === "loading" && search ? (
						<div className="p-4 text-center text-gray-500">Loading...</div>
					) : buildings.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							{search ? "No buildings found matching your search" : "No buildings yet"}
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{buildings.map((building) => {
								const isActive = location.pathname === `/admin/buildings/${building.id}`
								return (
									<Link
										key={building.id}
										to={`/admin/buildings/${building.id}`}
										className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 relative ${
											isActive ? "bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30" : ""
										}`}
									>
										<div className="flex gap-3 items-start">
											<div
												className={`flex-shrink-0 p-1 rounded-md ${
													isActive
														? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-100"
														: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
												}`}
											>
												<Building2 className="h-5 w-5" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex justify-between items-start">
													<div>
														<p className="font-medium text-sm truncate">{building.name}</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">{building.address}</p>
														<div className="flex items-center mt-1 gap-2">
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
																{building._count?.rooms || 0} room{building._count?.rooms !== 1 ? "s" : ""}
															</span>
														</div>
													</div>
													{canDeleteBuildings && (
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 rounded-full text-gray-400 hover:text-red-500"
															onClick={(e) => {
																e.preventDefault()
																e.stopPropagation()
																setSelectedBuilding(building)
																setShowDeleteDialog(true)
															}}
														>
															<TrashIcon className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
										</div>
									</Link>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* Right content area */}
			<div className="lg:col-span-2 overflow-y-auto p-1 h-full">
				<Outlet />
			</div>

			{/* Delete dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Building</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete {selectedBuilding?.name}? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>

					<Form method="post">
						<input type="hidden" name="intent" value="delete" />
						<input type="hidden" name="id" value={selectedBuilding?.id} />

						{actionData?.error && <div className="text-sm text-red-500 mb-4">{actionData.error}</div>}

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={isSubmitting}>
								{isSubmitting ? "Deleting..." : "Delete Building"}
							</Button>
						</DialogFooter>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
