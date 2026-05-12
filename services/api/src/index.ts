import "../instrument.js";
import * as Sentry from "@sentry/node";
import Fastify from "fastify";

const app = Fastify();

Sentry.setupFastifyErrorHandler(app);

app.get("/", function rootHandler(req: any, res: any) {
  res.send("Hello world!");
});

app.listen({ port: 3000 });

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

fastify.get('/healthz', async (request: any, reply: any) => {
  return { ok: true };
});

fastify.get('/', async (request: any, reply: any) => {
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
