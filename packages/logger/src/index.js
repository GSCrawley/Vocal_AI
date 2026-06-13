function formatMessage(level, message, meta) {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message,
    ...meta,
  });
}
export const logger = {
  info: (message, meta) => {
    console.info(formatMessage('info', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, meta) => {
    console.error(formatMessage('error', message, meta));
  },
  debug: (message, meta) => {
    console.debug(formatMessage('debug', message, meta));
  },
};
