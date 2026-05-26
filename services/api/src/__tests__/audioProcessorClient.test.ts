import { enqueueAudioAnalysis } from '../routes/audioProcessorClient.js';
import { validateEnv } from '../config/env.js';

describe('audioProcessorClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
    process.env.AUDIO_PROCESSOR_URL = 'http://localhost:8000';
    process.env.SUPABASE_URL = 'https://example.com';
    process.env.SUPABASE_ANON_KEY = 'test'; process.env.SENTRY_DSN = 'https://test@sentry.io/1';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
    process.env.OPENAI_API_KEY = 'sk-123';
    process.env.DEEPGRAM_API_KEY = 'dg-123';
    process.env.ELEVENLABS_API_KEY = 'el-123';
    process.env.REDIS_URL = 'redis://localhost:6379';
    validateEnv(process.env);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('should send correctly formatted request to audio processor', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'queued', jobId: 'job-123' })
    });
    global.fetch = mockFetch;

    const result = await enqueueAudioAnalysis('job-123', 'http://example.com/audio.wav', 'user-456');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/jobs/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': 'test-token',
      },
      body: JSON.stringify({
        jobId: 'job-123',
        audioUrl: 'http://example.com/audio.wav',
        userId: 'user-456'
      })
    });

    expect(result).toEqual({ status: 'queued', jobId: 'job-123' });
  });

  it('should throw an error if the response is not ok', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    global.fetch = mockFetch;

    await expect(enqueueAudioAnalysis('job-123', 'http://example.com/audio.wav', 'user-456'))
      .rejects.toThrow('Failed to enqueue audio analysis job: 500 Internal Server Error');
  });
});
