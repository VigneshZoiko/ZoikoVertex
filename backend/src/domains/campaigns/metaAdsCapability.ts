/**
 * metaAdsCapability.ts
 * ------------------------------------------------------------------
 * Guards ads-scoped Meta reads (delivery_estimate, targeting search,
 * pixel stats, /adspixels) so they DON'T fire when the connected token
 * lacks ads_read / ads_management. Calling those endpoints without ads
 * scope returns a 400 — and it's exactly those avoidable 400s that
 * inflate the app's "Marketing API last-500 error rate".
 *
 * The check itself calls /me/permissions — a generic Graph endpoint,
 * NOT an Ads API endpoint — so it never counts against the ads error
 * rate. Results are cached per workspace for 5 minutes.
 */

import { createHmac } from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

const META_GRAPH = 'https://graph.facebook.com/v21.0';
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { ok: boolean; exp: number }>();

function appSecretProof(token: string): string {
  const secret = env.META_APP_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(token).digest('hex');
}

/**
 * True when the token has ads_read OR ads_management granted.
 * Fail-closed (returns false) on any error so we never fire ads calls
 * on a token that can't make them.
 */
export async function hasMetaAdsAccess(workspaceId: string, token: string): Promise<boolean> {
  if (!token) return false;
  const hit = cache.get(workspaceId);
  if (hit && hit.exp > Date.now()) return hit.ok;

  let ok = false;
  try {
    const proof = appSecretProof(token);
    const url = `${META_GRAPH}/me/permissions?access_token=${token}${proof ? `&appsecret_proof=${proof}` : ''}`;
    const r = await fetch(url);
    const j = (await r.json()) as any;
    if (Array.isArray(j?.data)) {
      ok = j.data.some(
        (p: any) =>
          (p.permission === 'ads_read' || p.permission === 'ads_management') &&
          p.status === 'granted',
      );
    }
  } catch (e: any) {
    logger.warn({ err: e?.message, workspaceId }, '[MetaAdsCapability] permission check failed — treating as no ads access');
    ok = false;
  }

  cache.set(workspaceId, { ok, exp: Date.now() + CACHE_TTL_MS });
  return ok;
}

/** Clear the cached capability for a workspace (e.g. after (re)connecting an account). */
export function invalidateMetaAdsAccess(workspaceId: string): void {
  cache.delete(workspaceId);
}
