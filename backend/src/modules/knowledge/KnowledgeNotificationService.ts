import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { sendEmail } from '../../services/email.service';

type NotificationType =
  | 'review_overdue'
  | 'review_due_soon'
  | 'conflict_detected'
  | 'parsing_failed'
  | 'source_expired'
  | 'quarantine'
  | 'scan_failed'
  | 'approval_required'
  | 'version_created';

interface NotificationInput {
  workspace_id: string;
  source_id?: string;
  collection_id?: string;
  notification_type: NotificationType;
  severity?: string;
  title: string;
  message?: string;
  actionable?: boolean;
  action_url?: string;
}

export class KnowledgeNotificationService {
  static async send(input: NotificationInput): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('knowledge_notifications')
        .insert({
          workspace_id: input.workspace_id,
          source_id: input.source_id || null,
          collection_id: input.collection_id || null,
          notification_type: input.notification_type,
          severity: input.severity || 'medium',
          title: input.title,
          message: input.message || null,
          actionable: input.actionable ?? true,
          action_url: input.action_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      if ((input.severity === 'high' || input.severity === 'critical') && process.env.EMAIL_FROM) {
        const workspaceLabel = input.workspace_id?.slice(0, 8) || 'unknown';
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'ops@zoikovertex.com',
          subject: `[Knowledge] ${input.title}`,
          text: `${input.message || ''}\n\nAction: ${input.action_url || `https://app.zoikovertex.com${input.action_url || ''}`}\n\nWorkspace: ${workspaceLabel}`,
        }).catch((e: any) => logger.warn({ err: e }, 'Failed to send notification email'));
      }

      logger.info({ notification_id: data?.id, type: input.notification_type }, 'Knowledge notification sent');

      internalEventBus.emit('knowledge.notification_sent', {
        workspace_id: input.workspace_id,
        notification_id: data?.id,
        notification_type: input.notification_type,
        severity: input.severity || 'medium',
        source_id: input.source_id,
        collection_id: input.collection_id,
        title: input.title,
        actionable: input.actionable ?? true,
      });
    } catch (error) {
      logger.error({ error, input }, 'Failed to send knowledge notification');
    }
  }

  static async listRecent(workspaceId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('knowledge_notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async acknowledge(id: string): Promise<void> {
    await supabaseAdmin
      .from('knowledge_notifications')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id);
  }

  static async notifyReviewDueSoon(sourceId: string, workspaceId: string, dueDate: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'review_due_soon',
      severity: 'medium',
      title: 'Knowledge review due soon',
      message: `Source review is due on ${new Date(dueDate).toLocaleDateString()}`,
      action_url: `/knowledge/sources/${sourceId}`,
    });
  }

  static async notifyReviewOverdue(sourceId: string, workspaceId: string, dueDate: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'review_overdue',
      severity: 'high',
      title: 'Knowledge review overdue',
      message: `Source review was due on ${new Date(dueDate).toLocaleDateString()}. Immediate action required.`,
      actionable: true,
      action_url: `/knowledge/sources/${sourceId}`,
    });
  }

  static async notifyConflict(workspaceId: string, sourceIdA: string, sourceIdB: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceIdA,
      notification_type: 'conflict_detected',
      severity: 'high',
      title: 'Knowledge conflict detected',
      message: `Conflicting information detected between sources ${sourceIdA} and ${sourceIdB}`,
      actionable: true,
      action_url: `/knowledge/conflicts`,
    });
  }

  static async notifyParsingFailed(workspaceId: string, sourceId: string, errorMsg: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'parsing_failed',
      severity: 'high',
      title: 'Knowledge parsing failed',
      message: errorMsg,
      actionable: true,
      action_url: `/knowledge/sources/${sourceId}`,
    });
  }

  static async notifySourceExpired(workspaceId: string, sourceId: string, title: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'source_expired',
      severity: 'medium',
      title: 'Knowledge source expired',
      message: `"${title}" has expired and has been retired`,
      actionable: true,
      action_url: `/knowledge/sources/${sourceId}`,
    });
  }

  static async notifyQuarantine(workspaceId: string, sourceId: string, reason: string[]): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'quarantine',
      severity: 'critical',
      title: 'Knowledge source quarantined',
      message: `Source blocked: ${reason.join(', ')}`,
      actionable: true,
      action_url: `/knowledge/sources/${sourceId}`,
    });
  }

  static async notifyVersionCreated(workspaceId: string, sourceId: string, version: number, createdBy: string): Promise<void> {
    await this.send({
      workspace_id: workspaceId,
      source_id: sourceId,
      notification_type: 'version_created',
      severity: 'low',
      title: `New version ${version} created`,
      message: `Version ${version} created by ${createdBy}`,
      actionable: false,
      action_url: `/knowledge/sources/${sourceId}/versions`,
    });
  }
}
