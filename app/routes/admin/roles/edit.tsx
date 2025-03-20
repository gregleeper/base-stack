import { ArrowLeftIcon, PlusIcon, Shield, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { toast } from "sonner"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/edit"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check if user has admin permissions
	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Forbidden", { status: 403 })
	}

	const { roleId } = params

	if (!roleId) {
		throw new Response("Role ID is required", { status: 400 })
	}

	// Fetch the role to edit with its permissions
	const role = await prisma.userRole.findUnique({
		where: {
			id: roleId,
		},
		include: {
			permissions: {
				include: {
					permission: true,
				},
			},
		},
	})

	if (!role) {
		throw new Response("Role not found", { status: 404 })
	}

	// Fetch all available permissions
	const permissions = await prisma.permission.findMany({
		orderBy: [{ entity: "asc" }, { action: "asc" }, { access: "asc" }],
	})

	// Get unique entities, actions, and access types for dropdowns
	const entities = [...new Set(permissions.map((p) => p.entity))].sort()
	const actions = [...new Set(permissions.map((p) => p.action))].sort()
	const accessTypes = [...new Set(permissions.map((p) => p.access))].sort()

	return {
		role,
		currentUser: user,
		permissions,
		entities,
		actions,
		accessTypes,
	}
}

export async function action({ request, params, context }: Route.ActionArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check if user has admin permissions
	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Forbidden", { status: 403 })
	}

	const roleId = params.roleId

	if (!roleId) {
		return { success: false, error: "Role ID is required" }
	}

	try {
		const formData = await request.formData()
		const name = formData.get("name")?.toString()
		const description = formData.get("description")?.toString() || ""

		// Get permission selections
		const permissionIds = formData.getAll("permissionIds[]").map((id) => id.toString())

		// Validate required fields
		if (!name) {
			return { success: false, error: "Role name is required" }
		}

		// Check if role with same name already exists
		const existingRole = await prisma.userRole.findFirst({
			where: {
				name,
				id: { not: roleId },
			},
		})

		if (existingRole) {
			return { success: false, error: "A role with this name already exists" }
		}

		// Start a transaction to update role and permissions
		await prisma.$transaction(async (tx) => {
			// Update role in database
			await tx.userRole.update({
				where: {
					id: roleId,
				},
				data: {
					name,
					description,
				},
			})

			// Remove all existing permissions for this role
			await tx.roleToPermission.deleteMany({
				where: {
					roleId,
				},
			})

			// Add new permissions
			if (permissionIds.length > 0) {
				await tx.roleToPermission.createMany({
					data: permissionIds.map((permissionId) => ({
						roleId,
						permissionId,
					})),
				})
			}
		})

		return redirect(`/admin/roles/${roleId}/view`)
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return { success: false, error: "Failed to update role. Please try again." }
	}
}

export default function EditRole({ loaderData }: Route.ComponentProps) {
	const { role, permissions, entities, actions, accessTypes } = loaderData
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const isSubmitting = navigation.state === "submitting"
	const formError = actionData?.error

	// State for permission selection
	const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
	const [selectedAction, setSelectedAction] = useState<string | null>(null)
	const [selectedAccess, setSelectedAccess] = useState<string | null>(null)
	const [selectedPermissions, setSelectedPermissions] = useState<
		Array<{ id: string; entity: string; action: string; access: string; description: string }>
	>([])

	// Initialize selected permissions from role data
	useEffect(() => {
		if (role.permissions) {
			setSelectedPermissions(
				role.permissions.map((rp) => ({
					id: rp.permission.id,
					entity: rp.permission.entity,
					action: rp.permission.action,
					access: rp.permission.access,
					description: rp.permission.description || "",
				}))
			)
		}
	}, [role])

	// Find a permission by entity, action, and access
	const findPermission = () => {
		if (!selectedEntity || !selectedAction || !selectedAccess) return null

		return permissions.find(
			(p) => p.entity === selectedEntity && p.action === selectedAction && p.access === selectedAccess
		)
	}

	// Add a permission to the selected list
	const addPermission = (permissionId: string) => {
		const permission = permissions.find((p) => p.id === permissionId)
		if (!permission) return

		// Check if permission already exists
		if (selectedPermissions.some((p) => p.id === permissionId)) {
			toast.error(
				`Permission "${permission.entity.replace(/-/g, " ")} - ${permission.action} - ${permission.access}" is already added`
			)
			return
		}

		setSelectedPermissions([
			...selectedPermissions,
			{
				id: permission.id,
				entity: permission.entity,
				action: permission.action,
				access: permission.access,
				description: permission.description || "",
			},
		])

		toast.success("Permission added successfully")
	}

	// Remove a permission from the selected list
	const removePermission = (permissionId: string) => {
		setSelectedPermissions(selectedPermissions.filter((p) => p.id !== permissionId))
	}

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full pr-4">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
						<Shield className="h-6 w-6 text-purple-600 dark:text-purple-300" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold">Edit Role</h1>
						<p className="text-gray-500 dark:text-gray-400">Modify role details</p>
					</div>
				</div>

				{formError && (
					<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">{formError}</div>
				)}

				<Form method="post" className="space-y-8">
					{/* Basic Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-medium">Basic Information</h2>
						<div className="grid grid-cols-1 gap-4">
							<div>
								<Label htmlFor="name">Role Name *</Label>
								<Input id="name" name="name" defaultValue={role.name} required className="mt-1" />
							</div>
							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									name="description"
									defaultValue={role.description || ""}
									rows={3}
									className="mt-1"
								/>
							</div>
						</div>
					</div>

					{/* Permissions Section */}
					<div className="space-y-4">
						<h2 className="text-lg font-medium">Permissions</h2>

						{/* Permission Selection */}
						<div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
							<h3 className="text-md font-medium mb-3">Add Permissions</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
								<div>
									<Label htmlFor="entity">Entity</Label>
									<Select value={selectedEntity || undefined} onValueChange={setSelectedEntity}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select entity" />
										</SelectTrigger>
										<SelectContent>
											{entities.map((entity) => (
												<SelectItem key={entity} value={entity}>
													{entity.replace(/-/g, " ")}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="action">Action</Label>
									<Select value={selectedAction || undefined} onValueChange={setSelectedAction}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select action" />
										</SelectTrigger>
										<SelectContent>
											{actions.map((action) => (
												<SelectItem key={action} value={action}>
													{action}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="access">Access</Label>
									<Select value={selectedAccess || undefined} onValueChange={setSelectedAccess}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select access" />
										</SelectTrigger>
										<SelectContent>
											{accessTypes.map((access) => (
												<SelectItem key={access} value={access}>
													{access}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex justify-end">
								<Button
									type="button"
									onClick={() => {
										const permission = findPermission()
										if (permission) {
											addPermission(permission.id)
										}
									}}
									disabled={!selectedEntity || !selectedAction || !selectedAccess}
									className="flex items-center gap-1"
								>
									<PlusIcon className="h-4 w-4" />
									Add Permission
								</Button>
							</div>
						</div>

						{/* Selected Permissions List */}
						<div className="border rounded-md p-4">
							<h3 className="text-md font-medium mb-3">Selected Permissions</h3>

							{selectedPermissions.length === 0 ? (
								<p className="text-gray-500 dark:text-gray-400 text-sm">No permissions selected</p>
							) : (
								<div className="space-y-2">
									{selectedPermissions.map((permission) => (
										<Card key={permission.id} className="p-3 flex justify-between items-center">
											<div>
												<div className="flex gap-2 mb-1">
													<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
														{permission.entity.replace(/-/g, " ")}
													</Badge>
													<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
														{permission.action}
													</Badge>
													<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
														{permission.access}
													</Badge>
												</div>
												<p className="text-sm text-gray-600 dark:text-gray-300">{permission.description}</p>
												<input type="hidden" name="permissionIds[]" value={permission.id} />
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removePermission(permission.id)}
												className="text-gray-500 hover:text-red-600"
											>
												<Trash2Icon className="h-4 w-4" />
											</Button>
										</Card>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
						<Button type="button" variant="outline" asChild>
							<Link to={`/admin/roles/${role.id}/view`} className="flex items-center gap-1">
								<ArrowLeftIcon className="h-4 w-4" />
								Cancel
							</Link>
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</Form>
			</ScrollArea>
		</div>
	)
}
