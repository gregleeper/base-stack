import {
	Building2,
	Calendar,
	DoorOpen,
	FolderIcon,
	Home,
	Laptop,
	LayoutDashboard,
	LogOut,
	Shield,
	Users,
} from "lucide-react"
import { Link, Outlet, useLoaderData } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { getSessionUser } from "~/services/auth.server"

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar"

export async function loader({ request }: LoaderFunctionArgs) {
	// Check if the user is authenticated
	const user = await getSessionUser(request)

	// If no user is authenticated, redirect to login
	if (!user) {
		throw new Response("Unauthorized", { status: 401 })
	}

	// Return the user data
	return { user }
}

export default function AdminLayout() {
	const { user } = useLoaderData<typeof loader>()

	return (
		<div className="flex h-screen overflow-hidden">
			<SidebarProvider defaultOpen={true}>
				{/* Main layout with proper sidebar and content area */}
				<div className="flex h-full w-full">
					{/* Sidebar component */}
					<Sidebar className="border-r">
						<SidebarHeader className="border-b py-4 px-6">
							<div className="flex items-center">
								<LayoutDashboard className="mr-2 h-6 w-6 text-indigo-500" />
								<div>
									<h2 className="text-lg font-semibold dark:text-white">Admin Dashboard</h2>
									<p className="text-xs text-muted-foreground dark:text-gray-400">Welcome, {user.name}</p>
								</div>
							</div>
						</SidebarHeader>

						<SidebarContent className="py-4">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Dashboard">
										<Link to="/admin" className="flex items-center w-full">
											<LayoutDashboard className="mr-2 h-5 w-5" />
											<span>Dashboard</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Users">
										<Link to="/admin/users" className="flex items-center w-full">
											<Users className="mr-2 h-5 w-5" />
											<span>Users</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Booking Categories">
										<Link to="/admin/booking-categories" className="flex items-center w-full">
											<Calendar className="mr-2 h-5 w-5" />
											<span>Booking Categories</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Rooms">
										<Link to="/admin/rooms" className="flex items-center w-full">
											<DoorOpen className="mr-2 h-5 w-5" />
											<span>Rooms</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Equipment">
										<Link to="/admin/equipment" className="flex items-center w-full">
											<Laptop className="mr-2 h-5 w-5" />
											<span>Equipment</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Roles">
										<Link to="/admin/roles" className="flex items-center w-full">
											<Shield className="mr-2 h-5 w-5" />
											<span>Roles</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Groups">
										<Link to="/admin/groups" className="flex items-center w-full">
											<FolderIcon className="mr-2 h-5 w-5" />
											<span>Groups</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Buildings">
										<Link to="/admin/buildings" className="flex items-center w-full">
											<Building2 className="mr-2 h-5 w-5" />
											<span>Buildings</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<div className="px-3 mt-6 space-y-2">
									<SidebarMenuItem>
										<SidebarMenuButton asChild tooltip="Home">
											<Link to="/" className="flex items-center w-full">
												<Home className="mr-2 h-5 w-5" />
												<span>Back to Home</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>

									<SidebarMenuItem>
										<SidebarMenuButton
											asChild
											tooltip="Logout"
											variant="outline"
											className="text-red-600 hover:text-red-700 hover:bg-red-50"
										>
											<Link to="/logout" className="flex items-center w-full">
												<LogOut className="mr-2 h-5 w-5" />
												<span>Sign out</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</div>
							</SidebarMenu>
						</SidebarContent>
					</Sidebar>

					{/* Mobile trigger */}
					<div className="fixed top-0 left-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
						<SidebarTrigger />
					</div>

					{/* Main content wrapper that takes remaining width */}
					<main className="flex-1  w-full overflow-clip">
						<div className="w-full h-full">
							<Outlet />
						</div>
					</main>
				</div>
			</SidebarProvider>
		</div>
	)
}
