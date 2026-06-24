import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Response, Request } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v21.0';

function appSecretProof(token: string): string {
  if (!env.META_APP_SECRET) return '';
  return createHmac('sha256', env.META_APP_SECRET).update(token).digest('hex');
}

function sha256(val: string): string {
  return createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

function capiSecret(): string {
  return env.META_APP_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || 'zoiko-capi-fallback-secret';
}

export function generateCapiKey(workspaceId: string, pixelId: string): string {
  const hmac = createHmac('sha256', capiSecret())
    .update(`capi:${workspaceId}:${pixelId}`)
    .digest('hex');
  const wsB64 = Buffer.from(workspaceId).toString('base64url');
  return `${wsB64}.${hmac.substring(0, 40)}`;
}

function verifyCapiKey(key: string, pixelId: string): string | null {
  const dotIdx = key.indexOf('.');
  if (dotIdx < 4) return null;
  try {
    const workspaceId = Buffer.from(key.substring(0, dotIdx), 'base64url').toString('utf8');
    const expected = generateCapiKey(workspaceId, pixelId);
    if (expected.length !== key.length) return null;
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(key, 'utf8');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? workspaceId : null;
  } catch {
    return null;
  }
}

async function getTokenForWorkspace(workspaceId: string): Promise<string | null> {
  const { data: accs } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, refresh_token')
    .eq('workspace_id', workspaceId)
    .in('platform', ['facebook', 'instagram'])
    .order('created_at', { ascending: false })
    .limit(1);

  const acc = (accs as any)?.[0];
  if (!acc) return null;
  return (acc.refresh_token || acc.access_token) as string;
}

// ── GET /api/v1/campaigns/meta/pixels/:pixelId/capi/key ──────────────────────
// Returns the deterministic integration key for this workspace+pixel pair.
// Authenticated via JWT — only workspace members can retrieve it.

export const getCapiIntegrationKey = async (req: AuthRequest, res: Response): Promise<void> => {
  const pixelId     = req.params.pixelId as string;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !pixelId) { res.status(400).json({ error: 'Missing parameters' }); return; }

  const key = generateCapiKey(workspaceId, pixelId);

  // Mark this pixel as CAPI-configured for this workspace
  await supabaseAdmin
    .from('meta_pixel_capi')
    .upsert({ pixel_id: pixelId, workspace_id: workspaceId }, { onConflict: 'pixel_id,workspace_id' });

  res.json({ success: true, data: { integration_key: key, pixel_id: pixelId } });
};

// ── POST /api/v1/campaigns/meta/pixels/:pixelId/capi/test ────────────────────
// Sends a test PageView event to Meta to verify the integration is working.
// Authenticated via JWT.

export const testCapiEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const pixelId    = req.params.pixelId as string;
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId || !pixelId) { res.status(400).json({ error: 'Missing parameters' }); return; }

  try {
    const token = await getTokenForWorkspace(workspaceId);
    if (!token) { res.status(400).json({ error: 'No connected Meta account found for this workspace' }); return; }

    const { test_event_code } = req.body as { test_event_code?: string };
    const proof = appSecretProof(token);
    const testEvent = {
      event_name:       'PageView',
      event_time:       Math.floor(Date.now() / 1000),
      event_id:         `zoiko_test_${Date.now()}`,
      action_source:    'website',
      event_source_url: 'https://zoikovertex.com/capi-test',
      user_data: {
        client_ip_address: '0.0.0.0',
        client_user_agent: 'ZoikoVertex CAPI Test',
      },
    };

    const testCodeParam = test_event_code ? `&test_event_code=${encodeURIComponent(test_event_code)}` : '';
    const url = `${META_GRAPH}/${pixelId}/events?access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}${testCodeParam}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [testEvent] }),
    });
    const result = await r.json() as Record<string, unknown>;

    if ((result as any).error) {
      const metaErr = (result as any).error;
      logger.warn({ pixelId, msg: metaErr.message }, '[CAPI] test event rejected by Meta');
      res.json({ success: false, error: metaErr.message });
      return;
    }

    logger.info({ pixelId, workspaceId }, '[CAPI] Test event sent OK');
    res.json({
      success: true,
      data: {
        events_received: (result as any).events_received ?? 0,
        fbtrace_id:      (result as any).fbtrace_id,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[CAPI] test event error');
    res.status(500).json({ error: 'Failed to send test event' });
  }
};

// ── POST /api/v1/campaigns/meta/pixels/:pixelId/capi/events ─────────────────
// Public endpoint — receives events from client websites.
// Auth: Authorization: Bearer {integration_key}  OR  valid JWT (same workspace).
// Hashes all PII fields (email, phone, name) with SHA-256 before forwarding to Meta.

export const sendCapiEvents = async (req: Request, res: Response): Promise<void> => {
  const { pixelId } = req.params as { pixelId: string };

  let workspaceId: string | null = null;
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? null;

  if (bearer) workspaceId = verifyCapiKey(bearer, pixelId);
  if (!workspaceId) workspaceId = (req as AuthRequest).user?.workspace_id ?? null;

  if (!workspaceId) {
    res.status(401).json({ error: 'Invalid or missing integration key' });
    return;
  }

  const { events } = req.body as { events?: unknown[] };
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'events array is required and must not be empty' });
    return;
  }

  try {
    const token = await getTokenForWorkspace(workspaceId);
    if (!token) { res.status(400).json({ error: 'Workspace Meta account not connected' }); return; }

    const proof  = appSecretProof(token);
    const nowTs  = Math.floor(Date.now() / 1000);

    const metaEvents = (events as Record<string, unknown>[]).slice(0, 50).map(ev => {
      const ud  = (ev.user_data || {}) as Record<string, string>;
      const out: Record<string, string> = {};

      if (ud.email)      out.em = sha256(ud.email);
      if (ud.phone)      out.ph = sha256(ud.phone.replace(/\D/g, ''));
      if (ud.first_name) out.fn = sha256(ud.first_name);
      if (ud.last_name)  out.ln = sha256(ud.last_name);
      if (ud.ip)         out.client_ip_address = ud.ip;
      if (ud.user_agent) out.client_user_agent  = ud.user_agent;
      if (ud.fbp)        out.fbp = ud.fbp;
      if (ud.fbc)        out.fbc = ud.fbc;

      return {
        event_name:       ev.event_name,
        event_time:       ev.event_time   ?? nowTs,
        event_id:         ev.event_id     || undefined,
        event_source_url: ev.event_source_url || undefined,
        action_source:    ev.action_source  ?? 'website',
        user_data:        out,
        custom_data:      ev.custom_data  || undefined,
      };
    });

    const url = `${META_GRAPH}/${pixelId}/events?access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: metaEvents }),
    });
    const result = await r.json() as Record<string, unknown>;

    if ((result as any).error) {
      const metaErr = (result as any).error;
      logger.warn({ err: metaErr.message, pixelId }, '[CAPI] Meta rejected events');
      res.status(400).json({ success: false, error: metaErr.message });
      return;
    }

    logger.info({ pixelId, workspaceId, count: metaEvents.length }, '[CAPI] Events forwarded to Meta');
    res.json({
      success: true,
      data: {
        events_received: (result as any).events_received,
        fbtrace_id:      (result as any).fbtrace_id,
      },
    });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : err }, '[CAPI] send events error');
    res.status(500).json({ error: 'Failed to forward events to Meta' });
  }
};
