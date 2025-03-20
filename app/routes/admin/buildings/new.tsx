import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { Building2 } from "lucide-react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"
import type { ActionFunctionArgs, MetaFunction } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { getBuildingCategories } from "~/services/building-category.server"
import { prisma } from "~/services/db.server"

// Local type for building category
interface BuildingCategory {
	id: string
	name: string
	description: string | null
}

// Define component props type
interface ComponentProps {
	loaderData: {
		buildingCategories: BuildingCategory[]
	}
}

// Define the building schema with Zod
const buildingSchema = z.object({
	name: z.string().min(1, { message: "Building name is required" }),
	address: z.string().optional(),
	categoryId: z.string().min(1, { message: "Building category is required" }),
})

export const meta = (): ReturnType<MetaFunction> => {
	return [
		{
			title: "New Building | Admin Buildings | Resource Management",
		},
	]
}

// Loader returns a custom type, not directly used in the Route.ComponentProps
export async function loader() {
	// Fetch building categories for the form
	const buildingCategories = await getBuildingCategories()

	return {
		buildingCategories,
	}
}

export async function action({ request, context }: ActionFunctionArgs) {
	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Parse the form data with zod validation
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: buildingSchema })

	// If the form is invalid, return the errors
	if (submission.status !== "success") {
		return { submission }
	}

	const { name, address, categoryId } = submission.value

	try {
		// Check if a building with this name already exists
		const existingBuilding = await prisma.building.findFirst({
			where: {
				name,
				isDeleted: false,
			},
		})

		if (existingBuilding) {
			return {
				submission: {
					...submission,
					error: {
						name: "Building name already exists",
					},
				},
			}
		}

		// Create the building
		await prisma.building.create({
			data: {
				name,
				address: address || "",
				createdBy: user.id,
				categoryId,
			},
		})

		// Redirect to the buildings list
		return redirect("/admin/buildings")
	} catch (error) {
		return {
			submission: {
				...submission,
				error: {
					form: (error as Error).message || "An error occurred while processing your request",
				},
			},
		}
	}
}

// Use our own ComponentProps type
export default function NewBuilding({ loaderData }: ComponentProps) {
	const { buildingCategories } = loaderData
	const navigation = useNavigation()
	const actionData = useActionData()

	// Setup the form with Conform
	const [form, { name, address, categoryId }] = useForm({
		id: "new-building-form",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: buildingSchema })
		},
		defaultValue: {
			name: "",
			address: "",
			categoryId: "",
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		// Use this to retrieve the previous submission data
		lastResult: actionData?.submission,
	})

	// Check for form-level errors
	const formError =
		form.errors && form.errors.length > 0 && form.errors[0].includes("form:")
			? form.errors[0].replace("form:", "")
			: undefined

	const isSubmitting = navigation.state === "submitting"

	return (
		<div className="max-w-3xl mx-auto">
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						<CardTitle>Create New Building</CardTitle>
					</div>
					<CardDescription>
						Enter the details for the new building. Building name and category are required.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<Form method="post" {...getFormProps(form)}>
						{formError && (
							<div className="bg-red-50 p-4 rounded-md mb-4">
								<p className="text-red-500">{formError}</p>
							</div>
						)}

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={name.id}>Building Name</Label>
								<Input
									id={name.id}
									name={name.name}
									defaultValue={name.initialValue}
									className={name.errors ? "border-red-500" : ""}
									aria-describedby={name.errors ? `${name.id}-error` : undefined}
									required
								/>
								{name.errors && (
									<p id={`${name.id}-error`} className="text-sm font-medium text-destructive">
										{name.errors}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor={address.id}>Address</Label>
								<Input
									id={address.id}
									name={address.name}
									defaultValue={address.initialValue}
									className={address.errors ? "border-red-500" : ""}
									aria-describedby={address.errors ? `${address.id}-error` : undefined}
								/>
								{address.errors && (
									<p id={`${address.id}-error`} className="text-sm font-medium text-destructive">
										{address.errors}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor={categoryId.id}>Building Category</Label>
								<Select name={categoryId.name} defaultValue={categoryId.initialValue}>
									<SelectTrigger
										id={categoryId.id}
										className={categoryId.errors ? "border-red-500" : ""}
										aria-describedby={categoryId.errors ? `${categoryId.id}-error` : undefined}
									>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										{buildingCategories.map((category: BuildingCategory) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{categoryId.errors && (
									<p id={`${categoryId.id}-error`} className="text-sm font-medium text-destructive">
										{categoryId.errors}
									</p>
								)}
							</div>
						</div>
					</Form>
				</CardContent>

				<CardFooter className="flex justify-between">
					<Button variant="outline" asChild>
						<Link to="/admin/buildings">Cancel</Link>
					</Button>
					<Button type="submit" form={form.id} disabled={isSubmitting}>
						{isSubmitting ? "Creating..." : "Create Building"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
