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

jest.unstable_mockModule('@voice/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock instrument to avoid side effects
jest.unstable_mockModule('../instrument.js', () => ({}));

describe('analyticsWorker', () => {
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
    expect(index.analyticsWorker).toBeDefined();
    expect(index.analyticsWorker.service).toBe('analytics-worker');
    expect(index.analyticsWorker.jobs).toEqual([
      'progress-snapshots',
      'weekly-summaries',
      'milestones',
    ]);
  });

  it('starts server on default port when PORT is not set', async () => {
    delete process.env.PORT;
    const http = await import('node:http');
    await import('./index.js');

    expect(http.createServer).toHaveBeenCalled();
    const serverMock = (http.createServer as jest.Mock).mock.results[0].value as any;
    expect(serverMock.listen).toHaveBeenCalledWith(3001, '0.0.0.0');
  });

  it('starts server on PORT environment variable when set', async () => {
    process.env.PORT = '4005';
    const http = await import('node:http');
    await import('./index.js');

    expect(http.createServer).toHaveBeenCalled();
    const serverMock = (http.createServer as jest.Mock).mock.results[0].value as any;
    expect(serverMock.listen).toHaveBeenCalledWith(4005, '0.0.0.0');
  });

  it('enables heartbeat logs when ANALYTICS_WORKER_HEARTBEAT_LOGS is true', async () => {
    jest.useFakeTimers();
    process.env.ANALYTICS_WORKER_HEARTBEAT_LOGS = 'true';

    const { logger } = await import('@voice/logger');
    await import('./index.js');

    // Advance time by 30 seconds
    jest.advanceTimersByTime(30000);

    expect(logger.info).toHaveBeenCalledWith('analytics-worker heartbeat');

    jest.useRealTimers();
  });

  it('does not enable heartbeat logs when ANALYTICS_WORKER_HEARTBEAT_LOGS is false', async () => {
    jest.useFakeTimers();
    process.env.ANALYTICS_WORKER_HEARTBEAT_LOGS = 'false';

    const { logger } = await import('@voice/logger');
    await import('./index.js');

    // Advance time by 30 seconds
    jest.advanceTimersByTime(30000);

    expect(logger.info).not.toHaveBeenCalledWith('analytics-worker heartbeat');

    jest.useRealTimers();
  });
});
