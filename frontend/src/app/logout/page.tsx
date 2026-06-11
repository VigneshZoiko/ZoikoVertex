"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      document.cookie = "zv_auth=; path=/; SameSite=Lax; max-age=0";
      try { localStorage.removeItem("zv_role_cache"); } catch {}
      router.replace("/login");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
      <p className="text-white/40 text-sm">Signing out&hellip;</p>
    </div>
  );
}
