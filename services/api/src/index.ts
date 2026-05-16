import "../instrument.js";
import * as Sentry from "@sentry/node";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";

const app = Fastify();

Sentry.setupFastifyErrorHandler(app);

app.get("/", function rootHandler(req: FastifyRequest, res: FastifyReply) {
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
  logger: true,
  disableRequestLogging: true
});

fastify.get('/healthz', async (request: FastifyRequest, reply: FastifyReply) => {
  return { ok: true };
});

fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return { service: 'api', status: 'stub' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '10000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info({ port }, "voice-api listening on PORT");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
