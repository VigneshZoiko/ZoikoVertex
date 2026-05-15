/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

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
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
    } catch {
      workspaceId = stateParam as string;
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
        const facebookAccount = {
          workspace_id: workspaceId,
          platform: 'facebook',
          account_name: page.name,
          account_handle: pageDetails.username || page.id,
          avatar_url: pageDetails.picture?.data?.url,
          access_token: page.access_token,
          status: 'active'
        };

        await supabaseAdmin
          .from('connected_accounts')
          .upsert(facebookAccount, { onConflict: 'workspace_id,platform,account_handle' });

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
            status: 'active'
          };

          const { error: igSaveError } = await supabaseAdmin
            .from('connected_accounts')
            .upsert(instagramAccount, { onConflict: 'workspace_id,platform,account_handle' });
            
          if (igSaveError) {
            logger.error({ igSaveError }, `[Social] Database error saving IG: ${ig.username}`);
          } else {
            logger.info(`[Social] Successfully connected Instagram: ${ig.username}`);
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
 * Handles the LinkedIn OAuth callback
 */
export const handleLinkedInCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No code provided from LinkedIn' });
    }

    let workspaceId: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
    } catch {
      workspaceId = stateParam as string;
    }

    logger.info(`[Social] Handling LinkedIn callback for workspace: ${workspaceId}`);

    const credentials = Buffer.from(`${env.LINKEDIN_CLIENT_ID}:${env.LINKEDIN_CLIENT_SECRET}`).toString('base64');
    
    logger.info('[Social] Exchanging LinkedIn code for access token');
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
        client_id: env.LINKEDIN_CLIENT_ID || '',
        client_secret: env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`LinkedIn Token Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    const accountData = {
      workspace_id: workspaceId,
      platform: 'linkedin',
      account_name: profileData.name || profileData.given_name,
      account_handle: profileData.sub,
      avatar_url: profileData.picture,
      access_token: accessToken,
      status: 'active'
    };

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=linkedin`);

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
    } catch {
      workspaceId = stateParam as string;
    }

    logger.info(`[Social] Handling Pinterest callback for workspace: ${workspaceId}`);

    const credentials = Buffer.from(`${env.PINTEREST_CLIENT_ID}:${env.PINTEREST_CLIENT_SECRET}`).toString('base64');
    
    const redirectUri = env.PINTEREST_REDIRECT_URI || `${env.FRONTEND_URL.replace('3000', '5005')}/api/auth/pinterest/callback`;
    
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
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

    const profileResponse = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    const accountData = {
      workspace_id: workspaceId,
      platform: 'pinterest',
      account_name: profileData.username || 'Pinterest User',
      account_handle: profileData.username,
      avatar_url: profileData.profile_image,
      access_token: accessToken,
      status: 'active'
    };

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

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
    } catch {
      workspaceId = stateParam as string;
    }

    logger.info(`[Social] Handling Threads callback for workspace: ${workspaceId}`);

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
      status: 'active'
    };

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=threads`);

  } catch (error) {
    next(error);
  }
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

    const codeVerifier = 'zoikovertex_twitter_oauth2_pkce_plain_challenge_string';
    const workspaceId = stateParam as string;

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

    if (profileData.errors) {
      logger.error({ details: profileData.errors }, '[Social] Twitter profile fetch failed');
      return res.redirect(`${env.FRONTEND_URL}/accounts?status=error&platform=twitter&reason=${encodeURIComponent('Failed to fetch Twitter profile')}`);
    }

    const user = profileData.data;

    const accountData = {
      workspace_id: workspaceId,
      platform: 'twitter',
      account_name: user.name || user.username,
      account_handle: user.username,
      avatar_url: user.profile_image_url,
      access_token: accessToken,
      status: 'active'
    };

    const { error: dbError } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' });

    if (dbError) throw dbError;

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

    logger.info(`[Social] Account ${id} disconnected by user ${userId}`);
    res.status(200).json({ success: true, message: 'Account disconnected successfully' });
  } catch (error) {
    next(error);
  }
};
