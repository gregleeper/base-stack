import { createMiddleware } from "hono/factory"
import { pathToRegexp } from "path-to-regexp"

type ProtectOptions = {
	publicPaths: string[]
	adminPaths: string[]
	editorPaths: string[]
	onFailRedirectTo: string
	rolePermissions?: {
		[path: string]: {
			requiredPermissions: Array<{
				action: string
				entity: string
				access: string
			}>
		}
	}
}

export function protect({ publicPaths }: ProtectOptions) {
	return createMiddleware(async (c, next) => {
		const isPublic = pathMatch(publicPaths, c.req.path)
		// const isAdmin = pathMatch(adminPaths, c.req.path)
		// const isEditor = pathMatch(editorPaths, c.req.path)
		// if (isPublic) {
		// 	return next()
		// }
		// const user = await getSessionUser(c.req.raw)
		// if (!user) {
		// 	return c.redirect(onFailRedirectTo)
		// }
		// const roles = await prisma.user.findUnique({
		// 	where: { id: user.id },
		// 	include: { roles: { include: { permissions: true } } },
		// })
		// if (!roles) {
		// 	return c.redirect(onFailRedirectTo)
		// }
		// const pathPermissions = getPathPermissions(rolePermissions, c.req.path)
		// if (!pathPermissions) {
		// 	return next()
		// }
		// const hasPermissions = await checkUserPermissions(roles, pathPermissions.requiredPermissions)
		// if (!hasPermissions) {
		// 	return c.redirect(onFailRedirectTo)
		// }
		return next()
	})
}

function getPathPermissions(rolePermissions: ProtectOptions["rolePermissions"], requestPath: string) {
	// Early return if rolePermissions is undefined
	if (!rolePermissions) return null

	for (const [path, permissions] of Object.entries(rolePermissions)) {
		const regex = pathToRegexp(path)
		if (regex.regexp.test(requestPath)) {
			return permissions
		}
	}
	return null
}

async function checkUserPermissions(
	user: { id: string; roles?: { permissions: Array<{ action: string; entity: string; access: string }> }[] },
	requiredPermissions: Array<{ action: string; entity: string; access: string }>
) {
	if (!user.roles) return false

	const userPermissions = user.roles.flatMap((role) => role.permissions)

	return requiredPermissions.every((required) =>
		userPermissions.some(
			(permission) =>
				permission.action === required.action &&
				permission.entity === required.entity &&
				permission.access === required.access
		)
	)
}

function pathMatch(paths: string[], requestPath: string) {
	for (const path of paths) {
		const regex = pathToRegexp(path)

		if (regex.regexp.test(requestPath)) {
			return true
		}
	}

	return false
}
