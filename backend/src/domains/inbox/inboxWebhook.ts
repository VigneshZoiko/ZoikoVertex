import { Request, Response } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { env } from '../../config/env';
import { insertMessageIfNew, AutoReplyRule } from './inboxController';

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

interface WorkspaceCtx {
  workspaceId: string;
  accessToken: string;
  accountHandle: string;
  accountName: string;
  platform: string;
  userId: string | null;
  rules: AutoReplyRule[];
}

async function resolveWorkspaceCtx(platformAccountId: string): Promise<WorkspaceCtx | null> {
  const { data } = await supabaseAdmin
    .from('connected_accounts')
    .select('workspace_id, access_token, platform, account_handle, account_name')
    .eq('account_handle', platformAccountId)
    .eq('status', 'active')
    .limit(1);

  if (!data || data.length === 0) return null;
  const { workspace_id: workspaceId, access_token: accessToken, platform, account_handle, account_name } = data[0];

  const { data: rulesData } = await supabaseAdmin
    .from('inbox_auto_reply_rules')
    .select('id, keywords, reply_body, is_active, is_case_sensitive')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  const { data: adminMember } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['WORKSPACE_OWNER', 'ADMIN'])
    .limit(1)
    .maybeSingle();

  return {
    workspaceId,
    accessToken,
    accountHandle: String(account_handle || platformAccountId),
    accountName: String(account_name || platformAccountId),
    platform,
    userId: adminMember?.user_id ?? null,
    rules: (rulesData || []) as AutoReplyRule[],
  };
}

async function fetchSenderName(senderId: string, accessToken: string): Promise<string> {
  try {
    const r = await fetch(`${GRAPH_BASE}/${senderId}?fields=name,username&access_token=${accessToken}`);
    const d = await r.json();
    return d.username || d.name || senderId;
  } catch {
    return senderId;
  }
}

// ─── GET — Meta webhook verification ─────────────────────────────────────────

export const verifyMetaWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error('[Webhook] META_WEBHOOK_VERIFY_TOKEN is not set — rejecting verification');
    res.status(403).json({ error: 'Webhook not configured' });
    return;
  }
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Meta verification failed — wrong verify token');
    res.status(403).json({ error: 'Forbidden' });
  }
};

// ─── POST — Receive Meta events ───────────────────────────────────────────────

export const handleMetaWebhook = async (req: Request, res: Response): Promise<void> => {
  // Acknowledge immediately — Meta requires < 5s response or retries
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  if (!body?.entry) return;

  const isInstagram = body.object === 'instagram';
  const isFacebook = body.object === 'page';

  console.log(`[Webhook] Incoming event: object=${body.object} entries=${body.entry?.length ?? 0}`);

  if (!isInstagram && !isFacebook) {
    console.log(`[Webhook] Ignored unknown object type: ${body.object}`);
    return;
  }

  for (const entry of body.entry) {
    const recipientId = String(entry.id);
    console.log(`[Webhook] Processing entry id=${recipientId} platform=${body.object}`);

    const ctx = await resolveWorkspaceCtx(recipientId);
    if (!ctx) {
      console.warn(`[Webhook] No connected account found for id=${recipientId}`);
      continue;
    }

    const platform = isInstagram ? 'INSTAGRAM' : 'FACEBOOK';
    const recipientFields = {
      recipient_account_handle: ctx.accountHandle,
      recipient_account_name: ctx.accountName,
    };
    if (!ctx.userId) {
      console.warn(`[Webhook] No admin/owner member in workspace ${ctx.workspaceId} — auto-reply rules will not fire`);
    }
    const insertOpts = ctx.userId
      ? { userId: ctx.userId, rules: ctx.rules, accessToken: ctx.accessToken, accountHandle: ctx.accountHandle }
      : undefined;

    // ── DMs / Messenger messages ───────────────────────────────────────────
    for (const event of (entry.messaging || [])) {
      if (!event.message) continue;
      if (event.message.is_echo) continue;

      const senderId = String(event.sender.id);
      const messageId = event.message.mid as string;
      const messageText = (event.message.text as string) || '[Media message]';
      const timestamp = new Date(event.timestamp as number).toISOString();
      const senderName = await fetchSenderName(senderId, ctx.accessToken);

      const result = await insertMessageIfNew(ctx.workspaceId, {
        platform,
        platform_message_id: messageId,
        sender_name: senderName,
        sender_handle: senderId,
        message_type: 'DM',
        message_body: messageText,
        status: 'UNREAD',
        risk_level: 'LOW',
        sentiment: 'NEUTRAL',
        received_at: timestamp,
        ...recipientFields,
      }, insertOpts);

      if (result === 'new') {
        console.log(`[Webhook] New ${platform} DM from ${senderName} → ${ctx.accountName} (${ctx.workspaceId})`);
      }
    }

    // ── Instagram comment events ───────────────────────────────────────────
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value;
      if (!val?.id || !val?.text) continue;

      const senderName = val.from?.username || val.from?.name || 'Instagram User';

      const result = await insertMessageIfNew(ctx.workspaceId, {
        platform: 'INSTAGRAM',
        platform_message_id: val.id as string,
        sender_name: senderName,
        sender_handle: val.from?.id || '',
        message_type: 'COMMENT',
        message_body: val.text as string,
        original_post_id: val.media?.id || null,
        status: 'UNREAD',
        risk_level: 'LOW',
        sentiment: 'NEUTRAL',
        received_at: new Date().toISOString(),
        ...recipientFields,
      }, insertOpts);

      if (result === 'new') {
        console.log(`[Webhook] New INSTAGRAM comment from ${senderName} → ${ctx.accountName} (${ctx.workspaceId})`);
      }
    }

    // ── Facebook Page comment events ───────────────────────────────────────
    for (const change of (entry.changes || [])) {
      if (change.field !== 'feed') continue;
      const val = change.value;
      if (val?.item !== 'comment' || !val?.comment_id) continue;

      const senderName = val.from?.name || 'Facebook User';

      const result = await insertMessageIfNew(ctx.workspaceId, {
        platform: 'FACEBOOK',
        platform_message_id: val.comment_id as string,
        sender_name: senderName,
        sender_handle: val.from?.id || '',
        message_type: 'COMMENT',
        message_body: (val.message as string) || '',
        original_post_id: val.post_id || null,
        status: 'UNREAD',
        risk_level: 'LOW',
        sentiment: 'NEUTRAL',
        received_at: new Date().toISOString(),
        ...recipientFields,
      }, insertOpts);

      if (result === 'new') {
        console.log(`[Webhook] New FACEBOOK comment from ${senderName} → ${ctx.accountName} (${ctx.workspaceId})`);
      }
    }
  }
};
