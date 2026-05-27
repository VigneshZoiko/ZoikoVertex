import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

// ============================================================
// AutoCampaignBoostService
//
// Auto-boost orchestration for posts published under an ACTIVE
// campaign (Meta Ads integration — migration 38_campaign_boosts).
//
// Called fire-and-forget (non-fatal) from:
//   - executionService  → triggerPostBoost on successful publish
//   - campaignsV2Controller → processActiveCampaignPosts on launch
//
// Responsibility here: detect a boostable published post and
// record a PENDING `campaign_boosts` row capturing the intent.
// The actual Meta ad-creative creation is performed by the boost
// pipeline in `adsController` (createBoost / syncBoostMetrics),
// which owns the Meta Graph API calls and ad-account resolution.
// This keeps auto-boost capture side-effect-safe and idempotent;
// it never throws into the publish path.
// ============================================================

// Platforms with a Meta Ads boost path today. Other platforms are
// captured as a no-op until their ads integration lands.
const BOOSTABLE_PLATFORMS = ['facebook', 'instagram'];

export class AutoCampaignBoostService {
  /**
   * Trigger an auto-boost for a single published post. Idempotent:
   * skips if a boost already exists for the intent. Non-fatal.
   */
  static async triggerPostBoost(
    intentId: string,
    campaignId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      // Idempotency — never double-boost the same published post.
      const { data: existing } = await supabaseAdmin
        .from('campaign_boosts')
        .select('id')
        .eq('publish_intent_id', intentId)
        .maybeSingle();

      if (existing) {
        logger.info({ intentId, campaignId }, '[AutoBoost] Boost already exists for intent — skipping');
        return;
      }

      const { data: intent, error: intentErr } = await supabaseAdmin
        .from('publish_intents')
        .select('id, platform, status, platform_post_id')
        .eq('id', intentId)
        .eq('workspace_id', workspaceId)
        .single();

      if (intentErr || !intent) {
        logger.warn({ intentId, err: intentErr?.message }, '[AutoBoost] Publish intent not found — skipping');
        return;
      }

      if (intent.status !== 'PUBLISHED') {
        logger.info({ intentId, status: intent.status }, '[AutoBoost] Intent not published — skipping');
        return;
      }

      if (!BOOSTABLE_PLATFORMS.includes(String(intent.platform))) {
        logger.info({ intentId, platform: intent.platform }, '[AutoBoost] Platform not boostable — skipping');
        return;
      }

      const { error: insertErr } = await supabaseAdmin
        .from('campaign_boosts')
        .insert([{
          workspace_id: workspaceId,
          campaign_id: campaignId,
          publish_intent_id: intentId,
          platform: intent.platform,
          boost_type: 'POST',
          status: 'PENDING',
          objective: 'POST_ENGAGEMENT',
        }]);

      if (insertErr) {
        logger.warn({ intentId, err: insertErr.message }, '[AutoBoost] Failed to queue boost');
        return;
      }

      logger.info({ intentId, campaignId, platform: intent.platform }, '[AutoBoost] Queued PENDING boost for published post');
    } catch (err) {
      logger.warn({ err, intentId, campaignId }, '[AutoBoost] triggerPostBoost failed (non-fatal)');
    }
  }

  /**
   * On campaign launch, queue boosts for any posts already published
   * under the campaign. Non-fatal; delegates per-post to triggerPostBoost.
   */
  static async processActiveCampaignPosts(
    campaignId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      const { data: intents, error } = await supabaseAdmin
        .from('publish_intents')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'PUBLISHED');

      if (error) {
        logger.warn({ campaignId, err: error.message }, '[AutoBoost] Could not load published campaign posts');
        return;
      }

      if (!intents || intents.length === 0) {
        logger.info({ campaignId }, '[AutoBoost] No published posts to boost on launch');
        return;
      }

      for (const intent of intents) {
        await AutoCampaignBoostService.triggerPostBoost(intent.id, campaignId, workspaceId);
      }
    } catch (err) {
      logger.warn({ err, campaignId }, '[AutoBoost] processActiveCampaignPosts failed (non-fatal)');
    }
  }
}
