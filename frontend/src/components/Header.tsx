"use client";

import Link from "next/link";
import {
  Bell,
  ShieldCheck,
  Settings,
  FileText,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/components/NotificationPanel";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useRoleContext } from "@/lib/context/RoleContext";

export default function Header() {
  const { fullName, role, orgName, isSuperAdmin } = useRoleContext();

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

      {/* Right-side utilities */}
      <div className="flex-1 flex items-center justify-end gap-3">
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--info-bg)] border-[var(--info-border)] rounded-full text-[10px] font-bold text-[var(--info-text)] uppercase tracking-wider">
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
            <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
              {fullName || "User Profile"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] font-black uppercase tracking-wider">
              {formatRole(role || (isSuperAdmin ? 'SUPERADMIN' : ''))}-{orgName || 'ZoikoGroup'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[color-mix(in_srgb,var(--accent),black_60%)] shrink-0 border-2 border-transparent group-hover:border-[var(--accent)]/50 transition-all overflow-hidden shadow-lg flex items-center justify-center text-xs text-foreground font-bold uppercase">
            {fullName ? fullName.split(' ').map(n => n[0]).join('') : "U"}
          </div>
        </Link>
      </div>
    </header>
  );
}
