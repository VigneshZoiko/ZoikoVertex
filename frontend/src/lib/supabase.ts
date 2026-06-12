import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Suppress the noisy "Invalid Refresh Token" console.error that Supabase emits
// when a stale session can't be refreshed (harmless — Supabase clears the session
// internally, but the red error confuses users).
function suppressRefreshError(...args: any[]) {
  const msg = args.map(String).join(' ');
  if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    return true; // suppressed
  }
  return false; // not suppressed
}

if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = function (...args: any[]) {
    if (!suppressRefreshError(...args)) origError.apply(console, args);
  };
  const origWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (!suppressRefreshError(...args)) origWarn.apply(console, args);
  };
}

function initClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseKey);
}

let client: SupabaseClient;
let initialized = false;

try {
  client = initClient();
  initialized = true;
} catch (e) {
  console.warn("Supabase initialization failed. Check your environment variables.");

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
export const isSupabaseReady = initialized;

// Keep the zv_auth cookie in sync with the Supabase session so that
// middleware can make lightweight routing decisions without needing @supabase/ssr.
if (typeof window !== 'undefined' && initialized) {
  client.auth.onAuthStateChange((_event, session) => {
    if (session) {
      document.cookie = 'zv_auth=1; path=/; SameSite=Lax; max-age=3600';
    } else {
      document.cookie = 'zv_auth=; path=/; SameSite=Lax; max-age=0';
      try { localStorage.removeItem('zv_role_cache'); } catch {}
    }
  });
}
