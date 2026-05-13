"use client";

import { useEffect, useState } from "react";
import { Search, Bell, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email ?? "");
          
          // Fetch full_name from public.users
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          
          if (userData?.full_name) {
            setFullName(userData.full_name);
          }
        }
      } catch (err) {
        console.warn("Header user fetch failed:", err);
      }
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


        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[var(--header-bg)]" />
        </button>

        {/* User profile */}
        <a 
          href="/profile"
          className="flex items-center pl-4 border-l border-[var(--border)] hover:opacity-80 transition-opacity group"
        >
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">{email || "Loading..."}</p>
            <p className="text-xs text-[var(--foreground-muted)]">{fullName || "Authenticated Session"}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 border-2 border-transparent group-hover:border-indigo-500/50 transition-all overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold uppercase">
              {fullName ? fullName.split(' ').map(n => n[0]).join('') : "U"}
            </div>
          </div>
        </a>
      </div>
    </header>
  );
}
