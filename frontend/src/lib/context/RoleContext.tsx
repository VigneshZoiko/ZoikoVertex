"use client";

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from "react";
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
  hasRole: (allowedRoles: string[]) => boolean;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const CACHE_KEY = 'zv_role_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_VERSION = 2;

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

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        setRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        clearCache();
        return;
      }

      let nextRole: string | null = null;
      let nextIsSuperAdmin = false;

      if (user.email === 'developer@zoikogroup.com') {
        nextIsSuperAdmin = true;
        nextRole = "SUPERADMIN";
        setIsSuperAdmin(true);
        setRole("SUPERADMIN");
      }

      const result = await api.get("/api/v1/user/context");
      if (result.success) {
        if (result.data.role) { nextRole = result.data.role.toUpperCase(); setRole(nextRole); }
        if (result.data.org_status) setOrgStatus(result.data.org_status);
        if (result.data.workspace_status) setWorkspaceStatus(result.data.workspace_status);
        if (result.data.org_name) setOrgName(result.data.org_name);
        if (result.data.full_name) setFullName(result.data.full_name);
        if (result.data.plan_type) setPlanType(result.data.plan_type);
        if (result.data.premium_paid_until !== undefined) setPremiumPaidUntil(result.data.premium_paid_until);
        if (result.data.is_superadmin) { nextIsSuperAdmin = true; setIsSuperAdmin(true); }

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
      if (!background) clearCache();
    } finally {
      if (!background) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCache();
    fetchUserRole(!!cached);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Always background — these fire on tab focus/token refresh, never block the UI
        fetchUserRole(true);
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

    return () => { subscription.unsubscribe(); };
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
