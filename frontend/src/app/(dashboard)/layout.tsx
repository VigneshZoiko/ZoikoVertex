"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import PendingApproval from "@/components/PendingApproval";
import SuspendedOverlay from "@/components/SuspendedOverlay";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { useRoleContext } from "@/lib/context/RoleContext";
import { supabase } from "@/lib/supabase";
import { canAccess } from "@/lib/routeAccess";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { orgStatus, workspaceStatus, orgName, isSuperAdmin, isLoading, role } = useRoleContext();
  const [isUnauthorized, setIsUnauthorized] = useState<boolean | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  // Runs on every route change. getSession() reads from localStorage so it's
  // synchronous-fast. Redirects to /login if no valid session exists.
  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error || !session) {
          // Error means stale/invalid refresh token — sign out and go to login
          if (error) {
            console.warn('[layout] Session error, signing out:', error.message);
            try { await supabase.auth.signOut(); } catch { /* best effort */ }
          }
          router.replace('/login');
        }
      } catch (err: any) {
        if (cancelled) return;
        // AuthApiError: Refresh Token Not Found — clear and redirect
        console.warn('[layout] Auth exception, redirecting to login:', err?.message);
        try { await supabase.auth.signOut(); } catch { /* best effort */ }
        router.replace('/login');
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, [pathname, router]);

  // ── Role guard ──────────────────────────────────────────────────────────────
  // Waits for the role to load, then checks if this pathname is allowed.
  // If role is still null after loading (cache miss / background refresh pending),
  // defer the check — the auth guard handles unauthenticated users via redirect.
  useEffect(() => {
    if (isLoading) return;
    if (role === null && !isSuperAdmin) return;
    setIsUnauthorized(!canAccess(pathname, role, isSuperAdmin));
  }, [pathname, isLoading, role, isSuperAdmin]);

  // ── Loading skeleton (initial role fetch + auth check) ──────────────────────
  if (isLoading || isUnauthorized === null) {
    return (
      <div className="h-screen bg-[var(--background,#111111)] flex overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-64 shrink-0 bg-[var(--sidebar-bg,#1a1a1a)] border-r border-[var(--sidebar-border,#2a2a2a)] flex flex-col">
          <div className="px-4 pt-5 pb-4 border-b border-[var(--sidebar-border,#2a2a2a)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sidebar-hover,#222)] animate-pulse" />
              <div className="h-5 w-28 rounded bg-[var(--sidebar-hover,#222)] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 py-4 px-3 space-y-2">
            {[80, 60, 72, 64, 56, 68].map((w, i) => (
              <div key={i} className="h-9 rounded-lg bg-[var(--sidebar-hover,#222)] animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-[var(--border,#2a2a2a)] bg-[var(--header-bg,#111)] px-8 flex items-center justify-between shrink-0">
            <div className="h-8 w-80 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--surface,#1a1a1a)] animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-[var(--surface,#1a1a1a)] animate-pulse" />
              <div className="h-8 w-32 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 p-8 space-y-4">
            <div className="h-8 w-48 rounded-lg bg-[var(--surface,#1a1a1a)] animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 rounded-2xl bg-[var(--surface,#1a1a1a)] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-[var(--surface,#1a1a1a)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Pending org approval gate ────────────────────────────────────────────────
  if (!isSuperAdmin && orgStatus === "PENDING") {
    return <PendingApproval orgName={orgName ?? undefined} />;
  }

  // ── Suspended/deleted org gate ──────────────────────────────────────────────
  const isSupportRoute = pathname.startsWith('/support');
  const isSuspended = !isSuperAdmin && !isSupportRoute && (workspaceStatus === "SUSPENDED" || orgStatus === "SUSPENDED");
  const isDeleted = !isSuperAdmin && !isSupportRoute && orgStatus === "NO_WORKSPACE" && !isLoading;
  const showSuspension = isSuspended || isDeleted;
  const suspensionType = isSuspended ? 'paused' as const : 'deleted' as const;

  return (
    <NotificationProvider>
      <DraftGuardProvider>
        <WelcomeOverlay />
        <div className="bg-[var(--background)] text-[var(--foreground)] h-screen overflow-hidden flex transition-colors">
          <div className={`w-64 shrink-0 transition-all duration-500 ${showSuspension ? 'opacity-20 pointer-events-none select-none' : ''}`}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 h-screen">
            <Header />
            <main className="flex-1 overflow-hidden flex flex-col bg-[var(--background)] transition-colors">
              {showSuspension ? (
                <SuspendedOverlay orgName={orgName ?? undefined} type={suspensionType} />
              ) : isUnauthorized ? (
                <UnauthorizedView pathname={pathname} onBack={() => router.replace('/dashboard')} />
              ) : (
                <div
                  key={pathname}
                  className={`page-enter flex-1 ${
                    pathname === '/inbox'
                      ? 'overflow-hidden'
                      : 'overflow-y-auto p-8'
                  }`}
                >
                  {children}
                </div>
              )}
            </main>
          </div>
        </div>
      </DraftGuardProvider>
    </NotificationProvider>
  );
}

// ── Inline 403 component ─────────────────────────────────────────────────────
function UnauthorizedView({ pathname, onBack }: { pathname: string; onBack: () => void }) {
  // Derive a readable section name from the first path segment
  const section = pathname.split('/').filter(Boolean)[0];
  const label = section
    ? section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, ' ')
    : 'this page';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 page-enter">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <ShieldOff className="w-7 h-7 text-rose-400" />
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight">
        Access Restricted
      </h1>
      <p className="text-[var(--foreground-muted)] text-sm max-w-sm leading-relaxed mb-8">
        Your current role does not have permission to view{' '}
        <span className="text-[var(--foreground)] font-semibold">{label}</span>.
        Contact your workspace administrator if you need access.
      </p>

      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
    </div>
  );
}
