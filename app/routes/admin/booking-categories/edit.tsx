import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import { Form, Link, redirect, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/edit"

// Define the booking category schema with Zod
const bookingCategorySchema = z.object({
	name: z.string().min(1, "Category name is required"),
	description: z.string().optional(),
})

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs) => {
	// Type assertion for the data object
	const typedData = data as { bookingCategory?: { name: string } } | undefined

	return [
		{
			title: typedData?.bookingCategory
				? `Edit ${typedData.bookingCategory.name} | Booking Categories | Resource Management`
				: "Edit Booking Category | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get category ID from params
	const bookingCategoryId = params.bookingCategoryId

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check user role permissions
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	if (!userWithRole?.roles.some((role) => role.name === "Administrator" || role.name === "Manager")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!bookingCategoryId) {
		throw new Response("Booking Category ID is required", { status: 400 })
	}

	// Get the booking category
	const bookingCategory = await prisma.bookingCategory.findUnique({
		where: {
			id: bookingCategoryId,
		},
	})

	if (!bookingCategory) {
		throw new Response("Booking Category not found", { status: 404 })
	}

	return { bookingCategory, currentUser: userWithRole }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	// Get the current user
	const user = context.user
	const bookingCategoryId = params.bookingCategoryId

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check user role permissions
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	if (!userWithRole?.roles.some((role) => role.name === "Administrator" || role.name === "Manager")) {
		throw new Response("Forbidden", { status: 403 })
	}

	if (!bookingCategoryId) {
		return {
			success: false,
			errors: ["Booking Category ID is required"],
		}
	}

	// Parse the form data with Zod schema
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: bookingCategorySchema })

	// If validation fails, return the errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	try {
		// Check if a category with this name already exists (excluding the current category)
		const existingCategory = await prisma.bookingCategory.findFirst({
			where: {
				name: submission.value.name,
				id: {
					not: bookingCategoryId,
				},
			},
		})

		if (existingCategory) {
			return submission.reply({
				formErrors: ["A booking category with this name already exists"],
			})
		}

		// Update the booking category
		const updatedBookingCategory = await prisma.bookingCategory.update({
			where: {
				id: bookingCategoryId,
			},
			data: {
				name: submission.value.name,
				description: submission.value.description || null,
			},
		})

		// Redirect to the booking category details page
		return redirect(`/admin/booking-categories/${updatedBookingCategory.id}/view`)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		return submission.reply({
			formErrors: [`An error occurred while updating the booking category: ${errorMessage}`],
		})
	}
}

export default function EditBookingCategory({ loaderData }: Route.ComponentProps) {
	const { bookingCategory } = loaderData
	const navigation = useNavigation()
	const isSubmitting = navigation.state === "submitting"

	// Setup form with Conform
	const [form, fields] = useForm({
		id: "edit-booking-category-form",
		defaultValue: {
			name: bookingCategory.name,
			description: bookingCategory.description || "",
		},
		shouldValidate: "onSubmit",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: bookingCategorySchema })
		},
	})

	return (
		<div className="bg-white dark:bg-gray-950 rounded-lg border shadow-sm">
			<ScrollArea className="h-[calc(100vh-8rem)] w-full">
				<ScrollBar orientation="vertical" />
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-xl font-semibold">Edit Booking Category</h1>
					</div>

					<Form method="post" {...getFormProps(form)} className="space-y-6">
						{/* Form error messages */}
						{form.errors && (
							<div className="bg-red-50 p-3 rounded-md">
								<p className="text-sm text-red-600">{form.errors}</p>
							</div>
						)}

						{/* Category Name */}
						<div className="space-y-2">
							<Label htmlFor={fields.name.id} className={fields.name.errors ? "text-destructive" : ""}>
								Category Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id={fields.name.id}
								name={fields.name.name}
								type="text"
								defaultValue={bookingCategory.name}
								required
								className={fields.name.errors ? "border-destructive" : ""}
								aria-invalid={Boolean(fields.name.errors)}
							/>
							{fields.name.errors && <p className="text-xs text-destructive">{fields.name.errors}</p>}
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor={fields.description.id}>Description</Label>
							<Textarea
								id={fields.description.id}
								name={fields.description.name}
								rows={3}
								defaultValue={bookingCategory.description || ""}
								placeholder="Enter a description for this booking category (optional)"
							/>
						</div>

						{/* Submit Buttons */}
						<div className="flex justify-between pt-4 border-t">
							<Button type="button" variant="outline" asChild>
								<Link to={`/admin/booking-categories/${bookingCategory.id}/view`} className="flex items-center gap-1">
									<ArrowLeftIcon className="h-4 w-4" />
									<span>Cancel</span>
								</Link>
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</Form>
				</div>
			</ScrollArea>
		</div>
	)
}
