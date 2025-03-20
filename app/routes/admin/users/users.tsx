import type { User } from "@prisma/client"
import { PlusIcon, SearchIcon, TrashIcon, UserIcon, XIcon } from "lucide-react"
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
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/users"

// Loader function to get users and roles
export async function loader({ request, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const currentUser = context.user

	// If no user is authenticated, redirect to login
	if (!currentUser) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get search parameter from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get("q") || ""

	// Get all users
	const users = await prisma.user.findMany({
		where: {
			isDeleted: false,
			OR: searchQuery ? [{ name: { contains: searchQuery } }, { email: { contains: searchQuery } }] : undefined,
		},
		select: {
			id: true,
			email: true,
			name: true,
			roles: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	// Get all roles
	const roles = await prisma.userRole.findMany({
		orderBy: {
			name: "asc",
		},
	})

	return { users, roles, currentUser, searchQuery }
}

// Action function to handle form submissions
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	try {
		// Create user
		if (intent === "create") {
			const email = formData.get("email")?.toString()
			const name = formData.get("name")?.toString()
			const password = formData.get("password")?.toString()
			const roleId = formData.get("roleId")?.toString()

			if (!email || !name || !password || !roleId) {
				return { error: "Missing required fields", fields: { email, name, roleId } }
			}

			// Check if email already exists
			const existingUser = await prisma.user.findUnique({
				where: {
					email,
				},
			})

			if (existingUser) {
				return { error: "Email already exists", fields: { email, name, roleId } }
			}

			// Create the user with hashed password
			// Note: In a real app, you'd hash the password here
			await prisma.user.create({
				data: {
					email,
					name,
					password, // This should be hashed in a real application
					roles: {
						connect: {
							id: roleId,
						},
					},
				},
			})

			return { success: "User created successfully" }
		}

		// Update user
		if (intent === "update") {
			const id = formData.get("id")?.toString()
			const email = formData.get("email")?.toString()
			const name = formData.get("name")?.toString()
			const roleIds = formData.getAll("roleIds")

			if (!id || !email || !name || !roleIds) {
				return { error: "Missing required fields", fields: { id, email, name, roleIds } }
			}

			// Check if email already exists (excluding current user)
			const existingUser = await prisma.user.findFirst({
				where: {
					email,
					id: {
						not: id,
					},
				},
			})

			if (existingUser) {
				return { error: "Email already exists", fields: { id, email, name, roleIds } }
			}

			// Update the user
			await prisma.user.update({
				where: {
					id,
				},
				data: {
					email,
					name,
					roles: {
						connect: roleIds.map((id) => ({ id: id as string })),
					},
				},
			})

			return { success: "User updated successfully" }
		}

		// Delete user
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Missing user ID" }
			}

			// Soft delete the user
			await prisma.user.update({
				where: {
					id,
				},
				data: {
					isDeleted: true,
					deletedAt: new Date(),
				},
			})

			return { success: "User deleted successfully" }
		}

		return { error: "Invalid intent" }
	} catch (_) {
		// Log error internally but don't expose details to client
		return { error: "An error occurred while processing your request" }
	}
}

export default function UsersAdmin({ loaderData }: Route.ComponentProps) {
	const { users, currentUser, searchQuery } = loaderData
	const actionData = useActionData()
	const navigation = useNavigation()
	const location = useLocation()
	const submit = useSubmit()
	const searchFormRef = useRef<HTMLFormElement>(null)

	const [selectedUser, setSelectedUser] = useState<User | null>(null)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [searchInputValue, setSearchInputValue] = useState(searchQuery || "")

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
	const isRootUserRoute = location.pathname === "/admin/users" || location.pathname.endsWith("/users/")
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

	return (
		<div className="flex h-full">
			{/* Left Sidebar - User List */}
			<div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 dark:border-gray-800">
					<div className="flex justify-between items-center">
						<h2 className="text-lg font-semibold">Users</h2>
						<Button asChild variant="outline" size="sm">
							<Link to="/admin/users/new">
								<PlusIcon className="h-4 w-4" />
								Add User
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
									placeholder="Search users..."
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

				{/* Scrollable user list */}
				<div className="flex-1 overflow-auto">
					{isSearching ? (
						<div className="flex items-center justify-center h-20">
							<div className="text-sm text-gray-500">Searching...</div>
						</div>
					) : users.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center h-full">
							<UserIcon className="h-8 w-8 text-gray-300 mb-2" />
							<h3 className="text-sm font-medium text-gray-900">
								{searchQuery ? "No matching users found" : "No users found"}
							</h3>
							<p className="text-xs text-gray-500 mt-1">
								{searchQuery ? (
									<>
										Try different search terms or{" "}
										<Link to="/admin/users" className="text-blue-500 hover:underline">
											clear the search
										</Link>
									</>
								) : (
									"Get started by creating a new user."
								)}
							</p>
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-800">
							{users.map((user) => {
								const isActive = location.pathname === `/admin/users/${user.id}`
								return (
									<Link
										key={user.id}
										to={`/admin/users/${user.id}`}
										className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${
											isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
													<UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
												</div>
												<div>
													<p className="text-sm font-medium">{user.name}</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
													<span className="inline-block text-xs px-2 py-0.5 mt-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
														{user.roles.map((role) => role.name).join(", ")}
													</span>
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
														setSelectedUser(user as unknown as User)
														setShowDeleteDialog(true)
													}}
													disabled={user.id === currentUser.id}
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

			{/* Right Content Area - User Details or Welcome */}
			<div className="flex-1 overflow-auto p-6">
				{isRootUserRoute ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<UserIcon className="h-16 w-16 text-gray-300 mb-4" />
						<h2 className="text-xl font-medium text-gray-900">User Management</h2>
						<p className="text-gray-500 mt-2 max-w-md">
							Select a user from the list to view their details, or create a new user to get started.
						</p>
					</div>
				) : (
					<Outlet />
				)}
			</div>

			{/* Delete User Dialog */}
			{selectedUser && (
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete User</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete this user? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>

						<div className="py-4">
							<p className="font-medium">{selectedUser.name}</p>
							<p className="text-sm text-gray-500">{selectedUser.email}</p>
						</div>

						<Form method="post">
							<input type="hidden" name="intent" value="delete" />
							<input type="hidden" name="id" value={selectedUser.id} />

							<DialogFooter>
								<Button variant="outline" type="button" onClick={() => setShowDeleteDialog(false)}>
									Cancel
								</Button>
								<Button variant="destructive" type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Deleting..." : "Delete User"}
								</Button>
							</DialogFooter>
						</Form>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
