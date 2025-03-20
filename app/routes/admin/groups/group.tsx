import { UserIcon } from "lucide-react"
import { Link, useActionData, useNavigation } from "react-router"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/group"

// Meta function to set the page title and description
export const meta = ({ data }: Route.MetaArgs): Route.MetaDescriptors => {
	return [
		{
			title: data?.group
				? `${data.group.name} | Admin Groups | Resource Management`
				: "Group Details | Admin Groups | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get the group ID from the params
	const groupId = params.groupId

	// Check if the user is authenticated
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!groupId) {
		throw new Response("Group ID is required", { status: 400 })
	}

	// Get the group
	const group = await prisma.userGroup.findUnique({
		where: {
			id: groupId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	if (!group) {
		throw new Response("Group not found", { status: 404 })
	}

	// Get group members
	const members = await prisma.userGroupMember.findMany({
		where: {
			groupId: groupId,
		},
		select: {
			userId: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
		orderBy: {
			user: {
				name: "asc",
			},
		},
	})

	return { group, members, currentUser: user }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const groupId = params.id
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!groupId) {
		return { error: "Group ID is required" }
	}

	try {
		// Update group
		if (intent === "update") {
			const name = formData.get("name")?.toString()
			const description = formData.get("description")?.toString()

			if (!name) {
				return { error: "Group name is required", fields: { id: groupId, name, description } }
			}

			// Check if name already exists (excluding current group)
			const existingGroup = await prisma.userGroup.findFirst({
				where: {
					name,
					id: {
						not: groupId,
					},
					isDeleted: false,
				},
			})

			if (existingGroup) {
				return { error: "Group name already exists", fields: { id: groupId, name, description } }
			}

			// Update the group
			await prisma.userGroup.update({
				where: {
					id: groupId,
				},
				data: {
					name,
					description: description || "",
				},
			})

			return { success: "Group updated successfully" }
		}

		return { error: "Invalid intent" }
	} catch (_) {
		return { error: "An error occurred while processing your request" }
	}
}

export default function GroupDetails({ loaderData }: Route.ComponentProps) {
	const { group, members, currentUser } = loaderData
	const actionData = useActionData()
	const navigation = useNavigation()

	const isSubmitting = navigation.state === "submitting"
	const canEdit = currentUser.roles.some((role) => role.name === "Administrator")
	const formattedCreatedAt = new Date(group.createdAt).toLocaleString()
	const formattedUpdatedAt = new Date(group.updatedAt).toLocaleString()

	return (
		<div className="max-w-3xl mx-auto">
			<Card>
				<CardHeader className="pb-2">
					<div className="flex justify-between items-start">
						<div>
							<CardTitle className="text-2xl">{group?.name}</CardTitle>
							{group?.description && <CardDescription className="text-base mt-1">{group?.description}</CardDescription>}
						</div>
						<div className="flex space-x-2">
							<Button size="sm" variant="outline" asChild>
								<Link to={`/admin/groups/${group.id}/edit`}>Edit</Link>
							</Button>
							<Button size="sm" variant="outline" asChild>
								<Link to={`/admin/groups/${group.id}/delete`}>Delete</Link>
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6 pt-6">
					{actionData?.success && <div className="p-3 bg-green-50 text-green-700 rounded-md">{actionData.success}</div>}

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-medium">Group Members ({members.length})</h3>
							{canEdit && (
								<Button size="sm" variant="outline" className="flex items-center gap-1">
									<span>Manage Members</span>
								</Button>
							)}
						</div>

						{members.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-8 text-center">
								<UserIcon className="h-8 w-8 text-gray-300 mb-2" />
								<h3 className="text-sm font-medium text-gray-900">No members</h3>
								<p className="text-xs text-gray-500 mt-1">This group doesn't have any members yet.</p>
							</div>
						) : (
							<div className="border rounded-lg overflow-hidden">
								<div className="divide-y divide-gray-200 dark:divide-gray-800">
									{members.map((member) => (
										<div key={member.userId} className="flex items-center justify-between p-4">
											<div className="flex items-center space-x-3">
												<div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
													<Avatar className="">
														<AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
													</Avatar>
												</div>
												<div>
													<p className="text-sm font-medium">{member.user.name}</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
												</div>
											</div>
											{canEdit && (
												<Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700">
													Remove
												</Button>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="space-y-4 border-t pt-4">
						<h3 className="text-lg font-medium">System Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Created At</p>
								<p>{formattedCreatedAt}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Last Updated</p>
								<p>{formattedUpdatedAt}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Group ID</p>
								<p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{group.id}</p>
							</div>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-end pt-6">
					<Button variant="outline" asChild>
						<Link to="/admin/groups">Back to Groups</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
