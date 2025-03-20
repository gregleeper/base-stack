import { ArrowLeftIcon, TrashIcon } from "lucide-react"
import { redirect } from "react-router"
import { Form, Link, useActionData, useNavigation } from "react-router"
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
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/delete"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { role?: { name: string } } | undefined

	return [
		{
			title: typedData?.role
				? `Delete ${typedData.role.name} | Roles | Resource Management`
				: "Delete Role | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get role ID from params
	const roleId = params.roleId

	// Check if the user is authenticated
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check if user has admin permissions
	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!roleId) {
		throw new Response("Role ID is required", { status: 400 })
	}

	// Get the role with users count
	const role = await prisma.userRole.findUnique({
		where: {
			id: roleId,
		},
		select: {
			id: true,
			name: true,
			description: true,
			_count: {
				select: {
					users: true,
				},
			},
		},
	})

	if (!role) {
		throw new Response("Role not found", { status: 404 })
	}

	return { role, currentUser: user }
}

export async function action({ params, context }: Route.ActionArgs) {
	const roleId = params.roleId
	const user = context.prismaUser

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check if user has admin permissions
	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!roleId) {
		return { success: false, error: "Role ID is required" }
	}

	try {
		// First check if the role exists
		const role = await prisma.userRole.findUnique({
			where: {
				id: roleId,
			},
			include: {
				_count: {
					select: {
						users: true,
					},
				},
			},
		})

		if (!role) {
			return { success: false, error: "Role not found" }
		}

		// Check if there are any users with this role
		if (role._count.users > 0) {
			return {
				success: false,
				error: `Cannot delete role because it is assigned to ${role._count.users} users. Please reassign these users to a different role first.`,
			}
		}

		// Delete the role
		await prisma.userRole.delete({
			where: {
				id: roleId,
			},
		})

		return redirect("/admin/roles")
	} catch (error) {
		// Include the error message in the return but don't expose internal details
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		return {
			success: false,
			error: `An error occurred while deleting the roles: ${errorMessage}`,
		}
	}
}

export default function DeleteRole({ loaderData }: Route.ComponentProps) {
	const { role } = loaderData
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	return (
		<Dialog defaultOpen={true}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TrashIcon className="h-5 w-5 text-destructive" />
						Delete Role
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this role? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="mb-4">
						<p className="font-medium">{role.name}</p>
						{role.description && <p className="text-sm text-gray-500">{role.description}</p>}
					</div>

					<div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
						<p className="text-sm text-amber-700">
							Deleting this role will remove it from the system. Make sure no users are assigned to this role before
							deleting it.
						</p>
					</div>
				</div>

				{actionData?.error && (
					<div className="bg-red-50 p-3 rounded-md">
						<p className="text-sm text-red-600">{actionData.error}</p>
					</div>
				)}

				<DialogFooter>
					<Link to={`/admin/roles/${role.id}/view`}>
						<Button type="button" variant="outline" className="flex items-center gap-1">
							<ArrowLeftIcon className="h-4 w-4" />
							Cancel
						</Button>
					</Link>
					<Form method="post">
						<Button type="submit" variant="destructive" disabled={isSubmitting}>
							{isSubmitting ? "Deleting..." : "Delete Role"}
						</Button>
					</Form>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
