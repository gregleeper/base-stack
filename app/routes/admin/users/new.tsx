import { ArrowLeftIcon } from "lucide-react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { MultiSelect } from "~/components/ui/multi-select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/new"

// Meta function to set the page title
export const meta = () => {
	return [
		{
			title: "New User | Resource Management",
		},
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Get all available roles
	const roles = await prisma.userRole.findMany({
		orderBy: {
			name: "asc",
		},
	})

	return { roles }
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData()

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	try {
		const email = formData.get("email")?.toString()
		const name = formData.get("name")?.toString()
		const roleIds = formData.getAll("roleIds[]").map((id) => id.toString())

		if (!email || !name || roleIds.length === 0) {
			return { error: "Missing required fields", fields: { email, name } }
		}

		// Check if email already exists
		const existingUser = await prisma.user.findUnique({
			where: {
				email,
			},
		})

		if (existingUser) {
			return { error: "Email already exists", fields: { email, name } }
		}

		// Create the user with required password field (you may need to adjust this based on your schema)
		const newUser = await prisma.user.create({
			data: {
				email,
				name,
				password: "temporary_password", // Add a default password or get from form
				roles: {
					connect: roleIds.map((roleId) => ({ id: roleId })),
				},
			},
		})

		// Redirect to user details page after successful creation
		return redirect(`/admin/users/${newUser.id}`)
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return { error: "An error occurred while creating the user" }
	}
}

export default function NewUser({ loaderData }: Route.ComponentProps) {
	const { roles } = loaderData
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	const formattedRoles = roles.map((role: { id: string; name: string }) => ({
		label: role.name,
		value: role.id,
	}))

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
				<CardHeader>
					<CardTitle>New User</CardTitle>
					<CardDescription>Create a new user. All fields are required.</CardDescription>
				</CardHeader>

				<CardContent>
					<Form method="post" className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="user@example.com"
									required
									defaultValue={actionData?.fields?.email || ""}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									name="name"
									placeholder="John Doe"
									required
									defaultValue={actionData?.fields?.name || ""}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="roleIds">Roles</Label>
								<MultiSelect
									id="roleIds"
									name="roleIds"
									options={formattedRoles}
									selected={[]}
									placeholder="Select roles"
									emptyMessage="No roles found"
									onChange={() => {}} // Form will handle the state on submit
								/>
							</div>

							{actionData?.error && <div className="p-3 bg-red-50 text-red-700 rounded-md">{actionData.error}</div>}
						</div>

						<div className="flex justify-end space-x-4">
							<Button variant="outline" asChild>
								<Link to="/admin/users">Cancel</Link>
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create User"}
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
