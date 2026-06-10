import '../instrument.js';

// All other imports below
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '@voice/logger';

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // server code
});

server.listen(parseInt(process.env.PORT || '3001', 10), '0.0.0.0');
export const analyticsWorker = {
  service: 'analytics-worker',
  jobs: ['progress-snapshots', 'weekly-summaries', 'milestones'],
};

const heartbeatLogsEnabled = process.env.ANALYTICS_WORKER_HEARTBEAT_LOGS === 'true';

logger.info('voice-analytics-worker started');

if (heartbeatLogsEnabled) {
  setInterval(() => {
    logger.info('analytics-worker heartbeat');
  }, 30_000);
}
