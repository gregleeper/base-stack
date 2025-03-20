import { Outlet } from "react-router"
import { SidebarNav } from "~/components/ui/sidebar-nav"

export default function AdminLayout() {
	return (
		<div className="flex h-screen overflow-hidden">
			{/* Sidebar */}
			<div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col h-full">
				<div className="mb-6">
					<h1 className="text-xl font-bold">Admin Dashboard</h1>
					<p className="text-sm text-gray-500">Manage your resources</p>
				</div>
				<SidebarNav className="flex-1" />
				<div className="pt-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
					<div className="text-xs text-gray-500">Logged in as Admin</div>
				</div>
			</div>

			{/* Main content */}
			<div className="flex-1 overflow-auto">
				<Outlet />
			</div>
		</div>
	)
}
