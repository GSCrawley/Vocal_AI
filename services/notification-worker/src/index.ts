import "../instrument.js";

// All other imports below
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { logger } from "./logger.js";

const server = createServer((req: any, res: any) => {
  // server code
});

server.listen(parseInt(process.env.PORT || "3002", 10), "0.0.0.0");

export const notificationWorker = {
  service: 'notification-worker',
  jobs: ['daily-reminders', 'weekly-summaries', 'milestone-notifications'],
};

logger.info("voice-notification-worker started");

const heartbeatLogsEnabled = process.env.NOTIFICATION_WORKER_HEARTBEAT_LOGS === 'true';

if (heartbeatLogsEnabled) {
  setInterval(() => {
    logger.info('notification-worker heartbeat');
  }, 30_000);
}
