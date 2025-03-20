import { FolderIcon, PlusCircleIcon, SearchIcon, TrashIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Form, Link, Outlet, useLocation, useNavigation, useSubmit } from "react-router"
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
import type { Route } from "./+types/groups"

// Loader function to get groups
export async function loader({ request, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get search parameter from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get("q") || ""

	// Get all groups
	const groups = await prisma.userGroup.findMany({
		where: {
			isDeleted: false,
			OR: searchQuery ? [{ name: { contains: searchQuery } }, { description: { contains: searchQuery } }] : undefined,
		},
		select: {
			id: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			_count: {
				select: {
					members: true,
					access: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	return { groups, currentUser: user, searchQuery }
}

// Action function to handle form submissions
export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Get the current user
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	try {
		// Delete a group
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Group ID is required" }
			}

			// Soft delete the group
			await prisma.userGroup.update({
				where: {
					id,
				},
				data: {
					isDeleted: true,
					deletedAt: new Date(),
				},
			})

			return { success: "Group deleted successfully" }
		}

		return { error: "Invalid action" }
	} catch (_) {
		// Error occurred during group operation
		return { error: "An error occurred while processing your request" }
	}
}

export default function GroupsAdmin({ loaderData, actionData }: Route.ComponentProps) {
	const { groups, currentUser, searchQuery } = loaderData
	const navigation = useNavigation()
	const location = useLocation()
	const submit = useSubmit()
	const searchFormRef = useRef<HTMLFormElement>(null)

	const [selectedGroup, setSelectedGroup] = useState<(typeof loaderData.groups)[number] | null>(null)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [searchInputValue, setSearchInputValue] = useState(searchQuery || "")

	// Reset dialogs when navigation state changes
	useEffect(() => {
		if (navigation.state === "idle" && actionData?.success) {
			setShowDeleteDialog(false)
			setSelectedGroup(null)
		}
	}, [navigation.state, actionData])

	// Debounce search form submission
	useEffect(() => {
		// Don't submit if the input value is the same as the current search query
		if (searchInputValue === searchQuery) return

		const timeoutId = setTimeout(() => {
			if (searchFormRef.current) {
				submit(searchFormRef.current, { replace: true })
			}
		}, 200)

		return () => clearTimeout(timeoutId)
	}, [searchInputValue, searchQuery, submit])

	const isSubmitting = navigation.state === "submitting"
	const isRootGroupRoute = location.pathname === "/admin/groups" || location.pathname.endsWith("/groups/")
	const isSearching = navigation.state === "loading" && new URLSearchParams(navigation.location.search).has("q")

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchInputValue(e.target.value)
	}

	const handleClearSearch = () => {
		setSearchInputValue("")
		// Submit the form immediately when clearing
		if (searchFormRef.current) {
			// Clear the input value in the form before submitting
			const input = searchFormRef.current.querySelector('input[name="q"]') as HTMLInputElement
			if (input) input.value = ""
			submit(searchFormRef.current, { replace: true })
		}
	}

	// Check if the current user can delete groups
	const canDeleteGroups = currentUser.roles?.some((role) => role.name === "Administrator") ?? false

	return (
		<div className="flex h-full">
			{/* Left Sidebar - Group List */}
			<div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 dark:border-gray-800">
					<div className="flex justify-between items-center">
						<h2 className="text-lg font-semibold">Groups</h2>
						<Button variant="outline" size="sm" className="h-8" asChild>
							<Link to="/admin/groups/new" className="flex items-center gap-1">
								<PlusCircleIcon className="h-4 w-4 mr-1" />
								<span>Add</span>
							</Link>
						</Button>
					</div>
					{actionData?.success && (
						<div className="mt-2 p-2 text-xs bg-green-50 text-green-700 rounded-md">{actionData.success}</div>
					)}

					{/* Search Bar */}
					<div className="mt-3">
						<Form method="get" className="relative" ref={searchFormRef}>
							<div className="relative">
								<input
									type="text"
									name="q"
									placeholder="Search groups..."
									className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-1 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
									value={searchInputValue}
									onChange={handleSearchChange}
								/>
								<SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
								{searchInputValue && (
									<button
										type="button"
										onClick={handleClearSearch}
										className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
										aria-label="Clear search"
									>
										<XIcon className="h-4 w-4" />
									</button>
								)}
							</div>
						</Form>
					</div>
				</div>

				{/* Scrollable group list */}
				<div className="flex-1 overflow-auto">
					{isSearching ? (
						<div className="flex items-center justify-center h-20">
							<div className="text-sm text-gray-500">Searching...</div>
						</div>
					) : groups.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center h-full">
							<FolderIcon className="h-8 w-8 text-gray-300 mb-2" />
							<h3 className="text-sm font-medium text-gray-900">
								{searchQuery ? "No matching groups found" : "No groups found"}
							</h3>
							<p className="text-xs text-gray-500 mt-1">
								{searchQuery ? (
									<>
										Try different search terms or{" "}
										<Link to="/admin/groups" className="text-blue-500 hover:underline">
											clear the search
										</Link>
									</>
								) : (
									"Get started by creating a new group."
								)}
							</p>
							{!searchQuery && (
								<Button size="sm" className="mt-4" asChild>
									<Link to="/admin/groups/new">Add Group</Link>
								</Button>
							)}
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{groups.map((group) => {
								const isActive =
									location.pathname === `/admin/groups/${group.id}` ||
									location.pathname.startsWith(`/admin/groups/${group.id}/`)
								return (
									<Link
										key={group.id}
										to={`/admin/groups/${group.id}`}
										className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${
											isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
													<FolderIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
												</div>
												<div>
													<p className="text-sm font-medium">{group.name}</p>
													{group.description && (
														<p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{group.description}</p>
													)}
													<div className="flex gap-2 mt-1">
														<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
															{group._count?.members || 0} members
														</span>
														{group._count?.access !== undefined && (
															<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
																{group._count.access} resources
															</span>
														)}
													</div>
												</div>
											</div>
											<div className="flex">
												<Button
													size="sm"
													variant="ghost"
													className="h-7 w-7 p-0 rounded-full"
													onClick={(e) => {
														e.preventDefault()
														e.stopPropagation()
														setSelectedGroup(group)
														setShowDeleteDialog(true)
													}}
													disabled={!canDeleteGroups}
												>
													<TrashIcon className="h-3.5 w-3.5 text-red-500" />
													<span className="sr-only">Delete</span>
												</Button>
											</div>
										</div>
									</Link>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* Right Content Area - Group Details or Welcome */}
			<div className="flex-1 overflow-auto p-6">
				{isRootGroupRoute ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<FolderIcon className="h-16 w-16 text-gray-300 mb-4" />
						<h2 className="text-xl font-medium text-gray-900">Group Management</h2>
						<p className="text-gray-500 mt-2 max-w-md">
							Select a group from the list to view its details, or create a new group to get started.
						</p>
					</div>
				) : (
					<Outlet />
				)}
			</div>

			{/* Delete Group Dialog */}
			{selectedGroup && (
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Group</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete this group? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>

						<div className="py-4">
							<p className="font-medium">{selectedGroup.name}</p>
							{selectedGroup.description && <p className="text-sm text-gray-500 mt-1">{selectedGroup.description}</p>}
						</div>

						<Form method="post">
							<input type="hidden" name="intent" value="delete" />
							<input type="hidden" name="id" value={selectedGroup.id} />

							<DialogFooter>
								<Button variant="outline" type="button" onClick={() => setShowDeleteDialog(false)}>
									Cancel
								</Button>
								<Button variant="destructive" type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Deleting..." : "Delete Group"}
								</Button>
							</DialogFooter>
						</Form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
