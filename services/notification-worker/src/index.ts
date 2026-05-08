require("./instrument.js");

// All other imports below
const { createServer } = require("node:http");

const server = createServer((req, res) => {
  // server code
});

server.listen(3000, "127.0.0.1");

export const notificationWorker = {
  service: 'notification-worker',
  jobs: ['daily-reminders', 'weekly-summaries', 'milestone-notifications'],
};

console.log("voice-notification-worker started");

const heartbeatLogsEnabled = process.env.NOTIFICATION_WORKER_HEARTBEAT_LOGS === 'true';

if (heartbeatLogsEnabled) {
  setInterval(() => {
    console.log('notification-worker heartbeat');
  }, 30_000);
}
