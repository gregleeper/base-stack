import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router"
import type { LinksFunction } from "react-router"
import type { Route } from "./+types/root"
import { Toaster } from "./components/ui/sonner"
import { ClientHintCheck, getHints, useHints } from "./services/client-hints"
import tailwindcss from "./tailwind.css?url"

export async function loader({ context, request }: Route.LoaderArgs) {
	const { clientEnv, user } = context
	const hints = getHints(request)
	return { clientEnv, hints, user }
}

export type RootLoaderData = Awaited<ReturnType<typeof loader>>

export const links: LinksFunction = () => [{ rel: "stylesheet", href: tailwindcss }]

export default function App({ loaderData }: Route.ComponentProps) {
	const { clientEnv } = loaderData
	return (
		<>
			<Outlet />
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: We set the window.env variable to the client env */}
			<script dangerouslySetInnerHTML={{ __html: `window.env = ${JSON.stringify(clientEnv)}` }} />
		</>
	)
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
	const hints = useHints()
	return (
		<html className={`${hints?.theme === "dark" ? "dark" : "light"} overflow-y-auto overflow-x-hidden`} lang="en">
			<head>
				<ClientHintCheck />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="w-full h-full">
				{/* <LanguageSwitcher /> */}
				{children}
				<Toaster />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export const ErrorBoundary = () => {
	const error = useRouteError()

	const errorStatusCode = isRouteErrorResponse(error) ? error.status : "500"

	return (
		<div className="placeholder-index relative h-full min-h-screen w-screen flex items-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 justify-center dark:bg-white sm:pb-16 sm:pt-8">
			<div className="relative mx-auto max-w-[90rem] sm:px-6 lg:px-8">
				<div className="relative  min-h-72 flex flex-col justify-center sm:overflow-hidden sm:rounded-2xl p-1 md:p-4 lg:p-6">
					<h1 className="text-center w-full text-red-600 text-2xl pb-2">Error</h1>
					<p className="text-lg dark:text-white text-center w-full">An error occurred</p>
					<p className="text-lg dark:text-white text-center w-full">Error status code: {errorStatusCode}</p>
					<p className="text-lg dark:text-white text-center w-full">
						Error message: {error instanceof Error ? error.message : "Unknown error"}
					</p>
				</div>
			</div>
		</div>
	)
}
