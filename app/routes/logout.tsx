import { redirect } from "react-router"
import { sessionStorage } from "~/services/auth.server"
import type { Route } from "./+types/logout"

export async function action({ request }: Route.ActionArgs) {
	const session = await sessionStorage.getSession(request.headers.get("cookie"))
	return redirect("/login", {
		headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
	})
}
