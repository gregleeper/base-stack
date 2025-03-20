import { FolderIcon, HomeIcon, User2Icon } from "lucide-react"
import { Link, useLocation } from "react-router"

interface SidebarNavProps {
	className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
	const location = useLocation()

	const navItems = [
		{
			title: "Dashboard",
			href: "/admin",
			icon: HomeIcon,
		},
		{
			title: "Users",
			href: "/admin/users",
			icon: User2Icon,
		},
		{
			title: "Groups",
			href: "/admin/groups",
			icon: FolderIcon,
		},
	]

	return (
		<nav className={`flex flex-col space-y-1 ${className || ""}`}>
			{navItems.map((item) => {
				const isActive = location.pathname.startsWith(item.href)
				return (
					<Link
						to={item.href}
						key={item.href}
						className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
							isActive
								? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100"
								: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
						}`}
					>
						<item.icon
							className={`h-4 w-4 mr-3 ${isActive ? "text-blue-700 dark:text-blue-100" : "text-gray-500 dark:text-gray-400"}`}
						/>
						{item.title}
					</Link>
				)
			})}
		</nav>
	)
}
