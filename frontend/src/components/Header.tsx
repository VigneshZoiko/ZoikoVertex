"use client";

import { useEffect, useState } from "react";
import { Search, Bell, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? "");
    };
    fetchUser();
  }, []);

  return (
    <header className="h-16 bg-[var(--header-bg)] border-b border-[var(--border)] flex items-center justify-between px-8 z-10 sticky top-0">
      {/* Search */}
      <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 w-96 transition-colors">
        <Search className="w-4 h-4 text-[var(--foreground-muted)] mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search workspace..."
          className="bg-transparent border-none outline-none text-sm text-[var(--foreground)] w-full placeholder:text-[var(--foreground-muted)]"
        />
      </div>

      {/* Right-side utilities */}
      <div className="flex items-center gap-3">
        {/* System Secure Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">System Secure</span>
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[var(--header-bg)]" />
        </button>

        {/* User profile */}
        <div className="flex items-center pl-4 border-l border-[var(--border)]">
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-medium text-[var(--foreground)]">{email || "Loading..."}</p>
            <p className="text-xs text-[var(--foreground-muted)]">Authenticated Session</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0" />
        </div>
      </div>
    </header>
  );
}
