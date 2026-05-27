/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { broadcastWebhookEvent } from '../integrations/apiWebhookController';
import { AutoCampaignBoostService } from '../campaigns/autoCampaignBoostService';

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

      // 3. Update final status — also save platform post ID if Meta publish succeeded
      const metaResult = results.find(r => r.success && r.id && ['facebook', 'instagram'].includes(r.platform));
      await supabaseAdmin
        .from('publish_intents')
        .update({
          status: allSuccessful ? 'PUBLISHED' : 'FAILED',
          feedback: allSuccessful ? null : (firstError || 'One or more platforms failed to publish.'),
          ...(metaResult?.id ? { platform_post_id: metaResult.id } : {}),
        })
        .eq('id', intentId);

      // 4. Auto-retire media vault record on full success.
      // Only the DB row is removed — the file stays in Supabase Storage so that
      // publish_intents.media_url (and inbox/comment previews) keep working.
      // If even one platform failed we leave the record untouched.
      if (allSuccessful) {
        const urlsToClean: string[] = [
          ...(intent.media_url ? [intent.media_url] : []),
          ...(Array.isArray(intent.media_urls) ? intent.media_urls : []),
        ].filter(Boolean);

        if (urlsToClean.length > 0) {
          // Match on the primary `url` column; the asset is keyed by its first URL.
          const { error: cleanErr } = await supabaseAdmin
            .from('media_library')
            .delete()
            .in('url', urlsToClean);

          if (cleanErr) {
            // Non-fatal — log and continue. Storage file is unaffected.
            logger.warn({ cleanErr, intentId }, '[Execution] Media vault cleanup failed (non-fatal)');
          } else {
            logger.info(`[Execution] Media vault record(s) retired after successful publish of ${intentId}`);
          }
        }
      }

      // 5. Auto-boost: if post published on an ACTIVE campaign, trigger immediately
      if (allSuccessful && intent.campaign_id) {
        AutoCampaignBoostService.triggerPostBoost(intentId, intent.campaign_id, intent.workspace_id)
          .catch(err => logger.warn({ err, intentId }, '[Execution] Auto-boost trigger failed (non-fatal)'));
      }

      // 6. Broadcast webhook event
      broadcastWebhookEvent(intent.workspace_id, allSuccessful ? 'post.published' : 'post.failed', {
        intent_id: intentId,
        platform: intent.platform,
        content: (intent.content || '').substring(0, 500),
        status: allSuccessful ? 'PUBLISHED' : 'FAILED',
        error: allSuccessful ? undefined : (firstError || 'One or more platforms failed'),
        published_at: new Date().toISOString(),
      }).catch(() => {});

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
      }
      return { success: false, platform: account.platform, error: `Unsupported platform: ${account.platform}` };
    } catch (err: any) {
      logger.error({ err }, `[Execution] Error publishing to ${account.platform}`);
      return { success: false, platform: account.platform, error: err.message || 'Unknown error' };
    }
  }

  private static async uploadTwitterMedia(mediaUrl: string, accessToken: string): Promise<string | null> {
    try {
      const imgRes = await fetch(mediaUrl);
      if (!imgRes.ok) throw new Error(`Failed to download media: ${imgRes.status}`);
      const buffer = await imgRes.arrayBuffer();
      const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

      // v2 media upload endpoint with multipart/form-data
      const form = new FormData();
      form.append('media', new Blob([buffer], { type: mimeType }), 'media');
      form.append('media_category', 'tweet_image');
      form.append('media_type', mimeType);

      const uploadRes = await fetch('https://api.x.com/2/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });

      const uploadData: any = await uploadRes.json();
      if (!uploadRes.ok || uploadData.errors) {
        logger.warn({ status: uploadRes.status, uploadData }, '[Execution] Twitter media upload failed — posting without image');
        return null;
      }

      const mediaId = uploadData.data?.id ?? uploadData.media_id_string ?? null;
      logger.info(`[Execution] Twitter media uploaded: ${mediaId}`);
      return mediaId as string;
    } catch (err: any) {
      logger.warn({ err }, '[Execution] Twitter media upload error — posting without image');
      return null;
    }
  }

  private static async postToTwitter(intent: any, account: any): Promise<PublishResult> {
    logger.info(`[Execution] Sending tweet for ${account.account_handle}...`);
    try {
      const body: any = { text: intent.content };

      // Upload media if present
      if (intent.media_url) {
        const mediaId = await ExecutionService.uploadTwitterMedia(intent.media_url, account.access_token);
        if (mediaId) {
          body.media = { media_ids: [mediaId] };
          logger.info(`[Execution] Attaching media ${mediaId} to tweet`);
        }
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.access_token}`,
        },
        body: JSON.stringify(body),
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

    const pBase = process.env.PINTEREST_API_BASE || 'https://api.pinterest.com';

    try {
      // 1. Fetch boards — auto-create a default board if none exist
      const boardsRes = await fetch(`${pBase}/v5/boards`, {
        headers: { 'Authorization': `Bearer ${account.access_token}` },
      });
      const boardsData = await boardsRes.json();

      let boardId = '';

      const existingBoard = boardsData.items?.find((b: any) => b.name === 'ZoikoVertex') || boardsData.items?.[0];

      if (existingBoard) {
        boardId = existingBoard.id;
        logger.info(`[Execution] Pinterest using existing board: ${boardId}`);
      } else {
        // No boards listed — create one. Sandbox has global name uniqueness so fall back to a
        // unique name if the default is already taken by a different sandbox session.
        const nameCandidates = ['ZoikoVertex', `ZoikoVertex_${Date.now()}`];
        let created = false;

        for (const name of nameCandidates) {
          logger.info(`[Execution] Pinterest creating board "${name}"...`);
          const createRes = await fetch(`${pBase}/v5/boards`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${account.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description: 'Posts published via ZoikoVertex', privacy: 'PUBLIC' }),
          });
          const createData = await createRes.json();

          if (createRes.ok && !createData.code) {
            boardId = createData.id;
            logger.info(`[Execution] Pinterest board created: ${boardId} ("${name}")`);
            created = true;
            break;
          }

          const msg: string = createData.message || '';
          if (msg.toLowerCase().includes('already have a board')) {
            logger.warn(`[Execution] Pinterest board name "${name}" taken — trying next...`);
            continue;
          }

          throw new Error(`Failed to create Pinterest board: ${msg || JSON.stringify(createData)}`);
        }

        if (!created) throw new Error('Could not create a Pinterest board — all name candidates taken.');
      }

      // 2. Build media_source — image vs video
      let mediaSource: Record<string, string>;

      if (intent.media_url && this.isVideoUrl(intent.media_url)) {
        // ── Video pin: upload via Pinterest v5 media API ──────────────────────
        logger.info(`[Execution] Pinterest video upload flow starting...`);

        // 2a. Register a video upload slot
        const registerRes = await fetch(`${pBase}/v5/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ media_type: 'video' }),
        });
        const registerData = await registerRes.json();
        if (registerData.code) throw new Error(`Pinterest media register failed: ${registerData.message || JSON.stringify(registerData)}`);

        const mediaId: string = registerData.media_id;
        const uploadUrl: string = registerData.upload_url;
        const uploadParams: Record<string, string> = registerData.upload_parameters || {};
        logger.info(`[Execution] Pinterest media_id: ${mediaId}`);

        // 2b. Fetch video bytes
        const videoRes = await fetch(intent.media_url);
        if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        // 2c. Upload to Pinterest's S3-backed endpoint (multipart/form-data)
        const form = new FormData();
        for (const [key, value] of Object.entries(uploadParams)) {
          form.append(key, value);
        }
        form.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4');

        const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form as any });
        if (!uploadRes.ok) {
          const body = await uploadRes.text();
          throw new Error(`Pinterest video upload failed (${uploadRes.status}): ${body}`);
        }
        logger.info(`[Execution] Pinterest video upload complete (HTTP ${uploadRes.status})`);

        // 2d. Poll until Pinterest finishes processing (up to 90s)
        for (let attempt = 0; attempt < 18; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(`${pBase}/v5/media/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${account.access_token}` },
          });
          const statusData = await statusRes.json();
          logger.info(`[Execution] Pinterest media status [${attempt + 1}/18]: ${statusData.status}`);
          if (statusData.status === 'succeeded') break;
          if (statusData.status === 'failed') throw new Error(`Pinterest video processing failed for media_id ${mediaId}`);
          if (attempt === 17) throw new Error('Pinterest video processing timed out after 90s');
        }

        mediaSource = { source_type: 'video_id', media_id: mediaId };

      } else if (intent.media_url) {
        // ── Image pin ─────────────────────────────────────────────────────────
        mediaSource = { source_type: 'image_url', url: intent.media_url };
      } else {
        throw new Error('Pinterest requires a media URL (image or video) to create a pin.');
      }

      // 3. Create the Pin
      const pinBody: Record<string, unknown> = {
        board_id: boardId,
        media_source: mediaSource,
        title: (intent.title || '').substring(0, 100),
        description: (intent.content || '').substring(0, 500),
      };

      const response = await fetch(`${pBase}/v5/pins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pinBody),
      });

      const data = await response.json();
      if (!response.ok || data.code) {
        throw new Error(data.message || JSON.stringify(data));
      }

      logger.info(`[Execution] Pinterest pin created: ${data.id}`);
      return { success: true, platform: 'pinterest', id: data.id };
    } catch (err: any) {
      logger.error({ err }, '[Execution] Pinterest Error');
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

}
