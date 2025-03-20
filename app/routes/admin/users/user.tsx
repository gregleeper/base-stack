import { ArrowLeftIcon, PencilIcon, TrashIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/user"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	if (!data) {
		return [
			{
				title: "User not found | Resource Management",
			},
		]
	}

	return [
		{
			title: `${data.user.name} | Users | Resource Management`,
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	const userId = params.id
	const currentUser = context.user

	if (!currentUser) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!userId) {
		throw new Response("User ID is required", { status: 400 })
	}

	// Get all roles
	const roles = await prisma.userRole.findMany({
		orderBy: {
			name: "asc",
		},
	})

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: { roles: true },
	})

	if (!user) {
		throw new Response("User not found", { status: 404 })
	}

	return { user, roles, currentUser }
}

export default function UserDetails({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData

	// Format dates
	const formattedCreatedAt = new Date(user?.createdAt ?? "").toLocaleString()
	const formattedUpdatedAt = new Date(user?.updatedAt ?? "").toLocaleString()

	return (
		<div className="container py-8 mx-auto max-w-5xl">
			<div className="mb-8">
				<Button asChild variant="outline" size="sm">
					<Link to="/admin/users">
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						Back to Users
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader className="relative">
					<div className="absolute right-6 top-6 flex space-x-2">
						<Button asChild variant="outline" size="sm">
							<Link to={`/admin/users/${user?.id}/edit`}>
								<PencilIcon className="mr-2 h-4 w-4" />
								Edit
							</Link>
						</Button>
						<Button asChild variant="destructive" size="sm">
							<Link to={`/admin/users/${user?.id}/delete`}>
								<TrashIcon className="mr-2 h-4 w-4" />
								Delete
							</Link>
						</Button>
					</div>
					<CardTitle>{user?.name}</CardTitle>
					<CardDescription>{user?.email}</CardDescription>
					<div className="mt-2">
						<span className="inline-block text-sm px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
							{user?.roles.map((role) => role.name).join(", ")}
						</span>
					</div>
				</CardHeader>

				<CardContent className="space-y-6 pt-6">
					<div className="space-y-4">
						<h3 className="text-lg font-medium">User Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Email</p>
								<p>{user.email}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Name</p>
								<p>{user.name}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Roles</p>
								<p>{user.roles.map((role) => role.name).join(", ")}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">User ID</p>
								<p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{user.id}</p>
							</div>
						</div>
					</div>

					<div className="space-y-4 border-t pt-4">
						<h3 className="text-lg font-medium">System Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Created At</p>
								<p>{formattedCreatedAt}</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-500">Updated At</p>
								<p>{formattedUpdatedAt}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
