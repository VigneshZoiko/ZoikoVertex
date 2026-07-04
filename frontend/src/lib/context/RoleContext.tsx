"use client";

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import { api } from "@/lib/api";
import { supabase, isSupabaseReady } from "@/lib/supabase";

interface RoleContextType {
  role: string | null;
  orgStatus: string | null;
  workspaceStatus: string | null;
  orgName: string | null;
  fullName: string | null;
  planType: string | null;
  premiumPaidUntil: string | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isBackendOffline: boolean;
  hasRole: (allowedRoles: string[]) => boolean;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const CACHE_KEY = 'zv_role_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_VERSION = 3;

interface RoleCache {
  role: string | null;
  orgStatus: string | null;
  workspaceStatus: string | null;
  orgName: string | null;
  fullName: string | null;
  planType: string | null;
  premiumPaidUntil: string | null;
  isSuperAdmin: boolean;
  ts: number;
  v: number;
}

function readCache(): RoleCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: RoleCache = JSON.parse(raw);
    if (parsed.v !== CACHE_VERSION) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: Omit<RoleCache, 'ts' | 'v'>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, v: CACHE_VERSION, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

// useLayoutEffect causes SSR warnings; this silently falls back to useEffect on the server
// while keeping the before-paint timing on the client (avoids skeleton flash with valid cache)
const useClientLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [premiumPaidUntil, setPremiumPaidUntil] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const workspaceIdRef = useRef<string | null>(null);
  // Generation counter — incremented on every new fetch. Stale in-flight fetches
  // (e.g. from a previous user's session) are discarded when they resolve.
  const fetchGenRef = useRef(0);

  // Seed from localStorage before first paint — eliminates skeleton flash on revisit
  useClientLayoutEffect(() => {
    const cached = readCache();
    if (cached) {
      setRole(cached.role);
      setOrgStatus(cached.orgStatus);
      setWorkspaceStatus(cached.workspaceStatus);
      setOrgName(cached.orgName);
      setFullName(cached.fullName);
      setPlanType(cached.planType ?? null);
      setPremiumPaidUntil(cached.premiumPaidUntil ?? null);
      setIsSuperAdmin(cached.isSuperAdmin ?? false);
      setIsLoading(false);
    }
  }, []);

  const fetchUserRole = async (background = false) => {
    // Stamp this invocation. Any older in-flight call that resolves later will see
    // a mismatched generation and discard its result — prevents stale sessions from
    // overwriting the freshly-logged-in user's role.
    const gen = ++fetchGenRef.current;

    try {
      if (!background) setIsLoading(true);

      if (!isSupabaseReady) {
        if (fetchGenRef.current !== gen) return;
        setRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      // getSession() reads from localStorage — no network round-trip to Supabase Auth.
      // The backend's authenticate middleware still verifies the JWT server-side.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        if (fetchGenRef.current !== gen) return;
        setRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        clearCache();
        return;
      }

      const result = await api.get("/api/v1/user/context");

      // Discard if a newer fetch has started (e.g. the previous user's TOKEN_REFRESHED
      // race arriving after the current user's SIGNED_IN fetch completed)
      if (fetchGenRef.current !== gen) return;

      if (result.success) {
        const d = result.data;
        const nextRole = d.role ? (d.role as string).toUpperCase() : null;
        const nextIsSuperAdmin = d.is_superadmin === true;

        setIsBackendOffline(false);
        // Always set ALL fields unconditionally so switching from a higher-privilege
        // account to a lower one never leaves stale truthy values in state.
        setRole(nextRole);
        setOrgStatus(d.org_status ?? null);
        setWorkspaceStatus(d.workspace_status ?? null);
        setOrgName(d.org_name ?? null);
        setFullName(d.full_name ?? null);
        setPlanType(d.plan_type ?? null);
        setPremiumPaidUntil(d.premium_paid_until ?? null);
        setIsSuperAdmin(nextIsSuperAdmin);

        workspaceIdRef.current = d.workspace_id || null;

        writeCache({
          role: nextRole,
          orgStatus: d.org_status ?? null,
          workspaceStatus: d.workspace_status ?? null,
          orgName: d.org_name ?? null,
          fullName: d.full_name ?? null,
          planType: d.plan_type ?? null,
          premiumPaidUntil: d.premium_paid_until ?? null,
          isSuperAdmin: nextIsSuperAdmin,
        });
      } else if (result.data?.code === 'ORG_DELETED') {
        clearCache();
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?error=org_deleted';
        }
        return;
      } else if (result.status === 401) {
        // Backend rejected the session token (expired, project paused, or network issue
        // between backend and Supabase). Sign out to clear stale state so the user can
        // log in again with a fresh token.
        clearCache();
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }
    } catch (err) {
      console.error("Failed to fetch user role context:", err);
      if (fetchGenRef.current === gen) {
        setIsBackendOffline(true);
        if (!background) clearCache();
      }
    } finally {
      if (fetchGenRef.current === gen && !background) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCache();
    fetchUserRole(!!cached);

    if (!isSupabaseReady) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Reset ALL state before fetching so stale role UI never flashes for a
        // different user. Show loading spinner until the new session resolves.
        clearCache();
        setRole(null);
        setIsSuperAdmin(false);
        setOrgStatus(null);
        setOrgName(null);
        setFullName(null);
        setPlanType(null);
        setPremiumPaidUntil(null);
        fetchUserRole(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // TOKEN_REFRESHED fires on tab re-focus / auto-renewal (up to once per hour).
        // Skip if the localStorage cache is still fresh — the user context hasn't changed.
        const cached = readCache();
        if (!cached) fetchUserRole(true);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setOrgStatus(null);
        setOrgName(null);
        setFullName(null);
        setPlanType(null);
        setPremiumPaidUntil(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        clearCache();
      }
    });

    // ── Realtime subscription: re-fetch when workspace/org status changes ──
    const statusChannel = supabase
      .channel('user-org-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workspaces' },
        (payload) => {
          const newWs = payload.new as { id: string; status?: string };
          if (workspaceIdRef.current && newWs.id === workspaceIdRef.current && newWs.status) {
            clearCache();
            fetchUserRole(true);
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(statusChannel);
    };
  }, []);

  const hasRole = (allowedRoles: string[]) => {
    if (isSuperAdmin) return true;
    if (!role) return false;
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'SUPERADMIN') return true;
    return allowedRoles.includes(normalizedRole);
  };

  const value = {
    role,
    orgStatus,
    workspaceStatus,
    orgName,
    fullName,
    planType,
    premiumPaidUntil,
    isSuperAdmin,
    isLoading,
    isBackendOffline,
    hasRole,
    refresh: () => fetchUserRole(false),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRoleContext() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRoleContext must be used within a RoleProvider");
  }
  return context;
}
