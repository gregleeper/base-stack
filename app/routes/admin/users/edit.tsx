import { getFormProps, getInputProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useState } from "react"
import { Form, Link, redirect, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { MultiSelect } from "~/components/ui/multi-select"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/edit"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { user?: { name: string } } | undefined

	return [
		{
			title: typedData?.user
				? `Edit ${typedData.user.name} | Users | Resource Management`
				: "Edit User | Resource Management",
		},
	]
}

// JSON preprocessor for handling MultiSelect values
const parseJsonPreprocessor = (value: unknown) => {
	if (typeof value === "string") {
		try {
			return JSON.parse(value)
		} catch (e) {
			// If parsing fails, treat it as a single value instead of an error
			if (value.trim()) {
				return [value]
			}
			return []
		}
	} else if (Array.isArray(value)) {
		// If it's already an array, return it as is
		return value
	}
	return []
}

// Define the user schema with Zod
const userSchema = z.object({
	email: z.string().email("Invalid email address"),
	name: z.string().min(1, "Name is required"),
	roleIds: z
		.preprocess(parseJsonPreprocessor, z.array(z.string()))
		.refine((val) => val.length > 0, { message: "At least one role is required" }),
})

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
	const editUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: {
			roles: true,
		},
	})

	if (!editUser) {
		throw new Response("User not found", { status: 404 })
	}

	// Get all available roles
	const roles = await prisma.userRole.findMany({
		orderBy: {
			name: "asc",
		},
	})

	return { user: editUser, roles, currentUser }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const userId = params.id
	const formData = await request.formData()

	// Check if the user is authenticated
	const currentUser = context.prismaUser

	if (!currentUser) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!userId) {
		return { error: "User ID is required" }
	}

	// Process form data with Conform and Zod
	const submission = parseWithZod(formData, { schema: userSchema })

	// If the form submission has errors, return them
	if (submission.status !== "success") {
		return { submission }
	}

	const { email, name, roleIds } = submission.value

	try {
		// Check if email already exists (excluding current user)
		const existingUser = await prisma.user.findFirst({
			where: {
				email: email as string,
				id: {
					not: userId,
				},
			},
		})

		if (existingUser) {
			// Create a new submission with an email error
			return {
				submission: {
					...submission,
					status: "error" as const,
					error: {
						email: ["Email already exists"],
					},
				},
			}
		}

		// Update the user
		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				email: email as string,
				name: name as string,
				roles: {
					set: [], // Remove existing roles
					connect: (roleIds as string[]).map((roleId) => ({ id: roleId })), // Connect new roles
				},
			},
		})

		// Redirect to user details page after successful update
		return redirect(`/admin/users/${userId}`)
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return {
			submission: {
				...submission,
				status: "error" as const,
				error: {
					"": ["An error occurred while updating the user"],
				},
			},
		}
	}
}

export default function EditUser({ loaderData, actionData }: Route.ComponentProps) {
	const { user, roles } = loaderData
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	const formattedRoles = roles.map((role: { id: string; name: string }) => ({
		label: role.name,
		value: role.id,
	}))

	// Setup form with Conform
	// @ts-ignore - TypeScript has issues with Zod schema inference in Conform
	const [form, fields] = useForm({
		id: "edit-user-form",
		defaultValue: {
			email: user.email,
			name: user.name,
			roleIds: JSON.stringify(user.roles.map((role: { id: string }) => role.id)),
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		// @ts-ignore - TypeScript has issues with the return type of parseWithZod
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: userSchema })
		},
		// @ts-ignore - submission type mismatch but works at runtime
		lastResult: actionData?.submission,
	})

	// Use state to manage the selected role IDs for MultiSelect component
	const [selectedRoleIds, setSelectedRoleIds] = useState(user.roles.map((role: { id: string }) => role.id))

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
					<CardTitle>Edit User</CardTitle>
					<CardDescription>Update user information. All fields are required.</CardDescription>
				</CardHeader>

				<CardContent>
					<Form method="post" {...getFormProps(form)} className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={fields.email.id}>Email</Label>
								<Input {...getInputProps(fields.email, { type: "email" })} placeholder="user@example.com" required />
								{fields.email.errors && fields.email.errors.length > 0 && (
									<div className="text-sm text-red-500">{fields.email.errors[0]}</div>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor={fields.name.id}>Name</Label>
								<Input {...getInputProps(fields.name, { type: "text" })} placeholder="John Doe" required />
								{fields.name.errors && fields.name.errors.length > 0 && (
									<div className="text-sm text-red-500">{fields.name.errors[0]}</div>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor={fields.roleIds.id}>Roles</Label>
								<MultiSelect
									id={`${fields.roleIds.id}-select`}
									options={formattedRoles}
									selected={selectedRoleIds}
									placeholder="Select roles"
									emptyMessage="No roles found"
									onChange={(selected) => {
										setSelectedRoleIds(selected)
										// Update the hidden input with JSON stringified value
										const input = document.getElementById(fields.roleIds.id) as HTMLInputElement | null
										if (input) {
											input.value = JSON.stringify(selected)
										}
									}}
								/>
								<input
									type="hidden"
									id={fields.roleIds.id}
									name={fields.roleIds.name}
									value={JSON.stringify(selectedRoleIds)}
								/>
								{fields.roleIds.errors && fields.roleIds.errors.length > 0 && (
									<div className="text-sm text-red-500">{fields.roleIds.errors[0]}</div>
								)}
							</div>

							{form.errors && form.errors.length > 0 && (
								<div className="p-3 bg-red-50 text-red-700 rounded-md">{form.errors[0]}</div>
							)}
						</div>

						<div className="flex justify-end space-x-4">
							<Button variant="outline" asChild>
								<Link to={`/admin/users/${user.id}`}>Cancel</Link>
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Updating..." : "Update User"}
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
