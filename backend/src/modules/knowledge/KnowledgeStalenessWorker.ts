import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { KnowledgeNotificationService } from './KnowledgeNotificationService';
import { internalEventBus } from '../../shared/internalEventBus';

export class KnowledgeStalenessWorker {
  static async checkAndRetireExpired(): Promise<number> {
    const now = new Date().toISOString();

    const { data: expired } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, workspace_id, collection_id')
      .eq('status', 'ACTIVE')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', now);

    if (!expired || expired.length === 0) return 0;

    const ids = expired.map((s: any) => s.id);

    await supabaseAdmin
      .from('knowledge_sources')
      .update({
        status: 'EXPIRED',
        updated_at: now,
        metadata: supabaseAdmin.rpc('coalesce_jsonb', {
          base: null,
          update: { expired_at: now, expired_reason: 'expiry_date_reached' },
        } as any) as any,
      })
      .in('id', ids);

    for (const source of expired as any[]) {
      await KnowledgeNotificationService.notifySourceExpired(
        source.workspace_id,
        source.id,
        source.title,
      );

      internalEventBus.emit('knowledge.source_expired', {
        workspace_id: source.workspace_id,
        source_id: source.id,
        collection_id: source.collection_id,
        title: source.title,
        retired_at: now,
      });
    }

    logger.info({ count: expired.length }, 'Expired knowledge sources retired');
    return expired.length;
  }

  static async checkStaleSources(maxAgeDays = 365): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: stale, error } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, title, updated_at, workspace_id')
      .eq('status', 'ACTIVE')
      .lt('updated_at', cutoff)
      .is('expiry_date', null);

    if (error) throw error;
    if (!stale || stale.length === 0) return 0;

    logger.warn({ count: stale.length, maxAgeDays }, 'Stale sources detected (no expiry set)');

    for (const source of stale as any[]) {
      await KnowledgeNotificationService.send({
        workspace_id: source.workspace_id,
        source_id: source.id,
        notification_type: 'source_expired',
        severity: 'medium',
        title: 'Source may be stale',
        message: `"${source.title}" last updated ${new Date(source.updated_at).toLocaleDateString()}. Consider reviewing or setting an expiry date.`,
        actionable: true,
        action_url: `/knowledge/sources/${source.id}`,
      });
    }

    return stale.length;
  }
}
