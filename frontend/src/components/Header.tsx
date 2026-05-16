"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useRoleContext } from "@/lib/context/RoleContext";

export default function Header() {
  const { fullName, role, orgName, isSuperAdmin } = useRoleContext();

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

  const formatRole = (r: string | null) => {
    if (!r) return 'Member';
    if (r === 'SUPERADMIN') return 'Super Admin';
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <header className="h-16 bg-[var(--header-bg)]/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm transition-colors">
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
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            SuperAdmin
          </div>
        )}

        <ThemeToggle />
        <NotificationPanel />

        {/* User profile */}
        <Link
          href="/profile"
          className="flex items-center pl-4 border-l border-[var(--border)] hover:opacity-80 transition-opacity group"
        >
          <div className="text-right mr-3 hidden md:block">
            <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
              {fullName || "User Profile"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-black uppercase tracking-wider">
              {formatRole(role || (isSuperAdmin ? 'SUPERADMIN' : ''))}-{orgName || 'ZoikoGroup'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 border-2 border-transparent group-hover:border-indigo-500/50 transition-all overflow-hidden shadow-lg flex items-center justify-center text-xs text-white font-bold uppercase">
            {fullName ? fullName.split(' ').map(n => n[0]).join('') : "U"}
          </div>
        </Link>
      </div>
    </header>
  );
}
