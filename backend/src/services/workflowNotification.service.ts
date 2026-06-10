import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../shared/logger';
import { sendEmail } from './email.service';
import { env } from '../config/env';

// ─── Types ──────────────────────────────────────────────────────────────────

export type WorkflowEventType =
  | 'approval_pending'
  | 'approval_completed'
  | 'simulation_blocked'
  | 'dependency_critical_failure'
  | 'workflow_activated'
  | 'workflow_paused'
  | 'workflow_retired'
  | 'workflow_failed'
  | 'sla_breach';

export type NotificationChannel = 'in_app' | 'email' | 'slack' | 'webhook';

export interface WorkflowNotificationEvent {
  id: string;
  event_type: WorkflowEventType;
  workflow_id: string;
  workflow_name: string;
  version_id?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  channel: NotificationChannel;
  recipient_user_id?: string;
  recipient_role?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  delivered: boolean;
  delivery_error?: string;
}

export interface ChannelPayload {
  in_app: {
    title: string;
    body: string;
    user_id: string;
    metadata: Record<string, unknown>;
  };
  email: {
    subject: string;
    html_body: string;
    to: string[];
    metadata: Record<string, unknown>;
  };
  slack: {
    channel: string;
    text: string;
    blocks: unknown[];
    metadata: Record<string, unknown>;
  };
  webhook: {
    url: string;
    payload: Record<string, unknown>;
  };
}

const EVENT_SEVERITY: Record<WorkflowEventType, 'info' | 'warning' | 'critical'> = {
  approval_pending: 'info',
  approval_completed: 'info',
  simulation_blocked: 'warning',
  dependency_critical_failure: 'critical',
  workflow_activated: 'info',
  workflow_paused: 'info',
  workflow_retired: 'info',
  workflow_failed: 'critical',
  sla_breach: 'critical',
};

function buildTitle(eventType: WorkflowEventType, workflowName: string): string {
  const titles: Record<WorkflowEventType, string> = {
    approval_pending: `Approval Required: ${workflowName}`,
    approval_completed: `Approval Complete: ${workflowName}`,
    simulation_blocked: `Simulation Blocked: ${workflowName}`,
    dependency_critical_failure: `Critical Dependency Failure: ${workflowName}`,
    workflow_activated: `Workflow Activated: ${workflowName}`,
    workflow_paused: `Workflow Paused: ${workflowName}`,
    workflow_retired: `Workflow Retired: ${workflowName}`,
    workflow_failed: `Workflow Failed: ${workflowName}`,
    sla_breach: `SLA Breach: ${workflowName}`,
  };
  return titles[eventType];
}

function buildMessage(eventType: WorkflowEventType, workflowName: string, metadata: Record<string, unknown>): string {
  const msgs: Record<WorkflowEventType, string> = {
    approval_pending: `${workflowName} requires your approval. ${(metadata.required_roles as string[])?.length ? `Required roles: ${(metadata.required_roles as string[]).join(', ')}.` : ''}`,
    approval_completed: `${workflowName} has completed the approval process. Status: ${metadata.status || 'approved'}.`,
    simulation_blocked: `Simulation for ${workflowName} was blocked. ${(metadata.blocks as string[])?.length ? `Issues: ${(metadata.blocks as string[]).join('; ')}` : 'Review simulation results for details.'}`,
    dependency_critical_failure: `Critical dependency failure detected for ${workflowName}. ${(metadata.failed_deps as string[])?.length ? `Affected: ${(metadata.failed_deps as string[]).join(', ')}` : 'Check dependency health for details.'}`,
    workflow_activated: `${workflowName} has been activated and is now running.`,
    workflow_paused: `${workflowName} has been paused.`,
    workflow_retired: `${workflowName} has been retired.`,
    workflow_failed: `${workflowName} has failed. ${metadata.error || 'Check workflow logs for details.'}`,
    sla_breach: `${workflowName} has breached its SLA. ${metadata.sla_info || 'Review performance metrics.'}`,
  };
  return msgs[eventType];
}

// ─── In-App Notification ────────────────────────────────────────────────────

export async function createInAppNotification(params: {
  eventType: WorkflowEventType;
  workflowId: string;
  workflowName: string;
  versionId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const id = uuidv4();
  const severity = EVENT_SEVERITY[params.eventType];
  const title = buildTitle(params.eventType, params.workflowName);
  const message = buildMessage(params.eventType, params.workflowName, params.metadata || {});

  const { error } = await supabaseAdmin.from('notifications').insert({
    id,
    user_id: params.userId,
    title,
    message,
    type: `workflow_${params.eventType}`,
    category: 'workflow',
    severity,
    read: false,
    metadata: {
      event_type: params.eventType,
      workflow_id: params.workflowId,
      workflow_name: params.workflowName,
      version_id: params.versionId || null,
      ...(params.metadata || {}),
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    logger.error({ err: error }, 'Failed to create in-app notification');
    throw error;
  }

  return id;
}

// ─── Multi-channel notification ─────────────────────────────────────────────

export async function createWorkflowNotification(params: {
  eventType: WorkflowEventType;
  workflowId: string;
  workflowName: string;
  versionId?: string;
  channels: NotificationChannel[];
  recipientUserIds?: string[];
  recipientRoles?: string[];
  metadata?: Record<string, unknown>;
}): Promise<WorkflowNotificationEvent[]> {
  const events: WorkflowNotificationEvent[] = [];
  const now = new Date().toISOString();
  const severity = EVENT_SEVERITY[params.eventType];
  const title = buildTitle(params.eventType, params.workflowName);
  const message = buildMessage(params.eventType, params.workflowName, params.metadata || {});

  for (const channel of params.channels) {
    if (channel === 'in_app') {
      if (params.recipientUserIds?.length) {
        for (const userId of params.recipientUserIds) {
          try {
            const nid = await createInAppNotification({
              eventType: params.eventType,
              workflowId: params.workflowId,
              workflowName: params.workflowName,
              versionId: params.versionId,
              userId,
              metadata: params.metadata,
            });
            events.push({
              id: nid,
              event_type: params.eventType,
              workflow_id: params.workflowId,
              workflow_name: params.workflowName,
              version_id: params.versionId,
              severity,
              title,
              message,
              channel,
              recipient_user_id: userId,
              metadata: params.metadata || {},
              created_at: now,
              delivered: true,
            });
          } catch (err: any) {
            logger.error({ err }, 'Failed to create in-app notification');
            events.push({
              id: uuidv4(),
              event_type: params.eventType,
              workflow_id: params.workflowId,
              workflow_name: params.workflowName,
              version_id: params.versionId,
              severity,
              title,
              message,
              channel,
              recipient_user_id: userId,
              metadata: params.metadata || {},
              created_at: now,
              delivered: false,
              delivery_error: err?.message,
            });
          }
        }
      }
    }

    if (channel === 'email') {
      const userIds = params.recipientUserIds || [];
      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name')
          .in('id', userIds);

        for (const user of users || []) {
          try {
            if (user.email) {
              await sendEmail({
                to: user.email,
                subject: title,
                text: `${title}\n\n${message}\n\nWorkflow: ${params.workflowName}\nType: ${params.eventType}\nSeverity: ${severity}`,
              });
            }
            events.push({
              id: uuidv4(),
              event_type: params.eventType,
              workflow_id: params.workflowId,
              workflow_name: params.workflowName,
              version_id: params.versionId,
              severity,
              title,
              message,
              channel: 'email',
              recipient_user_id: user.id,
              metadata: params.metadata || {},
              created_at: now,
              delivered: true,
            });
          } catch (err: any) {
            logger.error({ err, userId: user.id }, 'Failed to send email notification');
            events.push({
              id: uuidv4(),
              event_type: params.eventType,
              workflow_id: params.workflowId,
              workflow_name: params.workflowName,
              version_id: params.versionId,
              severity,
              title,
              message,
              channel: 'email',
              recipient_user_id: user.id,
              metadata: params.metadata || {},
              created_at: now,
              delivered: false,
              delivery_error: err?.message,
            });
          }
        }
      }
    }

    if (channel === 'slack') {
      const webhookUrl = env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          const slackPayload = {
            text: title,
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: title } },
              { type: 'section', text: { type: 'mrkdwn', text: message } },
              { type: 'context', elements: [{ type: 'mrkdwn', text: `*Workflow:* ${params.workflowName} | *Type:* ${params.eventType} | *Severity:* ${severity}` }] },
            ],
          };
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload),
          });
          if (!resp.ok) {
            throw new Error(`Slack webhook responded with ${resp.status}`);
          }
          events.push({
            id: uuidv4(),
            event_type: params.eventType,
            workflow_id: params.workflowId,
            workflow_name: params.workflowName,
            version_id: params.versionId,
            severity,
            title,
            message,
            channel: 'slack',
            recipient_role: params.recipientRoles?.join(', '),
            metadata: params.metadata || {},
            created_at: now,
            delivered: true,
          });
        } catch (err: any) {
          logger.error({ err }, 'Failed to deliver Slack notification');
          events.push({
            id: uuidv4(),
            event_type: params.eventType,
            workflow_id: params.workflowId,
            workflow_name: params.workflowName,
            version_id: params.versionId,
            severity,
            title,
            message,
            channel: 'slack',
            recipient_role: params.recipientRoles?.join(', '),
            metadata: params.metadata || {},
            created_at: now,
            delivered: false,
            delivery_error: err?.message,
          });
        }
      } else {
        logger.warn('[notifications] SLACK_WEBHOOK_URL not configured — skipping Slack delivery');
        events.push({
          id: uuidv4(),
          event_type: params.eventType,
          workflow_id: params.workflowId,
          workflow_name: params.workflowName,
          version_id: params.versionId,
          severity,
          title,
          message,
          channel: 'slack',
          recipient_role: params.recipientRoles?.join(', '),
          metadata: params.metadata || {},
          created_at: now,
          delivered: false,
          delivery_error: 'Slack webhook URL not configured',
        });
      }
    }

    if (channel === 'webhook') {
      const webhookUrl = (params.metadata?.webhook_url as string) || (params.metadata?.url as string);
      if (webhookUrl) {
        try {
          const webhookPayload = {
            event_type: params.eventType,
            workflow_id: params.workflowId,
            workflow_name: params.workflowName,
            severity,
            title,
            message,
            metadata: params.metadata || {},
            timestamp: now,
          };
          const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });
          if (!resp.ok) {
            throw new Error(`Webhook responded with ${resp.status}`);
          }
          events.push({
            id: uuidv4(),
            event_type: params.eventType,
            workflow_id: params.workflowId,
            workflow_name: params.workflowName,
            version_id: params.versionId,
            severity,
            title,
            message,
            channel: 'webhook',
            recipient_role: params.recipientRoles?.join(', '),
            metadata: params.metadata || {},
            created_at: now,
            delivered: true,
          });
        } catch (err: any) {
          logger.error({ err }, 'Failed to deliver webhook notification');
          events.push({
            id: uuidv4(),
            event_type: params.eventType,
            workflow_id: params.workflowId,
            workflow_name: params.workflowName,
            version_id: params.versionId,
            severity,
            title,
            message,
            channel: 'webhook',
            recipient_role: params.recipientRoles?.join(', '),
            metadata: params.metadata || {},
            created_at: now,
            delivered: false,
            delivery_error: err?.message,
          });
        }
      } else {
        events.push({
          id: uuidv4(),
          event_type: params.eventType,
          workflow_id: params.workflowId,
          workflow_name: params.workflowName,
          version_id: params.versionId,
          severity,
          title,
          message,
          channel: 'webhook',
          recipient_role: params.recipientRoles?.join(', '),
          metadata: params.metadata || {},
          created_at: now,
          delivered: false,
          delivery_error: 'No webhook URL provided in metadata',
        });
      }
    }
  }

  return events;
}

// ─── Build channel payloads (for external delivery) ─────────────────────────

export function buildEmailPayload(
  event: WorkflowNotificationEvent,
): ChannelPayload['email'] {
  return {
    subject: event.title,
    html_body: `<h2>${event.title}</h2><p>${event.message}</p><pre>${JSON.stringify(event.metadata, null, 2)}</pre>`,
    to: [],
    metadata: event.metadata,
  };
}

export function buildSlackPayload(
  event: WorkflowNotificationEvent,
): ChannelPayload['slack'] {
  return {
    channel: '#workflow-alerts',
    text: event.title,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: event.title } },
      { type: 'section', text: { type: 'mrkdwn', text: event.message } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `*Workflow:* ${event.workflow_name} | *Type:* ${event.event_type} | *Severity:* ${event.severity}` }] },
    ],
    metadata: event.metadata,
  };
}

// ─── Get pending/undelivered notifications ──────────────────────────────────

export async function listPendingEmailNotifications(): Promise<WorkflowNotificationEvent[]> {
  return [];
}
