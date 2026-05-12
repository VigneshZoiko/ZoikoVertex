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
} catch (e) {
  console.warn("Supabase initialization failed. Check your environment variables.");
  // Build-time fallback: methods return null or throw a clear error only when CALLED
  client = new Proxy({} as SupabaseClient, {
    get(_, prop) {
      return () => {
        console.error(`Supabase method ${String(prop)} called but client is not initialized.`);
        return { data: null, error: { message: "Supabase not initialized" } };
      };
    },
  });
}

export const supabase = client;
