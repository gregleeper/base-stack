/**
 * Simple logger utility for consistent logging throughout the application
 */
export const logger = {
	info: (message: string, ...args: any[]) => {
		console.log(`[INFO] ${message}`, ...args)
	},

	error: (message: string, ...args: any[]) => {
		console.error(`[ERROR] ${message}`, ...args)
	},

	warn: (message: string, ...args: any[]) => {
		console.warn(`[WARN] ${message}`, ...args)
	},

	debug: (message: string, ...args: any[]) => {
		if (process.env.NODE_ENV !== "production") {
			console.debug(`[DEBUG] ${message}`, ...args)
		}
	},
}
