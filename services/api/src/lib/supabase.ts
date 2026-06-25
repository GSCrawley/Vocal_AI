import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isTest = process.env.NODE_ENV === 'test';

if ((!supabaseUrl || !supabaseServiceKey) && !isTest) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseServiceKey ?? 'test-service-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
