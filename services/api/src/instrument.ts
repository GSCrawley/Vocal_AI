import * as Sentry from '@sentry/node';
// Sentry instrumentation mock
export function initSentry() {
  Sentry.init({
    sendDefaultPii: false,
  });
}
