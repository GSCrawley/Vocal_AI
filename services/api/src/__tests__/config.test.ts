import { validateEnv } from '../config/env.js';

describe('Config Validation', () => {
  const validEnv = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    DATABASE_URL: 'https://example.supabase.co/database',
    OPENAI_API_KEY: 'sk-123',
    DEEPGRAM_API_KEY: 'dg-123',
    ELEVENLABS_API_KEY: 'el-123',
    REDIS_URL: 'redis://localhost:6379',
    INTERNAL_SERVICE_TOKEN: 'internal-token',
    NODE_ENV: 'test',
    PORT: '10000'
  };

  it('should parse valid env successfully', () => {
    const config = validateEnv(validEnv);
    expect(config.SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('should fail fast and throw for missing vars', () => {
    const invalidEnv = { ...validEnv } as any;
    delete invalidEnv.SUPABASE_URL;

    expect(() => validateEnv(invalidEnv)).toThrowError(/Missing or invalid required environment variables: SUPABASE_URL/);
  });
});
