import { getPermissionsForRole } from './rolePermissions';

export interface AuthContext {
  userId: string;
  workspaceId: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export function buildAuthContext(reqUser: {
  id: string;
  role?: string | null;
  workspace_id?: string | null;
  is_superadmin?: boolean;
  [key: string]: unknown;
} | undefined): AuthContext {
  const role = (reqUser?.role || 'VIEWER').toUpperCase();
  return {
    userId: reqUser?.id || '',
    workspaceId: reqUser?.workspace_id || '',
    role,
    isSuperAdmin: reqUser?.is_superadmin || false,
    permissions: getPermissionsForRole(role),
  };
}

export function requireAnyPermission(auth: AuthContext | undefined, ...permissions: string[]): void {
  if (!auth) return;
  if (auth.isSuperAdmin) return;
  const hasAny = permissions.some((p) => auth.permissions.includes(p));
  if (!hasAny && !auth.permissions.includes('*')) {
    const err = new Error(`Forbidden: requires one of — ${permissions.join(', ')}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

export function requireAllPermissions(auth: AuthContext | undefined, ...permissions: string[]): void {
  if (!auth) return;
  if (auth.isSuperAdmin) return;
  const hasAll = permissions.every((p) => auth.permissions.includes(p));
  if (!hasAll && !auth.permissions.includes('*')) {
    const err = new Error(`Forbidden: requires all of — ${permissions.join(', ')}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

export function requireRole(auth: AuthContext | undefined, ...roles: string[]): void {
  if (!auth) return;
  if (auth.isSuperAdmin) return;
  const normalized = roles.map((r) => r.toUpperCase());
  if (!normalized.includes(auth.role)) {
    const err = new Error(`Forbidden: requires one of roles — ${roles.join(', ')}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

export function requireOwnershipOrRole(auth: AuthContext | undefined, ownerId: string, ...roles: string[]): void {
  if (!auth) return;
  if (auth.isSuperAdmin) return;
  if (auth.userId === ownerId) return;
  requireRole(auth, ...roles);
}
