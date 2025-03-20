import { ArrowLeftIcon, Shield } from "lucide-react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import { requireUserWithRole } from "~/services/permissions.server"
import type { Route } from "./+types/new"

export async function loader({ context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.prismaUser

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!requireUserWithRole(user, "Administrator")) {
		throw new Response("Forbidden", { status: 403 })
	}

	return {}
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

	try {
		const formData = await request.formData()
		const name = formData.get("name")?.toString()
		const description = formData.get("description")?.toString() || ""

		// Validate required fields
		if (!name) {
			return { success: false, error: "Role name is required" }
		}

		// Check if role with same name already exists
		const existingRole = await prisma.userRole.findFirst({
			where: {
				name,
			},
		})

		if (existingRole) {
			return { success: false, error: "A role with this name already exists" }
		}

		// Create role in database
		const newRole = await prisma.userRole.create({
			data: {
				name,
				description,
			},
		})

		return redirect(`/admin/roles/${newRole.id}/view`)
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return { success: false, error: "Failed to create role. Please try again." }
	}
}

export default function NewRole() {
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const isSubmitting = navigation.state === "submitting"
	const formError = actionData?.error

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm p-6">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full pr-4">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
						<Shield className="h-6 w-6 text-purple-600 dark:text-purple-300" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold">Create New Role</h1>
						<p className="text-gray-500 dark:text-gray-400">Add a new role to the system</p>
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
								<Input id="name" name="name" required className="mt-1" placeholder="e.g., Content Editor" />
							</div>
							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									name="description"
									rows={3}
									className="mt-1"
									placeholder="Describe the purpose of this role"
								/>
							</div>
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
						<Button type="button" variant="outline" asChild>
							<Link to="/admin/roles" className="flex items-center gap-1">
								<ArrowLeftIcon className="h-4 w-4" />
								Cancel
							</Link>
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Role"}
						</Button>
					</div>
				</Form>
			</ScrollArea>
		</div>
	)
}
