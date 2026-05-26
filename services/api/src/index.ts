import "./instrument.js";
import { validateEnv } from "./config/env.js";

// Validate env vars before anything else runs. This ensures we fail fast.
const config = validateEnv();

import * as Sentry from "@sentry/node";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import {
  LivePitchFrame,
  SessionState,
  SessionEvent
} from "@voice/shared-types";
import { runMicCheck, computeSustainedNoteScore } from "@voice/audio-metrics";
import { nextState } from "@voice/exercise-engine";
import authPlugin from "./plugins/auth.js";
import { createClient } from "redis";
import { enqueueAudioAnalysis } from "./routes/audioProcessorClient.js";

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

let sharedRedisClient: ReturnType<typeof createClient> | null = null;
async function getRedisClient() {
  if (!sharedRedisClient) {
    sharedRedisClient = createClient({ url: config.REDIS_URL });
    sharedRedisClient.on('error', (err) => {
      fastify.log.error(err, 'Redis connection error');
    });
    await sharedRedisClient.connect();
  }
  return sharedRedisClient;
}

fastify.get('/healthz', async (request, reply) => {
  let redis;
  try {
    // Attempt connecting to Redis to verify it's reachable without leaking memory.
    // Creating a short-lived client for healthz
    redis = createClient({ url: config.REDIS_URL });
    redis.on('error', (err) => {
      // Catch errors silently here so we don't crash, we'll wait for the connect.
    });
    await redis.connect();
    await redis.ping();

    return { ok: true, status: "healthy" };
  } catch (err) {
    fastify.log.error(err, "Health check failed");
    return reply.code(503).send({ ok: false, error: "Health check failed: Redis unreachable or config issue" });
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }
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
    const checkResult = runMicCheck(frames);
    if (checkResult.status !== 'ok') {
      return reply.code(400).send({ error: checkResult.status });
    }
    const score = computeSustainedNoteScore(request.body.frames, { frequencyHz: request.body.targetHz, durationMs: 1000 });
    return { score };
  }
);

// Route to handle audio upload and enqueue analysis job
fastify.post<{ Body: { audioUrl: string; jobId: string } }>(
  '/upload-audio',
  {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
    },
    schema: {
      body: {
        type: 'object',
        required: ['audioUrl', 'jobId'],
        properties: {
          audioUrl: { type: 'string' },
          jobId: { type: 'string' }
        }
      }
    }
  },
  async (request, reply) => {
    const { audioUrl, jobId } = request.body;

    try {
      const result = await enqueueAudioAnalysis(jobId, audioUrl, request.user?.id || 'anonymous');
      return reply.code(202).send(result);
    } catch (err: any) {
      request.log.error(err, "Failed to enqueue audio analysis");
      return reply.code(500).send({ error: "Failed to enqueue audio analysis job" });
    }
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
    const sessionMock: any = { state: currentState };
    const newState = nextState(sessionMock, event).state;
    return { nextState: newState };
  }
);

// Only start the server if this file is executed directly (not imported in tests)
const start = async () => {
  try {
    const port = parseInt(config.PORT || '10000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info({ port }, 'voice-api listening');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

const isMainModule = import.meta.url.startsWith('file:') && process.argv[1] === new URL(import.meta.url).pathname;

if (isMainModule) {
  start();
}

export const app = fastify;
