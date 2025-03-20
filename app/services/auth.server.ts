import crypto from "node:crypto"
import type { UserRole } from "@prisma/client"
import { createCookieSessionStorage, redirect } from "react-router"
import { Authenticator } from "remix-auth"
import { FormStrategy } from "remix-auth-form"
import { prisma } from "./db.server"
// Define user type
export type SessionUser = {
	id: string
	email: string
	displayName: string
	pictureUrl: string
}
// Function to hash password with SHA-256 (matching the setup script)
function hashPassword(password: string): string {
	return crypto.createHash("sha256").update(password).digest("hex")
}

// Define the user type that will be stored in the session
export interface AuthUser {
	id: string
	email: string
	name: string
	roles: UserRole[]
}

// Create a session storage
export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "__resource_scheduling_session",
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secrets: ["s3cr3t"], // Replace with a real secret in .env file
		secure: false, // Set to true in production
	},
})

// Create an instance of the authenticator
export const authenticator = new Authenticator<AuthUser>()

// Create a FormStrategy that will handle username/password authentication
authenticator.use(
	new FormStrategy(async ({ form }) => {
		const email = form.get("email") as string
		const password = form.get("password") as string

		// Validate the form data
		if (!email || !password) {
			throw new Error("Email and password are required")
		}

		// Find the user in the database
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				roles: true,
			},
		})

		if (!user) {
			throw new Error("User not found")
		}

		// Hash the provided password using the same method as in setup-dummy-data.ts
		const hashedPassword = hashPassword(password)

		// Compare the hashed password with the stored hash
		if (hashedPassword !== user.password) {
			throw new Error("Invalid credentials")
		}

		// Return the user object that will be stored in the session
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			roles: user.roles,
		}
	})
)

export const getSession = async (request: Request) => {
	const cookieHeader = await sessionStorage.getSession(request.headers.get("Cookie") || "")

	return cookieHeader
}

export const getSessionUser = async (request: Request) => {
	try {
		const session = await sessionStorage.getSession(request.headers.get("cookie") || "")
		const user = session.get("user")
		// Verify we have all required user fields
		if (!user?.id || !user?.email) {
			return null
		}
		return user
	} catch (error) {
		// If there's any error reading the session, treat it as invalid
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(error)
		return null
	}
}

export const saveSession = async (request: Request, user: SessionUser) => {
	const session = await getSession(request)
	session.set("user", user)
	const cookie = await sessionStorage.commitSession(session)
	return new Headers({
		"Set-Cookie": cookie,
	})
}

export const destroySession = async (request: Request) => {
	const session = await getSession(request)
	return await sessionStorage.destroySession(session)
}

export async function requireUserId(request: Request, { redirectTo }: { redirectTo?: string | null } = {}) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo = redirectTo === null ? null : (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`)
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ["/login", loginParams?.toString()].filter(Boolean).join("?")
		throw redirect(loginRedirect)
	}
	return userId
}

export async function getUserId(request: Request) {
	const session = await getSession(request)
	const user = session.get("user")
	return user?.id
}
