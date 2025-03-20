import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes"

export default [
	layout("./routes/layout.tsx", [
		index("./routes/home.tsx"),
		route("/login", "./routes/login.tsx"),
		route("/logout", "./routes/logout.tsx"),
		route("/protected", "./routes/protected.tsx"),
		route("/bookings", "./routes/bookings/bookings.tsx", [
			route(":bookingId", "./routes/bookings/booking.tsx"),
			route("new", "./routes/bookings/new.tsx"),
			route(":bookingId/edit", "./routes/bookings/edit.tsx"),
			route(":bookingId/cancel", "./routes/bookings/cancel.tsx"),
		]),
	]),
	...prefix("/admin", [
		layout("./routes/admin/layout.tsx", [
			index("./routes/admin/admin-home.tsx"),
			route("users", "./routes/admin/users/users.tsx", [
				route(":id", "./routes/admin/users/user.tsx"),
				route("new", "./routes/admin/users/new.tsx"),
				route(":id/delete", "./routes/admin/users/delete.tsx"),
				route(":id/edit", "./routes/admin/users/edit.tsx"),
			]),
			route("equipment", "./routes/admin/equipment/equipment.tsx", [
				route(":equipmentId/view", "./routes/admin/equipment/view.tsx"),
				route("new", "./routes/admin/equipment/new.tsx"),
				route(":equipmentId/edit", "./routes/admin/equipment/edit.tsx"),
				route(":equipmentId/delete", "./routes/admin/equipment/delete.tsx"),
			]),
			route("groups", "./routes/admin/groups/groups.tsx", [
				route(":groupId", "./routes/admin/groups/group.tsx"),
				route("new", "./routes/admin/groups/new.tsx"),
				route(":groupId/delete", "./routes/admin/groups/delete.tsx"),
				route(":groupId/edit", "./routes/admin/groups/edit.tsx"),
				route(":groupId/members", "./routes/admin/groups/members.tsx"),
				route(":groupId/members/manage", "./routes/admin/groups/members/manage.tsx"),
			]),
			route("roles", "./routes/admin/roles/roles.tsx", [
				route(":roleId/view", "./routes/admin/roles/role.tsx"),
				route(":roleId/edit", "./routes/admin/roles/edit.tsx"),
				route("new", "./routes/admin/roles/new.tsx"),
				route(":roleId/delete", "./routes/admin/roles/delete.tsx"),
			]),
			route("buildings", "./routes/admin/buildings/buildings.tsx", [
				route(":buildingId", "./routes/admin/buildings/building.tsx", [
					route("rooms", "./routes/admin/buildings/rooms/rooms.tsx", [
						route(":roomId/view", "./routes/admin/buildings/rooms/room.tsx"),
						route(":roomId/edit", "./routes/admin/buildings/rooms/edit.tsx"),
						route("new", "./routes/admin/buildings/rooms/new.tsx"),
						route(":roomId/delete", "./routes/admin/buildings/rooms/delete.tsx"),
					]),
				]),
				route("new", "./routes/admin/buildings/new.tsx"),
			]),
			route("rooms", "./routes/admin/rooms/rooms.tsx", [
				route(":roomId/view", "./routes/admin/rooms/room.tsx"),
				route(":roomId/edit", "./routes/admin/rooms/edit.tsx"),
				route("new", "./routes/admin/rooms/new.tsx"),
				route(":roomId/delete", "./routes/admin/rooms/delete.tsx"),
			]),
			route("booking-categories", "./routes/admin/booking-categories/booking-categories.tsx", [
				route(":bookingCategoryId/view", "./routes/admin/booking-categories/booking-category.tsx"),
				route(":bookingCategoryId/edit", "./routes/admin/booking-categories/edit.tsx"),
				route("new", "./routes/admin/booking-categories/new.tsx"),
				route(":bookingCategoryId/delete", "./routes/admin/booking-categories/delete.tsx"),
			]),
		]),
	]),
] as RouteConfig
