import { DoorClosed, PlusCircleIcon } from "lucide-react"
import { Link, Outlet, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import { prisma } from "~/services/db.server"
import type { Route } from "./+types/rooms"

export async function loader({ params, context }: Route.LoaderArgs) {
	// Get building ID from params
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
		},
	})

	if (!building) {
		throw new Response("Building not found", { status: 404 })
	}

	return { building, currentUser: user }
}

export default function RoomsAdmin({ loaderData }: Route.ComponentProps) {
	const { building } = loaderData
	const location = useLocation()
	const isRootRoomsPath = location.pathname === `/admin/buildings/${building.id}/rooms`

	// Only show this component when directly on the rooms path, otherwise render the Outlet
	if (!isRootRoomsPath) {
		return <Outlet />
	}

	return (
		<div className="py-4">
			<div className="mb-6 flex justify-between items-center">
				<h2 className="text-xl font-semibold">Manage Rooms</h2>
				<Button size="sm" className="flex items-center gap-1" asChild>
					<Link to={`/admin/buildings/${building.id}/rooms/new`}>
						<PlusCircleIcon className="h-4 w-4" />
						<span>New Room</span>
					</Link>
				</Button>
			</div>

			<div className="flex flex-col items-center justify-center text-gray-500 p-8 border rounded-md">
				<DoorClosed className="h-16 w-16 mb-4 opacity-20" />
				<h3 className="text-lg font-medium mb-1">Select a Room</h3>
				<p className="text-sm text-center mb-4">Choose a room from the building details or create a new one</p>
				<Button variant="outline" size="sm" asChild>
					<Link to={`/admin/buildings/${building.id}`}>Back to Building Details</Link>
				</Button>
			</div>
		</div>
	)
}
