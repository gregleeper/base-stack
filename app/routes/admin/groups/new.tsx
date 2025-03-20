import { getFormProps, useForm } from "@conform-to/react"
import type { SubmissionResult } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon, UserIcon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { z } from "zod"
import { MultiSelect } from "~/components/MultiSelect"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/new"

// Define the group schema with Zod
const groupSchema = z.object({
	name: z.string().min(1, { message: "Group name is required" }),
	description: z.string().optional(),
	memberIds: z.array(z.string()).min(1, "Group must have at least one member"),
})

export async function loader({ context }: Route.LoaderArgs) {
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

	return { users, currentUser: user }
}

export async function action({ request, context }: Route.ActionArgs) {
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

	const formData = await request.formData()

	// Process member IDs array
	const processMultiSelect = (fieldName: string): string[] => {
		const value = formData.get(fieldName)

		if (!value) return []

		try {
			return JSON.parse(value.toString())
		} catch {
			return [value.toString()]
		}
	}

	const memberIds = processMultiSelect("memberIds")

	// Validate with Zod
	const submission = parseWithZod(formData, {
		schema: groupSchema.superRefine(async (data, ctx) => {
			// Check if group with this name already exists
			const existingGroup = await prisma.userGroup.findUnique({
				where: { name: data.name },
			})

			if (existingGroup) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "A group with this name already exists",
					path: ["name"],
				})
			}
		}),
	})

	// If validation fails, return errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	const data = submission.value

	try {
		// Create new group with transaction to ensure all operations succeed
		const newGroup = await prisma.$transaction(async (tx) => {
			// 1. Create the group
			const group = await tx.userGroup.create({
				data: {
					name: data.name,
					description: data.description,
					createdBy: user.id,
				},
			})

			// 2. Add members to group
			if (memberIds.length > 0) {
				await tx.userGroupMember.createMany({
					data: memberIds.map((userId) => ({
						userId,
						groupId: group.id,
						assignedBy: user.id,
					})),
				})
			}

			return group
		})

		// Redirect to the new group's detail page
		return redirect(`/admin/groups/${newGroup.id}/view`)
	} catch (_) {
		return submission.reply({
			formErrors: ["Failed to create group. Please try again."],
		})
	}
}

export default function NewGroup({ loaderData }: Route.ComponentProps) {
	const { users } = loaderData
	const actionData = useActionData<SubmissionResult<string[]> | null>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	// User and option types
	interface User {
		id: string
		name: string
		email: string
	}

	// Format users for MultiSelect component
	const userOptions = users.map((user: User) => ({
		label: `${user.name} (${user.email})`,
		value: user.id,
	}))

	// State for selected members
	const [selectedMembers, setSelectedMembers] = useState<string[]>([])

	// Setup the form with Conform
	const [form, fields] = useForm({
		id: "new-group-form",
		lastResult: actionData,
		onValidate({ formData }) {
			// Update memberIds value with selected members
			if (selectedMembers.length > 0) {
				formData.set("memberIds", JSON.stringify(selectedMembers))
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
						<h1 className="text-2xl font-semibold">Create New Group</h1>
						<p className="text-gray-500 dark:text-gray-400">Add a new user group</p>
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
									required
									className={fields.name.errors ? "border-destructive" : ""}
									aria-invalid={Boolean(fields.name.errors)}
								/>
								{fields.name.errors && <p className="text-xs text-destructive mt-1">{fields.name.errors}</p>}
							</div>
							<div>
								<Label htmlFor={fields.description.id}>Description</Label>
								<Textarea id={fields.description.id} name={fields.description.name} rows={3} className="mt-1" />
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

					{/* Submit Buttons */}
					<div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
						<Button type="button" variant="outline" asChild>
							<Link to="/admin/groups" className="flex items-center gap-1">
								<ArrowLeftIcon className="h-4 w-4" />
								Cancel
							</Link>
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Group"}
						</Button>
					</div>
				</Form>
			</ScrollArea>
		</div>
	)
}
