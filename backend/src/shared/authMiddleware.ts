import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "./supabase";
import { logger } from "./logger";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string | null;
    workspace_id?: string | null;
    workspace_plan?: string | null;
    workspace_status?: string | null;
    is_superadmin?: boolean;
    api_key_id?: string;
    api_key_scopes?: string[];
  };
  file?: Express.Multer.File;
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
    .then(() => {});

  // Look up workspace plan for rate limiting and plan-gating
  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("plan_type")
    .eq("id", apiKey.workspace_id)
    .single();

  req.user = {
    id: apiKey.created_by,
    workspace_id: apiKey.workspace_id,
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

    // Supabase JWT path
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, "[Auth] Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const [{ data: userData }, { data: member }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("is_superadmin")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    const isSuperAdmin = userData?.is_superadmin || false;
    const workspaceId =
      member?.workspace_id ||
      (isSuperAdmin ? "00000000-0000-0000-0000-000000000000" : null);

    let workspacePlan: string | null = null;
    let workspaceStatus: string | null = null;
    if (member?.workspace_id) {
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("plan_type, status")
        .eq("id", member.workspace_id)
        .single();

      workspacePlan = ws?.plan_type ?? null;
      workspaceStatus = ws?.status ?? null;
    } else if (isSuperAdmin) {
      workspacePlan = "ENTERPRISE";
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: member?.role || null,
      workspace_id: workspaceId,
      workspace_plan: workspacePlan,
      workspace_status: workspaceStatus,
      is_superadmin: isSuperAdmin,
    };

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
    if (env.INTERNAL_SERVICE_SECRET && token === env.INTERNAL_SERVICE_SECRET) {
      return next();
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

    if (profileError || !profile?.is_superadmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: SuperAdmin privileges required" });
    }

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
