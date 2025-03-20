import { ArrowLeftIcon, TrashIcon } from "lucide-react"
import { redirect } from "react-router"
import { Form, Link, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/delete"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { user?: { name: string } } | undefined

	return [
		{
			title: typedData?.user
				? `Delete ${typedData.user.name} | Users | Resource Management`
				: "Delete User | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get user ID from params
	const userId = params.id

	// Check if the user is authenticated
	const currentUser = context.prismaUser

	if (!currentUser) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!userId) {
		throw new Response("User ID is required", { status: 400 })
	}

	// Get the user with their roles
	const userToDelete = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: {
			roles: true,
		},
	})

	if (!userToDelete) {
		throw new Response("User not found", { status: 404 })
	}

	// Get current user information to check permissions

	// Prevent deletion of current user
	if (userId === currentUser.id) {
		throw new Response("Cannot delete your own account", { status: 403 })
	}

	return { user: userToDelete }
}

export async function action({ params, context }: Route.ActionArgs) {
	const userId = params.id

	// Check if the user is authenticated
	const currentUser = context.prismaUser

	if (!currentUser) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!userId) {
		throw new Response("User ID is required", { status: 400 })
	}

	// Prevent deletion of current user
	if (userId === currentUser.id) {
		throw new Response("Cannot delete your own account", { status: 403 })
	}

	try {
		// Soft delete the user or permanent delete based on your application's needs
		await prisma.user.delete({
			where: {
				id: userId,
			},
		})

		// Redirect to users list
		return redirect("/admin/users")
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		throw new Response("Failed to delete user", { status: 500 })
	}
}

export default function DeleteUser({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	return (
		<div className="container py-8 mx-auto max-w-5xl">
			<div className="mb-8">
				<Button asChild variant="outline" size="sm">
					<Link to={`/admin/users/${user.id}`}>
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						Back to User Details
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-red-600">Delete User</CardTitle>
					<CardDescription>Are you sure you want to delete this user? This action cannot be undone.</CardDescription>
				</CardHeader>

				<CardContent>
					<div className="space-y-4">
						<div className="rounded-md border border-gray-200 p-4">
							<h3 className="font-medium">{user.name}</h3>
							<p className="text-sm text-gray-500">{user.email}</p>
							<div className="mt-2">
								<span className="text-sm text-gray-500">Roles: </span>
								<span className="text-sm">{user.roles.map((role: { name: string }) => role.name).join(", ")}</span>
							</div>
						</div>

						<div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
							<p className="text-sm">
								<strong>Warning:</strong> Deleting this user will remove all of their data and cannot be reversed.
							</p>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-end space-x-4">
					<Button variant="outline" asChild>
						<Link to={`/admin/users/${user.id}`}>Cancel</Link>
					</Button>
					<Form method="post">
						<Button type="submit" variant="destructive" disabled={isSubmitting}>
							<TrashIcon className="mr-2 h-4 w-4" />
							{isSubmitting ? "Deleting..." : "Delete User"}
						</Button>
					</Form>
				</CardFooter>
			</Card>
		</div>
	)
}
