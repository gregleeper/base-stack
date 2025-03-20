import { Edit, Shield, Trash2 } from "lucide-react"
import { Link, redirect, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/services/db.server"
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/role"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const currentUser = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!currentUser) {
		return redirect("/login")
	}
	if (!requireUserWithRole(currentUser, "Administrator")) {
		throw new Response("Unauthorized", { status: 403 })
	}

	const { roleId } = params

	if (!roleId) {
		throw new Response("Role ID is required", { status: 400 })
	}

	// Fetch the role details
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
		throw new Response("Role not found", { status: 404 })
	}

	return { role, currentUser }
}

export default function RoleDetails({ loaderData }: Route.ComponentProps) {
	const { role } = loaderData
	const location = useLocation()

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full">
				<ScrollBar orientation="vertical" />
				<div className="flex justify-between items-start mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
							<Shield className="h-6 w-6 text-purple-600 dark:text-purple-300" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold">{role.name}</h1>
							<p className="text-gray-500 dark:text-gray-400">
								{role._count.users} user{role._count.users !== 1 ? "s" : ""} with this role
							</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button asChild variant="outline" size="sm" className="flex items-center gap-1">
							<Link to={`/admin/roles/${role.id}/edit`}>
								<Edit className="h-4 w-4" />
								<span>Edit</span>
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="flex items-center gap-1 text-destructive hover:text-destructive"
						>
							<Link to={`/admin/roles/${role.id}/delete`}>
								<Trash2 className="h-4 w-4" />
								<span>Delete</span>
							</Link>
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 mb-8">
					<div>
						<h2 className="text-lg font-medium mb-3">Role Details</h2>
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Name</span>
								<span className="font-medium">{role.name}</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Description</span>
								<span className="font-medium">{role.description || "No description"}</span>
							</div>
							<div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
								<span className="text-gray-600 dark:text-gray-300">Users</span>
								<span className="font-medium">{role._count.users}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Actions Section at bottom */}
				<div className="mt-8 pt-4 border-t flex justify-between">
					<Button variant="outline" asChild>
						<Link to={`/admin/roles${location.search}`}>Back to Roles</Link>
					</Button>

					<div className="flex gap-2">
						<Button variant="destructive" size="sm" className="flex items-center gap-1" asChild>
							<Link to={`/admin/roles/${role.id}/delete`}>
								<Trash2 className="h-4 w-4" />
								<span>Delete Role</span>
							</Link>
						</Button>
					</div>
				</div>
			</ScrollArea>
		</div>
	)
}
