export const logger = {
  info: (msg: string, obj?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', msg, time: new Date().toISOString(), ...obj }));
  },
  error: (msg: string, err?: Error | unknown, obj?: Record<string, unknown>) => {
    const errorObj = err instanceof Error
      ? { errorMessage: err.message, stack: err.stack }
      : { err };
    console.error(JSON.stringify({ level: 'error', msg, time: new Date().toISOString(), ...errorObj, ...obj }));
  },
  warn: (msg: string, obj?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', msg, time: new Date().toISOString(), ...obj }));
  },
  debug: (msg: string, obj?: Record<string, unknown>) => {
    console.debug(JSON.stringify({ level: 'debug', msg, time: new Date().toISOString(), ...obj }));
  }
};
