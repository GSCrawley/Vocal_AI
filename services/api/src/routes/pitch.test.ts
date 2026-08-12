import Fastify, { FastifyInstance } from 'fastify';
import pitchRoutes from './pitch.js';
import fastifyJwt from '@fastify/jwt';

describe('pitchRoutes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.register(fastifyJwt, { secret: 'test-secret' });

    // Mock user for testing route logic
    app.addHook('onRequest', async (request) => {
      request.user = { sub: 'test-user' };
    });

    app.register(pitchRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const originalToken = process.env.INTERNAL_SERVICE_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.INTERNAL_SERVICE_TOKEN;
    } else {
      process.env.INTERNAL_SERVICE_TOKEN = originalToken;
    }
  });

  it('fails securely with 500 when INTERNAL_SERVICE_TOKEN is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/extract',
      headers: {
        // multipart/form-data boundary
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      payload:
        '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="file"; filename="test.m4a"\r\nContent-Type: audio/mp4\r\n\r\ntest\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal server configuration error' });
  });

  it('proceeds past config check when INTERNAL_SERVICE_TOKEN is present', async () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'mock-token';
    const response = await app.inject({
      method: 'POST',
      url: '/extract',
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      // Valid multipart body, but with no file part.
      payload:
        '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'No audio file provided' });
    // reset for other tests
    delete process.env.INTERNAL_SERVICE_TOKEN;
  });
});
