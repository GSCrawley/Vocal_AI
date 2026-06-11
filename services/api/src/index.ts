import '../instrument.js';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
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

export const app = Fastify({
  logger: true,
});

app.get('/healthz', async (request: any, reply: any) => {
  return { ok: true };
});

app.get('/', async (request: any, reply: any) => {
  return { service: 'api', status: 'stub' };
});

// Placeholder route for processing audio with audio-metrics
app.post(
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
            score: {
              type: 'object',
              additionalProperties: true,
              properties: {
                overall: { type: 'number' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
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
app.post(
  '/transition-state',
  {
    schema: {
      body: {
        type: 'object',
        required: ['currentState', 'event'],
        properties: {
          currentState: { type: 'string' },
          event: {
            type: 'object',
            properties: {
              type: { type: 'string' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nextState: { type: 'string' },
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
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`voice-api listening on PORT ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}
