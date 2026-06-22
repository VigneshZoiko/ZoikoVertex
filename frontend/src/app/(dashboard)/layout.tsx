"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ChatbotWidget from "@/components/ChatbotWidget";
import PendingApproval from "@/components/PendingApproval";
import SuspendedOverlay from "@/components/SuspendedOverlay";
import { DraftGuardProvider } from "@/lib/context/DraftGuardContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { useRoleContext } from "@/lib/context/RoleContext";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { canAccess } from "@/lib/routeAccess";
import { type Plan, type Feature, PLAN_DISPLAY, PLAN_BADGE_COLOR, FEATURE_UPGRADE_REASON, FEATURE_MIN_PLAN } from "@/lib/planFeatures";
import { useSidebarCollapse } from "@/lib/hooks/useSidebarCollapse";
import { ShieldOff, ArrowLeft, Lock, ArrowRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router   = useRouter();
  const { orgStatus, workspaceStatus, orgName, planType, premiumPaidUntil, isSuperAdmin, isLoading, role, refresh } = useRoleContext();
  const { enabled: sidebarCollapseEnabled } = useSidebarCollapse();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState<
    | { reason: 'role' }
    | { reason: 'plan'; requiredPlan: Plan; feature: Feature }
    | false
    | null
  >(null);
  const verifyingRef    = useRef(false);
  const emailRetriedRef = useRef(false);

  // ── Auth guard — runs once on mount; RoleContext handles per-nav auth state ──
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) router.replace('/login');
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Super Admin redirect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!pathname.startsWith('/superadmin')) {
      router.replace('/superadmin/analytics');
    }
  }, [isSuperAdmin, pathname, router]);

  // ── No workspace → verify API before redirecting (guards against stale RoleContext) ─
  // Email-signup users always have a workspace created at signup time. If the API
  // returns NO_WORKSPACE for them, it's likely a transient cache/timing issue — retry
  // once before sending them to onboarding. SSO first-time users redirect immediately.
  useEffect(() => {
    if (isLoading || isSuperAdmin || orgStatus !== 'NO_WORKSPACE') return;
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    const doCheck = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const provider = session?.user?.app_metadata?.provider;
        const res = await api.get('/api/v1/user/context');
        verifyingRef.current = false;

        if (res?.success && res.data?.workspace_id) {
          // Stale RoleContext — workspace exists, refresh and stay on dashboard
          refresh();
        } else if (provider === 'email' && !emailRetriedRef.current) {
          // Email-signup users always have a workspace. First miss may be a race condition
          // (auth cache hasn't reflected the new membership yet). Retry once via full refresh.
          emailRetriedRef.current = true;
          refresh();
        } else {
          // SSO user with no workspace, or email user whose workspace genuinely wasn't created
          router.replace('/onboarding');
        }
      } catch {
        verifyingRef.current = false;
        router.replace('/onboarding');
      }
    };

    doCheck();
  }, [isLoading, isSuperAdmin, orgStatus, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Role guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin && orgStatus === 'NO_WORKSPACE') return;
    if (role === null && !isSuperAdmin) {
      // Loading finished but no role resolved (auth failure, backend unreachable, etc.).
      // Unblock the skeleton so the auth guard can redirect to /login; don't show content.
      setAccessDenied(false);
      return;
    }
    const result = canAccess(pathname, role, isSuperAdmin, planType);
    setAccessDenied(result.allowed ? false : result);
  }, [pathname, isLoading, role, isSuperAdmin, orgStatus, planType]);

  // ── Loading skeleton — mimics sidebar + header + content so transition feels instant ──
  if (isLoading || accessDenied === null) {
    return (
      <div className="h-full bg-[var(--background,#111111)] flex overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-64 shrink-0 border-r border-white/5 flex flex-col gap-3 p-4">
          <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse mb-4" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
          <div className="mt-auto flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header skeleton */}
          <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 shrink-0">
            <div className="h-5 w-40 rounded-md bg-white/5 animate-pulse" />
            <div className="ml-auto flex gap-3">
              <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
            <div className="h-8 w-56 rounded-lg bg-white/5 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
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
  const suspensionType = resolvedStatus === 'DELETED' ? 'deleted' : resolvedStatus === 'RESTRICTED' ? 'banned' : 'paused' as const;

  return (
    <NotificationProvider>
      <DraftGuardProvider>
        <div className="bg-[var(--background)] text-[var(--foreground)] h-screen overflow-hidden flex transition-colors relative">
          {/* Mobile backdrop */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar wrapper — overlay on mobile, inline on desktop */}
          <div className={`
            fixed md:static inset-y-0 left-0 z-50 md:z-30
            shrink-0 transition-transform duration-300 ease-in-out
            w-64
            ${sidebarCollapseEnabled ? 'md:w-16' : 'md:w-64'}
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isSuspended ? 'opacity-20 pointer-events-none select-none' : ''}
          `}>
            <Sidebar onMobileClose={() => setMobileSidebarOpen(false)} />
          </div>

          <div className="flex-1 flex flex-col min-w-0 h-full">
            <Header onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} />
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
                  className={`page-enter flex-1 ${
                    pathname === '/inbox' || pathname?.startsWith('/campaigns') || pathname?.startsWith('/campaigns/')
                      ? 'overflow-hidden'
                      : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
                  }`}
                >
                  {children}
                </div>
              )}
            </main>
          </div>
        </div>
      <ChatbotWidget />
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
      <div className="w-16 h-16 rounded-2xl bg-warning-text/10 border border-warning-border/20 flex items-center justify-center mb-6">
        <Lock className="w-7 h-7 text-warning-text" />
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
          className="flex items-center gap-2 px-5 py-2.5 bg-warning-text hover:bg-warning-text text-black rounded-xl text-sm font-bold transition-all duration-200"
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
      <div className="w-16 h-16 rounded-2xl bg-error-text/10 border border-error-border/20 flex items-center justify-center mb-6">
        <ShieldOff className="w-7 h-7 text-error-text" />
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
