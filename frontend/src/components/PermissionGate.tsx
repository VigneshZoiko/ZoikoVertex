"use client";

import { ReactNode } from "react";

interface PermissionGateProps {
  allowedRoles: string[];
  userRole: string | null;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGate({
  allowedRoles,
  userRole,
  children,
  fallback = null,
}: PermissionGateProps) {
  if (!userRole) return <>{fallback}</>;
  const normalized = userRole.toUpperCase();
  if (normalized === "ADMIN" || normalized === "WORKSPACE_OWNER" || normalized === "SUPERADMIN") {
    return <>{children}</>;
  }
  if (allowedRoles.map((r) => r.toUpperCase()).includes(normalized)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
