"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Try immediately — session may already be in storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { router.replace("/dashboard"); return; }
    });

    // Otherwise wait for Supabase to parse the hash and fire the event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        subscription.unsubscribe();
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return <div className="min-h-screen bg-[#09090b]" />;
}
