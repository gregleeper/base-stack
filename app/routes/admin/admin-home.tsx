import type { LoaderFunctionArgs } from "react-router"

export async function loader({ context }: LoaderFunctionArgs) {
	return { user: context.user }
}

export default function Admin() {
	return (
		<div className="h-full w-full p-8 bg-gray-100 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-full">
				<h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
				<p className="text-gray-600 dark:text-gray-300 mb-6">
					Welcome to the admin dashboard. Use the sidebar to navigate between different administrative sections.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
						<h2 className="font-semibold text-lg mb-2">User Management</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400">Manage users, permissions and roles</p>
					</div>

					<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
						<h2 className="font-semibold text-lg mb-2">Buildings</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400">Manage building locations and details</p>
					</div>

					<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
						<h2 className="font-semibold text-lg mb-2">Room Resources</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400">Configure rooms and available resources</p>
					</div>
				</div>
			</div>
		</div>
	)
}
