import { PrismaClient } from "@prisma/client"

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

// Add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends Global {
	prisma: PrismaClient
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal

const prisma = global.prisma || new PrismaClient()

// biome-ignore lint/nursery/noProcessEnv: Needed for environment detection
if (process.env.NODE_ENV === "development") {
	global.prisma = prisma
}

export { prisma }

// Helper method to serialize dates to ISO strings when returning data
// This helps with JSON serialization
export function serializeDate<T extends Record<string, unknown>>(obj: T): T {
	const newObj = { ...obj }
	for (const key in newObj) {
		// biome-ignore lint/suspicious/noExplicitAny: Need to check instance of Date
		const value = newObj[key] as any
		if (value instanceof Date) {
			newObj[key] = value.toISOString() as unknown as T[Extract<keyof T, string>]
		} else if (typeof value === "object" && value !== null) {
			// biome-ignore lint/suspicious/noExplicitAny: Recursive call with unknown structure
			newObj[key] = serializeDate(value as any) as unknown as T[Extract<keyof T, string>]
		}
	}
	return newObj
}

// Helper methods for JSON fields
export function parseJsonField<T>(field: string | null): T | null {
	if (!field) return null
	try {
		return JSON.parse(field) as T
	} catch (e) {
		// biome-ignore lint/nursery/noConsole: Acceptable for error reporting
		console.error("Error parsing JSON field:", e)
		return null
	}
}

export function stringifyJsonField<T>(data: T | null): string | null {
	if (data === null) return null
	return JSON.stringify(data)
}
