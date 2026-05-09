import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

/**
 * Handles the Facebook OAuth callback
 * 1. Exchanges the 'code' for a short-lived access token
 * 2. Exchanges short-lived token for a long-lived token (60 days)
 * 3. Fetches the Facebook Pages linked to the account
 * 4. Saves the connected accounts to the database
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
    } catch (e) {
      // Fallback if state is just a string (for legacy/debug)
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
    // This requires 'pages_show_list' and 'pages_read_engagement' permissions
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      logger.error({ error: pagesData.error }, '[Social] Meta Pages Fetch Error');
      return res.status(500).json({ error: 'Failed to fetch pages', details: pagesData.error });
    }

    // 4. Process each page and save to connected_accounts
    const connectedAccounts = [];

    for (const page of pagesData.data) {
      // Get page details (like profile picture)
      const pageDetailsResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=picture,username,name&access_token=${page.access_token}`
      );
      const pageDetails = await pageDetailsResponse.json();

      const accountData = {
        workspace_id: workspaceId,
        platform: 'facebook',
        account_name: page.name,
        account_handle: pageDetails.username || page.id,
        avatar_url: pageDetails.picture?.data?.url,
        access_token: page.access_token, // Page-scoped access token (never expires if user-token is valid)
        status: 'active'
      };

      // Upsert into connected_accounts
      const { data, error } = await supabaseAdmin
        .from('connected_accounts')
        .upsert(accountData, { onConflict: 'workspace_id,platform,account_handle' }) // Assuming unique constraint
        .select()
        .single();

      if (error) {
        logger.error({ error }, `[Social] Failed to save account: ${page.name}`);
      } else {
        connectedAccounts.push(data);
      }
      
      // Bonus: If this page has an Instagram Business account linked, we should fetch that too
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${page.access_token}`
      );
      const igData = await igResponse.json();
      
      if (igData.instagram_business_account) {
        const igAccount = igData.instagram_business_account;
        const igAccountData = {
          workspace_id: workspaceId,
          platform: 'instagram',
          account_name: igAccount.name || igAccount.username,
          account_handle: igAccount.username,
          avatar_url: igAccount.profile_picture_url,
          access_token: page.access_token, // Instagram uses the parent Page's access token
          status: 'active'
        };

        const { data: igSaved, error: igError } = await supabaseAdmin
          .from('connected_accounts')
          .upsert(igAccountData, { onConflict: 'workspace_id,platform,account_handle' })
          .select()
          .single();
          
        if (igError) {
          logger.error({ error: igError }, `[Social] Failed to save IG account: ${igAccount.username}`);
        } else {
          connectedAccounts.push(igSaved);
        }
      }
    }

    // Redirect user back to the frontend dashboard
    // In a real app, you'd redirect to a "success" page or the accounts settings
    // Redirect user back to the frontend dashboard
    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&connected=${connectedAccounts.length}`);

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

    // Parse state from JSON
    let workspaceId: string;
    try {
      const stateObj = JSON.parse(stateParam as string);
      workspaceId = stateObj.workspaceId;
    } catch (e) {
      workspaceId = stateParam as string;
    }

    logger.info(`[Social] Handling LinkedIn callback for workspace: ${workspaceId}`);

    // 1. Exchange code for access token
    const credentials = Buffer.from(`${env.LINKEDIN_CLIENT_ID}:${env.LINKEDIN_CLIENT_SECRET}`).toString('base64');
    
    console.log(`[Social] Exchanging LinkedIn code for token. ID: ${env.LINKEDIN_CLIENT_ID?.substring(0, 4)}...`);

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${env.META_REDIRECT_URI?.replace('facebook', 'linkedin')}`, // Hack to use the same base redirect domain
        client_id: env.LINKEDIN_CLIENT_ID || '',
        client_secret: env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`LinkedIn Token Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile to get the URN (Person ID)
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const profileData = await profileResponse.json();

    // 3. Save to database
    const accountData = {
      workspace_id: workspaceId,
      platform: 'linkedin',
      account_name: profileData.name || profileData.given_name,
      account_handle: profileData.sub, // This is the unique person identifier
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

export const handlePinterestCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;
    const stateObj = JSON.parse(stateParam as string);
    const workspaceId = stateObj.workspaceId;

    logger.info(`[Social] Pinterest callback received for workspace: ${workspaceId}`);
    
    // Placeholder for Pinterest Token Exchange logic
    
    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=pinterest`);
  } catch (error) {
    next(error);
  }
};

export const handleThreadsCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: stateParam } = req.query;
    const stateObj = JSON.parse(stateParam as string);
    const workspaceId = stateObj.workspaceId;

    logger.info(`[Social] Threads callback received for workspace: ${workspaceId}`);
    
    // Placeholder for Threads Token Exchange logic
    
    res.redirect(`${env.FRONTEND_URL}/accounts?status=success&platform=threads`);
  } catch (error) {
    next(error);
  }
};
