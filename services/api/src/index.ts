import "../instrument.js";
import * as Sentry from "@sentry/node";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import {
  LivePitchFrame,
  SessionState,
  SessionEvent
} from "@voice/shared-types";
import { micCheck, scoreSustainedNote } from "@voice/audio-metrics";
import { transition } from "@voice/exercise-engine";
import authPlugin from "./plugins/auth.js";

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
    'exercise-engine'
  ],
};

const fastify = Fastify({
  logger: true
});

fastify.register(authPlugin);

fastify.get('/healthz', async () => {
  return { ok: true };
});

fastify.get('/', {
  preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);
  }
}, async () => {
  return { service: 'api', status: 'stub' };
});

// Placeholder route for processing audio with audio-metrics
fastify.post<{ Body: { frames: LivePitchFrame[]; targetHz: number; rmsDbFrames: number[] } }>(
  '/process-audio',
  {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
    },
    schema: {
      body: {
        type: 'object',
        required: ['frames', 'targetHz', 'rmsDbFrames'],
        properties: {
          frames: { type: 'array' },
          targetHz: { type: 'number' },
          rmsDbFrames: { type: 'array', items: { type: 'number' } }
        }
      }
    }
  },
  async (request, reply) => {
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
fastify.post<{ Body: { currentState: SessionState; event: SessionEvent } }>(
  '/transition-state',
  {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
    },
    schema: {
      body: {
        type: 'object',
        required: ['currentState', 'event'],
        properties: {
          currentState: { type: 'object' },
          event: { type: 'string' }
        }
      }
    }
  },
  async (request, reply) => {
    const { currentState, event } = request.body;
    const nextState = transition(currentState, event);
    return { nextState };
  }
);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '10000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info({ port }, 'voice-api listening');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
