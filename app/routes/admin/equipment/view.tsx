import { Edit, Laptop, Trash2 } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ScrollBar } from "~/components/ui/scroll-area"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/view"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Check if the user is authenticated
	const user = context.user

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	const { equipmentId } = params

	if (!equipmentId) {
		throw new Response("Equipment ID is required", { status: 400 })
	}

	// Fetch the equipment details
	const equipment = await prisma.equipment.findUnique({
		where: {
			id: equipmentId,
			isDeleted: false,
		},
	})

	if (!equipment) {
		throw new Response("Equipment not found", { status: 404 })
	}

	return { equipment, currentUser: user }
}

export default function EquipmentDetails({ loaderData }: Route.ComponentProps) {
	const { equipment } = loaderData
	const location = useLocation()

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between pb-4 border-b">
				<div className="flex items-center gap-2">
					<Laptop className="h-5 w-5" />
					<h1 className="text-2xl font-bold">{equipment.name}</h1>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" asChild>
						<Link to={`/admin/equipment/edit/${equipment.id}`}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Link>
					</Button>
					<Button variant="destructive" asChild>
						<Link to={`/admin/equipment/delete/${equipment.id}?returnTo=${encodeURIComponent(location.pathname)}`}>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link to="/admin/equipment">Back to List</Link>
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1 mt-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
					{/* Equipment Details */}
					<div className="border rounded-lg p-4 shadow-sm">
						<h2 className="text-lg font-semibold mb-4">Equipment Details</h2>
						<div className="space-y-3">
							<div>
								<p className="text-sm text-gray-500">Name</p>
								<p className="font-medium">{equipment.name}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Type</p>
								<p className="font-medium">{equipment.type}</p>
							</div>
							{equipment.location && (
								<div>
									<p className="text-sm text-gray-500">Location</p>
									<p className="font-medium">{equipment.location}</p>
								</div>
							)}
							<div>
								<p className="text-sm text-gray-500">Availability</p>
								<p className="font-medium">{equipment.isAvailable ? "Available" : "Not Available"}</p>
							</div>
						</div>
					</div>

					{/* System Information */}
					<div className="border rounded-lg p-4 shadow-sm">
						<h2 className="text-lg font-semibold mb-4">System Information</h2>
						<div className="space-y-3">
							<div>
								<p className="text-sm text-gray-500">ID</p>
								<p className="font-medium">{equipment.id}</p>
							</div>
							<div>
								<p className="text-sm text-gray-500">Created At</p>
								<p className="font-medium">{new Date(equipment.createdAt).toLocaleString()}</p>
							</div>
							{equipment.createdBy && (
								<div>
									<p className="text-sm text-gray-500">Created By</p>
									<p className="font-medium">{equipment.createdBy}</p>
								</div>
							)}
							<div>
								<p className="text-sm text-gray-500">Last Updated</p>
								<p className="font-medium">{new Date(equipment.updatedAt).toLocaleString()}</p>
							</div>
							{equipment.updatedBy && (
								<div>
									<p className="text-sm text-gray-500">Updated By</p>
									<p className="font-medium">{equipment.updatedBy}</p>
								</div>
							)}
						</div>
					</div>
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	)
}
