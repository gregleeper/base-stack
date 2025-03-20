import { Link } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { requireUser } from "~/services/auth.server"

export async function loader({ request }: LoaderFunctionArgs) {
	// Check if the user is authenticated
	const user = await requireUser(request)

	// Return the user data
	return { user }
}

export default function Protected() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
			<div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Protected Page</h2>
					<p className="mt-2 text-center text-sm text-gray-600">You are authenticated!</p>
				</div>

				<div className="mt-8 flex justify-center">
					<Link
						to="/logout"
						className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						Sign out
					</Link>
				</div>
			</div>
		</div>
	)
}
