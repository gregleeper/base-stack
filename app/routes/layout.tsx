import { CalendarIcon, HomeIcon, LogInIcon, LogOutIcon, ShieldIcon, UserIcon } from "lucide-react"
import { Link, Outlet, useRouteLoaderData, useSubmit } from "react-router"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar"
import type { RootLoaderData } from "../root"

export default function AppLayout() {
	const submit = useSubmit()
	const stuff = useRouteLoaderData("root") as RootLoaderData

	// Function to get user initials from name
	const getUserInitials = (name?: string) => {
		if (!name) return "U"
		return name
			.split(" ")
			.map((part) => part[0])
			.join("")
			.toUpperCase()
			.substring(0, 2)
	}

	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex min-h-screen w-full flex-col">
				{/* Navbar */}
				<header className="bg-background border-b h-14 flex items-center px-4 sticky top-0 z-40 w-full">
					<div className="flex items-center gap-2">
						<SidebarTrigger />
						<Link to="/" className="font-semibold text-lg">
							Resource Scheduling
						</Link>
					</div>
					<div className="flex-1" />
					<div className="flex items-center gap-3">
						{stuff.user ? (
							<>
								<div className="flex items-center gap-2">
									<Avatar>
										<AvatarImage src={stuff.user.avatarUrl} alt={stuff.user.name || "User"} />
										<AvatarFallback className="bg-primary text-primary-foreground">
											{getUserInitials(stuff.user.name)}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm font-medium hidden sm:inline-block">{stuff.user.name || "User"}</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => submit(null, { method: "post", action: "/logout" })}
									className="cursor-pointer"
								>
									<LogOutIcon className="size-4 mr-2" />
									Logout
								</Button>
							</>
						) : (
							<Button variant="ghost" size="sm" asChild>
								<Link to="/login">
									<LogInIcon className="size-4 mr-2" />
									Login
								</Link>
							</Button>
						)}
					</div>
				</header>

				{/* Content area - sidebar and main content */}
				<div className="flex flex-1 pt-14 -mt-14 w-full">
					{/* Sidebar */}
					<Sidebar>
						<SidebarHeader className="pt-14">
							<div className="flex items-center px-2">
								<span className="font-medium sr-only">Navigation</span>
							</div>
						</SidebarHeader>
						<SidebarContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Home">
										<Link to="/">
											<HomeIcon />
											<span>Home</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Protected">
										<Link to="/protected">
											<ShieldIcon />
											<span>Protected</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton asChild tooltip="Bookings">
										<Link to="/bookings">
											<CalendarIcon />
											<span>Bookings</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter>
							<div className="p-2">
								<Button variant="outline" size="sm" className="w-full" asChild>
									<Link to="/admin">
										<UserIcon className="size-4 mr-2" />
										Admin Panel
									</Link>
								</Button>
							</div>
						</SidebarFooter>
					</Sidebar>

					{/* Main content */}
					<main className="flex-1 w-full overflow-auto p-4">
						<Outlet />
					</main>
				</div>
			</div>
		</SidebarProvider>
	)
}
