import { Form, redirect, useActionData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { authenticator, sessionStorage } from "~/services/auth.server"

export async function action({ request }: ActionFunctionArgs) {
	// Call the authenticator
	try {
		// Authenticate the user
		const user = await authenticator.authenticate("form", request)

		// Create a new session and set the user
		const session = await sessionStorage.getSession(request.headers.get("cookie"))
		session.set("user", user)

		// Redirect to the home page with the session
		return redirect("/", {
			headers: {
				"Set-Cookie": await sessionStorage.commitSession(session),
			},
		})
	} catch (error) {
		// Return the error message
		return { error: (error as Error).message }
	}
}

export default function Login() {
	const actionData = useActionData<{ error?: string }>()

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md dark:bg-gray-800 dark:shadow-gray-700/20">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
						Sign in to your account
					</h2>
				</div>
				<Form method="post" className="mt-8 space-y-6">
					<div className="-space-y-px rounded-md shadow-sm">
						<div>
							<label htmlFor="email" className="sr-only">
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400 sm:text-sm"
								placeholder="Email address"
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400 sm:text-sm"
								placeholder="Password"
							/>
						</div>
					</div>

					{actionData?.error && (
						<div className="text-center text-sm text-red-600 dark:text-red-400">{actionData.error}</div>
					)}

					<div>
						<button
							type="submit"
							className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800"
						>
							Sign in
						</button>
					</div>
				</Form>
			</div>
		</div>
	)
}
