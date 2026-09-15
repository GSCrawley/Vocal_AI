import { createClient } from '@supabase/supabase-js';

const isTest = process.env.NODE_ENV === 'test';

const supabaseUrl =
  process.env.SUPABASE_URL ?? (isTest ? 'https://stub-project.supabase.co' : undefined);
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isTest ? 'stub-service-key' : undefined);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

if (!supabaseAnonKey) {
  console.warn('Missing SUPABASE_ANON_KEY environment variable');
}

// Service-role client: bypasses RLS — use only for trusted background/admin operations.
export const supabase = createClient(
  supabaseUrl || 'https://stub-project.supabase.co',
  supabaseServiceKey || 'stub-service-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Returns a user-scoped Supabase client that operates under the caller's JWT,
 * so that Row Level Security policies are enforced automatically.
 * Use this for all /me endpoints and any user-initiated operations.
 */
export function createUserSupabaseClient(jwt: string) {
  return createClient(
    supabaseUrl || 'https://stub-project.supabase.co',
    supabaseAnonKey || 'stub-anon-key',
    {
      global: { headers: { Authorization: 'Bearer ' + jwt } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
