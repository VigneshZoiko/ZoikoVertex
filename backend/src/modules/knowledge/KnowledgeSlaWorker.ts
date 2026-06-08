import { supabaseAdmin } from '../../shared/supabase';
import { KnowledgeNotificationService } from './KnowledgeNotificationService';

export class KnowledgeSlaWorker {
  static async checkReviewSLAs(): Promise<{
    dueSoon: number;
    overdue: number;
    escalated: number;
  }> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const dueSoonCount = await this.processDueSoon(now, threeDaysFromNow);
    const overdueCount = await this.processOverdue(now);
    const escalatedCount = await this.processEscalation(now);

    return { dueSoon: dueSoonCount, overdue: overdueCount, escalated: escalatedCount };
  }

  private static async processDueSoon(now: Date, threeDaysFromNow: Date): Promise<number> {
    const { data: dueSoon } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, review_date, workspace_id, title')
      .eq('status', 'ACTIVE')
      .not('review_date', 'is', null)
      .gte('review_date', now.toISOString())
      .lte('review_date', threeDaysFromNow.toISOString())
      .neq('review_sla_status', 'due_soon');

    if (!dueSoon || dueSoon.length === 0) return 0;

    for (const source of dueSoon as any[]) {
      await supabaseAdmin
        .from('knowledge_sources')
        .update({ review_sla_status: 'due_soon' })
        .eq('id', source.id);

      await KnowledgeNotificationService.notifyReviewDueSoon(source.id, source.workspace_id, source.review_date);
    }

    return dueSoon.length;
  }

  private static async processOverdue(now: Date): Promise<number> {
    const { data: overdue } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, review_date, workspace_id, title')
      .eq('status', 'ACTIVE')
      .not('review_date', 'is', null)
      .lt('review_date', now.toISOString())
      .neq('review_sla_status', 'overdue')
      .neq('review_sla_status', 'escalated');

    if (!overdue || overdue.length === 0) return 0;

    for (const source of overdue as any[]) {
      await supabaseAdmin
        .from('knowledge_sources')
        .update({ review_sla_status: 'overdue' })
        .eq('id', source.id);

      await KnowledgeNotificationService.notifyReviewOverdue(source.id, source.workspace_id, source.review_date);
    }

    return overdue.length;
  }

  private static async processEscalation(now: Date): Promise<number> {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: toEscalate } = await supabaseAdmin
      .from('knowledge_sources')
      .select('id, review_date, workspace_id, title, review_escalated_to')
      .eq('status', 'ACTIVE')
      .not('review_date', 'is', null)
      .lt('review_date', sevenDaysAgo.toISOString())
      .eq('review_sla_status', 'overdue');

    if (!toEscalate || toEscalate.length === 0) return 0;

    for (const source of toEscalate as any[]) {
      await supabaseAdmin
        .from('knowledge_sources')
        .update({
          review_sla_status: 'escalated',
          review_escalated_at: now.toISOString(),
          review_escalated_to: 'admin', 
        })
        .eq('id', source.id);

      await KnowledgeNotificationService.send({
        workspace_id: source.workspace_id,
        source_id: source.id,
        notification_type: 'review_overdue',
        severity: 'critical',
        title: 'Review overdue — escalated to admin',
        message: `Source "${source.title}" review has been overdue for over 7 days. Escalated to admin.`,
        action_url: `/knowledge/sources/${source.id}`,
      });
    }

    return toEscalate.length;
  }
}
