type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    ...(meta ?? {}),
    level,
    timestamp: new Date().toISOString(),
    message,
  };

  const seen = new WeakSet<object>();
  return JSON.stringify(payload, (_key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (value && typeof value === 'object') {
      const obj = value as object;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
    }
    return value;
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
