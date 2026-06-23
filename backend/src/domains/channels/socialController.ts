import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { broadcastWebhookEvent } from '../integrations/apiWebhookController';
import { AuthRequest } from '../../shared/authMiddleware';

// CSRF nonce store for OAuth state verification (5 min TTL)
const oauthNonces = new Map<string, { wsId: string; expiresAt: number; codeVerifier?: string }>();

export const generateOAuthNonce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
    const nonce = randomUUID();
    oauthNonces.set(nonce, { wsId: workspaceId, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.json({ success: true, data: { nonce } });
  } catch (err) { next(err); }
};

function consumeNonce(nonce: string, expectedWsId: string): boolean {
  const entry = oauthNonces.get(nonce);
  if (!entry) return false;
  oauthNonces.delete(nonce);
  return entry.wsId === expectedWsId && entry.expiresAt > Date.now();
}

// In-memory session store for short-lived OAuth page-selection sessions (10 min TTL)
const _sessionStore = new Map<string, { data: string; expiresAt: number }>();

function setSession(key: string, value: string, ttlSeconds: number): void {
  _sessionStore.set(key, { data: value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
function getSession(key: string): string | null {
  const entry = _sessionStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _sessionStore.delete(key); return null; }
  return entry.data;
}
function deleteSession(key: string): void {
  _sessionStore.delete(key);
}

/**
 * Handles the Facebook OAuth callback
 * 1. Exchanges the 'code' for a short-lived access token
 * 2. Exchanges short-lived token for a long-lived token (60 days)
 * 3. Fetches the Facebook Pages linked to the account
 * 4. Automatically detects and saves linked Instagram Business Accounts
 */
export const handleFacebookCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided from Meta' });
    }

    if (!stateParam) {
      return res.status(400).json({ error: 'No state parameter provided' });
    }

    // Parse state from JSON
    let workspaceId: string;
    let nonce: string | undefined;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
      nonce = stateObj.nonce;
    } catch {
      workspaceId = stateParam as string;
    }

    // Verify CSRF nonce (required)
    if (!nonce || !consumeNonce(nonce, workspaceId)) {
      logger.warn(`[Social] Facebook callback with invalid/expired nonce — possible CSRF attack`);
      return res.status(403).json({ error: 'Invalid state parameter. Please reconnect your account.' });
    }

    logger.info(`[Social] Handling Facebook callback for workspace: ${workspaceId}`);

    // 1. Exchange code for short-lived access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${env.META_APP_ID}&redirect_uri=${env.META_REDIRECT_URI}&client_secret=${env.META_APP_SECRET}&code=${code}`
    );
    
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error({ error: tokenData.error }, '[Social] Meta Token Exchange Error');
      return res.status(500).json({ error: 'Failed to exchange code for token', details: tokenData.error });
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    );
    
    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;

    // 3. Fetch Facebook Pages to see which accounts we can manage
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      logger.error({ error: pagesData.error }, '[Social] Meta Pages Fetch Error');
      return res.status(500).json({ error: 'Failed to fetch pages', details: pagesData.error });
    }

    // 4. Process each page and save to connected_accounts
    for (const page of pagesData.data) {
      try {
        // 4a. Fetch page details AND linked Instagram account
        const pageDetailsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=picture,username,name,instagram_business_account{id,username,profile_picture_url}&access_token=${page.access_token}`
        );
        const pageDetails = await pageDetailsResponse.json();
        
        logger.info(`[Social] Page found: ${page.name}. IG Business Account Data: ${JSON.stringify(pageDetails.instagram_business_account || 'NONE')}`);

        // 4b. Save Facebook Page
        // access_token = Page Access Token (for publishing/replying)
        // refresh_token = long-lived User Access Token (needed to read comment authors — Page tokens strip `from` in v18+)
        const facebookAccount = {
          workspace_id: workspaceId,
          platform: 'facebook',
          account_name: page.name,
          account_handle: pageDetails.username || page.id,
          page_id: page.id,  // numeric page ID — required by adcreatives object_story_spec
          avatar_url: pageDetails.picture?.data?.url,
          access_token: page.access_token,   // Page Access Token (posts/inbox)
          refresh_token: accessToken,         // Long-lived User Token (ads API — pages_manage_ads)
          status: 'active',
          token_expires_at: longLivedData.expires_in
            ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          token_status: 'active',
        };

        await supabaseAdmin
          .from('connected_accounts')
          .upsert(facebookAccount, { onConflict: 'workspace_id,platform,account_handle' });

        broadcastWebhookEvent(workspaceId, 'account.connected', { platform: 'facebook', account_handle: facebookAccount.account_handle, account_name: facebookAccount.account_name, connected_at: new Date().toISOString() }).catch(() => {});

        // 4c. Save Linked Instagram Account (if exists)
        if (pageDetails.instagram_business_account) {
          const ig = pageDetails.instagram_business_account;
          const instagramAccount = {
            workspace_id: workspaceId,
            platform: 'instagram',
            account_name: ig.username,
            account_handle: ig.id,
            avatar_url: ig.profile_picture_url,
            access_token: page.access_token,
            status: 'active',
            token_expires_at: longLivedData.expires_in
              ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
              : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            token_status: 'active',
          };

          const { error: igSaveError } = await supabaseAdmin
            .from('connected_accounts')
            .upsert(instagramAccount, { onConflict: 'workspace_id,platform,account_handle' });
            
          if (igSaveError) {
            logger.error({ igSaveError }, `[Social] Database error saving IG: ${ig.username}`);
          } else {
            logger.info(`[Social] Successfully connected Instagram: ${ig.username}`);
            broadcastWebhookEvent(workspaceId, 'account.connected', { platform: 'instagram', account_handle: ig.id, account_name: ig.username, connected_at: new Date().toISOString() }).catch(() => {});
          }
        }
      } catch (err) {
        logger.error({ err }, `[Social] Failed to process page: ${page.name}`);
      }
    }

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success`);

  } catch (error) {
    next(error);
  }
};

/**
 * Handles the LinkedIn OAuth callback (personal profile + page flows)
 */
export const handleLinkedInCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided from LinkedIn' });
    }

    let workspaceId: string;
    let flowType: string | undefined;
    let nonce: string | undefined;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
      flowType = stateObj.flowType;
      nonce = stateObj.nonce;
    } catch {
      workspaceId = stateParam as string;
    }

    if (nonce && !consumeNonce(nonce, workspaceId)) {
      logger.warn(`[Social] LinkedIn callback with invalid/expired nonce — possible CSRF attack`);
      return res.status(403).json({ error: 'Invalid state parameter. Please reconnect your account.' });
    }

    logger.info(`[Social] Handling LinkedIn callback for workspace: ${workspaceId}, flow: ${flowType || 'personal'}`);

    const isPageFlow = flowType === 'page';
    const liClientId     = isPageFlow ? env.LINKEDIN_CLIENT_ID     : (env.LINKEDIN_PERSONAL_CLIENT_ID     || env.LINKEDIN_CLIENT_ID);
    const liClientSecret = isPageFlow ? env.LINKEDIN_CLIENT_SECRET  : (env.LINKEDIN_PERSONAL_CLIENT_SECRET  || env.LINKEDIN_CLIENT_SECRET);
    const credentials = Buffer.from(`${liClientId}:${liClientSecret}`).toString('base64');
    const redirectUri = env.LINKEDIN_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/linkedin/callback`;

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: liClientId || '',
        client_secret: liClientSecret || '',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`LinkedIn Token Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // ── Page flow: fetch admin pages and present picker ──────────────────────
    if (flowType === 'page') {
      logger.info('[Social] LinkedIn page flow — fetching admin organizations');

      const aclRes = await fetch(
        'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50',
        { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
      );
      const aclData = await aclRes.json();
      logger.info({ status: aclRes.status, aclData }, '[Social] organizationAcls response');

      let elements: any[] = aclData.elements || [];

      // Fallback: try REST API if v2 returned empty or error
      if (elements.length === 0) {
        const restAclRes = await fetch(
          'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': '202406',
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );
        const restAclData = await restAclRes.json();
        logger.info({ status: restAclRes.status, restAclData }, '[Social] REST organizationAcls response');
        elements = restAclData.elements || [];
      }

      // Extract org IDs from URNs like "urn:li:organization:12345"
      const orgIds = elements
        .map((el: any) => {
          const org = el.organization || el.organizationalTarget || '';
          return org.match(/\d+$/)?.[0];
        })
        .filter(Boolean);

      let pages: { id: string; name: string; urn: string }[] = [];

      if (orgIds.length > 0) {

        const orgsRes = await fetch(
          `https://api.linkedin.com/v2/organizations?ids=List(${orgIds.join(',')})&projection=(results*(id,localizedName,vanityName))`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
        );
        const orgsData = await orgsRes.json();
        logger.info({ orgsData }, '[Social] organizations lookup response');
        const results = orgsData.results || {};

        pages = orgIds.map((id: string) => ({
          id,
          name: results[id]?.localizedName || results[id]?.vanityName || `Page ${id}`,
          urn: `urn:li:organization:${id}`,
        }));
      }

      logger.info(`[Social] Found ${pages.length} admin pages for workspace ${workspaceId}`);

      const sessionId = randomUUID();
      setSession(`lp_session:${sessionId}`, JSON.stringify({ accessToken, workspaceId, pages }), 600);

      return res.redirect(`${env.FRONTEND_URL}/accounts?status=linkedin_pages&session=${sessionId}`);
    }

    // ── Personal flow ────────────────────────────────────────────────────────
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    const accountData: Record<string, any> = {
      workspace_id: workspaceId,
      platform: 'linkedin',
      account_name: profileData.name || profileData.given_name || profileData.email || 'LinkedIn User',
      account_handle: profileData.sub,
      avatar_url: profileData.picture,
      access_token: accessToken,
      status: 'active',
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      token_status: 'active',
    };
    if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    broadcastWebhookEvent(workspaceId, 'account.connected', { platform: accountData.platform, account_handle: accountData.account_handle, account_name: accountData.account_name, connected_at: new Date().toISOString() }).catch(() => {});

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=linkedin`);

  } catch (error) {
    next(error);
  }
};

/**
 * Returns the list of LinkedIn pages stored in a session (for page picker modal)
 */
export const getLinkedInPagesSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { session } = req.query;
    const raw = getSession(`lp_session:${session as string}`);
    if (!raw) return res.status(404).json({ success: false, error: 'Session expired or not found' });

    const { pages } = JSON.parse(raw);
    res.json({ success: true, data: pages });
  } catch (error) {
    next(error);
  }
};

/**
 * Saves the user-selected LinkedIn pages as connected accounts
 */
export const saveLinkedInPages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { session, selectedPageIds } = req.body as { session: string; selectedPageIds: string[] };

    const raw = getSession(`lp_session:${session}`);
    if (!raw) return res.status(400).json({ success: false, error: 'Session expired — please reconnect LinkedIn' });

    const { accessToken, workspaceId, pages } = JSON.parse(raw);
    const selectedPages = pages.filter((p: any) => selectedPageIds.includes(p.id));

    for (const page of selectedPages) {
      const { error: dbError } = await supabaseAdmin
        .from('connected_accounts')
        .upsert({
          workspace_id: workspaceId,
          platform: 'linkedin',
          account_name: page.name,
          account_handle: page.urn,
          access_token: accessToken,
          status: 'active',
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          token_status: 'active',
        }, { onConflict: 'workspace_id,platform,account_handle' });

      if (dbError) throw dbError;
    }

    deleteSession(`lp_session:${session}`);
    logger.info(`[Social] Saved ${selectedPages.length} LinkedIn pages for workspace ${workspaceId}`);
    res.json({ success: true, count: selectedPages.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles the Pinterest OAuth callback
 */
export const handlePinterestCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided from Pinterest' });
    }

    let workspaceId: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
      if (stateObj.nonce && !consumeNonce(stateObj.nonce, workspaceId)) {
        return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=pinterest&reason=${encodeURIComponent('Session expired. Please try again.')}`);
      }
    } catch {
      workspaceId = stateParam as string;
    }

    const credentials = Buffer.from(`${env.PINTEREST_CLIENT_ID}:${env.PINTEREST_CLIENT_SECRET}`).toString('base64');
    const pinterestBase = env.PINTEREST_API_BASE || 'https://api.pinterest.com';
    const redirectUri = env.PINTEREST_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/pinterest/callback`;

    const tokenResponse = await fetch(`${pinterestBase}/v5/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(500).json({ error: 'Failed to exchange code for token', details: tokenData.error_description || tokenData.error });
    }

    const accessToken = tokenData.access_token;

    const profileResponse = await fetch(`${pinterestBase}/v5/user_account`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    const accountData: Record<string, any> = {
      workspace_id: workspaceId,
      platform: 'pinterest',
      account_name: profileData.username || 'Pinterest User',
      account_handle: profileData.username,
      avatar_url: profileData.profile_image,
      access_token: accessToken,
      status: 'active',
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      token_status: 'active',
    };
    if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    broadcastWebhookEvent(workspaceId, 'account.connected', { platform: accountData.platform, account_handle: accountData.account_handle, account_name: accountData.account_name, connected_at: new Date().toISOString() }).catch(() => {});

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=pinterest`);

  } catch (error) {
    next(error);
  }
};

/**
 * Handles the Threads OAuth callback
 */
export const handleThreadsCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided from Threads' });
    }

    let workspaceId: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
      if (stateObj.nonce && !consumeNonce(stateObj.nonce, workspaceId)) {
        return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=threads&reason=${encodeURIComponent('Session expired. Please try again.')}`);
      }
    } catch {
      workspaceId = stateParam as string;
    }

    const redirectUri = env.THREADS_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/threads/callback`;

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: env.THREADS_APP_ID || '',
        client_secret: env.THREADS_APP_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code as string,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(500).json({ error: 'Failed to exchange code for token', details: tokenData.error_message || tokenData.error });
    }

    const shortLivedToken = tokenData.access_token;

    const longLivedResponse = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${env.THREADS_APP_SECRET}&access_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token || shortLivedToken;

    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
    );
    const profileData = await profileResponse.json();

    if (profileData.error) {
      return res.status(500).json({ error: 'Failed to fetch Threads profile', details: profileData.error.message });
    }

    const accountData = {
      workspace_id: workspaceId,
      platform: 'threads',
      account_name: profileData.username,
      account_handle: profileData.id,
      avatar_url: profileData.threads_profile_picture_url,
      access_token: accessToken,
      status: 'active',
      token_expires_at: longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      token_status: 'active',
    };

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    broadcastWebhookEvent(workspaceId, 'account.connected', { platform: accountData.platform, account_handle: accountData.account_handle, account_name: accountData.account_name, connected_at: new Date().toISOString() }).catch(() => {});

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=threads`);

  } catch (error) {
    next(error);
  }
};

/**
 * Twitter OAuth init — generates nonce + PKCE code_verifier
 */
export const initTwitterOAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });
    const nonce = randomUUID();
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    oauthNonces.set(nonce, { wsId: workspaceId, expiresAt: Date.now() + 5 * 60 * 1000, codeVerifier });
    res.json({ success: true, data: { nonce, codeVerifier } });
  } catch (err) { next(err); }
};

/**
 * Handles the Twitter OAuth 2.0 callback
 */
export const handleTwitterCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    const twitterError = req.query.error as string | undefined;
    if (twitterError) {
      const desc = (req.query.error_description as string) || twitterError;
      logger.warn(`[Social] Twitter OAuth denied: ${desc}`);
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent(desc)}`);
    }

    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent('No authorization code returned from Twitter')}`);
    }

    let nonce: string;
    let workspaceId: string;
    let codeVerifier: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      nonce = stateObj.nonce;
      workspaceId = stateObj.workspaceId;
      const entry = oauthNonces.get(nonce);
      if (!entry || entry.wsId !== workspaceId || entry.expiresAt < Date.now()) {
        return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent('Session expired. Please try again.')}`);
      }
      codeVerifier = entry.codeVerifier || '';
      oauthNonces.delete(nonce);
    } catch {
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent('Invalid session. Please try again.')}`);
    }

    logger.info(`[Social] Handling Twitter callback for workspace: ${workspaceId}`);

    const redirectUri = env.TWITTER_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/twitter/callback`;

    const credentials = Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        client_id: env.TWITTER_CLIENT_ID || '',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      logger.error({ details: tokenData }, '[Social] Twitter token exchange failed');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;

    const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    if (profileData.errors || !profileData.data) {
      logger.error({ details: profileData.errors ?? profileData }, '[Social] Twitter profile fetch failed');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent('Failed to fetch Twitter profile — ensure users.read scope is granted')}`);
    }

    const user = profileData.data;

    const accountData: Record<string, any> = {
      workspace_id: workspaceId,
      platform: 'twitter',
      account_name: user.name || user.username,
      account_handle: user.username,
      page_id: user.id,
      avatar_url: user.profile_image_url?.replace('_normal', '') ?? null,
      access_token: accessToken,
      status: 'active',
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      token_status: 'active',
    };
    if (tokenData.refresh_token) accountData.refresh_token = tokenData.refresh_token;

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    broadcastWebhookEvent(workspaceId, 'account.connected', { platform: accountData.platform, account_handle: accountData.account_handle, account_name: accountData.account_name, connected_at: new Date().toISOString() }).catch(() => {});

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=twitter`);

  } catch (error) {
    next(error);
  }
};

/**
 * Threads deauthorize callback — called when a user removes the app from their Threads account
 */
export const handleThreadsDeauthorize = async (req: Request, res: Response) => {
  const signedRequest = req.body?.signed_request;
  logger.info({ signedRequest }, '[Social] Threads deauthorize callback received');

  try {
    if (signedRequest) {
      const payload = signedRequest.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      const userId = decoded?.user_id;

      if (userId) {
        await supabaseAdmin
          .from('connected_accounts')
          .delete()
          .eq('platform', 'threads')
          .eq('account_handle', userId);
        logger.info(`[Social] Threads account deauthorized for user ${userId}`);
      }
    }
  } catch (err) {
    logger.warn({ err }, '[Social] Could not parse Threads deauthorize signed_request');
  }

  res.status(200).json({ success: true });
};

/**
 * Threads data deletion callback — called when a user requests their data be deleted
 */
export const handleThreadsDataDeletion = async (req: Request, res: Response) => {
  const signedRequest = req.body?.signed_request;
  logger.info({ signedRequest }, '[Social] Threads data deletion request received');

  let confirmationCode = `threads_del_${Date.now()}`;

  try {
    if (signedRequest) {
      const payload = signedRequest.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      const userId = decoded?.user_id;

      if (userId) {
        await supabaseAdmin
          .from('connected_accounts')
          .delete()
          .eq('platform', 'threads')
          .eq('account_handle', userId);
        confirmationCode = `threads_del_${userId}_${Date.now()}`;
        logger.info(`[Social] Threads data deleted for user ${userId}`);
      }
    }
  } catch (err) {
    logger.warn({ err }, '[Social] Could not parse Threads data deletion signed_request');
  }

  res.status(200).json({
    url: `https://hacker-despise-ipad.ngrok-free.dev/api/auth/threads/deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
};

/**
 * Handles the YouTube OAuth callback
 */
export const handleYoutubeCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn(`[Social] YouTube OAuth denied: ${oauthError}`);
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=youtube&reason=${encodeURIComponent(oauthError as string)}`);
    }

    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=youtube&reason=${encodeURIComponent('No authorization code returned from Google')}`);
    }

    let workspaceId: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
      if (stateObj.nonce && !consumeNonce(stateObj.nonce, workspaceId)) {
        return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=youtube&reason=${encodeURIComponent('Session expired. Please try again.')}`);
      }
    } catch {
      workspaceId = stateParam as string;
    }

    const redirectUri = env.YOUTUBE_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/youtube/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: env.YOUTUBE_CLIENT_ID || '',
        client_secret: env.YOUTUBE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      logger.error({ details: tokenData }, '[Social] YouTube token exchange failed');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=youtube&reason=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    // Fetch YouTube channel details
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const channelData = await channelResponse.json();

    if (channelData.error || !channelData.items || channelData.items.length === 0) {
      logger.error({ details: channelData }, '[Social] YouTube channel fetch failed or no channel found');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=youtube&reason=${encodeURIComponent('No YouTube channel found for this Google account')}`);
    }

    const channel = channelData.items[0];

    const accountData: Record<string, unknown> = {
      workspace_id: workspaceId,
      platform: 'youtube',
      account_name: channel.snippet.title,
      account_handle: channel.snippet.customUrl || channel.id,
      avatar_url: channel.snippet.thumbnails?.default?.url,
      access_token: accessToken,
      status: 'active',
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
      token_status: 'active',
    };
    if (refreshToken) accountData.refresh_token = refreshToken;

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    broadcastWebhookEvent(workspaceId, 'account.connected', { platform: accountData.platform, account_handle: accountData.account_handle, account_name: accountData.account_name, connected_at: new Date().toISOString() }).catch(() => {});

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=youtube`);

  } catch (error) {
    next(error);
  }
};


/**
 * Handles the Google Ads OAuth callback (uses Google OAuth with adwords scope)
 */
export const handleGoogleAdsCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn(`[Social] Google Ads OAuth denied: ${oauthError}`);
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=googleads&reason=${encodeURIComponent(oauthError as string)}`);
    }

    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=googleads&reason=${encodeURIComponent('No authorization code returned')}`);
    }

    const workspaceId = stateParam as string;
    logger.info(`[Social] Handling Google Ads callback for workspace: ${workspaceId}`);

    const clientId     = env.GOOGLE_ADS_CLIENT_ID     || env.YOUTUBE_CLIENT_ID     || '';
    const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET || '';
    const redirectUri  = env.GOOGLE_ADS_REDIRECT_URI  || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/googleads/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code:          code as string,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      logger.error({ details: tokenData }, '[Social] Google Ads token exchange failed');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=googleads&reason=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const accessToken  = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    // Fetch Google user info for account name
    const profileRes  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profileData = await profileRes.json();

    const accountData: Record<string, unknown> = {
      workspace_id:  workspaceId,
      platform:      'googleads',
      account_name:  profileData.name || profileData.email || 'Google Ads Account',
      account_handle: profileData.sub || profileData.email,
      avatar_url:    profileData.picture || null,
      access_token:  accessToken,
      status:        'active',
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
      token_status: 'active',
    };
    if (refreshToken) accountData.refresh_token = refreshToken;

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    logger.info(`[Social] Google Ads account connected for workspace ${workspaceId}`);
    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=googleads`);

  } catch (error) {
    next(error);
  }
};

/**
 * Disconnects a social account
 */
export const disconnectAccount = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: account, error: fetchError } = await supabaseAdmin
      .from('connected_accounts')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id, role').eq('user_id', userId).single();
    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    const { data: userData } = await supabaseAdmin.from('users').select('is_superadmin').eq('id', userId).single();
    const isSuper = userData?.is_superadmin;

    let query = supabaseAdmin
      .from('connected_accounts')
      .delete()
      .eq('id', id);

    if (!isSuper) {
      query = query.eq('workspace_id', member.workspace_id);
    }

    const { error: deleteError } = await query;

    if (deleteError) throw deleteError;

    broadcastWebhookEvent(member.workspace_id, 'account.disconnected', { account_id: id, disconnected_by: userId, disconnected_at: new Date().toISOString() }).catch(() => {});

    logger.info(`[Social] Account ${id} disconnected by user ${userId}`);
    res.status(200).json({ success: true, message: 'Account disconnected successfully' });
  } catch (error) {
    next(error);
  }
};
