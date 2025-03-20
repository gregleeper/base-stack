import { createHonoServer } from "react-router-hono-server/node"
import { getLoadContext } from "./context"
import { initCronJobs } from "./cron"

// Create the Hono server
const server = await createHonoServer({
	configure(server) {
		server.use("*")
	},
	defaultLogger: false,
	getLoadContext,
})

// Initialize cron jobs if running in a server environment
if (typeof window === "undefined") {
	initCronJobs()
}

export default server
