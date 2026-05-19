"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface RoleContextType {
  role: string | null;
  orgStatus: string | null;
  orgName: string | null;
  fullName: string | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasRole: (allowedRoles: string[]) => boolean;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const CACHE_KEY = 'zv_role_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface RoleCache {
  role: string | null;
  orgStatus: string | null;
  orgName: string | null;
  fullName: string | null;
  isSuperAdmin: boolean;
  ts: number;
}

function readCache(): RoleCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: RoleCache = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: Omit<RoleCache, 'ts'>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const cached = readCache();

  const [role, setRole] = useState<string | null>(cached?.role ?? null);
  const [orgStatus, setOrgStatus] = useState<string | null>(cached?.orgStatus ?? null);
  const [orgName, setOrgName] = useState<string | null>(cached?.orgName ?? null);
  const [fullName, setFullName] = useState<string | null>(cached?.fullName ?? null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(cached?.isSuperAdmin ?? false);
  // If we have a valid cache, skip the loading skeleton entirely
  const [isLoading, setIsLoading] = useState(!cached);

  const fetchUserRole = async (background = false) => {
    try {
      if (!background) setIsLoading(true);

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      let nextRole: string | null = role;
      let nextIsSuperAdmin = isSuperAdmin;

      if (user?.email === 'developer@zoikogroup.com') {
        nextIsSuperAdmin = true;
        nextRole = "SUPERADMIN";
        setIsSuperAdmin(true);
        setRole("SUPERADMIN");
      }

      const result = await api.get("/api/v1/user/context");
      if (result.success) {
        if (result.data.role) { nextRole = result.data.role.toUpperCase(); setRole(nextRole); }
        if (result.data.org_status) setOrgStatus(result.data.org_status);
        if (result.data.org_name) setOrgName(result.data.org_name);
        if (result.data.full_name) setFullName(result.data.full_name);
        if (result.data.is_superadmin) { nextIsSuperAdmin = true; setIsSuperAdmin(true); }

        writeCache({
          role: nextRole,
          orgStatus: result.data.org_status ?? null,
          orgName: result.data.org_name ?? null,
          fullName: result.data.full_name ?? null,
          isSuperAdmin: nextIsSuperAdmin,
        });
      }
    } catch (err) {
      console.error("Failed to fetch user role context:", err);
      if (!background) clearCache();
    } finally {
      if (!background) setIsLoading(false);
    }
  };

  useEffect(() => {
    // If cache seeded state → fetch quietly in background; otherwise fetch normally
    fetchUserRole(!!cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    orgName,
    fullName,
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
