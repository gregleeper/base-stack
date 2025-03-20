import cron from "node-cron"
import { processPendingNotifications } from "../services/notifications.server"
import { logger } from "../utils/logger"

/**
 * Initialize all cron jobs for the application
 */
export function initCronJobs() {
	logger.info("Initializing cron jobs...")

	// Process notifications every 5 minutes
	// Format: '*/5 * * * *' (minute hour day-of-month month day-of-week)
	cron.schedule("*/5 * * * *", async () => {
		logger.info("Running notification processing job")
		try {
			const result = await processPendingNotifications()
			logger.info(`Processed ${result.processed || 0} notifications`)
		} catch (error) {
			logger.error("Error in notification processing job:", error)
		}
	})

	// Add more cron jobs as needed
	// For example, you might want a job to clean up old notifications
	// cron.schedule('0 2 * * *', async () => { // Runs at 2 AM every day
	//   logger.info('Running notification cleanup job');
	//   try {
	//     // Implement cleanup logic here
	//   } catch (error) {
	//     logger.error('Error in notification cleanup job:', error);
	//   }
	// });

	logger.info("Cron jobs initialized")
}
