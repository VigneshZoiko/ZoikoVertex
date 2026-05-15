"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";
import Breadcrumbs from "@/components/Breadcrumbs";

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

  // Global Keyboard Shortcut for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 bg-[var(--header-bg)]/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm">
      {/* Left side: Breadcrumbs */}
      <div className="flex-1 hidden md:block">
        <Breadcrumbs />
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center">
        <div className="relative group w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[var(--foreground-muted)] group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            id="global-search"
            type="text"
            placeholder="Search workspace..."
            className="block w-full pl-10 pr-12 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm group-hover:border-[var(--foreground-muted)]"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block border border-[var(--border)] rounded bg-[var(--background)] px-1.5 text-[10px] font-mono text-[var(--foreground-muted)] font-bold shadow-sm">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right-side utilities */}
      <div className="flex-1 flex items-center justify-end gap-3">


        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationPanel />

        {/* User profile */}
        <Link
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
        </Link>
      </div>
    </header>
  );
}

