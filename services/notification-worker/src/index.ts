export const notificationWorker = {
  service: 'notification-worker',
  jobs: ['daily-reminders', 'weekly-summaries', 'milestone-notifications'],
};

console.log("voice-notification-worker started");

setInterval(() => {
  console.log('notification-worker heartbeat');
}, 30_000);
