/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Proactive OAuth token refresh worker.
 *
 * Runs every 30 minutes via setInterval — no Redis required.
 * Queries connected_accounts where the token expires within 60 minutes
 * (or has no expiry recorded yet) and refreshes each one per platform rules.
 *
 * Only the DB row is updated; Supabase Storage files are never touched.
 * One account failing never stops the others.
 */

import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { env } from '../config/env';

// How far ahead to refresh (accounts expiring within this window are refreshed now)
const REFRESH_BUFFER_MS = 60 * 60 * 1000; // 1 hour

// How often the worker polls
const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ── Per-platform token lifetimes used when expires_at is unknown ──────────────
const DEFAULT_LIFETIME_MS: Record<string, number> = {
  youtube:   1 * 60 * 60 * 1000,      // 1 hour
  twitter:   2 * 60 * 60 * 1000,      // 2 hours
  pinterest: 30 * 24 * 60 * 60 * 1000, // 30 days
  linkedin:  60 * 24 * 60 * 60 * 1000, // 60 days
  facebook:  60 * 24 * 60 * 60 * 1000, // 60 days
  instagram: 60 * 24 * 60 * 60 * 1000, // 60 days (shares Meta token)
  threads:   60 * 24 * 60 * 60 * 1000, // 60 days
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function expiresAt(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

async function persistToken(
  accountId: string,
  accessToken: string,
  tokenExpiresAt: string,
  refreshToken?: string | null,
): Promise<void> {
  const update: Record<string, any> = {
    access_token: accessToken,
    token_expires_at: tokenExpiresAt,
    token_status: 'active',
  };
  if (refreshToken) update.refresh_token = refreshToken;

  const { error } = await supabaseAdmin
    .from('connected_accounts')
    .update(update)
    .eq('id', accountId);

  if (error) throw error;
}

async function markFailed(accountId: string, reason: string): Promise<void> {
  await supabaseAdmin
    .from('connected_accounts')
    .update({ token_status: 'refresh_failed' })
    .eq('id', accountId);
  logger.warn(`[TokenRefresh] Account ${accountId} marked refresh_failed: ${reason}`);
}

// ── Platform refresh implementations ─────────────────────────────────────────

async function refreshYouTube(account: any): Promise<void> {
  if (!account.refresh_token) throw new Error('No refresh_token — reconnect YouTube');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID || '',
      client_secret: env.YOUTUBE_CLIENT_SECRET || '',
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`YouTube: ${data.error_description || data.error}`);

  await persistToken(
    account.id,
    data.access_token,
    expiresAt(data.expires_in ?? 3600),
  );
}

async function refreshMeta(account: any): Promise<void> {
  // Meta long-lived tokens are extended by re-exchanging them — no refresh_token needed.
  const platform = account.platform; // facebook | instagram | threads

  if (platform === 'threads') {
    const res = await fetch(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${account.access_token}`
    );
    const data = await res.json();
    if (data.error || !data.access_token) {
      throw new Error(`Threads: ${data.error?.message || 'refresh failed'}`);
    }
    await persistToken(
      account.id,
      data.access_token,
      expiresAt(data.expires_in ?? 5184000),
    );
    return;
  }

  // Facebook / Instagram — extend the long-lived User Access Token (stored in refresh_token).
  // Page Access Tokens (access_token) cannot be extended with fb_exchange_token.
  const userToken = account.refresh_token;
  if (!userToken) {
    throw new Error('Meta: no user token (refresh_token) — reconnect Facebook');
  }

  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', env.META_APP_ID || '');
  url.searchParams.set('client_secret', env.META_APP_SECRET || '');
  url.searchParams.set('fb_exchange_token', userToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`Meta: ${data.error?.message || 'refresh failed'}`);
  }

  // Write extended user token back to refresh_token (not access_token — that holds the page token)
  const { error } = await supabaseAdmin
    .from('connected_accounts')
    .update({
      refresh_token:    data.access_token,
      token_expires_at: expiresAt(data.expires_in ?? 5184000),
      token_status:     'active',
    })
    .eq('id', account.id);
  if (error) throw error;
}

async function refreshLinkedIn(account: any): Promise<void> {
  if (!account.refresh_token) throw new Error('No refresh_token — reconnect LinkedIn');

  const credentials = Buffer.from(
    `${env.LINKEDIN_CLIENT_ID}:${env.LINKEDIN_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`LinkedIn: ${data.error_description || data.error || 'refresh failed'}`);
  }

  await persistToken(
    account.id,
    data.access_token,
    expiresAt(data.expires_in ?? 5184000),
    data.refresh_token ?? null,
  );
}

async function refreshPinterest(account: any): Promise<void> {
  if (!account.refresh_token) throw new Error('No refresh_token — reconnect Pinterest');

  const credentials = Buffer.from(
    `${env.PINTEREST_CLIENT_ID}:${env.PINTEREST_CLIENT_SECRET}`
  ).toString('base64');

  const base = env.PINTEREST_API_BASE || 'https://api.pinterest.com';
  const res = await fetch(`${base}/v5/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`Pinterest: ${JSON.stringify(data.error || 'refresh failed')}`);
  }

  await persistToken(
    account.id,
    data.access_token,
    expiresAt(data.expires_in ?? 2592000),
    data.refresh_token ?? null,
  );
}

async function refreshTwitter(account: any): Promise<void> {
  if (!account.refresh_token) throw new Error('No refresh_token — reconnect Twitter');

  const credentials = Buffer.from(
    `${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`Twitter: ${data.error_description || data.error || 'refresh failed'}`);
  }

  await persistToken(
    account.id,
    data.access_token,
    expiresAt(data.expires_in ?? 7200),
    data.refresh_token ?? null,
  );
}

async function refreshAccount(account: any): Promise<void> {
  const p = account.platform as string;
  if (p === 'youtube')                           return refreshYouTube(account);
  if (p === 'linkedin')                          return refreshLinkedIn(account);
  if (p === 'pinterest')                         return refreshPinterest(account);
  if (p === 'twitter')                           return refreshTwitter(account);
  if (p === 'facebook' || p === 'instagram' || p === 'threads') return refreshMeta(account);
  throw new Error(`Unknown platform: ${p}`);
}

// ── Main refresh pass ─────────────────────────────────────────────────────────

async function runRefreshPass(): Promise<void> {
  const cutoff = new Date(Date.now() + REFRESH_BUFFER_MS).toISOString();

  // Fetch accounts that are expiring soon OR have never had their expiry recorded
  const { data: accounts, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, platform, access_token, refresh_token, token_expires_at, token_status, workspace_id, account_handle')
    .eq('status', 'active')
    .neq('token_status', 'disconnected')
    .or(`token_expires_at.is.null,token_expires_at.lt.${cutoff}`);

  if (error) {
    logger.error({ error }, '[TokenRefresh] Failed to query accounts');
    return;
  }

  if (!accounts || accounts.length === 0) {
    logger.info('[TokenRefresh] No accounts need refreshing');
    return;
  }

  logger.info(`[TokenRefresh] Refreshing ${accounts.length} account(s)...`);

  for (const account of accounts) {
    try {
      // For accounts with no expiry recorded, stamp a conservative default first
      // so they don't keep triggering on every pass if the platform doesn't return expires_in.
      if (!account.token_expires_at) {
        const defaultLifetime = DEFAULT_LIFETIME_MS[account.platform] ?? REFRESH_BUFFER_MS * 2;
        await supabaseAdmin
          .from('connected_accounts')
          .update({ token_expires_at: new Date(Date.now() + defaultLifetime).toISOString() })
          .eq('id', account.id);
      }

      await refreshAccount(account);
      logger.info(`[TokenRefresh] ✓ ${account.platform} / ${account.account_handle}`);
    } catch (err: any) {
      await markFailed(account.id, err.message);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startTokenRefreshWorker(): void {
  logger.info('[TokenRefresh] Worker starting — polling every 30 minutes');

  // Run immediately on boot, then on the interval
  runRefreshPass().catch((err) =>
    logger.error({ err }, '[TokenRefresh] Initial pass failed')
  );

  setInterval(() => {
    runRefreshPass().catch((err) =>
      logger.error({ err }, '[TokenRefresh] Scheduled pass failed')
    );
  }, POLL_INTERVAL_MS);
}
