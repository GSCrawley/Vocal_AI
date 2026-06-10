type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message,
    ...meta,
  });
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(formatMessage('info', message, meta));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(formatMessage('error', message, meta));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    console.debug(formatMessage('debug', message, meta));
  },
};
