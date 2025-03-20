import type { Room } from "@prisma/client"
import { DoorOpen, SearchIcon, TrashIcon, XIcon } from "lucide-react"
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
import { MultiSelect, type Option } from "~/components/ui/multi-select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/rooms"

export async function loader({ request, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get search query and building filters from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get("q") || ""
	const buildingIds = url.searchParams.getAll("buildingIds[]")

	// Fetch all buildings for the filter
	const buildings = await prisma.building.findMany({
		where: { isDeleted: false },
		orderBy: { name: "asc" },
		select: { id: true, name: true },
	})

	// Fetch rooms from database with search and building filters
	const rooms = await prisma.room.findMany({
		where: {
			isDeleted: false,
			...(buildingIds.length > 0 ? { buildingId: { in: buildingIds } } : {}),
			...(searchQuery
				? {
						OR: [
							{ name: { contains: searchQuery } },
							{ building: { name: { contains: searchQuery } } },
							{ type: { name: { contains: searchQuery } } },
						],
					}
				: {}),
		},
		include: {
			building: {
				select: {
					name: true,
				},
			},
			type: {
				select: {
					name: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	return { rooms, buildings, currentUser: user, searchQuery, selectedBuildingIds: buildingIds }
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
		// Delete a room
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Room ID is required" }
			}

			// Soft delete the room
			await prisma.room.update({
				where: {
					id,
				},
				data: {
					isDeleted: true,
					deletedAt: new Date(),
				},
			})

			return { success: "Room deleted successfully" }
		}

		return { error: "Invalid action" }
	} catch (_) {
		// Error occurred during room operation
		return { error: "An error occurred while processing your request" }
	}
}

export default function RoomsAdmin({ loaderData, actionData }: Route.ComponentProps) {
	const { rooms, buildings, currentUser, searchQuery, selectedBuildingIds } = loaderData
	const navigation = useNavigation()
	const [searchParams, setSearchParams] = useSearchParams()

	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
	const [search, setSearch] = useState(searchQuery || "")
	const [selectedBuildings, setSelectedBuildings] = useState<string[]>(selectedBuildingIds || [])
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

	// Update selected buildings when selectedBuildingIds changes
	useEffect(() => {
		setSelectedBuildings(selectedBuildingIds || [])
	}, [selectedBuildingIds])

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

	const handleBuildingFilterChange = (selected: string[]) => {
		setSelectedBuildings(selected)

		if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current)
		filterTimeoutRef.current = setTimeout(() => {
			const newSearchParams = new URLSearchParams(searchParams)

			// Remove existing building IDs
			newSearchParams.delete("buildingIds[]")

			// Add new building IDs
			for (const id of selected) {
				newSearchParams.append("buildingIds[]", id)
			}

			setSearchParams(newSearchParams)
		}, 300)
	}

	const isSubmitting = navigation.state === "submitting"
	const canDeleteRooms = currentUser.role?.name === "Administrator"

	// Convert buildings to options format for MultiSelect
	const buildingOptions: Option[] = buildings.map((building) => ({
		label: building.name,
		value: building.id,
	}))

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-screen">
			{/* Left sidebar with room list */}
			<div className="lg:col-span-1 flex flex-col border-r border-gray-200 dark:border-gray-800 h-screen overflow-hidden">
				<div className="p-4 border-b flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h1 className="text-xl font-bold">Rooms</h1>

						{/* Add Room button - moved to top right */}
						<Link to={generateUrlWithSearchParams("/admin/rooms/new")}>
							<Button size="sm">Add New Room</Button>
						</Link>
					</div>

					{/* Search input */}
					<div className="relative">
						<Input
							type="text"
							placeholder="Search rooms..."
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

					{/* Building filter */}
					<div>
						<label htmlFor="building-filter" className="block text-sm font-medium mb-1">
							Filter by Building
						</label>
						<MultiSelect
							id="building-filter"
							options={buildingOptions}
							selected={selectedBuildings}
							onChange={handleBuildingFilterChange}
							placeholder="Select buildings..."
							className="w-full"
						/>
					</div>
				</div>

				<div className="overflow-y-auto flex-grow">
					{navigation.state === "loading" && search ? (
						<div className="p-4 text-center text-gray-500">Loading...</div>
					) : rooms.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							{search ? "No rooms found matching your search" : "No rooms yet"}
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{rooms.map((room) => (
								<div key={room.id} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 relative">
									<div className="flex gap-3 items-start">
										<div className="flex-shrink-0 p-1 rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
											<DoorOpen className="h-5 w-5" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex justify-between items-start">
												<div>
													<p className="font-medium text-sm">{room.name}</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Building: {room.building?.name} • Floor: {room.floor}
													</p>
													<div className="flex items-center mt-1 gap-2">
														<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
															Capacity: {room.capacity}
														</span>
														<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
															{room.type?.name}
														</span>
														{room.isActive ? (
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300">
																Active
															</span>
														) : (
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300">
																Inactive
															</span>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Button size="sm" variant="outline" className="h-7 text-xs" asChild>
														<Link to={generateUrlWithSearchParams(`/admin/rooms/${room.id}/view`)}>View</Link>
													</Button>
													<Button size="sm" variant="outline" className="h-7 text-xs" asChild>
														<Link to={generateUrlWithSearchParams(`/admin/rooms/${room.id}/edit`)}>Edit</Link>
													</Button>
													{canDeleteRooms && (
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 rounded-full text-gray-400 hover:text-red-500"
															onClick={() => {
																setSelectedRoom(room as Room)
																setShowDeleteDialog(true)
															}}
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

			{/* Right content area - with padding for content but no overflow handling */}
			<div className="lg:col-span-2 p-6">
				<Outlet />
			</div>

			{/* Delete dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Room</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete {selectedRoom?.name}? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>

					<Form method="post">
						<input type="hidden" name="intent" value="delete" />
						<input type="hidden" name="id" value={selectedRoom?.id} />

						{actionData?.error && <div className="text-sm text-red-500 mb-4">{actionData.error}</div>}

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={isSubmitting}>
								{isSubmitting ? "Deleting..." : "Delete Room"}
							</Button>
						</DialogFooter>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
