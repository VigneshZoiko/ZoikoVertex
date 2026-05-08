import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

interface PublishTarget {
  platform: string;
  access_token: string;
  account_handle: string;
}

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
    console.log(`[EXECUTION SERVICE] Wake up! Processing intent: ${intentId}`);
    try {
      // 1. Fetch intent details
      console.log(`[EXECUTION SERVICE] Fetching details for intent ${intentId}...`);
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
      console.log(`[EXECUTION SERVICE] Starting publication for intent ${intentId} to ${accountList.length} platforms`);

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
          } catch (e) {}

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
    console.log(`[EXECUTION SERVICE] Targeting platform: ${account.platform} (${account.account_handle})`);
    try {
      if (account.platform === 'facebook') {
        return await this.postToFacebook(intent, account);
      } else if (account.platform === 'instagram') {
        return await this.postToInstagram(intent, account);
      } else if (account.platform === 'linkedin') {
        return await this.postToLinkedIn(intent, account);
      }
      return { success: false, platform: account.platform, error: `Unsupported platform: ${account.platform}` };
    } catch (err: any) {
      console.error(`[EXECUTION SERVICE] Error publishing to ${account.platform}:`, err);
      return { success: false, platform: account.platform, error: err.message || 'Unknown error' };
    }
  }

  private static async postToLinkedIn(intent: any, account: any) {
    console.log(`[EXECUTION SERVICE] LinkedIn Handshake Started for: ${account.account_handle}`);
    
    // LinkedIn URN format for person: urn:li:person:<id>
    const authorUrn = account.account_handle.startsWith('urn:li:') 
      ? account.account_handle 
      : `urn:li:person:${account.account_handle}`;

    console.log(`[EXECUTION SERVICE] Using Author URN: ${authorUrn}`);

    const url = 'https://api.linkedin.com/v2/ugcPosts';
    
    const postBody = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: intent.content
          },
          shareMediaCategory: intent.media_url ? 'IMAGE' : 'NONE',
          media: intent.media_url ? [
            {
              status: 'READY',
              description: {
                text: 'Image uploaded via ZoikoVertex'
              },
              media: intent.media_url,
              title: {
                text: 'ZoikoVertex Post'
              }
            }
          ] : []
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    console.log(`[EXECUTION SERVICE] Sending payload to LinkedIn...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postBody),
    });

    const responseText = await response.text();
    console.log(`[EXECUTION SERVICE] LinkedIn Response (${response.status}):`, responseText);

    if (!response.ok) {
      throw new Error(`LinkedIn API Failed: ${response.status} - ${responseText}`);
    }

    return { success: true, platform: 'linkedin' };
  }

  private static async postToFacebook(intent: any, account: any) {
    console.log(`[EXECUTION SERVICE] Sending Native POST to Facebook for ${account.account_handle}...`);
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

      // 2. Publish the Container
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
