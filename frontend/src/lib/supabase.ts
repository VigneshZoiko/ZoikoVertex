import { createClient, SupabaseClient } from "@supabase/supabase-js";

function initClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseKey);
}

let client: SupabaseClient;

try {
  client = initClient();
} catch {
  // Build-time fallback: methods throw a clear error if called during prerender
  client = new Proxy({} as SupabaseClient, {
    get(_, prop) {
      throw new Error(
        `supabase.${String(prop)}() is not available during build. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.`,
      );
    },
  });
}

export const supabase = client;
