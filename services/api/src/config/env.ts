import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUDIO_PROCESSOR_URL: z.string().url().optional(),
  INTERNAL_SERVICE_TOKEN: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('10000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const missingVars = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    const logMessage = `Missing or invalid required environment variables: ${missingVars}`;

    console.error(`[FATAL] ${logMessage}`);

    // In tests we don't want to actually exit the process
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw new Error(logMessage);
    }
  }

  config = parsed.data;
  return config;
}

export function getConfig(): EnvConfig {
  if (!config) {
    return validateEnv();
  }
  return config;
}
