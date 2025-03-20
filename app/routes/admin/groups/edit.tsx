import { getFormProps, useForm } from "@conform-to/react"
import type { SubmissionResult } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon, UserIcon, UsersIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { z } from "zod"
import { MultiSelect } from "~/components/MultiSelect"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/edit"

// JSON preprocessor for handling JSON strings in form data
const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
	if (typeof value === "string") {
		try {
			return JSON.parse(value)
		} catch (e) {
			// If parsing fails, treat it as a single value instead of an error
			if (value.trim()) {
				return [value]
			}
			// Only add an issue if it's not an empty string and really can't be parsed
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: (e as Error).message,
			})
		}
	} else if (Array.isArray(value)) {
		// If it's already an array, return it as is
		return value
	}
	return value
}

// Define schemas for nested objects
const memberIdsSchema = z.array(z.string()).min(1, "Group must have at least one member")
const resourceAccessItemSchema = z.object({
	resourceType: z.string(),
	resourceId: z.string(),
	canView: z.boolean().default(true),
	canBook: z.boolean().default(false),
	canApprove: z.boolean().default(false),
	canManage: z.boolean().default(false),
})
const resourceAccessSchema = z.array(resourceAccessItemSchema).optional()

// Define the group schema with Zod
const groupSchema = z.object({
	name: z.string().min(1, { message: "Group name is required" }),
	description: z.string().optional(),
	memberIds: z.preprocess(parseJsonPreprocessor, memberIdsSchema),
	resourceAccess: z.preprocess(parseJsonPreprocessor, resourceAccessSchema),
})

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

	const { groupId } = params

	if (!groupId) {
		throw new Response("Group ID is required", { status: 400 })
	}

	// Fetch the group to edit with its members
	const group = await prisma.userGroup.findUnique({
		where: {
			id: groupId,
		},
		include: {
			members: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			},
		},
	})

	if (!group) {
		throw new Response("Group not found", { status: 404 })
	}

	// Fetch all users for member selection
	const users = await prisma.user.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			email: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	// Fetch resources for resource access selection
	const buildings = await prisma.building.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	const rooms = await prisma.room.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			building: {
				select: {
					name: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	})

	const equipment = await prisma.equipment.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			type: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	// Get existing resource access for this group
	const resourceAccess = await prisma.resourceAccess.findMany({
		where: {
			userGroupId: groupId,
		},
	})

	return {
		group,
		users,
		buildings,
		rooms,
		equipment,
		resourceAccess,
		currentUser: user,
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

	const groupId = params.groupId

	if (!groupId) {
		return { success: false, error: "Group ID is required" }
	}

	const formData = await request.formData()

	// Validate with Zod - it will handle the JSON parsing now
	const submission = await parseWithZod(formData, {
		schema: groupSchema.superRefine(async (data, ctx) => {
			// Check if group with this name already exists (excluding current group)
			const existingGroup = await prisma.userGroup.findFirst({
				where: {
					name: data.name,
					id: { not: groupId },
				},
			})

			if (existingGroup) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "A group with this name already exists",
					path: ["name"],
				})
			}
		}),
		async: true,
	})

	// If validation fails, return errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	const data = submission.value

	try {
		// Update group with transaction to ensure all operations succeed
		await prisma.$transaction(async (tx) => {
			// 1. Update the group
			await tx.userGroup.update({
				where: {
					id: groupId,
				},
				data: {
					name: data.name,
					description: data.description,
					updatedBy: user.id,
					updatedAt: new Date(),
				},
			})

			// 2. Remove existing members
			await tx.userGroupMember.deleteMany({
				where: {
					groupId,
				},
			})

			// 3. Add new members
			if (data.memberIds.length > 0) {
				await tx.userGroupMember.createMany({
					data: data.memberIds.map((userId: string) => ({
						userId,
						groupId,
						assignedBy: user.id,
					})),
				})
			}

			// 4. Remove existing resource access
			await tx.resourceAccess.deleteMany({
				where: {
					userGroupId: groupId,
				},
			})

			// 5. Add new resource access entries
			if (data.resourceAccess && data.resourceAccess.length > 0) {
				await tx.resourceAccess.createMany({
					data: data.resourceAccess.map((access) => ({
						userGroupId: groupId,
						resourceType: access.resourceType,
						resourceId: access.resourceId,
						canView: access.canView,
						canBook: access.canBook,
						canApprove: access.canApprove,
						canManage: access.canManage,
						createdBy: user.id,
					})),
				})
			}
		})

		// Redirect to the group's detail page
		return redirect(`/admin/groups/${groupId}`)
	} catch (_) {
		return submission.reply({
			formErrors: ["Failed to update group. Please try again."],
		})
	}
}

export default function EditGroup({ loaderData }: Route.ComponentProps) {
	const { group, users, buildings, rooms, equipment, resourceAccess } = loaderData
	const actionData = useActionData<SubmissionResult<string[]> | null>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	// Format users for MultiSelect component
	interface User {
		id: string
		name: string
		email: string
	}

	interface GroupMember {
		user: User
	}

	// Format users for MultiSelect component
	const userOptions = users.map((user: User) => ({
		label: `${user.name} (${user.email})`,
		value: user.id,
	}))

	// Format resources for MultiSelect component
	const buildingOptions = buildings.map((building: { id: string; name: string }) => ({
		label: `${building.name} (Building)`,
		value: `building:${building.id}`,
	}))

	const roomOptions = rooms.map((room: { id: string; name: string; building: { name: string } }) => ({
		label: `${room.name} (Room - ${room.building.name})`,
		value: `room:${room.id}`,
	}))

	const equipmentOptions = equipment.map((eq: { id: string; name: string; type: string }) => ({
		label: `${eq.name} (${eq.type})`,
		value: `equipment:${eq.id}`,
	}))

	const resourceOptions = [...buildingOptions, ...roomOptions, ...equipmentOptions]

	// State for selected members
	const [selectedMembers, setSelectedMembers] = useState<string[]>([])

	// State for resource access
	const [selectedResources, setSelectedResources] = useState<string[]>([])
	const [resourcePermissions, setResourcePermissions] = useState<
		Record<
			string,
			{
				canView: boolean
				canBook: boolean
				canApprove: boolean
				canManage: boolean
			}
		>
	>({})

	// Initialize selected members from group data
	useEffect(() => {
		if (group.members) {
			setSelectedMembers(group.members.map((member: GroupMember) => member.user.id))
		}
	}, [group])

	// Initialize resource access from existing data
	useEffect(() => {
		if (resourceAccess?.length > 0) {
			const selectedKeys = resourceAccess.map(
				(access: { resourceType: string; resourceId: string }) => `${access.resourceType}:${access.resourceId}`
			)

			setSelectedResources(selectedKeys)

			const permissions: Record<
				string,
				{
					canView: boolean
					canBook: boolean
					canApprove: boolean
					canManage: boolean
				}
			> = {}

			for (const access of resourceAccess) {
				const key = `${access.resourceType}:${access.resourceId}`
				permissions[key] = {
					canView: access.canView,
					canBook: access.canBook,
					canApprove: access.canApprove,
					canManage: access.canManage,
				}
			}

			setResourcePermissions(permissions)
		}
	}, [resourceAccess])

	// Handle resource selection change using for...of
	const handleResourceChange = (selected: string[]) => {
		setSelectedResources(selected)

		// Initialize permissions for newly added resources
		const newPermissions = { ...resourcePermissions }

		for (const resource of selected) {
			if (!newPermissions[resource]) {
				newPermissions[resource] = {
					canView: true,
					canBook: false,
					canApprove: false,
					canManage: false,
				}
			}
		}

		// Remove permissions for removed resources
		for (const key of Object.keys(newPermissions)) {
			if (!selected.includes(key)) {
				delete newPermissions[key]
			}
		}

		setResourcePermissions(newPermissions)
	}

	// Handle permission change for a resource
	const handlePermissionChange = (resource: string, permission: string, value: boolean) => {
		setResourcePermissions((prev) => ({
			...prev,
			[resource]: {
				...prev[resource],
				[permission]: value,
			},
		}))
	}

	// Setup the form with Conform
	const [form, fields] = useForm({
		id: "edit-group-form",
		lastResult: actionData,
		onValidate({ formData }) {
			// Update memberIds value with selected members
			if (selectedMembers.length > 0) {
				formData.set("memberIds", JSON.stringify(selectedMembers))
			}

			// Update resourceAccess value with selected resources and permissions
			const resourceAccessData = selectedResources.map((resource) => {
				const [type, id] = resource.split(":")
				return {
					resourceType: type,
					resourceId: id,
					...resourcePermissions[resource],
				}
			})

			if (resourceAccessData.length > 0) {
				formData.set("resourceAccess", JSON.stringify(resourceAccessData))
			}

			return parseWithZod(formData, { schema: groupSchema })
		},
	})

	// Safely handle possibly undefined form errors
	const formErrors = form.errors || []

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full pr-4">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
						<UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold">Edit Group</h1>
						<p className="text-gray-500 dark:text-gray-400">Modify group details</p>
					</div>
				</div>

				{formErrors.length > 0 && (
					<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4">
						{formErrors.map((error) => (
							<p key={error}>{error}</p>
						))}
					</div>
				)}

				<Form method="post" {...getFormProps(form)} className="space-y-8">
					{/* Basic Information */}
					<div className="space-y-4">
						<h2 className="text-lg font-medium">Basic Information</h2>
						<div className="grid grid-cols-1 gap-4">
							<div>
								<Label htmlFor={fields.name.id} className={fields.name.errors ? "text-destructive" : ""}>
									Group Name *
								</Label>
								<Input
									id={fields.name.id}
									name={fields.name.name}
									defaultValue={group.name}
									required
									className={fields.name.errors ? "border-destructive" : ""}
									aria-invalid={Boolean(fields.name.errors)}
								/>
								{fields.name.errors && <p className="text-xs text-destructive mt-1">{fields.name.errors}</p>}
							</div>
							<div>
								<Label htmlFor={fields.description.id}>Description</Label>
								<Textarea
									id={fields.description.id}
									name={fields.description.name}
									defaultValue={group.description || ""}
									rows={3}
									className="mt-1"
								/>
							</div>
						</div>
					</div>

					{/* Members Section */}
					<div className="space-y-4">
						<h2 className="text-lg font-medium">Group Members</h2>

						<div className="border rounded-md p-4">
							<input
								type="hidden"
								name={fields.memberIds.name}
								value={selectedMembers.length > 0 ? JSON.stringify(selectedMembers) : "[]"}
							/>

							<div className="mb-4">
								<Label htmlFor="member-select" className={fields.memberIds.errors ? "text-destructive" : ""}>
									Select Members *
								</Label>
								<MultiSelect
									id="member-select"
									options={userOptions}
									placeholder="Search and select users..."
									selected={selectedMembers}
									onChange={setSelectedMembers}
									className={fields.memberIds.errors ? "border-destructive" : ""}
								/>
								{fields.memberIds.errors && <p className="text-xs text-destructive mt-1">{fields.memberIds.errors}</p>}
							</div>

							{/* Selected Members Preview */}
							<div className="mt-4">
								<h3 className="text-sm font-medium mb-2">Selected Members ({selectedMembers.length})</h3>
								{selectedMembers.length === 0 ? (
									<div className="text-gray-500 text-sm">No members selected</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{selectedMembers.map((userId) => {
											const user = users.find((u: User) => u.id === userId)
											if (!user) return null
											return (
												<Card key={userId} className="p-2">
													<CardContent className="p-2 flex items-center gap-2">
														<div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
															<UserIcon className="h-4 w-4 text-gray-500" />
														</div>
														<div>
															<p className="text-sm font-medium">{user.name}</p>
															<p className="text-xs text-gray-500">{user.email}</p>
														</div>
													</CardContent>
												</Card>
											)
										})}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Resource Access Section */}
					<div className="space-y-4">
						<h2 className="text-lg font-medium">Resource Access</h2>

						<div className="border rounded-md p-4">
							<input
								type="hidden"
								name="resourceAccess"
								value={
									selectedResources.length > 0
										? JSON.stringify(
												selectedResources.map((resource) => {
													const [type, id] = resource.split(":")
													return {
														resourceType: type,
														resourceId: id,
														...resourcePermissions[resource],
													}
												})
											)
										: "[]"
								}
							/>

							<div className="mb-4">
								<Label htmlFor="resource-select">Select Resources</Label>
								<MultiSelect
									id="resource-select"
									options={resourceOptions}
									placeholder="Search and select resources..."
									selected={selectedResources}
									onChange={handleResourceChange}
								/>
							</div>

							{/* Selected Resources Preview */}
							<div className="mt-4">
								<h3 className="text-sm font-medium mb-2">Selected Resources ({selectedResources.length})</h3>
								{selectedResources.length === 0 ? (
									<div className=" text-sm">No resources selected</div>
								) : (
									<div className="grid grid-cols-1 gap-2">
										{selectedResources.map((resourceKey) => {
											const resource = resourceOptions.find((o) => o.value === resourceKey)
											if (!resource) return null

											const permissions = resourcePermissions[resourceKey]

											return (
												<Card key={resourceKey} className="p-2">
													<CardContent className="p-2">
														<div className="flex flex-col space-y-2">
															<div className="font-medium">{resource.label}</div>
															<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
																<div className="flex items-center space-x-2">
																	<Checkbox
																		id={`${resourceKey}-view`}
																		checked={permissions.canView}
																		onCheckedChange={(checked) =>
																			handlePermissionChange(resourceKey, "canView", checked === true)
																		}
																	/>
																	<Label htmlFor={`${resourceKey}-view`} className="text-sm">
																		View
																	</Label>
																</div>
																<div className="flex items-center space-x-2">
																	<Checkbox
																		id={`${resourceKey}-book`}
																		checked={permissions.canBook}
																		onCheckedChange={(checked) =>
																			handlePermissionChange(resourceKey, "canBook", checked === true)
																		}
																	/>
																	<Label htmlFor={`${resourceKey}-book`} className="text-sm">
																		Book
																	</Label>
																</div>
																<div className="flex items-center space-x-2">
																	<Checkbox
																		id={`${resourceKey}-approve`}
																		checked={permissions.canApprove}
																		onCheckedChange={(checked) =>
																			handlePermissionChange(resourceKey, "canApprove", checked === true)
																		}
																	/>
																	<Label htmlFor={`${resourceKey}-approve`} className="text-sm">
																		Approve
																	</Label>
																</div>
																<div className="flex items-center space-x-2">
																	<Checkbox
																		id={`${resourceKey}-manage`}
																		checked={permissions.canManage}
																		onCheckedChange={(checked) =>
																			handlePermissionChange(resourceKey, "canManage", checked === true)
																		}
																	/>
																	<Label htmlFor={`${resourceKey}-manage`} className="text-sm">
																		Manage
																	</Label>
																</div>
															</div>
														</div>
													</CardContent>
												</Card>
											)
										})}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
						<Button type="button" variant="outline" asChild>
							<Link to={`/admin/groups/${group.id}`} className="flex items-center gap-1">
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
