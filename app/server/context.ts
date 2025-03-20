import type { Prisma } from "@prisma/client"
import type { Context } from "hono"
import { getClientEnv, initEnv } from "~/env.server"
import { getSessionUser } from "~/services/auth.server"
import { prisma } from "~/services/db.server"

// Setup the .env vars
const env = initEnv()

export const getLoadContext = async (c: Context) => {
	// get the locale from the context
	// get t function for the default namespace
	const user = await getSessionUser(c.req.raw)
	let prismaUser: Prisma.UserGetPayload<{ include: { roles: { include: { permissions: true } } } }> | null = null
	if (user) {
		prismaUser = await prisma.user.findUnique({
			where: { id: user?.id },
			include: {
				roles: {
					include: {
						permissions: true,
					},
				},
			},
		})
	}
	const clientEnv = getClientEnv()
	return {
		env: env,
		clientEnv,
		user,
		prismaUser,
		// We do not add this to AppLoadContext type because it's not needed in the loaders, but it's used above to handle requests
		body: c.body,
	}
}

interface LoadContext extends Awaited<ReturnType<typeof getLoadContext>> {}

/**
 * Declare our loaders and actions context type
 */
declare module "react-router" {
	interface AppLoadContext extends Omit<LoadContext, "body"> {}
}
