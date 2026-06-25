import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// We use the service role key on the API side to bypass RLS when performing background operations
// For user-initiated operations, we can still use this client but we should pass the JWT to establish the user context
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
