import Fastify from 'fastify';

export const apiService = {
  service: 'api',
  modules: [
    'auth',
    'profiles',
    'assessments',
    'plans',
    'exercises',
    'sessions',
    'progress',
    'notifications',
    'admin',
    'analytics-events'
  ],
};

const fastify = Fastify({
  logger: false
});

fastify.get('/healthz', async (request, reply) => {
  return { ok: true };
});

fastify.get('/', async (request, reply) => {
  return { service: 'api', status: 'stub' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '10000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`voice-api listening on PORT ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
