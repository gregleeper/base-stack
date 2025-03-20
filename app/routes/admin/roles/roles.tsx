import type { UserRole } from "@prisma/client"
import { SearchIcon, Shield, Trash2, XIcon } from "lucide-react"
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
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/roles"

export async function loader({ request, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get search query from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get("q") || ""

	// Fetch roles from database with search filter
	const roles = await prisma.userRole.findMany({
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

	return { roles, currentUser: user, searchQuery }
}

export async function action({ request, context }: Route.ActionArgs) {
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	try {
		// Delete a role
		if (intent === "delete") {
			const id = formData.get("id")?.toString()

			if (!id) {
				return { error: "Role ID is required" }
			}

			// Check if users have this role
			const usersWithRole = await prisma.user.count({
				where: {
					roles: {
						some: {
							id,
						},
					},
				},
			})

			if (usersWithRole > 0) {
				return { error: `Cannot delete role because it is assigned to ${usersWithRole} users.` }
			}

			// Delete the role
			await prisma.userRole.delete({
				where: {
					id,
				},
			})

			return { success: "Role deleted successfully" }
		}

		return { error: "Invalid action" }
	} catch (error) {
		// Error occurred during role operation
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return { error: "An error occurred while processing your request" }
	}
}

export default function RolesAdmin({ loaderData, actionData }: Route.ComponentProps) {
	const { roles, searchQuery } = loaderData
	const navigation = useNavigation()
	const [searchParams, setSearchParams] = useSearchParams()

	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
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
			{/* Left sidebar with role list */}
			<div className="lg:col-span-1 flex flex-col border-r border-gray-200 dark:border-gray-800 h-screen overflow-hidden">
				<div className="p-4 border-b flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h1 className="text-xl font-bold">Roles</h1>

						{/* Add Role button */}
						<Link to={generateUrlWithSearchParams("/admin/roles/new")}>
							<Button size="sm">Add New Role</Button>
						</Link>
					</div>

					{/* Search input */}
					<div className="relative">
						<Input
							type="text"
							placeholder="Search roles..."
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

				{/* Role list */}
				<div className="flex-1 overflow-y-auto">
					{roles.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full p-4 text-center">
							<p className="text-gray-500 mb-4">No roles found.</p>
							<Link to="/admin/roles/new">
								<Button size="sm">Add First Role</Button>
							</Link>
						</div>
					) : (
						<ul className="divide-y">
							{roles.map((role) => (
								<li key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
									<div className="flex justify-between items-center p-4">
										<Link to={generateUrlWithSearchParams(`/admin/roles/${role.id}/view`)} className="flex-1">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
													<Shield className="h-5 w-5 text-purple-600 dark:text-purple-300" />
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center justify-between">
														<h2 className="text-sm font-medium truncate">{role.name}</h2>
													</div>
													<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
														{role.description || "No description"}
													</p>
												</div>
											</div>
										</Link>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setSelectedRole(role)
												setShowDeleteDialog(true)
											}}
											className="ml-2 text-gray-500 hover:text-red-600"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Right area for displaying nested routes */}
			<div className="lg:col-span-2 p-0 overflow-y-auto">
				<Outlet />
			</div>

			{/* Delete Role Dialog */}
			{showDeleteDialog && selectedRole && (
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Role</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete the role "{selectedRole.name}"? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>

						{actionData?.error && (
							<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">{actionData.error}</div>
						)}

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
								Cancel
							</Button>
							<Form method="post">
								<input type="hidden" name="intent" value="delete" />
								<input type="hidden" name="id" value={selectedRole.id} />
								<Button type="submit" variant="destructive" disabled={isSubmitting}>
									{isSubmitting ? "Deleting..." : "Delete Role"}
								</Button>
							</Form>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
