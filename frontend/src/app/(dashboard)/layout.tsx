"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PendingApproval from "@/components/PendingApproval";
import SuspendedOverlay from "@/components/SuspendedOverlay";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { useRoleContext } from "@/lib/context/RoleContext";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { canAccess } from "@/lib/routeAccess";
import { type Plan, type Feature, PLAN_DISPLAY, PLAN_BADGE_COLOR, FEATURE_UPGRADE_REASON, FEATURE_MIN_PLAN } from "@/lib/planFeatures";
import { ShieldOff, ArrowLeft, Lock, ArrowRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router   = useRouter();
  const { orgStatus, workspaceStatus, orgName, planType, premiumPaidUntil, isSuperAdmin, isLoading, role, refresh } = useRoleContext();
  const [accessDenied, setAccessDenied] = useState<
    | { reason: 'role' }
    | { reason: 'plan'; requiredPlan: Plan; feature: Feature }
    | false
    | null
  >(null);
  const verifyingRef = useRef(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) router.replace('/login');
    });
    return () => { cancelled = true; };
  }, [pathname, router]);

  // ── No workspace → verify API before redirecting (guards against stale RoleContext) ─
  useEffect(() => {
    if (isLoading || isSuperAdmin || orgStatus !== 'NO_WORKSPACE') return;
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    api.get('/api/v1/user/context').then(res => {
      verifyingRef.current = false;
      if (res?.success && res.data?.workspace_id) {
        // Context was stale — refresh silently and stay on dashboard
        refresh();
      } else {
        router.replace('/onboarding');
      }
    }).catch(() => {
      verifyingRef.current = false;
      router.replace('/onboarding');
    });
  }, [isLoading, isSuperAdmin, orgStatus, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Role guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin && orgStatus === 'NO_WORKSPACE') return;
    if (role === null && !isSuperAdmin) return;
    const result = canAccess(pathname, role, isSuperAdmin, planType);
    setAccessDenied(result.allowed ? false : result);
  }, [pathname, isLoading, role, isSuperAdmin, orgStatus, planType]);

  // ── Silent wait — plain dark background, nothing visible to the user ───────
  if (isLoading || accessDenied === null) {
    return <div className="h-screen bg-[var(--background,#111111)]" />;
  }

  // ── Pending org approval ────────────────────────────────────────────────────
  if (!isSuperAdmin && orgStatus === "PENDING") {
    return <PendingApproval orgName={orgName ?? undefined} />;
  }

  // ── Suspended / restricted / deleted org gate ──────────────────────────────
  const isSupportRoute = pathname.startsWith('/support');
  const blockedStatuses = ['SUSPENDED', 'RESTRICTED', 'DELETED'];
  const isSuspended    = !isSuperAdmin && !isSupportRoute && (
    blockedStatuses.includes(workspaceStatus ?? '') || blockedStatuses.includes(orgStatus ?? '')
  );

  const resolvedStatus = blockedStatuses.find(s => s === workspaceStatus || s === orgStatus) ?? null;
  const suspensionType = resolvedStatus === 'DELETED' ? 'deleted' : 'paused' as const;

  return (
    <NotificationProvider>
      <DraftGuardProvider>
        <div className="bg-[var(--background)] text-[var(--foreground)] h-screen overflow-hidden flex transition-colors">
          <div className={`w-64 shrink-0 transition-all duration-500 ${isSuspended ? 'opacity-20 pointer-events-none select-none' : ''}`}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 h-screen">
            <Header />
            <main className="flex-1 overflow-hidden flex flex-col bg-[var(--background)] transition-colors">
              {isSuspended ? (
                <SuspendedOverlay orgName={orgName ?? undefined} type={suspensionType} planType={planType} premiumPaidUntil={premiumPaidUntil} />
              ) : accessDenied ? (
                accessDenied.reason === 'plan'
                  ? <PlanBlockView requiredPlan={accessDenied.requiredPlan} feature={accessDenied.feature} onBack={() => router.replace('/dashboard')} />
                  : <UnauthorizedView pathname={pathname} onBack={() => router.replace('/dashboard')} />
              ) : (
                <div
                  key={pathname}
                  className={`page-enter flex-1 ${pathname === '/inbox' ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}
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

function PlanBlockView({ requiredPlan, feature, onBack }: { requiredPlan: Plan; feature: Feature; onBack: () => void }) {
  const router = useRouter();
  const badgeClass = PLAN_BADGE_COLOR[requiredPlan];
  const reason = FEATURE_UPGRADE_REASON[feature];
  const minPlan = FEATURE_MIN_PLAN[feature];
  const displayName = PLAN_DISPLAY[minPlan];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 page-enter">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <Lock className="w-7 h-7 text-amber-400" />
      </div>
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-4 ${badgeClass}`}>
        {displayName}
      </span>
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight">Feature Locked</h1>
      <p className="text-[var(--foreground-muted)] text-sm max-w-sm leading-relaxed mb-8">{reason}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <button
          onClick={() => router.push('/admin/billing')}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-all duration-200"
        >
          View Plans
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function UnauthorizedView({ pathname, onBack }: { pathname: string; onBack: () => void }) {
  const section = pathname.split('/').filter(Boolean)[0];
  const label   = section ? section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, ' ') : 'this page';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 page-enter">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <ShieldOff className="w-7 h-7 text-rose-400" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-tight">Access Restricted</h1>
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
