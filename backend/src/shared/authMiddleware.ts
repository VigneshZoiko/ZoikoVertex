import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "./supabase";
import { logger } from "./logger";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    user_metadata?: Record<string, unknown>;
    role?: string | null;
    workspace_id?: string | null;
    org_id?: string | null;
    workspace_plan?: string | null;
    workspace_status?: string | null;
    is_superadmin?: boolean;
    api_key_id?: string;
    api_key_scopes?: string[];
  };
  file?: Express.Multer.File;
}

// ─── Auth cache — avoids repeated Supabase DB calls for the same token ────────
// Multiple parallel requests from a single page load all share the same JWT;
// without this, each fires 3-4 Supabase queries. With it, only the first does.
interface AuthCacheEntry {
  user: AuthRequest["user"];
  expiresAt: number;
}
const _authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL_MS = 5_000; // 5 seconds

// Purge stale entries every minute to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _authCache) {
    if (entry.expiresAt < now) _authCache.delete(key);
  }
}, 60_000).unref();

function getCachedAuth(tokenHash: string): AuthRequest["user"] | null {
  const entry = _authCache.get(tokenHash);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { _authCache.delete(tokenHash); return null; }
  return entry.user;
}

function setCachedAuth(tokenHash: string, user: AuthRequest["user"]): void {
  _authCache.set(tokenHash, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

export function invalidateCachedAuth(tokenHash: string): void {
  _authCache.delete(tokenHash);
}

// Authenticate via a workspace API key (zv_live_* tokens)
async function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  token: string,
): Promise<boolean> {
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const { data: apiKey, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, workspace_id, scopes, is_active, expires_at, created_by")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !apiKey) {
    logger.warn("[Auth] API key not found");
    return false;
  }

  if (!apiKey.is_active) {
    res.status(401).json({ error: "Unauthorized: API key has been revoked" });
    return true; // handled
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    res.status(401).json({ error: "Unauthorized: API key has expired" });
    return true; // handled
  }

  // Update last_used_at (fire-and-forget)
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(undefined, () => {});

  // Look up workspace plan for rate limiting and plan-gating
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("plan_type, org_id")
    .eq("id", apiKey.workspace_id)
    .single();

  // Track org activity (fire-and-forget)
  if (workspace?.org_id) {
    supabaseAdmin
      .from("organizations")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", workspace.org_id)
      .then(undefined, () => {});
  }    req.user = {
      id: apiKey.created_by,
      workspace_id: apiKey.workspace_id,
      org_id: workspace?.org_id ?? null,
      workspace_plan: workspace?.plan_type ?? null,
      api_key_id: apiKey.id,
      api_key_scopes: apiKey.scopes,
    };

  next();
  return true; // handled
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // API key path — faster than a Supabase JWT roundtrip
    if (token.startsWith("zv_live_")) {
      const handled = await authenticateApiKey(req, res, next, token);
      if (handled) return;
      logger.warn("[Auth] Invalid API key presented");
      return res.status(401).json({ error: "Unauthorized: Invalid API key" });
    }

    // Cache hit — skip all DB queries for repeat requests within the TTL window
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const cached = getCachedAuth(tokenHash);
    if (cached) {
      req.user = cached;
      return next();
    }

    // Supabase JWT path
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, "[Auth] Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Fetch user flags and workspace membership in parallel.
    // Include workspace plan/status in the same JOIN to avoid a third sequential query.
    const [{ data: userData }, { data: member }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("is_superadmin, full_name")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, role, workspaces(plan_type, status, org_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const isSuperAdmin = userData?.is_superadmin || false;
    const userFullName = userData?.full_name || user.email?.split('@')[0] || '';
    const workspaceId =
      member?.workspace_id ||
      (isSuperAdmin ? "00000000-0000-0000-0000-000000000000" : null);

    const ws = member?.workspaces
      ? (Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces)
      : null;

    const workspacePlan = ws?.plan_type ?? (isSuperAdmin ? "ENTERPRISE" : null);
    const workspaceStatus = ws?.status ?? null;

    // Track org activity (fire-and-forget, no await)
    if (ws?.org_id) {
      supabaseAdmin
        .from("organizations")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", ws.org_id)
        .then(undefined, () => {});
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: userFullName,
      user_metadata: user.user_metadata as Record<string, unknown> | undefined,
      role: member?.role || null,
      workspace_id: workspaceId,
      org_id: ws?.org_id ?? null,
      workspace_plan: workspacePlan,
      workspace_status: workspaceStatus,
      is_superadmin: isSuperAdmin,
    };

    setCachedAuth(tokenHash, req.user);
    next();
  } catch (err) {
    next(err);
  }
};

export const provisionGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Service-to-service path: match against shared secret
    if (env.INTERNAL_SERVICE_SECRET) {
      try {
        const a = Buffer.from(token);
        const b = Buffer.from(env.INTERNAL_SERVICE_SECRET);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
      } catch { /* not a match */ }
    }

    // SUPERADMIN user path: validate JWT then check is_superadmin
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      logger.warn({ error }, "[Auth] Unauthorized provision attempt");
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = { id: user.id, email: user.email };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    // Superadmins can provision to any workspace
    if (!profileError && profile?.is_superadmin) {
      req.user.is_superadmin = true;
      return next();
    }

    // Use the same workspace lookup strategy as authenticate middleware (first row, limit 1)
    // then verify the user has ADMIN or WORKSPACE_OWNER role in that workspace
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role, workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return res
        .status(403)
        .json({ error: "Forbidden: No workspace membership found" });
    }

    if (!["ADMIN", "WORKSPACE_OWNER"].includes(membership.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin or Workspace Owner privileges required" });
    }

    req.user.workspace_id = membership.workspace_id;
    req.user.role = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

// Scope guard — only applies to API key requests; JWT dashboard users pass through freely
export function scopeGuard(...required: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.api_key_id) return next();
    const scopes = req.user.api_key_scopes || [];
    if (scopes.includes("*")) return next();
    if (required.some((s) => scopes.includes(s))) return next();
    return res.status(403).json({
      error: `Forbidden: API key requires scope — ${required.join(" or ")}`,
    });
  };
}
