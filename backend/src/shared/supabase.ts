import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Scoped client with Service Role for administrative tasks
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Standard client for normal operations (using anon key if available)
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
