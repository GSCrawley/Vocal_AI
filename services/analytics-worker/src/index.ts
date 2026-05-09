require("./instrument.js");

// All other imports below
import { createServer, IncomingMessage, ServerResponse } from "node:http";

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // server code
});

server.listen(3000, "127.0.0.1");
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
