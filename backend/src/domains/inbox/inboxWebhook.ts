import { Request, Response } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { env } from '../../config/env';

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

async function insertIfNew(workspaceId: string, payload: Record<string, unknown>): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('inbox_messages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform_message_id', payload.platform_message_id as string)
    .maybeSingle();
  if (existing) return false;
  const { error } = await supabaseAdmin.from('inbox_messages').insert({ workspace_id: workspaceId, ...payload });
  return !error;
}

async function resolveWorkspaceAndToken(platformAccountId: string): Promise<{ workspaceId: string; accessToken: string; platform: string } | null> {
  const { data } = await supabaseAdmin
    .from('connected_accounts')
    .select('workspace_id, access_token, platform')
    .eq('account_handle', platformAccountId)
    .eq('status', 'active')
    .limit(1);
  if (!data || data.length === 0) return null;
  return { workspaceId: data[0].workspace_id, accessToken: data[0].access_token, platform: data[0].platform };
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

  if (mode === 'subscribe' && token === (env.META_WEBHOOK_VERIFY_TOKEN || 'zoiko_webhook_2025')) {
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

    const ctx = await resolveWorkspaceAndToken(recipientId);
    if (!ctx) {
      console.warn(`[Webhook] No connected account found for id=${recipientId} — check connected_accounts table`);
      continue;
    }

    const platform = isInstagram ? 'INSTAGRAM' : 'FACEBOOK';

    // ── DMs / Messenger messages ───────────────────────────────────────────
    for (const event of (entry.messaging || [])) {
      if (!event.message) continue;
      if (event.message.is_echo) continue; // skip messages sent by the page itself

      const senderId = String(event.sender.id);
      const messageId = event.message.mid as string;
      const messageText = (event.message.text as string) || '[Media message]';
      const timestamp = new Date(event.timestamp as number).toISOString();

      const senderName = await fetchSenderName(senderId, ctx.accessToken);

      await insertIfNew(ctx.workspaceId, {
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
      });

      console.log(`[Webhook] New ${platform} DM from ${senderName} → workspace ${ctx.workspaceId}`);
    }

    // ── Instagram comment events ───────────────────────────────────────────
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value;
      if (!val?.id || !val?.text) continue;

      const senderName = val.from?.username || val.from?.name || 'Instagram User';

      await insertIfNew(ctx.workspaceId, {
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
      });

      console.log(`[Webhook] New INSTAGRAM comment from ${senderName} → workspace ${ctx.workspaceId}`);
    }

    // ── Facebook Page comment events ───────────────────────────────────────
    for (const change of (entry.changes || [])) {
      if (change.field !== 'feed') continue;
      const val = change.value;
      if (val?.item !== 'comment' || !val?.comment_id) continue;

      const senderName = val.from?.name || 'Facebook User';

      await insertIfNew(ctx.workspaceId, {
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
      });

      console.log(`[Webhook] New FACEBOOK comment from ${senderName} → workspace ${ctx.workspaceId}`);
    }
  }
};
