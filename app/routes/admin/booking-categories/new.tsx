import { getFormProps, useForm } from "@conform-to/react"
import { parseWithZod } from "@conform-to/zod"
import { ArrowLeftIcon } from "lucide-react"
import { Form, Link, redirect, useLocation, useNavigation } from "react-router"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { Textarea } from "~/components/ui/textarea"
import { prisma } from "~/services/db.server"
import { userHasRole } from "~/utils/user"
import type { Route } from "./+types/new"

// Define the booking category schema with Zod
const bookingCategorySchema = z.object({
	name: z.string().min(1, "Category name is required"),
	description: z.string().optional(),
})

// Meta function to set the page title
export const meta = () => {
	return [
		{
			title: "New Booking Category | Resource Management",
		},
	]
}

export async function loader({ context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const isAdmin = userHasRole(user, ["Administrator", "Manager"])
	console.log("isAdmin-----------", isAdmin)

	return {
		isAdmin,
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Check user role permissions
	const userWithRole = await prisma.user.findUnique({
		where: { id: user.id },
		include: { roles: true },
	})

	console.log("userWithRole-----------", userWithRole)

	if (!userWithRole?.roles?.some((role) => role.name === "Administrator" || role.name === "Manager")) {
		throw new Response("Forbidden", { status: 403 })
	}

	// Parse the form data with Zod schema
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: bookingCategorySchema })

	// If validation fails, return the errors
	if (submission.status !== "success") {
		return submission.reply()
	}

	try {
		// Check if a category with this name already exists
		const existingCategory = await prisma.bookingCategory.findFirst({
			where: {
				name: submission.value.name,
			},
		})

		if (existingCategory) {
			return submission.reply({
				formErrors: ["A booking category with this name already exists"],
			})
		}

		// Create the new booking category
		const newBookingCategory = await prisma.bookingCategory.create({
			data: {
				name: submission.value.name,
				description: submission.value.description || null,
			},
		})

		// Redirect to the booking category details page
		return redirect(`/admin/booking-categories/${newBookingCategory.id}/view`)
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error("Error creating booking category:", error)
		return submission.reply({
			formErrors: ["An error occurred while creating the booking category"],
		})
	}
}

export default function NewBookingCategory() {
	const navigation = useNavigation()
	const location = useLocation()
	const isSubmitting = navigation.state === "submitting"

	// Setup form with Conform
	const [form, fields] = useForm({
		id: "new-booking-category-form",
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
						<h1 className="text-xl font-semibold">Create New Booking Category</h1>
					</div>

					<Form method="post" {...getFormProps(form)} className="space-y-6">
						{/* Form error messages */}
						{form?.errors && (
							<div className="bg-red-50 p-3 rounded-md">
								<p className="text-sm text-red-600">{form.errors.map((error) => error).join(", ")}</p>
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
								placeholder="Enter a description for this booking category (optional)"
							/>
						</div>

						{/* Submit Buttons */}
						<div className="flex justify-between pt-4 border-t">
							<Button type="button" variant="outline" asChild>
								<Link to={`/admin/booking-categories${location.search}`} className="flex items-center gap-1">
									<ArrowLeftIcon className="h-4 w-4" />
									<span>Cancel</span>
								</Link>
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Booking Category"}
							</Button>
						</div>
					</Form>
				</div>
			</ScrollArea>
		</div>
	)
}
