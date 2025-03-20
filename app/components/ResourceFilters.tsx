import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"

type Building = {
	id: string
	name: string
	[key: string]: unknown
}

type Room = {
	id: string
	name: string
	buildingId: string
	capacity: number
	[key: string]: unknown
}

export type ResourceFilterProps = {
	buildings: Building[]
	rooms: Room[]
	selectedBuildingId: string
	selectedRoomId: string
	onBuildingChange: (buildingId: string) => void
	onRoomChange: (roomId: string) => void
	className?: string
}

export function ResourceFilters({
	buildings,
	rooms,
	selectedBuildingId,
	selectedRoomId,
	onBuildingChange,
	onRoomChange,
	className,
}: ResourceFilterProps) {
	// Filter rooms based on selected building
	const filteredRooms = selectedBuildingId ? rooms.filter((room) => room.buildingId === selectedBuildingId) : rooms

	// Convert empty string to 'all' and vice versa for building
	const handleBuilingValueChange = (value: string) => {
		onBuildingChange(value === "all" ? "" : value)
	}

	// Convert empty string to 'all' and vice versa for room
	const handleRoomValueChange = (value: string) => {
		onRoomChange(value === "all" ? "" : value)
	}

	return (
		<div className={`flex flex-col md:flex-row gap-4 items-end ${className || ""}`}>
			<div className="w-full md:w-1/3">
				<Label htmlFor="building" className="block text-sm font-medium mb-1 dark:text-gray-300">
					Building
				</Label>
				<Select value={selectedBuildingId || "all"} onValueChange={handleBuilingValueChange}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select a building" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Buildings</SelectItem>
						{buildings.map((building) => (
							<SelectItem key={building.id} value={building.id}>
								{building.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="w-full md:w-1/3">
				<Label htmlFor="room" className="block text-sm font-medium mb-1 dark:text-gray-300">
					Room
				</Label>
				<Select value={selectedRoomId || "all"} onValueChange={handleRoomValueChange} disabled={!selectedBuildingId}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder={selectedBuildingId ? "Select a room" : "Select a building first"} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{selectedBuildingId ? "All Rooms" : "Select a building first"}</SelectItem>
						{filteredRooms.map((room) => (
							<SelectItem key={room.id} value={room.id}>
								{room.name} (Capacity: {room.capacity})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
