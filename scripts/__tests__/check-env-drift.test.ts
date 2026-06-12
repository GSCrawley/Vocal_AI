import { join } from 'node:path';
import { runCheck, ROOT } from '../check-env-drift';

// Mock fs to simulate an error reading directory
jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  readdirSync: jest.fn((path: string) => {
    if (path.includes('mock-error-dir')) {
      throw new Error('Permission denied');
    }
    return jest.requireActual('node:fs').readdirSync(path);
  }),
}));

describe('check-env-drift error handling', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn(); // Suppress expected error logs
  });

  afterEach(() => {
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  it('should handle scan errors correctly', () => {
    const mockScanDirs = ['mock-error-dir'];
    const mockEnvExamplePath = join(ROOT, '.env.example');

    const result = runCheck(ROOT, mockScanDirs, mockEnvExamplePath);

    expect(result.success).toBe(false);
    expect(result.error).toBe('scan errors above may produce false-clean results');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ Failed to scan directory "mock-error-dir": Permission denied')
    );
  });
});
