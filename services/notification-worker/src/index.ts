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
