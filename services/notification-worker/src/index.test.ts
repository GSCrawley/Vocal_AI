import { jest } from '@jest/globals';

jest.unstable_mockModule('node:http', () => {
  const listenMock = jest.fn();
  const createServerMock = jest.fn(() => ({
    listen: listenMock,
  }));
  return {
    createServer: createServerMock,
    default: {
      createServer: createServerMock,
    },
  };
});
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.unstable_mockModule('@voice/logger', () => ({ logger: mockLogger }), { virtual: true });

// Mock instrument to avoid side effects
jest.unstable_mockModule('../instrument.js', () => ({}));

describe('notificationWorker', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('exports correct service information', async () => {
    const index = await import('./index.js');
    expect(index.notificationWorker).toBeDefined();
    expect(index.notificationWorker.service).toBe('notification-worker');
    expect(index.notificationWorker.jobs).toContain('daily-reminders');
  });

  it('starts server on default port when PORT is not set', async () => {
    delete process.env.PORT;
    const http = await import('node:http');
    await import('./index.js');

    expect(http.createServer).toHaveBeenCalled();
    const serverMock = (http.createServer as any).mock.results[0].value;
    expect(serverMock.listen).toHaveBeenCalledWith(3002, '0.0.0.0');
  });

  it('starts server on PORT environment variable when set', async () => {
    process.env.PORT = '4005';
    const http = await import('node:http');
    await import('./index.js');

    expect(http.createServer).toHaveBeenCalled();
    const serverMock = (http.createServer as any).mock.results[0].value;
    expect(serverMock.listen).toHaveBeenCalledWith(4005, '0.0.0.0');
  });

  it('enables heartbeat logs when NOTIFICATION_WORKER_HEARTBEAT_LOGS is true', async () => {
    jest.useFakeTimers();
    process.env.NOTIFICATION_WORKER_HEARTBEAT_LOGS = 'true';

    const { logger } = await import('@voice/logger');
    await import('./index.js');

    // Advance time by 30 seconds
    jest.advanceTimersByTime(30000);

    expect(logger.info).toHaveBeenCalledWith('notification-worker heartbeat');

    jest.useRealTimers();
  });

  it('does not enable heartbeat logs when NOTIFICATION_WORKER_HEARTBEAT_LOGS is false', async () => {
    jest.useFakeTimers();
    process.env.NOTIFICATION_WORKER_HEARTBEAT_LOGS = 'false';

    const { logger } = await import('@voice/logger');
    await import('./index.js');

    // Advance time by 30 seconds
    jest.advanceTimersByTime(30000);

    expect(logger.info).not.toHaveBeenCalledWith('notification-worker heartbeat');

    jest.useRealTimers();
  });
});
