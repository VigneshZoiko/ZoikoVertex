"use client";

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

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
    try {
      if (!background) setIsLoading(true);

      // getSession() reads from localStorage — no network round-trip to Supabase Auth.
      // The backend's authenticate middleware still verifies the JWT server-side.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        setRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        clearCache();
        return;
      }

      let nextRole: string | null = null;
      let nextIsSuperAdmin = false;

      const result = await api.get("/api/v1/user/context");
      if (result.success) {
        setIsBackendOffline(false);
        if (result.data.role) { nextRole = result.data.role.toUpperCase(); setRole(nextRole); }
        if (result.data.org_status) setOrgStatus(result.data.org_status);
        if (result.data.workspace_status) setWorkspaceStatus(result.data.workspace_status);
        if (result.data.org_name) setOrgName(result.data.org_name);
        if (result.data.full_name) setFullName(result.data.full_name);
        if (result.data.plan_type) setPlanType(result.data.plan_type);
        if (result.data.premium_paid_until !== undefined) setPremiumPaidUntil(result.data.premium_paid_until);
        if (result.data.is_superadmin) { nextIsSuperAdmin = true; setIsSuperAdmin(true); }

        workspaceIdRef.current = result.data.workspace_id || null;

        writeCache({
          role: nextRole,
          orgStatus: result.data.org_status ?? null,
          workspaceStatus: result.data.workspace_status ?? null,
          orgName: result.data.org_name ?? null,
          fullName: result.data.full_name ?? null,
          planType: result.data.plan_type ?? null,
          premiumPaidUntil: result.data.premium_paid_until ?? null,
          isSuperAdmin: nextIsSuperAdmin,
        });
      } else if (result.data?.code === 'ORG_DELETED') {
        clearCache();
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?error=org_deleted';
        }
        return;
      }
    } catch (err) {
      console.error("Failed to fetch user role context:", err);
      setIsBackendOffline(true);
      if (!background) clearCache();
    } finally {
      if (!background) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCache();
    fetchUserRole(!!cached);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // SIGNED_IN fires once after login — always refresh to pick up the new session
        fetchUserRole(true);
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
