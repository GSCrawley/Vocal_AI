export const analyticsWorker = {
  service: 'analytics-worker',
  jobs: ['progress-snapshots', 'weekly-summaries', 'milestones'],
};

const heartbeatLogsEnabled = process.env.ANALYTICS_WORKER_HEARTBEAT_LOGS === 'true';

console.log("voice-analytics-worker started");

if (heartbeatLogsEnabled) {
  setInterval(() => {
    console.log('analytics-worker heartbeat');
  }, 30_000);
}
