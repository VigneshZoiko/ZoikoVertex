import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { PLAN_LIMITS } from '../../shared/planLimits';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const fullKey = `zv_live_${raw}`;
  const prefix = fullKey.slice(0, 16);
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hash };
}

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

function signPayload(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makeError(message: string, statusCode: number): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

// Block requests to private/loopback addresses to prevent SSRF
function isPrivateUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }

  const host = parsed.hostname.toLowerCase();

  // Block non-HTTP(S) schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) return true;

  // Localhost by name
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;

  // IPv6 loopback / link-local / ULA
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fd')) return true;

  // Strip IPv6 brackets for numeric checks
  const ip = host.startsWith('[') ? host.slice(1, -1) : host;

  // IPv4 private/loopback ranges
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 127) return true;                              // 127.0.0.0/8  loopback
    if (a === 10) return true;                               // 10.0.0.0/8   private
    if (a === 172 && b >= 16 && b <= 31) return true;       // 172.16-31/12 private
    if (a === 192 && b === 168) return true;                 // 192.168.0.0/16 private
    if (a === 169 && b === 254) return true;                 // 169.254.0.0/16 link-local (AWS metadata)
    if (a === 0) return true;                                // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true;      // 100.64-127/10 shared address
  }

  return false;
}

// Fire-and-forget webhook delivery; records result in delivery log
async function deliverWebhook(
  endpointId: string,
  endpointUrl: string,
  secret: string,
  eventType: string,
  payload: object,
): Promise<void> {
  const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });
  const sig = signPayload(secret, body);
  const start = Date.now();

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let status: 'success' | 'failed' = 'failed';

  try {
    await new Promise<void>((resolve, reject) => {
      const url = new URL(endpointUrl);
      const lib = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-ZV-Signature': `sha256=${sig}`,
          'X-ZV-Event': eventType,
          'User-Agent': 'ZoikoVertex-Webhooks/1.0',
        },
        timeout: 10000,
      };
      const req = lib.request(options, (res) => {
        responseStatus = res.statusCode ?? null;
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          responseBody = data.slice(0, 500);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            status = 'success';
          }
          resolve();
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });
  } catch (err) {
    logger.warn({ endpointId, eventType, err }, '[webhook] delivery failed');
  }

  const duration = Date.now() - start;

  await supabaseAdmin.from('webhook_delivery_log').insert({
    webhook_endpoint_id: endpointId,
    event_type: eventType,
    payload,
    status,
    response_status: responseStatus,
    response_body: responseBody,
    duration_ms: duration,
  });

  if (status === 'failed') {
    const { data: current } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('failure_count')
      .eq('id', endpointId)
      .single();
    await supabaseAdmin
      .from('webhook_endpoints')
      .update({ failure_count: (current?.failure_count ?? 0) + 1 })
      .eq('id', endpointId);
  } else {
    await supabaseAdmin
      .from('webhook_endpoints')
      .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
      .eq('id', endpointId);
  }
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export const listApiKeys = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, scopes, is_active, last_used_at, created_at, expires_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const createApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return next(makeError('No workspace context', 403));

    const { name, scopes = ['read:content'], expires_at } = req.body;
    if (!name?.trim()) return next(makeError('Key name is required', 400));

    const plan   = (req.user?.workspace_plan ?? 'FREE').toUpperCase();
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

    if (limits.maxKeys === 0) {
      return next(makeError('API keys require Growth plan or higher', 403));
    }

    if (scopes.includes('*') && !limits.allowWildcard) {
      return next(makeError('Wildcard scope (*) requires Enterprise plan', 403));
    }

    if (limits.maxKeys > 0) {
      const { count } = await supabaseAdmin
        .from('api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);
      if ((count ?? 0) >= limits.maxKeys) {
        return next(makeError(
          `Plan limit reached: your ${plan.toLowerCase()} plan allows ${limits.maxKeys} active API keys`,
          403,
        ));
      }
    }

    const { fullKey, prefix, hash } = generateApiKey();

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hash,
        scopes,
        created_by: userId,
        expires_at: expires_at || null,
      })
      .select('id, name, key_prefix, scopes, is_active, created_at, expires_at')
      .single();

    if (error) throw error;

    // Return full key only on creation — never retrievable again
    res.status(201).json({ success: true, data: { ...data, full_key: fullKey } });
  } catch (err) {
    next(err);
  }
};

export const revokeApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const actorId = req.user?.id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    // Fetch key details before revoking for the ledger record
    const { data: keyData } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, prefix, created_at, created_by')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Record in Identity Ledger
    if (actorId && keyData) {
      const now = new Date().toISOString();
      const ledgerEntryId = `IDL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      Promise.resolve(supabaseAdmin.from('identity_ledger_entries').insert({
        ledger_entry_id: ledgerEntryId,
        tenant_id: workspaceId,
        workspace_id: workspaceId,
        data_residency: 'auto',
        schema_version: '1.0',
        entry_type: 'api_key.revoked',
        entry_category: 'access_change',
        timestamp_utc: now,
        actor_id: actorId,
        actor_type: 'human_user',
        source: { source_system: 'api_key_management', action: 'revoke_api_key', api_key_id: id },
        authority_change: {
          change: 'api_key_revoked',
          key_name: keyData.name || keyData.prefix,
          key_prefix: keyData.prefix,
          originally_created_by: keyData.created_by,
        },
        session_context: {},
        approvals: [],
        linked_authority_snapshot_id: null,
        risk: { risk_level: 'medium' },
        retention: { class: 'STANDARD' },
      })).catch((err: Error) => logger.error({ err }, '[IdentityLedger] Failed to record api_key.revoked'));
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

export const listWebhooks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('id, name, url, events, is_active, created_at, last_triggered_at, failure_count')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const createWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return next(makeError('No workspace context', 403));

    const { name, url, events = [] } = req.body;
    if (!name?.trim()) return next(makeError('Webhook name is required', 400));
    if (!url?.trim()) return next(makeError('Webhook URL is required', 400));
    try { new URL(url); } catch { return next(makeError('Invalid webhook URL', 400)); }
    if (isPrivateUrl(url)) return next(makeError('Webhook URL must be a public HTTPS endpoint', 400));
    if (!Array.isArray(events) || events.length === 0) return next(makeError('At least one event is required', 400));

    const plan   = (req.user?.workspace_plan ?? 'FREE').toUpperCase();
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

    if (limits.maxWebhooks === 0) {
      return next(makeError('Webhooks require Growth plan or higher', 403));
    }

    if (limits.maxWebhooks > 0) {
      const { count } = await supabaseAdmin
        .from('webhook_endpoints')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);
      if ((count ?? 0) >= limits.maxWebhooks) {
        return next(makeError(
          `Plan limit reached: your ${plan.toLowerCase()} plan allows ${limits.maxWebhooks} active webhooks`,
          403,
        ));
      }
    }

    const secret = generateWebhookSecret();

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        url: url.trim(),
        secret,
        events,
        created_by: userId,
      })
      .select('id, name, url, events, is_active, created_at, last_triggered_at, failure_count')
      .single();

    if (error) throw error;

    // Return secret only on creation
    res.status(201).json({ success: true, data: { ...data, secret } });
  } catch (err) {
    next(err);
  }
};

export const updateWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;
    const { name, url, events, is_active } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (url !== undefined) {
      try { new URL(url); } catch { return next(makeError('Invalid webhook URL', 400)); }
      if (isPrivateUrl(url)) return next(makeError('Webhook URL must be a public HTTPS endpoint', 400));
      updates.url = url.trim();
    }
    if (events !== undefined) updates.events = events;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id, name, url, events, is_active, created_at, last_triggered_at, failure_count')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const testWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    const { data: endpoint, error } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('id, url, secret, is_active')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !endpoint) return next(makeError('Webhook not found', 404));
    if (!endpoint.is_active) return next(makeError('Webhook is disabled', 400));

    // Deliver test event (fire-and-forget, but we await it to return the result)
    await deliverWebhook(
      endpoint.id,
      endpoint.url,
      endpoint.secret,
      'test.ping',
      { message: 'ZoikoVertex webhook test ping', workspace_id: workspaceId },
    );

    // Fetch the delivery log entry we just created
    const { data: log } = await supabaseAdmin
      .from('webhook_delivery_log')
      .select('status, response_status, duration_ms')
      .eq('webhook_endpoint_id', id)
      .eq('event_type', 'test.ping')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

export const getDeliveryLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return next(makeError('No workspace context', 403));

    const { id } = req.params;

    // Verify endpoint belongs to workspace
    const { data: endpoint, error: epErr } = await supabaseAdmin
      .from('webhook_endpoints')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (epErr || !endpoint) return next(makeError('Webhook not found', 404));

    const { data, error } = await supabaseAdmin
      .from('webhook_delivery_log')
      .select('id, event_type, status, response_status, duration_ms, created_at')
      .eq('webhook_endpoint_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

// ─── Broadcast (called internally when platform events occur) ─────────────────

export async function broadcastWebhookEvent(
  workspaceId: string,
  eventType: string,
  payload: object,
): Promise<void> {
  const { data: endpoints } = await supabaseAdmin
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .contains('events', [eventType]);

  if (!endpoints || endpoints.length === 0) return;

  await Promise.allSettled(
    endpoints.map((ep: { id: string; url: string; secret: string }) =>
      deliverWebhook(ep.id, ep.url, ep.secret, eventType, payload),
    ),
  );
}
