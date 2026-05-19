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
  
  // Recursive Proxy to prevent crashes on nested properties (auth.getUser, etc)
  const createResilientProxy = (path: string = "supabase"): any => {
    const noop = () => {
      console.error(`Method ${path}() called but Supabase is not initialized.`);
      return { data: null, error: { message: "Supabase not initialized" } };
    };
    
    return new Proxy(noop, {
      get(_, prop) {
        if (typeof prop === "string") {
          return createResilientProxy(`${path}.${prop}`);
        }
        return undefined;
      }
    });
  };

  client = createResilientProxy() as SupabaseClient;
}

export const supabase = client;

// Keep the zv_auth cookie in sync with the Supabase session so that
// middleware can make lightweight routing decisions without needing @supabase/ssr.
if (typeof window !== 'undefined') {
  client.auth.onAuthStateChange((event, session) => {
    if (session) {
      document.cookie = 'zv_auth=1; path=/; SameSite=Strict; max-age=3600';
    } else {
      document.cookie = 'zv_auth=; path=/; SameSite=Strict; max-age=0';
      // Clear role cache so a new login always gets fresh data
      try { localStorage.removeItem('zv_role_cache'); } catch {}
    }
  });
}
