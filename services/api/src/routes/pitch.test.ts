import { jest } from '@jest/globals';
import FormData from 'form-data';

// Mock node-fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const { app } = await import('../index.js');

describe('Pitch Routes', () => {
  let token = '';

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({ sub: 'test-user-uuid' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/pitch/extract', () => {
    it('returns 400 when no audio file is provided', async () => {
      const form = new FormData();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/pitch/extract',
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        payload: form.getBuffer(),
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'No audio file provided');
    });

    it('returns 500 when audio-processor fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Processor Error',
      });

      const form = new FormData();
      form.append('file', Buffer.from('fake-audio-data'), {
        filename: 'test.m4a',
        contentType: 'audio/mp4',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/pitch/extract',
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        payload: form.getBuffer(),
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toHaveProperty('error', 'Failed to extract pitch on audio-processor');
    });

    it('returns 200 and result when extraction is successful', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pitch: 440 }),
      });

      const form = new FormData();
      form.append('file', Buffer.from('fake-audio-data'), {
        filename: 'test.m4a',
        contentType: 'audio/mp4',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/pitch/extract',
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        payload: form.getBuffer(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ pitch: 440 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pitch/extract'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-internal-token': expect.any(String),
          }),
        })
      );
    });

    it('returns 500 when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const form = new FormData();
      form.append('file', Buffer.from('fake-audio-data'), {
        filename: 'test.m4a',
        contentType: 'audio/mp4',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/pitch/extract',
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
        payload: form.getBuffer(),
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toHaveProperty('error', 'Internal Server Error');
    });
  });
});
