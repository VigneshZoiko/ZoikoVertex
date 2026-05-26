import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logger } from '../../shared/logger';
import {
  createSubscription,
  listSubscriptions,
  getSubscription,
  deleteSubscription,
  deliverToSubscription,
} from '../../services/auditTrailStreaming.service';

export async function subscribeSSE(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const eventFilters: Record<string, unknown> = {};
    if (req.query.event_types) eventFilters.event_types = (req.query.event_types as string).split(',');
    if (req.query.risk_levels) eventFilters.risk_levels = (req.query.risk_levels as string).split(',');
    if (req.query.categories) eventFilters.categories = (req.query.categories as string).split(',');

    const sub = await createSubscription({
      workspace_id: workspaceId,
      name: `sse-${req.user?.id || 'anonymous'}-${Date.now()}`,
      subscription_type: 'sse',
      event_filters: eventFilters,
      created_by: req.user?.id || 'system',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', subscription_id: sub.id })}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      deleteSubscription(sub.id, workspaceId).catch((err) =>
        logger.warn({ subscriptionId: sub.id, err }, '[SSE] cleanup failed'),
      );
    });
  } catch (err) {
    next(err);
  }
}

export async function createWebhookSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'User and workspace required' });

    const { name, endpoint_url, event_filters } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!endpoint_url?.trim()) return res.status(400).json({ error: 'Endpoint URL is required' });

    try { new URL(endpoint_url); } catch { return res.status(400).json({ error: 'Invalid endpoint URL' }); }

    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const subscription = await createSubscription({
      workspace_id: workspaceId,
      name: name.trim(),
      subscription_type: 'webhook',
      endpoint_url: endpoint_url.trim(),
      secret,
      event_filters: event_filters || {},
      created_by: userId,
    });

    res.status(201).json({ success: true, data: { ...subscription, secret } });
  } catch (err) {
    next(err);
  }
}

export async function listSubscriptionsRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const subscriptions = await listSubscriptions(workspaceId);
    res.json({ success: true, data: subscriptions });
  } catch (err) {
    next(err);
  }
}

export async function deleteSubscriptionRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const id = req.params.id as string;

    const existing = await getSubscription(id);
    if (!existing || existing.workspace_id !== workspaceId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await deleteSubscription(id, workspaceId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const id = req.params.id as string;
    const subscription = await getSubscription(id);
    if (!subscription || subscription.workspace_id !== workspaceId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
}

export async function updateSubscriptionRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    const userId = req.user?.id;
    if (!workspaceId || !userId) return res.status(400).json({ error: 'User and workspace required' });

    const id = req.params.id as string;
    const existing = await getSubscription(id);
    if (!existing || existing.workspace_id !== workspaceId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { name, endpoint_url, event_filters, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (name?.trim()) updates.name = name.trim();
    if (endpoint_url?.trim()) {
      try { new URL(endpoint_url.trim()); updates.endpoint_url = endpoint_url.trim(); }
      catch { return res.status(400).json({ error: 'Invalid endpoint URL' }); }
    }
    if (event_filters) updates.event_filters = event_filters;
    if (status && ['ACTIVE', 'PAUSED', 'DISABLED'].includes(status)) updates.status = status;

    const { data, error } = await supabaseAdmin
      .from('audit_subscriptions')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function testSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const id = req.params.id as string;

    const subscription = await getSubscription(id);
    if (!subscription || subscription.workspace_id !== workspaceId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.endpoint_url) {
      return res.status(400).json({ error: 'Subscription has no endpoint URL' });
    }

    const testEvent = {
      event_id: `TEST-${Date.now()}`,
      event_type: 'audit.subscription_changed',
      event_category: 'system_security',
      risk_level: 'low',
      status: 'success',
      timestamp_utc: new Date().toISOString(),
      workspace_id: workspaceId,
      actor: { actor_id: req.user?.id || 'system', actor_type: 'system' },
      object: { object_type: 'subscription', object_id: id },
      message: 'This is a test event from ZoikoVertex Audit Trail',
    };

    const result = await deliverToSubscription(subscription, testEvent as unknown as Record<string, unknown>);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
