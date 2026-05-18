/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';

export function registerExecutionListeners(): void {
  internalEventBus.on('execution.requested', (payload: unknown) => {
    const { intentId } = payload as { intentId: string };
    ExecutionService.publishIntent(intentId).catch((err) => {
      logger.error({ err }, `[Execution] Event-triggered publish failed for ${intentId}`);
    });
  });
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
        .select('id, platform, access_token, refresh_token, account_handle')
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
      } else if (account.platform === 'twitter') {
        return await this.postToTwitter(intent, account);
      } else if (account.platform === 'youtube') {
        return await this.postToYoutube(intent, account);
      } else if (account.platform === 'tiktok') {
        return await this.postToTikTok(intent, account);
      }
      return { success: false, platform: account.platform, error: `Unsupported platform: ${account.platform}` };
    } catch (err: any) {
      logger.error({ err }, `[Execution] Error publishing to ${account.platform}`);
      return { success: false, platform: account.platform, error: err.message || 'Unknown error' };
    }
  }

  private static async postToTwitter(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending tweet for ${account.account_handle}...`);
    try {
      const url = 'https://api.twitter.com/2/tweets';
      
      const body: any = {
        text: intent.content
      };

      if (intent.media_url) {
        logger.warn(`[Execution] Twitter media upload requires v1.1 API integration. Sending tweet as text/link. URL: ${intent.media_url}`);
        // Can optionally append media_url to the text if desired, but we'll leave it out or handle it natively later.
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      logger.info({ httpStatus: response.status, body: data }, '[Execution] Twitter API response');
      if (!response.ok || data.errors) {
        throw new Error(JSON.stringify(data.errors || data.detail || data.title || 'Twitter API Error'));
      }

      return { success: true, platform: 'twitter', id: data.data?.id };
    } catch (err: any) {
      logger.error({ err }, `[Execution] Twitter Error`);
      return { success: false, platform: 'twitter', error: err.message };
    }
  }

  private static async refreshYoutubeToken(account: any): Promise<string> {
    if (!account.refresh_token) throw new Error('No refresh token stored — please reconnect your YouTube account.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);

    const newAccessToken: string = tokenData.access_token;
    // Persist the refreshed token
    await supabaseAdmin
      .from('connected_accounts')
      .update({ access_token: newAccessToken })
      .eq('id', account.id);

    return newAccessToken;
  }

  private static async postToYoutube(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending video to YouTube for ${account.account_handle}...`);
    try {
      if (!intent.media_url) {
        throw new Error('YouTube requires a media URL (video) to publish.');
      }

      // 1. Fetch video from URL to binary
      logger.info(`[Execution] Fetching video from ${intent.media_url} for YouTube upload...`);
      const videoRes = await fetch(intent.media_url);
      if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
      const videoBuffer = await videoRes.arrayBuffer();

      // 2. Upload video — auto-refresh token if expired
      const metadata = {
        snippet: {
          title: intent.title || 'ZoikoVertex Upload',
          description: intent.content,
          tags: intent.tags || ['ZoikoVertex']
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      };

      const doUpload = async (accessToken: string) => {
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }));
        const uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';
        return fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData as any,
        });
      };

      let response = await doUpload(account.access_token);
      let data = await response.json();

      // If token expired (401), refresh and retry once
      if (response.status === 401 && account.refresh_token) {
        logger.info(`[Execution] YouTube token expired — refreshing...`);
        const newToken = await this.refreshYoutubeToken(account);
        response = await doUpload(newToken);
        data = await response.json();
      }

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'YouTube API Error');
      }

      return { success: true, platform: 'youtube', id: data.id };
    } catch (err: any) {
      logger.error({ err }, `[Execution] YouTube Error`);
      return { success: false, platform: 'youtube', error: err.message };
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

  private static isVideoUrl(url: string): boolean {
    return /\.(mp4|mov|avi|webm|mkv|m4v|ogv)(\?|$)/i.test(url);
  }

  private static getPostType(intent: any): string | null {
    const factors: any[] = intent.risk_factors || [];
    return factors.find((f: any) => f.type === 'post_type')?.value || null;
  }

  private static async postToFacebook(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending post to Facebook for ${account.account_handle}...`);
    try {
      const isVideo = intent.media_url && this.isVideoUrl(intent.media_url);

      if (isVideo) {
        // Video upload via /videos endpoint
        const url = `https://graph.facebook.com/v18.0/${account.account_handle}/videos`;
        const body = {
          file_url: intent.media_url,
          description: intent.content,
          access_token: account.access_token,
        };
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        logger.info(`[Execution] Facebook video posted: ${data.id}`);
        return { success: true, platform: 'facebook', id: data.id };
      }

      // Photo or text post
      const endpoint = intent.media_url ? 'photos' : 'feed';
      const url = `https://graph.facebook.com/v18.0/${account.account_handle}/${endpoint}`;
      const params: any = { message: intent.content, access_token: account.access_token };
      if (intent.media_url) params.url = intent.media_url;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return { success: true, platform: 'facebook', id: data.id || data.post_id };
    } catch (err: any) {
      return { success: false, platform: 'facebook', error: err.message };
    }
  }

  private static async postToInstagram(intent: any, account: any): Promise<PublishResult> {
    if (!intent.media_url) {
      return { success: false, platform: 'instagram', error: 'Instagram requires a media URL' };
    }

    try {
      const postType = this.getPostType(intent);
      const isVideo = this.isVideoUrl(intent.media_url);

      // Build container body based on post type + media type
      const containerBody: Record<string, string> = {
        caption: intent.content,
        access_token: account.access_token,
      };

      if (postType === 'reel' || (isVideo && postType !== 'story')) {
        containerBody.media_type = 'REELS';
        containerBody.video_url = intent.media_url;
      } else if (postType === 'story' && isVideo) {
        containerBody.media_type = 'STORIES';
        containerBody.video_url = intent.media_url;
      } else if (isVideo) {
        containerBody.media_type = 'REELS';
        containerBody.video_url = intent.media_url;
      } else {
        // Image post
        containerBody.image_url = intent.media_url;
      }

      // 1. Create Media Container
      const containerUrl = `https://graph.facebook.com/v18.0/${account.account_handle}/media`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerBody),
      });
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);

      const creationId = containerData.id;
      logger.info(`[Execution] Instagram container ${creationId} created (type: ${containerBody.media_type || 'IMAGE'})`);

      // 2. Poll for container readiness (videos take longer than images)
      if (isVideo) {
        logger.info(`[Execution] Polling Instagram container status for video...`);
        for (let attempt = 0; attempt < 12; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(
            `https://graph.facebook.com/v18.0/${creationId}?fields=status_code,status&access_token=${account.access_token}`
          );
          const statusData = await statusRes.json();
          logger.info(`[Execution] Instagram container status: ${statusData.status_code}`);
          if (statusData.status_code === 'FINISHED') break;
          if (statusData.status_code === 'ERROR') throw new Error(`Instagram video processing failed: ${statusData.status || 'unknown error'}`);
          if (attempt === 11) throw new Error('Instagram video container timed out after 60s — try again.');
        }
      } else {
        await new Promise(r => setTimeout(r, 3000));
      }

      // 3. Publish the Container
      const publishUrl = `https://graph.facebook.com/v18.0/${account.account_handle}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: account.access_token }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      logger.info(`[Execution] Instagram published: ${publishData.id}`);
      return { success: true, platform: 'instagram', id: publishData.id };
    } catch (err: any) {
      return { success: false, platform: 'instagram', error: err.message };
    }
  }

  private static async postToTikTok(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Posting to TikTok for @${account.account_handle}...`);
    try {
      if (!intent.media_url) throw new Error('TikTok requires a video URL to publish.');
      if (!this.isVideoUrl(intent.media_url)) throw new Error('TikTok only supports video content.');

      const title = (intent.content || intent.title || 'ZoikoVertex Upload').substring(0, 150);

      // Step 1: Fetch video bytes (FILE_UPLOAD avoids domain verification requirement)
      logger.info(`[Execution] Fetching video bytes for TikTok FILE_UPLOAD...`);
      const videoRes = await fetch(intent.media_url);
      if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status} ${videoRes.statusText}`);
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      const videoSize = videoBuffer.length;
      logger.info(`[Execution] TikTok video fetched: ${(videoSize / 1024 / 1024).toFixed(2)}MB`);

      // Step 2: Calculate chunks (TikTok requires 5MB–64MB per chunk, except last)
      const MIN_CHUNK = 5 * 1024 * 1024;
      const MAX_CHUNK = 64 * 1024 * 1024;
      const chunkSize = videoSize <= MIN_CHUNK ? videoSize : Math.min(MAX_CHUNK, Math.max(MIN_CHUNK, videoSize));
      const totalChunks = Math.ceil(videoSize / chunkSize);

      // Step 3: Init FILE_UPLOAD
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: 'SELF_ONLY',
            disable_duet: true,
            disable_comment: true,
            disable_stitch: true,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: chunkSize,
            total_chunk_count: totalChunks,
          },
        }),
      });

      const initData = await initRes.json();
      logger.info({ initData }, '[Execution] TikTok init response');
      const errCode = initData.error?.code;
      if (errCode && errCode !== 'ok') {
        throw new Error(initData.error?.message || `TikTok init error: ${errCode}`);
      }

      const publishId: string = initData.data?.publish_id;
      const uploadUrl: string = initData.data?.upload_url;
      if (!publishId || !uploadUrl) throw new Error('TikTok did not return publish_id or upload_url');
      logger.info(`[Execution] TikTok FILE_UPLOAD init ok — publish_id: ${publishId}, chunks: ${totalChunks}`);

      // Step 4: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, videoSize);
        const chunk = videoBuffer.slice(start, end);

        logger.info(`[Execution] TikTok uploading chunk ${i + 1}/${totalChunks} (bytes ${start}-${end - 1})...`);
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`,
            'Content-Length': String(chunk.length),
          },
          body: chunk,
        });

        if (!uploadRes.ok && uploadRes.status !== 206) {
          const errBody = await uploadRes.text();
          throw new Error(`TikTok chunk ${i + 1} upload failed (${uploadRes.status}): ${errBody}`);
        }
        logger.info(`[Execution] TikTok chunk ${i + 1}/${totalChunks} uploaded (HTTP ${uploadRes.status})`);
      }

      // Step 5: Poll publish status (up to 60s)
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 4000));
        const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ publish_id: publishId }),
        });
        const statusData = await statusRes.json();
        const status: string = statusData.data?.status;
        logger.info(`[Execution] TikTok status [${attempt + 1}/15]: ${status}`);
        if (status === 'PUBLISH_COMPLETE') {
          return { success: true, platform: 'tiktok', id: publishId };
        }
        if (status === 'FAILED') {
          throw new Error(`TikTok publish failed: ${statusData.data?.fail_reason || 'unknown reason'}`);
        }
      }

      throw new Error('TikTok publish timed out — check TikTok app for video status.');
    } catch (err: any) {
      logger.error({ err }, '[Execution] TikTok Error');
      return { success: false, platform: 'tiktok', error: err.message };
    }
  }
}
