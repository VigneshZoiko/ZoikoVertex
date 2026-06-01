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
  ): Promise<{ done: true; checksAdded: string[] }> {
    const checksAdded: string[] = [];
    try {
      // Idempotency — never double-boost the same published post.
      const { data: existing } = await supabaseAdmin
        .from('campaign_boosts')
        .select('id')
        .eq('publish_intent_id', intentId)
        .maybeSingle();

      if (existing) {
        logger.info({ intentId, campaignId }, '[AutoBoost] Boost already exists for intent — skipping');
        return { done: true, checksAdded };
      }

      const { data: intent, error: intentErr } = await supabaseAdmin
        .from('publish_intents')
        .select('id, platform, status, platform_post_id')
        .eq('id', intentId)
        .eq('workspace_id', workspaceId)
        .single();

      if (intentErr || !intent) {
        logger.warn({ intentId, err: intentErr?.message }, '[AutoBoost] Publish intent not found — skipping');
        return { done: true, checksAdded };
      }

      if (intent.status !== 'PUBLISHED') {
        logger.info({ intentId, status: intent.status }, '[AutoBoost] Intent not published — skipping');
        return { done: true, checksAdded };
      }

      if (!BOOSTABLE_PLATFORMS.includes(String(intent.platform))) {
        logger.info({ intentId, platform: intent.platform }, '[AutoBoost] Platform not boostable — skipping');
        return { done: true, checksAdded };
      }

      // ── CHECK 1: auto_boost_enabled ────────────────────────────────────────
      // Fetch campaign fields needed for budget calculation and the enabled flag.
      const { data: campaign, error: campaignErr } = await supabaseAdmin
        .from('campaigns')
        .select('auto_boost_enabled, boost_per_post_budget, budget_total, start_at, end_at, budget_currency, name, targeting, objective, boost_settings')
        .eq('id', campaignId)
        .eq('workspace_id', workspaceId)
        .single();

      if (campaignErr || !campaign) {
        logger.warn({ campaignId, err: campaignErr?.message }, '[AutoBoost] Campaign not found — skipping');
        return { done: true, checksAdded };
      }

      checksAdded.push('auto_boost_enabled');
      if (!campaign.auto_boost_enabled) {
        logger.info({ campaignId }, '[AutoBoost] auto_boost_enabled=false — skipping silently');
        return { done: true, checksAdded };
      }

      // ── CHECK 2: wallet balance > 0 ────────────────────────────────────────
      checksAdded.push('wallet_balance');
      const { data: wallet, error: walletErr } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (walletErr) {
        logger.warn({ workspaceId, err: walletErr.message }, '[AutoBoost] Could not fetch wallet — skipping');
        return { done: true, checksAdded };
      }

      const balance = wallet?.balance ?? 0;
      if (balance <= 0) {
        logger.warn({ intentId, workspaceId, balance }, '[AutoBoost] Wallet balance is 0 — setting LOW_BALANCE and skipping');
        await supabaseAdmin
          .from('publish_intents')
          .update({ auto_boost_status: 'LOW_BALANCE' })
          .eq('id', intentId);
        return { done: true, checksAdded };
      }

      // ── BUDGET: resolve budget_daily ───────────────────────────────────────
      // Prefer explicit per-post budget; fall back to budget_total / campaign days.
      checksAdded.push('budget_daily');
      let budgetDaily: number | null = campaign.boost_per_post_budget ?? null;
      if (!budgetDaily && campaign.budget_total && campaign.start_at && campaign.end_at) {
        const startMs = new Date(campaign.start_at).getTime();
        const endMs = new Date(campaign.end_at).getTime();
        const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
        budgetDaily = Number((campaign.budget_total / durationDays).toFixed(2));
      }

      // ── INSERT campaign_boost ──────────────────────────────────────────────
      const { error: insertErr } = await supabaseAdmin
        .from('campaign_boosts')
        .insert([{
          workspace_id: workspaceId,
          campaign_id: campaignId,
          publish_intent_id: intentId,
          platform: intent.platform,
          boost_type: 'POST',
          status: 'PENDING',
          objective: campaign.objective ?? 'POST_ENGAGEMENT',
          ...(budgetDaily !== null && { budget_daily: budgetDaily }),
          ...(campaign.budget_currency && { budget_currency: campaign.budget_currency }),
          ...(campaign.targeting && { targeting: campaign.targeting }),
          ...(campaign.boost_settings && { boost_settings: campaign.boost_settings }),
        }]);

      if (insertErr) {
        logger.warn({ intentId, err: insertErr.message }, '[AutoBoost] Failed to queue boost');
        return { done: true, checksAdded };
      }

      // ── CHECK 4: mark intent as QUEUED ────────────────────────────────────
      checksAdded.push('auto_boost_status_queued');
      const { error: updateErr } = await supabaseAdmin
        .from('publish_intents')
        .update({ auto_boost_status: 'QUEUED', auto_boost_at: new Date().toISOString() })
        .eq('id', intentId);

      if (updateErr) {
        logger.warn({ intentId, err: updateErr.message }, '[AutoBoost] Boost queued but failed to update intent status');
      }

      logger.info({ intentId, campaignId, platform: intent.platform, budgetDaily }, '[AutoBoost] Queued PENDING boost for published post');
    } catch (err) {
      logger.warn({ err, intentId, campaignId }, '[AutoBoost] triggerPostBoost failed (non-fatal)');
    }
    return { done: true, checksAdded };
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
