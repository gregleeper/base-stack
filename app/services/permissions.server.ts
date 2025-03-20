import type { Prisma } from "@prisma/client"
import { data } from "react-router"
import { type PermissionString, parsePermissionString } from "../utils/user"
import { requireUserId } from "./auth.server"
import { prisma } from "./db.server"
export async function requireUserWithPermission(request: Request, permission: PermissionString) {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					permissions: {
						some: {
							permission: {
								action: permissionData.action,
								entity: permissionData.entity,
								access: permissionData.access ? { in: permissionData.access } : undefined,
							},
						},
					},
				},
			},
		},
	})

	if (!user) {
		throw data(
			{
				error: "Unauthorized",
				requiredPermission: permissionData,
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 }
		)
	}
	return user.id
}

export async function requireUserWithRole(user: Prisma.UserGetPayload<{ include: { roles: true } }>, name: string) {
	return user.roles.some((role) => role.name === name)
}
