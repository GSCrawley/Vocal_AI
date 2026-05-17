import "../instrument.js";
import * as Sentry from "@sentry/node";
import Fastify from "fastify";
import {
  LivePitchFrame,
  SessionState,
  SessionEvent,
  ExerciseDefinition,
  Tier
} from "@voice/shared-types";
import { micCheck, scoreSustainedNote } from "@voice/audio-metrics";
import { transition } from "@voice/exercise-engine";

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
    'analytics-events',
    'audio-metrics',
    'exercise-engine'
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

// Placeholder route for processing audio with audio-metrics
fastify.post('/process-audio', async (request: any, reply: any) => {
  try {
    const { frames, targetHz, rmsDbFrames } = request.body as { frames: LivePitchFrame[], targetHz: number, rmsDbFrames: number[] };

    const checkResult = micCheck(frames, rmsDbFrames);
    if (!checkResult.ok) {
        return reply.code(400).send({ error: checkResult.reason });
    }

    const score = scoreSustainedNote(frames, targetHz, 50, { pitch: 0.5, stability: 0.5 });
    return { score };
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

// Placeholder route for transitioning session state with exercise-engine
fastify.post('/transition-state', async (request: any, reply: any) => {
  try {
    const { currentState, event } = request.body as { currentState: SessionState, event: SessionEvent };
    const nextState = transition(currentState, event);
    return { nextState };
  } catch (err: any) {
     return reply.code(500).send({ error: err.message });
  }
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
