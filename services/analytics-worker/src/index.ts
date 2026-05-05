export const analyticsWorker = {
  service: 'analytics-worker',
  jobs: ['progress-snapshots', 'weekly-summaries', 'milestones'],
};

console.log("voice-analytics-worker started");

setInterval(() => {
  console.log('analytics-worker heartbeat');
}, 30_000);
