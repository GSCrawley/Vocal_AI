import Fastify, { FastifyInstance } from 'fastify';
import pitchRoutes from './pitch.js';
import FormData from 'form-data';

describe('Pitch Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();

    // Mock fastify-jwt decorator for testing
    app.decorate('user', null);
    app.addHook('onRequest', async (request, _reply) => {
       // Allow test runner to set user manually or leave empty
       if ((request as { headers: Record<string, string> }).headers['x-mock-user']) {
           request.user = { sub: (request as { headers: Record<string, string> }).headers['x-mock-user'] };
       }
    });

    await app.register(pitchRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 401 Unauthorized if no userId is present in JWT', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('dummy audio data'), {
      filename: 'test.m4a',
      contentType: 'audio/mp4'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/extract',
      headers: form.getHeaders(),
      payload: form
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Unauthorized' });
  });
});
