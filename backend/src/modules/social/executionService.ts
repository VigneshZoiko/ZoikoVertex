/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface PublishResult {
  success: boolean;
  platform: string;
  error?: string;
  id?: string;
}

/**
 * Service to handle actual API calls to social platforms
 */
export class ExecutionService {
  /**
   * Publishes an intent to all selected platforms
   */
  static async publishIntent(intentId: string) {
    logger.info(`[Execution] Processing intent: ${intentId}`);
    try {
      logger.info(`[Execution] Fetching details for intent ${intentId}...`);
      const { data: intent, error: intentError } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .eq('id', intentId)
        .single();

      if (intentError || !intent) throw new Error('Intent not found');

      // 2. Fetch targeted accounts
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .from('connected_accounts')
        .select('platform, access_token, account_handle')
        .in('id', intent.target_account_ids || []);

      if (accountsError || !accounts || (accounts as any[]).length === 0) {
        logger.warn(`[Execution] No valid target accounts for intent ${intentId}`);
        return;
      }

      const accountList = accounts as any[];
      logger.info(`[Execution] Starting publication for intent ${intentId} to ${accountList.length} platforms`);

      const results: PublishResult[] = await Promise.all(
        accountList.map(async account => {
          // Extract the correct caption for this platform
          let platformContent = intent.content;
          try {
            const parsed = JSON.parse(intent.content);
            if (parsed[account.platform]) {
              platformContent = parsed[account.platform];
            } else if (typeof parsed === 'object') {
              platformContent = Object.values(parsed)[0] as string;
            }
          } catch {}

          const intentWithCorrectContent = { ...intent, content: platformContent };
          return this.publishToPlatform(intentWithCorrectContent, account);
        })
      );

      const allSuccessful = results.every(r => r.success);
      const firstError = results.find(r => !r.success)?.error;

      // 3. Update final status
      await supabaseAdmin
        .from('publish_intents')
        .update({ 
          status: allSuccessful ? 'PUBLISHED' : 'FAILED',
          feedback: allSuccessful ? null : (firstError || 'One or more platforms failed to publish.')
        })
        .eq('id', intentId);

    } catch (err) {
      logger.error({ err }, `[Execution] Fatal error during publication of ${intentId}`);
    }
  }

  private static async publishToPlatform(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Targeting platform: ${account.platform} (${account.account_handle})`);
    try {
      if (account.platform === 'facebook') {
        return await this.postToFacebook(intent, account);
      } else if (account.platform === 'instagram') {
        return await this.postToInstagram(intent, account);
      } else if (account.platform === 'linkedin') {
        return await this.postToLinkedIn(intent, account);
      } else if (account.platform === 'pinterest') {
        return await this.postToPinterest(intent, account);
      } else if (account.platform === 'threads') {
        return await this.postToThreads(intent, account);
      }
      return { success: false, platform: account.platform, error: `Unsupported platform: ${account.platform}` };
    } catch (err: any) {
      logger.error({ err }, `[Execution] Error publishing to ${account.platform}`);
      return { success: false, platform: account.platform, error: err.message || 'Unknown error' };
    }
  }

  private static async postToThreads(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending post to Threads for ${account.account_handle}...`);
    try {
      // 1. Create Media Container
      const containerUrl = `https://graph.threads.net/v1.0/${account.account_handle}/threads`;
      const containerBody: any = {
        media_type: intent.media_url ? 'IMAGE' : 'TEXT',
        text: intent.content,
        access_token: account.access_token,
      };

      if (intent.media_url) {
        containerBody.image_url = intent.media_url;
      }

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerBody),
      });

      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);

      const creationId = containerData.id;

      // 2. Wait for the container to be ready (Threads requirement)
      logger.info(`[Execution] Waiting 5 seconds for Threads container ${creationId} to process...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Publish the Container
      const publishUrl = `https://graph.threads.net/v1.0/${account.account_handle}/threads_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: account.access_token,
        }),
      });

      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      return { success: true, platform: 'threads', id: publishData.id };
    } catch (err: any) {
      return { success: false, platform: 'threads', error: err.message };
    }
  }

  private static async postToPinterest(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending PIN to Pinterest for ${account.account_handle}...`);
    
    try {
      // 1. Fetch Boards to find a place to pin (if not specified in intent)
      // For now, we take the first board found
      const boardsRes = await fetch('https://api.pinterest.com/v5/boards', {
        headers: { 'Authorization': `Bearer ${account.access_token}` }
      });
      const boardsData = await boardsRes.json();
      
      if (boardsData.error || !boardsData.items || boardsData.items.length === 0) {
        throw new Error('No Pinterest boards found. Please create a board first.');
      }

      const boardId = boardsData.items[0].id;

      // 2. Create the Pin
      const pinBody = {
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: intent.media_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800' // Fallback image if none
        },
        title: intent.title || 'New Pin from ZoikoVertex',
        description: intent.content
      };

      const response = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pinBody),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error_description || JSON.stringify(data.error));
      }

      return { success: true, platform: 'pinterest', id: data.id };
    } catch (err: any) {
      return { success: false, platform: 'pinterest', error: err.message };
    }
  }

  private static async postToLinkedIn(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] LinkedIn Handshake Started for: ${account.account_handle}`);
    try {
      const authorUrn = account.account_handle.startsWith('urn:li:') 
        ? account.account_handle 
        : `urn:li:person:${account.account_handle}`;

      let mediaUrn = null;

      // 1. If there's an image, we must register and upload it to LinkedIn first
      if (intent.media_url) {
        logger.info(`[Execution] Registering image asset on LinkedIn...`);
        const registerUrl = 'https://api.linkedin.com/v2/assets?action=registerUpload';
        const registerBody = {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: authorUrn,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }
            ]
          }
        };

        const regRes = await fetch(registerUrl, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registerBody)
        });

        const regData = await regRes.json();
        if (regData.error) throw new Error(`LinkedIn Media Registration Failed: ${regData.message}`);

        const uploadUrl = regData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        mediaUrn = regData.value.asset;

        // Fetch image from Supabase/URL
        logger.info(`[Execution] Fetching image from ${intent.media_url} for upload...`);
        const imageRes = await fetch(intent.media_url);
        const imageBuffer = await imageRes.arrayBuffer();

        // Upload to LinkedIn
        logger.info(`[Execution] Uploading image binary to LinkedIn...`);
        await fetch(uploadUrl, {
          method: 'POST', // LinkedIn uses POST for the binary upload to the provided URL
          headers: { 'Authorization': `Bearer ${account.access_token}` },
          body: imageBuffer
        });
      }

      // 2. Create the Post
      const url = 'https://api.linkedin.com/v2/ugcPosts';
      const postBody = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: intent.content },
            shareMediaCategory: mediaUrn ? 'IMAGE' : 'NONE',
            media: mediaUrn ? [
              {
                status: 'READY',
                description: { text: 'ZoikoVertex Media' },
                media: mediaUrn,
                title: { text: 'ZoikoVertex' }
              }
            ] : []
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postBody),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`LinkedIn API Failed: ${response.status} - ${JSON.stringify(data)}`);

      return { success: true, platform: 'linkedin', id: data.id };
    } catch (err: any) {
      logger.error({ err }, `[Execution] LinkedIn Error`);
      return { success: false, platform: 'linkedin', error: err.message };
    }
  }

  private static async postToFacebook(intent: any, account: any) {
    logger.info(`[Execution] Sending post to Facebook for ${account.account_handle}...`);
    const endpoint = intent.media_url ? 'photos' : 'feed';
    const url = `https://graph.facebook.com/v18.0/${account.account_handle}/${endpoint}`;
    
    const params: any = {
      message: intent.content,
      access_token: account.access_token,
    };

    if (intent.media_url) {
      params.url = intent.media_url;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (data.error) {
      return { success: false, platform: 'facebook', error: data.error.message };
    }

    return { success: true, platform: 'facebook', id: data.id || data.post_id };
  }

  private static async postToInstagram(intent: any, account: any) {
    if (!intent.media_url) {
      return { success: false, platform: 'instagram', error: 'Instagram requires a media URL' };
    }

    try {
      // 1. Create Media Container
      const containerUrl = `https://graph.facebook.com/v18.0/${account.account_handle}/media`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: intent.media_url,
          caption: intent.content,
          access_token: account.access_token,
        }),
      });

      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);

      const creationId = containerData.id;
      
      // 2. Wait for processing (IG recommendation)
      logger.info(`[Execution] Waiting 5 seconds for Instagram container ${creationId} to process...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
 
      // 3. Publish the Container
      const publishUrl = `https://graph.facebook.com/v18.0/${account.account_handle}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: account.access_token,
        }),
      });

      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      return { success: true, platform: 'instagram', id: publishData.id };
    } catch (err: any) {
      return { success: false, platform: 'instagram', error: err.message };
    }
  }
}
