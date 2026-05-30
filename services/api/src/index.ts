import '../instrument.js';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { LivePitchFrame, SessionState, SessionEvent } from '@voice/shared-types';
import { micCheck, scoreSustainedNote } from '@voice/audio-metrics';
import { transition } from '@voice/exercise-engine';

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
    'analytics-events',
    'audio-metrics',
    'exercise-engine',
  ],
};

const fastify = Fastify({
  logger: true,
});

if (!process.env.JWT_SECRET) {
  fastify.log.error('JWT_SECRET environment variable is missing');
  process.exit(1);
}

fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
});

fastify.addHook('onRequest', async (request, reply) => {
  if (request.routeOptions.url === '/healthz') {
    return;
  }
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.send(err);
  }
});

fastify.get('/healthz', async (_request: FastifyRequest, _reply: FastifyReply) => {
  return { ok: true };
});

fastify.get('/', async (_request: FastifyRequest, _reply: FastifyReply) => {
  return { service: 'api', status: 'stub' };
});

// Placeholder route for processing audio with audio-metrics
fastify.post(
  '/process-audio',
  {
    schema: {
      body: {
        type: 'object',
        required: ['frames', 'targetHz', 'rmsDbFrames'],
        properties: {
          frames: { type: 'array' },
          targetHz: { type: 'number' },
          rmsDbFrames: { type: 'array', items: { type: 'number' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            score: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  async (
    request: FastifyRequest<{
      Body: { frames: LivePitchFrame[]; targetHz: number; rmsDbFrames: number[] };
    }>,
    reply: FastifyReply
  ) => {
    const { frames, targetHz, rmsDbFrames } = request.body;
    const checkResult = micCheck(frames, rmsDbFrames);
    if (!checkResult.ok) {
      return reply.code(400).send({ error: checkResult.reason });
    }
    const score = scoreSustainedNote(frames, targetHz, 50, { pitch: 0.5, stability: 0.5 });
    return { score };
  }
);

// Placeholder route for transitioning session state with exercise-engine
fastify.post(
  '/transition-state',
  {
    schema: {
      body: {
        type: 'object',
        required: ['currentState', 'event'],
        properties: {
          currentState: { type: 'object' },
          event: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nextState: { type: 'object' },
          },
        },
      },
    },
  },
  async (
    request: FastifyRequest<{ Body: { currentState: SessionState; event: SessionEvent } }>,
    _reply: FastifyReply
  ) => {
    const { currentState, event } = request.body;
    const nextState = transition(currentState, event);
    return { nextState };
  }
);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '10000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`voice-api listening on PORT ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
