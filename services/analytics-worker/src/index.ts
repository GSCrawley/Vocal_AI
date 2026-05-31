import '../instrument.js';

// All other imports below
import { createServer } from 'node:http';

const server = createServer((_req: unknown, _res: unknown) => {
  // server code
});

server.listen(parseInt(process.env.PORT || '3001', 10), '0.0.0.0');
export const analyticsWorker = {
  service: 'analytics-worker',
  jobs: ['progress-snapshots', 'weekly-summaries', 'milestones'],
};

const heartbeatLogsEnabled = process.env.ANALYTICS_WORKER_HEARTBEAT_LOGS === 'true';

console.log('voice-analytics-worker started');

if (heartbeatLogsEnabled) {
  setInterval(() => {
    console.log('analytics-worker heartbeat');
  }, 30_000);
}
