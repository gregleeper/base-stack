import { PencilIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Form, Link, Outlet, useActionData, useNavigation } from "react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/building"

// Meta function to set the page title
export const meta = ({ data }: Route.MetaArgs): Route.MetaDescriptors => {
	return [
		{
			title: data?.building
				? `${data.building.name} | Admin Buildings | Resource Management`
				: "Building Details | Admin Buildings | Resource Management",
		},
	]
}

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get the building ID from the params
	const buildingId = params.buildingId

	// Check if the user is authenticated
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		throw new Response("Building ID is required", { status: 400 })
	}

	// Get the building
	const building = await prisma.building.findUnique({
		where: {
			id: buildingId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			address: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	if (!building) {
		throw new Response("Building not found", { status: 404 })
	}

	// Get the rooms in this building
	const rooms = await prisma.room.findMany({
		where: {
			buildingId: buildingId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			capacity: true,
		},
		orderBy: {
			name: "asc",
		},
	})

	return { building, rooms, currentUser: user }
}

export async function action({ request, params, context }: Route.ActionArgs) {
	const buildingId = params.id
	const formData = await request.formData()
	const intent = formData.get("intent")?.toString()

	// Get the current user
	const user = context.user

	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	if (!buildingId) {
		return { error: "Building ID is required" }
	}

	try {
		// Update building
		if (intent === "update") {
			const name = formData.get("name")?.toString()
			const address = formData.get("address")?.toString() || ""

			if (!name) {
				return { error: "Building name is required", fields: { id: buildingId, name, address } }
			}

			// Check if a building with this name already exists (excluding current building)
			const existingBuilding = await prisma.building.findFirst({
				where: {
					name,
					id: {
						not: buildingId,
					},
					isDeleted: false,
				},
			})

			if (existingBuilding) {
				return { error: "Building name already exists", fields: { id: buildingId, name, address } }
			}

			// Update the building
			await prisma.building.update({
				where: {
					id: buildingId,
				},
				data: {
					name,
					address,
				},
			})

			return { success: "Building updated successfully" }
		}

		return { error: "Invalid intent" }
	} catch (_) {
		return { error: "An error occurred while processing your request" }
	}
}

export default function BuildingDetails({ loaderData }: Route.ComponentProps) {
	const { building, rooms, currentUser } = loaderData
	const actionData = useActionData()
	const navigation = useNavigation()

	const [showEditDialog, setShowEditDialog] = useState(false)

	// Reset dialog when navigation state changes
	useEffect(() => {
		if (navigation.state === "idle" && actionData?.success) {
			setShowEditDialog(false)
		}
	}, [navigation.state, actionData])

	const isSubmitting = navigation.state === "submitting"
	const canEdit = currentUser.role === "Administrator"
	const formattedCreatedAt = new Date(building.createdAt).toLocaleString()
	const formattedUpdatedAt = new Date(building.updatedAt).toLocaleString()

	return (
		<div className="max-w-3xl mx-auto">
			<Card>
				<CardHeader className="pb-2">
					<div className="flex justify-between items-start">
						<div>
							<CardTitle className="text-2xl">{building.name}</CardTitle>
						</div>
						<div className="flex space-x-2">
							<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
								<DialogTrigger asChild>
									<Button size="sm" className="flex items-center gap-1" disabled={!canEdit}>
										<PencilIcon className="h-4 w-4" />
										<span>Edit</span>
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Edit Building</DialogTitle>
										<DialogDescription>Update building information. Building name is required.</DialogDescription>
									</DialogHeader>

									<Form method="post">
										<input type="hidden" name="intent" value="update" />

										<div className="space-y-4 py-4">
											<div className="space-y-2">
												<Label htmlFor="name">Building Name</Label>
												<Input
													id="name"
													name="name"
													defaultValue={actionData?.fields?.name || building.name}
													required
												/>
											</div>

											<div className="space-y-2">
												<Label htmlFor="address">Address</Label>
												<Input
													id="address"
													name="address"
													defaultValue={actionData?.fields?.address || building.address}
												/>
											</div>
										</div>

										{actionData?.error && <div className="text-sm text-red-500 mb-4">{actionData.error}</div>}

										<DialogFooter>
											<Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
												Cancel
											</Button>
											<Button type="submit" disabled={isSubmitting}>
												{isSubmitting ? "Saving..." : "Save Changes"}
											</Button>
										</DialogFooter>
									</Form>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</CardHeader>

				<CardContent className="pb-2">
					{building.address && (
						<div className="flex items-start gap-2 mb-4">
							<div className="font-medium">Address:</div>
							<div>{building.address}</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="flex flex-col">
							<span className="text-gray-500 dark:text-gray-400">Created</span>
							<span>{formattedCreatedAt}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-gray-500 dark:text-gray-400">Last Updated</span>
							<span>{formattedUpdatedAt}</span>
						</div>
					</div>
				</CardContent>

				<CardHeader className="pb-2 border-t mt-6">
					<div className="flex justify-between items-center">
						<div>
							<CardTitle className="text-xl">Rooms</CardTitle>
							<CardDescription>
								This building has {rooms.length} room{rooms.length !== 1 ? "s" : ""}.
							</CardDescription>
						</div>
						<Button size="sm" asChild>
							<Link to={`/admin/buildings/${building.id}/rooms`}>Manage Rooms</Link>
						</Button>
					</div>
				</CardHeader>

				<CardContent>
					{rooms.length > 0 ? (
						<div className="space-y-2">
							{rooms.map((room) => (
								<div key={room.id} className="p-3 border rounded-md flex justify-between items-center">
									<div>
										<div className="font-medium">{room.name}</div>
										<div className="text-sm text-gray-500">Capacity: {room.capacity}</div>
									</div>
									<Button variant="outline" size="sm" asChild>
										<Link to={`/admin/buildings/${building.id}/rooms/${room.id}/view`}>View</Link>
									</Button>
								</div>
							))}
						</div>
					) : (
						<div className="text-gray-500 italic">No rooms available in this building.</div>
					)}
					<div className="mt-4">
						<Button variant="outline" size="sm" asChild>
							<Link to={`/admin/buildings/${building.id}/rooms/new`}>Add Room</Link>
						</Button>
					</div>
				</CardContent>

				{/* Outlet for rendering nested routes inside the card */}
				<CardContent className="pt-0 border-t mt-6">
					<Outlet />
				</CardContent>
			</Card>
		</div>
	)
}
