import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

function isPrivateUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }
  const host = parsed.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(parsed.protocol)) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fd')) return true;
  const ip = host.startsWith('[') ? host.slice(1, -1) : host;
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

export type SubscriptionType = 'sse' | 'webhook' | 'siem';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface Subscription {
  id: string;
  workspace_id: string;
  name: string;
  subscription_type: SubscriptionType;
  endpoint_url?: string;
  secret?: string;
  event_filters?: {
    event_types?: string[];
    risk_levels?: string[];
    categories?: string[];
    min_risk?: string;
  };
  status: SubscriptionStatus;
  created_by: string;
  created_at: string;
  last_delivery_at?: string;
  delivery_count?: number;
}

export interface CreateSubscriptionParams {
  workspace_id: string;
  name: string;
  subscription_type: SubscriptionType;
  endpoint_url?: string;
  secret?: string;
  event_filters?: Record<string, unknown>;
  created_by: string;
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
  const id = uuidv4();

  const { data, error } = await supabaseAdmin
    .from('audit_subscriptions')
    .insert({
      id,
      workspace_id: params.workspace_id,
      name: params.name,
      subscription_type: params.subscription_type,
      endpoint_url: params.endpoint_url || null,
      secret: params.secret || null,
      event_filters: params.event_filters || {},
      created_by: params.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
}

export async function listSubscriptions(workspaceId: string): Promise<Subscription[]> {
  const { data, error } = await supabaseAdmin
    .from('audit_subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Subscription[];
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from('audit_subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

export async function deleteSubscription(id: string, workspaceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('audit_subscriptions')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) throw error;
}

export async function deliverToSubscription(
  subscription: Subscription,
  event: Record<string, unknown>,
): Promise<{ success: boolean; statusCode?: number }> {
  if (!subscription.endpoint_url || !subscription.secret) {
    return { success: false };
  }

  const deliveredAt = new Date().toISOString();
  const signature = crypto.createHmac('sha256', subscription.secret).update(JSON.stringify(event)).digest('hex');

  const payload = {
    event,
    subscription_id: subscription.id,
    delivered_at: deliveredAt,
    signature,
  };

  if (isPrivateUrl(subscription.endpoint_url || '')) {
    logger.warn({ subId: subscription.id }, '[AuditStream] SSRF blocked — private endpoint URL');
    return { success: false, statusCode: 400 };
  }

  try {
    const response = await fetch(subscription.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Signature': `sha256=${signature}`,
        'User-Agent': 'ZoikoVertex-AuditStream/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const success = response.ok;

    await supabaseAdmin
      .from('audit_subscriptions')
      .update({
        last_delivery_at: deliveredAt,
        delivery_count: (subscription.delivery_count || 0) + 1,
      })
      .eq('id', subscription.id);

    return { success, statusCode: response.status };
  } catch (err) {
    logger.warn({ subscriptionId: subscription.id, err }, '[auditStream] delivery failed');

    await supabaseAdmin
      .from('audit_subscriptions')
      .update({
        last_delivery_at: deliveredAt,
        delivery_count: (subscription.delivery_count || 0) + 1,
      })
      .eq('id', subscription.id);

    return { success: false };
  }
}
