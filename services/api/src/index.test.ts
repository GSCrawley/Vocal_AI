import { app, apiService } from './index.js';
// Removed unused imports to fix linting issues

describe('API Service', () => {
  let token: string;
  beforeAll(async () => {
    // Make sure we have a secret for the test
    process.env.JWT_SECRET = 'test-secret';
    // Let the app be ready and initialize jwt plugin before creating a token
    await app.ready();
    token = app.jwt.sign({ sub: 'test-user' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('exports apiService object', () => {
    expect(apiService).toBeDefined();
    expect(apiService.service).toBe('api');
    expect(apiService.modules).toContain('auth');
  });

  it('GET /healthz returns ok: true', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('GET / returns stub status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: 'api', status: 'stub' });
  });

  describe('POST /process-audio', () => {
    it('returns 400 for bad mic check', async () => {
      // Mock inputs that would fail a mic check (e.g. clipping rmsDbFrames)
      const response = await app.inject({
        method: 'POST',
        url: '/process-audio',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          frames: [],
          targetHz: 440,
          rmsDbFrames: [0, 1], // Values >= 0 mean clipping
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });

    it('returns a score for valid inputs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/process-audio',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          frames: [
            { frequencyHz: 440, rmsDb: -10, confidence: 0.9, timestampMs: 0, voiced: true },
            { frequencyHz: 440, rmsDb: -10, confidence: 0.9, timestampMs: 100, voiced: true },
          ],
          targetHz: 440,
          rmsDbFrames: [-20, -20],
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('score');
      // score is an object with overall property from SingingExerciseScoreBreakdown
      expect(typeof response.json().score).toBe('object');
      expect(typeof response.json().score.overall).toBe('number');
    });
  });

  describe('POST /transition-state', () => {
    it('transitions state correctly', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/transition-state',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          currentState: 'IDLE',
          event: { type: 'LOAD' },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('nextState');
    });
  });
});
