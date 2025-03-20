import type { ActionFunction } from "react-router";
import { processPendingNotifications } from "../services/notifications.server";
import { logger } from "../utils/logger";

export const action: ActionFunction = async ({ request }) => {
	// Only allow POST requests
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" }
		});
	}

	try {
		logger.info("Manually triggering notification processing");
		const result = await processPendingNotifications();
		return new Response(JSON.stringify({
			success: true,
			message: "Notifications processed",
			...result
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		logger.error("Error processing notifications:", error);
		return new Response(JSON.stringify({
			success: false,
			message: "Error processing notifications",
			error: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
}
