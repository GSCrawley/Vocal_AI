import "../instrument.js";
import * as Sentry from "@sentry/node";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";

const app = Fastify();

Sentry.setupFastifyErrorHandler(app);

app.get(
  "/",
  {
    schema: {
      response: {
        200: { type: "string" },
      },
    },
  },
  function rootHandler(req: FastifyRequest, res: FastifyReply) {
    res.send("Hello world!");
  }
);

app.listen({ port: 3000 }).catch(console.error);

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

fastify.get(
  '/healthz',
  {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' }
          }
        }
      }
    }
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    return { ok: true };
  }
);

fastify.get(
  '/',
  {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    }
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    return { service: 'api', status: 'stub' };
  }
);

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
