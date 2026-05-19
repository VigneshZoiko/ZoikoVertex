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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async () => {
    try {
      setIsLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        setRole(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      if (user.email === 'developer@zoikogroup.com') {
        setIsSuperAdmin(true);
        setRole("SUPERADMIN");
      }

      const result = await api.get("/api/v1/user/context");
      if (result.success) {
        if (result.data.role) setRole(result.data.role.toUpperCase());
        if (result.data.org_status) setOrgStatus(result.data.org_status);
        if (result.data.org_name) setOrgName(result.data.org_name);
        if (result.data.full_name) setFullName(result.data.full_name);
        if (result.data.is_superadmin) setIsSuperAdmin(true);
      }
    } catch (err) {
      console.error("Failed to fetch user role context:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setOrgStatus(null);
        setOrgName(null);
        setFullName(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
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
    orgName,
    fullName,
    isSuperAdmin,
    isLoading,
    hasRole,
    refresh: fetchUserRole
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
