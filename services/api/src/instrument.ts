import * as Sentry from "@sentry/node";
import * as Profiler from "@sentry/profiling-node";

const nodeProfilingIntegration = Profiler.nodeProfilingIntegration;
const sentryDsn = process.env.SENTRY_DSN;

if (!sentryDsn) {
  const errorMessage = "Missing required SENTRY_DSN environment variable for Sentry initialization.";

  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMessage);
  }

  console.warn(errorMessage);
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    sendDefaultPii: false,
  });
}
