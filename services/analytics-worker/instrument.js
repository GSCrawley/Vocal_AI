import * as Sentry from '@sentry/node';
import * as Profiler from '@sentry/profiling-node';

const nodeProfilingIntegration = Profiler.nodeProfilingIntegration;

const sentryDsn = process.env.SENTRY_DSN;

if (!sentryDsn) {
  const errorMessage =
    'Missing required SENTRY_DSN environment variable for Sentry initialization.';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMessage);
  }
  console.warn(errorMessage);
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [nodeProfilingIntegration()],
    // Send structured logs to Sentry
    enableLogs: true,
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is evaluated only once per SDK.init call
    profileSessionSampleRate: 1.0,
    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: 'trace',
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: false,
  });
}
