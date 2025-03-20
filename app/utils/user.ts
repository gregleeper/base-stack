import type { Prisma } from "@prisma/client"
import { useRouteLoaderData } from "react-router"
import type { loader as rootLoader } from "../root"
import { prisma } from "../services/db.server"

const userGroups = await prisma.userGroup.findMany({
	select: { name: true },
})

export type Action = "create" | "read" | "update" | "delete"
export type Entity =
	| "user"
	| "note"
	| "booking"
	| "booking-category"
	| "role"
	| "permission"
	| "building"
	| "room"
	| "room-type"
	| "room-feature"
	| "equipment"
	| "booking-equipment"
	| "booking-approval"
	| "approval-status"
	| "booking-status"
	| "recurring-booking"
	| "recurring-frequency"
	| "notification-type"
	| "notification"
	| "notification-recipient"
	| "notification-recipient-method"
	| "notification-preference"
	| "user-preference-delivery-method"
	| "user-group"
	| "user-group-member"
	| "resource-access"
export type Access = "own" | "any" | "own,any" | "any,own" | (typeof userGroups)[number]["name"]

export interface Permission {
	entity: Entity
	action: Action
	access: Access
}

export interface Role {
	name: string
	permissions: Permission[]
}

export interface User {
	id: string
	roles: Role[]
	// Add other user properties as needed
}

function isUser(user: unknown): user is User {
	return Boolean(
		user &&
			typeof user === "object" &&
			user !== null &&
			"id" in user &&
			typeof (user as { id: unknown }).id === "string"
	)
}

export function useOptionalUser(): User | undefined {
	const data = useRouteLoaderData<typeof rootLoader>("root")
	if (!data || !isUser(data.user)) {
		return undefined
	}
	return data.user
}

export function useUser(): User {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			"No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
		)
	}
	return maybeUser
}

export type PermissionString = `${Action}:${Entity}` | `${Action}:${Entity}:${Access}`

export function parsePermissionString(permissionString: PermissionString) {
	const [action, entity, access] = permissionString.split(":") as [Action, Entity, Access | undefined]
	return {
		action,
		entity,
		access: access ? (access.split(",") as Array<Access>) : undefined,
	}
}

export function userHasPermission(
	user: Prisma.UserGetPayload<{ include: { roles: { include: { permissions: true } } } }> | null | undefined,
	permission: PermissionString
) {
	if (!user) return false
	const { action, entity, access } = parsePermissionString(permission)
	return user.roles.some((roles: Prisma.UserRoleGetPayload<{ include: { permissions: true } }>) =>
		roles.permissions.some(
			(permission: Prisma.UserPermissionGetPayload<{ include: { role: true } }>) =>
				permission.entity === entity &&
				permission.action === action &&
				(!access || access.includes(permission.access as Access))
		)
	)
}

export function userHasRole(
	user: Prisma.UserGetPayload<{ include: { roles: { include: { permissions: true } } } }> | null,
	roles: string[]
) {
	if (!user) return false
	return (
		user.roles?.some((r: Prisma.UserRoleGetPayload<{ include: { permissions: true } }>) => roles.includes(r.name)) ??
		false
	)
}
