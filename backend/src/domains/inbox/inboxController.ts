 
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logAuditEvent } from '../governance/evidenceController';
import { env } from '../../config/env';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { classifyMessage } from './inboxClassifier';
import { syncLinkedInComments } from '../channels/linkedinCommunityController';

export interface AutoReplyRule {
  id: string;
  keywords: string[];
  reply_body: string;
  is_active: boolean;
  is_case_sensitive: boolean;
}

// ─── Plan helpers ─────────────────────────────────────────────────────────────

const FREE_PLANS = ['FREE', 'STARTER'];

function getPlan(req: AuthRequest): string {
  return (req.user?.workspace_plan || 'FREE').toUpperCase();
}

function isPreviewOnly(req: AuthRequest): boolean {
  return FREE_PLANS.includes(getPlan(req));
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN'];
const APPROVER_ROLES = [...ADMIN_ROLES, 'CAMPAIGN_MANAGER', 'GOVERNANCE_ADMIN'];
const LIMITED_ROLES = ['AGENT_OPERATOR', 'PUBLISHER'];

async function getMemberRole(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role || '').toUpperCase();
}

// ─── Demo messages for Free / Starter ─────────────────────────────────────────

const DEMO_MESSAGES = [
  {
    id: 'demo-1',
    platform: 'INSTAGRAM',
    sender_name: 'Sarah Johnson',
    sender_handle: '@sarahjdesign',
    message_type: 'DM',
    message_body: 'Hi! I love your recent product launch. Can you tell me more about the pricing?',
    status: 'UNREAD',
    risk_level: 'LOW',
    sentiment: 'POSITIVE',
    received_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
  {
    id: 'demo-2',
    platform: 'FACEBOOK',
    sender_name: 'Marcus Chen',
    sender_handle: '@marcuschen_tech',
    message_type: 'COMMENT',
    message_body: 'This product broke within a week. Absolutely terrible quality. I want a refund immediately.',
    status: 'ESCALATED',
    risk_level: 'HIGH',
    sentiment: 'NEGATIVE',
    received_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
  {
    id: 'demo-3',
    platform: 'LINKEDIN',
    sender_name: 'Emily Torres',
    sender_handle: '@emilytorres_pr',
    message_type: 'MENTION',
    message_body: 'Just featured your brand in our latest industry report. Congrats on the growth!',
    status: 'OPEN',
    risk_level: 'LOW',
    sentiment: 'POSITIVE',
    received_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
  {
    id: 'demo-4',
    platform: 'INSTAGRAM',
    sender_name: 'Alex Rivera',
    sender_handle: '@alexrivera99',
    message_type: 'REPLY',
    message_body: 'Is this available in Europe? Your shipping policy is confusing and I can\'t find the information.',
    status: 'ASSIGNED',
    risk_level: 'MEDIUM',
    sentiment: 'NEUTRAL',
    received_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
  {
    id: 'demo-5',
    platform: 'TWITTER',
    sender_name: 'Jordan Lee',
    sender_handle: '@jordanlee_writes',
    message_type: 'MENTION',
    message_body: 'Just switched to your platform and already loving it. Team is super responsive too!',
    status: 'RESOLVED',
    risk_level: 'LOW',
    sentiment: 'POSITIVE',
    received_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
  {
    id: 'demo-6',
    platform: 'YOUTUBE',
    sender_name: 'TechWithDave',
    sender_handle: '@techwdave',
    message_type: 'COMMENT',
    message_body: "Great video! Could you make a tutorial on the API integration? I've been struggling with the auth flow.",
    status: 'UNREAD',
    risk_level: 'LOW',
    sentiment: 'POSITIVE',
    received_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    assigned_to: null,
    is_demo: true,
  },
];

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function logInboxAudit(
  messageId: string,
  workspaceId: string,
  userId: string,
  action: string,
  previousValue?: string,
  newValue?: string,
) {
  try {
    await supabaseAdmin.from('inbox_audit_log').insert({
      message_id: messageId,
      workspace_id: workspaceId,
      action,
      previous_value: previousValue || null,
      new_value: newValue || null,
      performed_by: userId,
    });
  } catch {
    // non-blocking
  }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ListMessagesSchema = z.object({
  tab:      z.enum(['all','unread','assigned','inprogress','escalation','resolved','archived']).optional().default('all'),
  platform: z.string().optional(),
  type:     z.string().optional(),
  risk:     z.string().optional(),
  search:   z.string().optional(),
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(30),
});

const AssignSchema = z.object({
  assigned_to: z.string().uuid().nullable(),
});

const StatusSchema = z.object({
  status: z.enum(['OPEN','ASSIGNED','IN_PROGRESS','PENDING_REVIEW','RESOLVED']),
});

const ReplySchema = z.object({
  reply_body: z.string().min(1).max(5000),
  reply_type: z.enum(['manual','ai_draft','edited_ai']).optional().default('manual'),
  ai_tone:    z.string().optional(),
});

const AiDraftSchema = z.object({
  tone: z.enum(['professional','friendly','apologetic','short','formal','brand-safe']).optional().default('professional'),
});

const EscalateSchema = z.object({
  escalation_reason: z.string().min(1),
  risk_category:     z.string().min(1),
  assigned_reviewer: z.string().uuid().optional(),
});

const EscalationDecisionSchema = z.object({
  decision:      z.enum(['APPROVED','REJECTED']),
  decision_note: z.string().optional(),
});

const NoteSchema = z.object({
  note_body: z.string().min(1).max(2000),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export const listInboxMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (isPreviewOnly(req)) {
      return res.json({ success: true, data: DEMO_MESSAGES, is_demo: true, total: DEMO_MESSAGES.length });
    }

    const { tab, platform, type, risk, search, page, limit } = ListMessagesSchema.parse(req.query);
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const offset = (page - 1) * limit;
    const isSuperAdmin = req.user?.is_superadmin === true;

    // Fetch all and filter in JS — avoids "invalid input value for enum" errors
    // when the DB status column has constraints that differ from what we expect
    const { data: allData, error: allError } = await supabaseAdmin
      .from('inbox_messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('received_at', { ascending: false });

    if (allError) {
      const code = (allError as { code?: string }).code;
      // 42P01 = table not found, 42703 = column not found — both mean migration not run
      if (code === '42P01' || code === '42703') {
        return res.json({ success: true, data: [], total: 0, is_demo: false, needs_migration: true });
      }
      console.error('[Inbox] listInboxMessages DB error:', { code, message: allError.message, details: (allError as any).details });
      throw allError;
    }

    const TAB_STATUS: Record<string, string[]> = {
      all:        ['UNREAD','OPEN','ASSIGNED','IN_PROGRESS','PENDING_REVIEW','ESCALATED','APPROVED','REJECTED'],
      unread:     ['UNREAD'],
      assigned:   ['ASSIGNED'],
      inprogress: ['IN_PROGRESS','PENDING_REVIEW'],
      escalation: ['ESCALATED'],
      resolved:   ['RESOLVED'],
      archived:   ['ARCHIVED'],
    };

    const allowedStatuses = new Set(TAB_STATUS[tab] || TAB_STATUS.all);

    let filtered = (allData || []).filter((m: any) => allowedStatuses.has(m.status));

    // Limited roles only see messages assigned to them — fetch role once, not per message
    const role = isSuperAdmin ? '' : await getMemberRole(userId);
    if (!isSuperAdmin && LIMITED_ROLES.includes(role)) {
      filtered = filtered.filter((m: any) => m.assigned_to === userId);
    }

    if (platform) filtered = filtered.filter((m: any) => m.platform === platform.toUpperCase());
    if (type)     filtered = filtered.filter((m: any) => m.message_type === type.toUpperCase());
    if (risk)     filtered = filtered.filter((m: any) => m.risk_level === risk.toUpperCase());
    if (search)   filtered = filtered.filter((m: any) => m.message_body?.toLowerCase().includes(search.toLowerCase()));

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    res.json({ success: true, data: paged, total, is_demo: false });
  } catch (error) {
    next(error);
  }
};

export const getInboxMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (isPreviewOnly(req)) {
      const demo = DEMO_MESSAGES.find(m => m.id === (req.params.id as string));
      if (!demo) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, data: { ...demo, replies: [], notes: [], audit: [], escalation: null } });
    }

    const workspaceId = req.user?.workspace_id;
    const { data: msg, error } = await supabaseAdmin
      .from('inbox_messages')
      .select('*')
      .eq('id', (req.params.id as string))
      .eq('workspace_id', workspaceId!)
      .single();

    if (error || !msg) return res.status(404).json({ error: 'Message not found' });

    const [repliesResult, notesResult, auditResult, escalationResult] = await Promise.all([
      supabaseAdmin.from('inbox_replies').select('id, reply_body, reply_type, status, created_at').eq('message_id', msg.id).order('created_at'),
      supabaseAdmin.from('inbox_notes').select('id, note_body, created_at').eq('message_id', msg.id).order('created_at'),
      supabaseAdmin.from('inbox_audit_log').select('id, action, previous_value, new_value, performed_at').eq('message_id', msg.id).order('performed_at'),
      // Fetch most recent escalation (including resolved) so we can show "Resolved by X"
      supabaseAdmin.from('inbox_escalations').select('review_status, is_auto_escalated, decision, escalation_reason, resolved_by_name, decision_note, risk_category, risk_level, assigned_reviewer_name, escalated_by_name, resolved_by, assigned_reviewer, escalated_by').eq('message_id', msg.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Mark UNREAD as OPEN on first view
    if (msg.status === 'UNREAD') {
      await supabaseAdmin.from('inbox_messages').update({ status: 'OPEN', updated_at: new Date().toISOString() }).eq('id', msg.id);
      await logInboxAudit(msg.id, workspaceId!, userId, 'Message opened', 'UNREAD', 'OPEN');
      msg.status = 'OPEN';
    }

    // Enrich escalation with user names
    let escalation = escalationResult.data || null;
    if (escalation) {
      const ids = [escalation.resolved_by, escalation.assigned_reviewer, escalation.escalated_by].filter(Boolean) as string[];
      if (ids.length > 0) {
        const { data: users } = await supabaseAdmin.from('users').select('id, full_name, email').in('id', ids);
        const nm: Record<string, string> = {};
        (users || []).forEach((u: any) => { nm[u.id] = u.full_name || u.email || u.id; });
        escalation = {
          ...escalation,
          resolved_by_name:       escalation.resolved_by       ? (nm[escalation.resolved_by]       ?? null) : null,
          assigned_reviewer_name: escalation.assigned_reviewer ? (nm[escalation.assigned_reviewer] ?? null) : null,
          escalated_by_name:      escalation.escalated_by      ? (nm[escalation.escalated_by]      ?? null) : null,
        };
      }
    }

    res.json({
      success: true,
      data: {
        ...msg,
        replies:    repliesResult.data    || [],
        notes:      notesResult.data      || [],
        audit:      auditResult.data      || [],
        escalation,
      },
    });
  } catch (error) {
    next(error);
  }
};

async function sendToThreadsApi(
  platformMessageId: string,
  replyBody: string,
  accessToken: string,
  accountHandle: string,
): Promise<{ sent: boolean; error?: string }> {
  const THREADS_BASE = 'https://graph.threads.net/v1.0';
  try {
    // Step 1 — create reply container
    const containerRes = await fetch(`${THREADS_BASE}/${accountHandle}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: replyBody,
        reply_to_id: platformMessageId,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json() as Record<string, unknown>;
    if ((containerData.error as Record<string, string> | undefined)?.message) {
      return { sent: false, error: (containerData.error as Record<string, string>).message };
    }
    const creationId = containerData.id as string;

    // Step 2 — brief wait for container processing
    await new Promise(r => setTimeout(r, 3000));

    // Step 3 — publish
    const publishRes = await fetch(`${THREADS_BASE}/${accountHandle}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });
    const publishData = await publishRes.json() as Record<string, unknown>;
    if ((publishData.error as Record<string, string> | undefined)?.message) {
      return { sent: false, error: (publishData.error as Record<string, string>).message };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function sendToYouTubeApi(
  platformMessageId: string,
  replyBody: string,
  accessToken: string,
): Promise<{ sent: boolean; error?: string }> {
  try {
    const r = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          parentId: platformMessageId,
          textOriginal: replyBody,
        },
      }),
    });
    const data = await r.json() as Record<string, unknown>;
    if (data.error) {
      const ytErr = data.error as { message?: string };
      return { sent: false, error: ytErr.message || 'YouTube API error' };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function sendToMetaApi(
  platform: string,
  messageType: string,
  platformMessageId: string,
  senderHandle: string,
  replyBody: string,
  accessToken: string,
  accountHandle?: string,
): Promise<{ sent: boolean; error?: string }> {
  try {
    if (messageType === 'COMMENT') {
      if (platform === 'INSTAGRAM') {
        const r = await fetch(`${GRAPH_BASE}/${platformMessageId}/replies`, {
          method: 'POST',
          body: new URLSearchParams({ message: replyBody, access_token: accessToken }),
        });
        const data = await r.json();
        if (data.error) return { sent: false, error: `(#${data.error.code}) ${data.error.message}` };
        return { sent: true };
      }

      // Facebook Page comment reply — requires pages_manage_engagement permission
      const r = await fetch(`${GRAPH_BASE}/${platformMessageId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyBody, access_token: accessToken }),
      });
      const data = await r.json();
      if (data.error) {
        const code = data.error.code;
        const msg = data.error.message || data.error.error_user_msg || '';
        if (code === 200 || msg.toLowerCase().includes('permission')) {
          return { sent: false, error: `pages_manage_engagement permission required. Add your account as a Developer on the Meta App, then re-connect your Facebook Page. (#${code})` };
        }
        return { sent: false, error: `(#${code}) ${msg}` };
      }
      return { sent: true };
    }

    if (messageType === 'DM' && senderHandle) {
      // Instagram DMs use /{ig-user-id}/messages; Facebook uses /me/messages
      const dmEndpoint = platform === 'INSTAGRAM' && accountHandle
        ? `/${accountHandle}/messages`
        : '/me/messages';
      const r = await fetch(`${GRAPH_BASE}${dmEndpoint}?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderHandle },
          message: { text: replyBody },
          messaging_type: 'RESPONSE',
        }),
      });
      const data = await r.json();
      if (data.error) return { sent: false, error: data.error.message };
      return { sent: true };
    }

    return { sent: false, error: 'Unsupported message type for live send' };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const createReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to reply to messages' });

    const { reply_body, reply_type, ai_tone } = ReplySchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin
      .from('inbox_messages')
      .select('id, status, platform, message_type, platform_message_id, original_post_id, sender_handle, recipient_account_handle')
      .eq('id', (req.params.id as string))
      .eq('workspace_id', workspaceId)
      .single();

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status === 'ESCALATED') {
      return res.status(403).json({ error: 'Escalated messages are reply-locked until approved' });
    }

    // Try to send live via Meta API
    let replyStatus = 'draft';
    let metaError: string | undefined;

    if (msg.platform_message_id && ['INSTAGRAM', 'FACEBOOK'].includes(msg.platform)) {
      const { data: account } = await supabaseAdmin
        .from('connected_accounts')
        .select('access_token, account_handle')
        .eq('workspace_id', workspaceId)
        .eq('platform', msg.platform.toLowerCase())
        .eq('status', 'active')
        .maybeSingle();

      if (account?.access_token) {
        const result = await sendToMetaApi(
          msg.platform,
          msg.message_type,
          msg.platform_message_id,
          msg.sender_handle || '',
          reply_body,
          account.access_token,
          account.account_handle as string | undefined,
        );
        replyStatus = result.sent ? 'sent' : 'draft';
        metaError = result.error;
        if (result.error) {
          console.error(`[Inbox] Meta API send failed: ${result.error} | platform=${msg.platform} type=${msg.message_type} msgId=${msg.platform_message_id}`);
        }
      } else {
        console.warn(`[Inbox] No connected account found for platform=${msg.platform} workspace=${workspaceId}`);
      }
    }

    if (msg.platform_message_id && msg.platform === 'THREADS') {
      const { data: account } = await supabaseAdmin
        .from('connected_accounts')
        .select('access_token, account_handle')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'threads')
        .eq('status', 'active')
        .maybeSingle();

      if (account?.access_token && account.account_handle) {
        const result = await sendToThreadsApi(
          msg.platform_message_id,
          reply_body,
          account.access_token,
          account.account_handle as string,
        );
        replyStatus = result.sent ? 'sent' : 'draft';
        metaError = result.error;
        if (result.error) {
          console.error(`[Inbox] Threads send failed: ${result.error} | msgId=${msg.platform_message_id}`);
        }
      } else {
        console.warn(`[Inbox] No active Threads account found for workspace=${workspaceId}`);
      }
    }

    if (msg.platform_message_id && msg.platform === 'YOUTUBE') {
      const { data: account } = await supabaseAdmin
        .from('connected_accounts')
        .select('access_token')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'youtube')
        .eq('status', 'active')
        .maybeSingle();

      if (account?.access_token) {
        const result = await sendToYouTubeApi(
          msg.platform_message_id,
          reply_body,
          account.access_token as string,
        );
        replyStatus = result.sent ? 'sent' : 'draft';
        metaError = result.error;
        if (result.error) {
          console.error(`[Inbox] YouTube send failed: ${result.error} | msgId=${msg.platform_message_id}`);
        }
      } else {
        console.warn(`[Inbox] No active YouTube account found for workspace=${workspaceId}`);
      }
    }

    if (msg.platform_message_id && msg.platform === 'TWITTER') {
      const { data: account } = await supabaseAdmin
        .from('connected_accounts')
        .select('access_token')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'twitter')
        .eq('status', 'active')
        .maybeSingle();

      if (account?.access_token) {
        try {
          const twUrl = msg.message_type === 'DM'
            ? `https://api.x.com/2/dm_conversations/${msg.platform_message_id}/messages`
            : 'https://api.x.com/2/tweets';
          const twBody = msg.message_type === 'DM'
            ? { text: reply_body }
            : { text: reply_body, reply: { in_reply_to_tweet_id: msg.platform_message_id } };
          const twFetch = await fetch(twUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(twBody),
          });
          const twitterData: any = await twFetch.json();
          if (twFetch.ok && !twitterData.errors) {
            replyStatus = 'sent';
          } else {
            metaError = twitterData.errors?.[0]?.message || twitterData.detail || 'Twitter API error';
            console.error(`[Inbox] Twitter reply failed: ${metaError}`);
          }
        } catch (err: any) {
          metaError = err.message;
          console.error(`[Inbox] Twitter reply error: ${err.message}`);
        }
      } else {
        console.warn(`[Inbox] No active Twitter account found for workspace=${workspaceId}`);
      }
    }

    if (msg.platform_message_id && msg.platform === 'LINKEDIN' && msg.message_type === 'COMMENT') {
      // Prefer the account that received the comment (recipient_account_handle),
      // fall back to any active org page in the workspace.
      const recipientHandle = (msg as any).recipient_account_handle as string | undefined;
      let liAccountQuery = supabaseAdmin
        .from('connected_accounts')
        .select('access_token, account_handle')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'linkedin')
        .eq('status', 'active')
        .like('account_handle', 'urn:li:organization:%');
      if (recipientHandle) liAccountQuery = liAccountQuery.eq('account_handle', recipientHandle);
      const { data: liAccount } = await liAccountQuery.maybeSingle();

      if (liAccount?.access_token && liAccount.account_handle) {
        try {
          // platform_message_id from REST API sync is always a full comment URN:
          //   urn:li:comment:(urn:li:ugcPost:123,456)
          // For nested reply to commenter use the comment URN as object.
          // For a fresh top-level reply use the post URN (original_post_id).
          const commentId = msg.platform_message_id || '';
          const postUrn   = msg.original_post_id   || '';

          // Extract the numeric comment ID for v2 nested reply (parentComment field).
          // v2 sync stores c.id as a numeric string e.g. "6789901234567890".
          // REST sync stores full URN e.g. "urn:li:comment:(urn:li:ugcPost:123,456789)" — extract the number after the last comma.
          let numericCommentId: number | null = null;
          if (commentId.startsWith('urn:li:comment:')) {
            const m = commentId.match(/,(\d+)\)$/);
            if (m) numericCommentId = parseInt(m[1], 10);
          } else if (/^\d+$/.test(commentId)) {
            numericCommentId = parseInt(commentId, 10);
          }

          // Try REST first — Community Management API product is now added to app.
          // REST uses the full comment URN as "object" for nested replies.
          const restObjectUrn = commentId.startsWith('urn:li:comment:') ? commentId : postUrn;
          const restRes = await fetch('https://api.linkedin.com/rest/comments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${liAccount.access_token}`,
              'LinkedIn-Version': '202406',
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actor:   liAccount.account_handle,
              object:  restObjectUrn,
              message: { text: reply_body },
            }),
          });

          if (restRes.ok || restRes.status === 201) {
            replyStatus = 'sent';
          } else {
            const restErr = await restRes.text().catch(() => '');
            console.warn(`[Inbox] LinkedIn REST reply failed (${restRes.status}), trying v2 fallback: ${restErr}`);

            // v2 fallback — uses parentComment field for nested reply instead of "object" URN
            const v2Body: Record<string, unknown> = {
              actor:   liAccount.account_handle,
              message: { text: reply_body },
            };
            if (numericCommentId !== null) {
              v2Body.parentComment = numericCommentId;
            }

            const v2ParentUrn = postUrn || commentId;
            const v2Res = await fetch(
              `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(v2ParentUrn)}/comments`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${liAccount.access_token}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(v2Body),
              },
            );

            if (v2Res.ok || v2Res.status === 201) {
              replyStatus = 'sent';
            } else {
              const errBody = await v2Res.text().catch(() => '');
              metaError = `LinkedIn API error: ${v2Res.status} ${errBody}`;
              console.error(`[Inbox] LinkedIn comment reply failed: ${metaError}`);
            }
          }
        } catch (err: any) {
          metaError = err.message;
          console.error(`[Inbox] LinkedIn comment reply error: ${err.message}`);
        }
      } else {
        console.warn(`[Inbox] No active LinkedIn organization account found for workspace=${workspaceId}`);
        metaError = 'No LinkedIn page account connected';
      }
    }

    const { data: reply, error } = await supabaseAdmin
      .from('inbox_replies')
      .insert({
        message_id: (req.params.id as string),
        workspace_id: workspaceId,
        reply_body,
        reply_type,
        ai_tone: ai_tone || null,
        status: replyStatus,
        created_by: userId,
        ...(replyStatus === 'sent' ? { sent_by: userId, sent_at: new Date().toISOString() } : {}),
      })
      .select()
      .single();

    if (error) throw error;

    if (replyStatus === 'sent') {
      await supabaseAdmin.from('inbox_messages').update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() }).eq('id', (req.params.id as string)).eq('workspace_id', workspaceId);
    }

    await logInboxAudit((req.params.id as string), workspaceId, userId, `Reply ${replyStatus} (${reply_type})`, undefined, replyStatus);
    await logAuditEvent({ workspaceId, actorId: userId, action: `Reply ${replyStatus} on inbox message`, objectType: 'INBOX_MESSAGE', objectId: (req.params.id as string), module: 'Inbox' });

    res.status(201).json({ success: true, data: reply, sent: replyStatus === 'sent', meta_error: metaError });
  } catch (error) {
    next(error);
  }
};

export const generateAiDraft = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const plan = getPlan(req);
    if (FREE_PLANS.includes(plan)) {
      return res.status(403).json({ error: 'Upgrade to Growth to use AI-assisted reply drafts' });
    }

    const { tone } = AiDraftSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin
      .from('inbox_messages')
      .select('message_body, sender_name, platform, message_type, status')
      .eq('id', (req.params.id as string))
      .eq('workspace_id', workspaceId)
      .single();

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status === 'ESCALATED') {
      return res.status(403).json({ error: 'Cannot generate draft for an escalated message' });
    }

    const TONE_INSTRUCTIONS: Record<string, string> = {
      professional: 'Write in a professional, polished tone. Be helpful and solution-oriented.',
      friendly:     'Write in a warm, friendly, conversational tone. Show empathy and genuine care.',
      apologetic:   'Start with a sincere apology. Acknowledge the issue and offer clear next steps.',
      short:        'Be very concise. 1-2 sentences maximum. Get straight to the point.',
      formal:       'Use formal business language. Maintain professional distance throughout.',
      'brand-safe': 'Strictly follow brand voice guidelines. Avoid anything controversial or uncommitted.',
    };

    const prompt = `You are a social media community manager. A customer sent the following message on ${msg.platform}:\n\n"${msg.message_body}"\n\nWrite a reply.\nTone: ${tone}\nInstruction: ${TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional}\n\nRules:\n- Do NOT make specific promises about refunds, timelines, or prices\n- Keep under 280 characters for Twitter/Threads, otherwise under 500 characters\n- No markdown, no preamble — start directly with the reply text\n\nReply:`;

    let draft = '';

    if (env.GROQ_API_KEY) {
      const openai = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY });
      const callModel = async (p: string): Promise<string> => {
        const c = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: p }],
          max_tokens: 200,
          temperature: 0.7,
        });
        return c.choices[0]?.message?.content?.trim() || '';
      };
      // Phase 4.D — prefer the governed 'inbox_ai_reply' prompt; on governance
      // block, record an audited fallback (fail-closed in production when
      // PROMPT_GOVERNANCE_ENFORCED) and use the inline prompt so behavior is
      // unchanged while the flag is off.
      const governed = await GovernedModelGate.execute({
        useCaseKey: 'inbox_ai_reply',
        workspaceId,
        variables: { platform: msg.platform, message: msg.message_body, tone, instruction: TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional },
        modelProvider: 'groq',
        actorId: userId,
        invoke: callModel,
      });
      if (governed.ok) {
        draft = governed.output || '';
      } else {
        await GovernedModelGate.legacyInlineFallback('inbox_ai_reply', workspaceId, `governed prompt unavailable: ${governed.code}`);
        draft = await callModel(prompt);
      }
    } else {
      const firstName = msg.sender_name.split(' ')[0];
      draft = `Thank you for reaching out, ${firstName}! We appreciate your message and will follow up with you very shortly.`;
    }

    await logInboxAudit((req.params.id as string), workspaceId, userId, `AI draft generated (tone: ${tone})`);

    res.json({ success: true, data: { draft, tone, message_id: (req.params.id as string) } });
  } catch (error) {
    next(error);
  }
};

export const sendReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to send replies' });

    const workspaceId = (req.user!.workspace_id as string);

    const { data: reply } = await supabaseAdmin
      .from('inbox_replies')
      .select('message_id, status')
      .eq('id', (req.params.replyId as string))
      .eq('workspace_id', workspaceId)
      .single();

    if (!reply) return res.status(404).json({ error: 'Reply not found' });

    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('status').eq('id', reply.message_id).eq('workspace_id', workspaceId).single();
    if (msg?.status === 'ESCALATED') {
      return res.status(403).json({ error: 'Reply locked — message is escalated and awaiting approval' });
    }

    await supabaseAdmin.from('inbox_replies').update({ status: 'sent', sent_by: userId, sent_at: new Date().toISOString() }).eq('id', (req.params.replyId as string));
    await supabaseAdmin.from('inbox_messages').update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() }).eq('id', reply.message_id).eq('workspace_id', workspaceId);

    await logInboxAudit(reply.message_id, workspaceId, userId, 'Reply sent', reply.status, 'sent');
    await logAuditEvent({ workspaceId, actorId: userId, action: 'Reply sent on inbox message', objectType: 'INBOX_MESSAGE', objectId: reply.message_id, module: 'Inbox' });

    res.json({ success: true, note: 'Reply recorded. Live platform delivery requires OAuth token management (Phase 2).' });
  } catch (error) {
    next(error);
  }
};

export const assignMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to assign messages' });

    const { assigned_to } = AssignSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('assigned_to, status').eq('id', (req.params.id as string)).eq('workspace_id', workspaceId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    await supabaseAdmin.from('inbox_messages').update({
      assigned_to,
      assigned_by: userId,
      assigned_at: new Date().toISOString(),
      status: assigned_to ? 'ASSIGNED' : 'OPEN',
      updated_at: new Date().toISOString(),
    }).eq('id', (req.params.id as string));

    await logInboxAudit((req.params.id as string), workspaceId, userId, assigned_to ? 'Message assigned' : 'Assignment removed', msg.assigned_to || 'none', assigned_to || 'none');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const updateMessageStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to manage message status' });

    const { status } = StatusSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('status').eq('id', (req.params.id as string)).eq('workspace_id', workspaceId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (msg.status === 'ESCALATED') {
      return res.status(403).json({ error: 'Escalated messages require a reviewer decision before status can change' });
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();

    await supabaseAdmin.from('inbox_messages').update(updates).eq('id', (req.params.id as string)).eq('workspace_id', workspaceId);
    await logInboxAudit((req.params.id as string), workspaceId, userId, 'Status changed', msg.status, status);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const escalateMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to use escalation' });

    const { escalation_reason, risk_category, assigned_reviewer } = EscalateSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('status, risk_level, sender_name').eq('id', (req.params.id as string)).eq('workspace_id', workspaceId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const riskLevel = msg.risk_level || 'HIGH';

    await supabaseAdmin.from('inbox_escalations').insert({
      message_id: (req.params.id as string),
      workspace_id: workspaceId,
      escalation_reason,
      risk_category,
      risk_level: riskLevel,
      escalated_by: userId,
      assigned_reviewer: assigned_reviewer || null,
    });

    await supabaseAdmin.from('inbox_messages').update({ status: 'ESCALATED', risk_level: riskLevel, updated_at: new Date().toISOString() }).eq('id', (req.params.id as string)).eq('workspace_id', workspaceId);
    await logInboxAudit((req.params.id as string), workspaceId, userId, `Escalated: ${escalation_reason}`, msg.status, 'ESCALATED');
    await logAuditEvent({ workspaceId, actorId: userId, action: `Message escalated: ${escalation_reason}`, objectType: 'INBOX_MESSAGE', objectId: (req.params.id as string), module: 'Inbox', riskLevel, metadata: { risk_category } });

    if (assigned_reviewer) {
      await notifyEscalationAssigned(assigned_reviewer, req.params.id as string, msg.sender_name || 'Unknown', riskLevel, false);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getEscalationQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (isPreviewOnly(req)) return res.json({ success: true, data: [], is_demo: true });

    const workspaceId = (req.user!.workspace_id as string);
    const role = await getMemberRole(userId);
    const isSuperAdmin = req.user?.is_superadmin === true;

    let query = supabaseAdmin
      .from('inbox_escalations')
      .select('*, message:inbox_messages(*)')
      .eq('workspace_id', workspaceId)
      .neq('review_status', 'RESOLVED')
      .order('created_at', { ascending: true });

    if (!isSuperAdmin && LIMITED_ROLES.includes(role)) {
      query = query.eq('assigned_reviewer', userId);
    }

    const { data, error } = await query;
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01' || code === '42703') return res.json({ success: true, data: [], needs_migration: true });
      throw error;
    }

    // Enrich with user names (resolved_by, assigned_reviewer, escalated_by)
    const rows = data || [];
    const userIds = [...new Set(
      rows.flatMap((r: any) => [r.resolved_by, r.assigned_reviewer, r.escalated_by].filter(Boolean))
    )] as string[];

    const nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      (users || []).forEach((u: any) => {
        nameMap[u.id] = u.full_name || u.email || u.id;
      });
    }

    const enriched = rows.map((r: any) => ({
      ...r,
      resolved_by_name:        r.resolved_by        ? (nameMap[r.resolved_by]        ?? null) : null,
      assigned_reviewer_name:  r.assigned_reviewer  ? (nameMap[r.assigned_reviewer]  ?? null) : null,
      escalated_by_name:       r.escalated_by        ? (nameMap[r.escalated_by]       ?? null) : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

export const resolveEscalation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin === true;
    const role = await getMemberRole(userId);
    if (!isSuperAdmin && !APPROVER_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to resolve escalations' });
    }

    const { decision, decision_note } = EscalationDecisionSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: esc } = await supabaseAdmin.from('inbox_escalations').select('message_id').eq('id', (req.params.escalationId as string)).eq('workspace_id', workspaceId).single();
    if (!esc) return res.status(404).json({ error: 'Escalation not found' });

    await supabaseAdmin.from('inbox_escalations').update({
      decision,
      decision_note: decision_note || null,
      review_status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    }).eq('id', (req.params.escalationId as string));

    const newMsgStatus = decision === 'APPROVED' ? 'IN_PROGRESS' : 'RESOLVED';
    await supabaseAdmin.from('inbox_messages').update({ status: newMsgStatus, updated_at: new Date().toISOString() }).eq('id', esc.message_id);
    await logInboxAudit(esc.message_id, workspaceId, userId, `Escalation ${decision.toLowerCase()}d`, 'ESCALATED', newMsgStatus);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const addNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Enterprise to add internal notes' });

    const { note_body } = NoteSchema.parse(req.body);
    const workspaceId = (req.user!.workspace_id as string);

    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('id').eq('id', (req.params.id as string)).eq('workspace_id', workspaceId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const { data: note, error } = await supabaseAdmin
      .from('inbox_notes')
      .insert({ message_id: (req.params.id as string), workspace_id: workspaceId, note_body, created_by: userId })
      .select()
      .single();

    if (error) throw error;

    await logInboxAudit((req.params.id as string), workspaceId, userId, 'Internal note added');
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const deleteInboxMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade required' });

    const workspaceId = (req.user!.workspace_id as string);
    const ids: string[] = req.body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No message IDs provided' });
    }
    if (ids.length > 100) {
      return res.status(400).json({ error: 'Cannot delete more than 100 messages at once' });
    }

    // Fetch only messages that belong to this workspace
    const { data: msgs } = await supabaseAdmin
      .from('inbox_messages')
      .select('id, status, sender_name, platform')
      .in('id', ids)
      .eq('workspace_id', workspaceId);

    if (!msgs || msgs.length === 0) {
      return res.status(404).json({ error: 'No matching messages found in this workspace' });
    }

    const validIds = msgs.map((m: any) => m.id);

    // Soft-delete: mark as DELETED so they vanish from all inbox views
    await supabaseAdmin
      .from('inbox_messages')
      .update({ status: 'DELETED', updated_at: new Date().toISOString() })
      .in('id', validIds);

    // Audit each deletion
    for (const msg of msgs) {
      await logInboxAudit(msg.id, workspaceId, userId, 'Message deleted from inbox', msg.status, 'DELETED');
    }

    res.json({ success: true, deleted: validIds.length });
  } catch (error) {
    next(error);
  }
};

export const archiveMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade required' });

    const workspaceId = (req.user!.workspace_id as string);
    const { data: msg } = await supabaseAdmin.from('inbox_messages').select('status').eq('id', (req.params.id as string)).eq('workspace_id', workspaceId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    await supabaseAdmin.from('inbox_messages').update({ status: 'ARCHIVED', archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', (req.params.id as string)).eq('workspace_id', workspaceId);
    await logInboxAudit((req.params.id as string), workspaceId, userId, 'Message archived', msg.status, 'ARCHIVED');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getMessageAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.json({ success: true, data: [], is_demo: true });

    const workspaceId = (req.user!.workspace_id as string);
    const { data, error } = await supabaseAdmin
      .from('inbox_audit_log')
      .select('*')
      .eq('message_id', (req.params.id as string))
      .eq('workspace_id', workspaceId)
      .order('performed_at', { ascending: true });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01' || code === '42703') return res.json({ success: true, data: [] });
      throw error;
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

const GRAPH_BASE = 'https://graph.facebook.com/v18.0';

async function graphGet(path: string, token: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ ...params, access_token: token }).toString();
  const r = await fetch(`${GRAPH_BASE}${path}?${qs}`);
  return r.json();
}

const PLACEHOLDER_NAMES = new Set(['Facebook User', 'Instagram User', 'Threads User', 'YouTube User', 'LinkedIn User']);

async function notifyEscalationAssigned(
  assignedReviewer: string,
  messageId: string,
  senderName: string,
  riskLevel: string,
  isAuto: boolean,
): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: assignedReviewer,
      title: isAuto ? '⚠️ Auto-Escalation Assigned' : '⚠️ Escalation Assigned to You',
      body: `A ${riskLevel} risk message from ${senderName} has been escalated and assigned to you for review.`,
      type: 'GOVERNANCE',
      link: '/inbox?tab=escalation',
      read: false,
    });
  } catch (err) {
    console.warn('[Inbox] Failed to send escalation notification:', err);
  }
}

export async function insertMessageIfNew(
  workspaceId: string,
  payload: Record<string, unknown>,
  options?: {
    userId?: string;
    rules?: AutoReplyRule[];
    accessToken?: string;
    accountHandle?: string;
    recipientAccountHandle?: string;
    recipientAccountName?: string;
  },
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('inbox_messages')
    .select('id, sender_name, sender_handle')
    .eq('workspace_id', workspaceId)
    .eq('platform_message_id', payload.platform_message_id as string)
    .maybeSingle();

  if (existing) {
    // Back-fill real name if placeholder was saved before
    const newName = payload.sender_name as string | undefined;
    if (newName && !PLACEHOLDER_NAMES.has(newName) && PLACEHOLDER_NAMES.has(existing.sender_name)) {
      await supabaseAdmin.from('inbox_messages').update({
        sender_name: newName,
        sender_handle: payload.sender_handle || existing.sender_handle,
      }).eq('id', existing.id);
    }
    return 'exists';
  }

  // Merge recipient account info from options if not already in payload
  const recipientFields: Record<string, unknown> = {};
  if (options?.recipientAccountHandle && !payload.recipient_account_handle) {
    recipientFields.recipient_account_handle = options.recipientAccountHandle;
  }
  if (options?.recipientAccountName && !payload.recipient_account_name) {
    recipientFields.recipient_account_name = options.recipientAccountName;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('inbox_messages')
    .insert({ workspace_id: workspaceId, ...payload, ...recipientFields })
    .select('id')
    .single();

  if (error) {
    console.error('[Inbox] insert error:', error.message, '| keys:', Object.keys(payload).join(','));
    return `error:${error.message}`;
  }

  // Classify + auto-reply asynchronously (non-blocking)
  const msgBody = (payload.message_body as string) || '';
  if (msgBody && inserted?.id) {
    classifyMessage(msgBody, payload.workspace_id as string | undefined)
      .then(async ({ risk_level, sentiment }) => {
        await supabaseAdmin
          .from('inbox_messages')
          .update({ risk_level, sentiment })
          .eq('id', inserted.id);

        const userId = options?.userId;
        const rules = options?.rules || [];
        let autoReplied = false;
        if (userId && rules.length > 0) {
          const matched = rules.find(r => {
            if (!r.is_active) return false;
            return r.keywords.some(kw =>
              r.is_case_sensitive
                ? msgBody.includes(kw)
                : msgBody.toLowerCase().includes(kw.toLowerCase()),
            );
          });
          if (matched) {
            const now = new Date().toISOString();
            const accessToken = options?.accessToken;
            const accountHandle = options?.accountHandle;
            const platform = (payload.platform as string) || '';
            const messageType = (payload.message_type as string) || '';
            const senderHandle = (payload.sender_handle as string) || '';
            const platformMessageId = (payload.platform_message_id as string) || '';

            let replyStatus = 'draft';
            if (accessToken) {
              let result: { sent: boolean; error?: string } = { sent: false, error: 'Unsupported platform' };

              if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
                result = await sendToMetaApi(
                  platform, messageType, platformMessageId, senderHandle,
                  matched.reply_body, accessToken, accountHandle,
                );
              } else if (platform === 'THREADS' && accountHandle) {
                result = await sendToThreadsApi(
                  platformMessageId, matched.reply_body, accessToken, accountHandle,
                );
              } else if (platform === 'YOUTUBE') {
                result = await sendToYouTubeApi(
                  platformMessageId, matched.reply_body, accessToken,
                );
              } else if (platform === 'TWITTER') {
                try {
                  const twUrl = messageType === 'DM'
                    ? `https://api.x.com/2/dm_conversations/${platformMessageId}/messages`
                    : 'https://api.x.com/2/tweets';
                  const twBody = messageType === 'DM'
                    ? { text: matched.reply_body }
                    : { text: matched.reply_body, reply: { in_reply_to_tweet_id: platformMessageId } };
                  const twFetch = await fetch(twUrl, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(twBody),
                  });
                  const twData: any = await twFetch.json();
                  result = twFetch.ok && !twData.errors
                    ? { sent: true }
                    : { sent: false, error: twData.errors?.[0]?.message || twData.detail || 'Twitter API error' };
                } catch (err) {
                  result = { sent: false, error: err instanceof Error ? err.message : 'Network error' };
                }
              }

              replyStatus = result.sent ? 'sent' : 'draft';
              if (!result.sent) console.warn(`[Inbox] Auto-reply API failed (${platform}) for ${inserted.id}: ${result.error}`);
            }

            await supabaseAdmin.from('inbox_replies').insert({
              message_id: inserted.id,
              workspace_id: workspaceId,
              reply_body: matched.reply_body,
              reply_type: 'auto_reply',
              status: replyStatus,
              sent_by: userId,
              sent_at: now,
              created_by: userId,
            });
            await supabaseAdmin
              .from('inbox_messages')
              .update({ status: 'RESOLVED', resolved_at: now, updated_at: now })
              .eq('id', inserted.id);
            autoReplied = true;
            console.info(`[Inbox] Auto-reply ${replyStatus} for message ${inserted.id} — rule: "${matched.reply_body.slice(0, 40)}…"`);
          }
        }

        // Auto-escalate HIGH/CRITICAL — skipped if auto-reply already resolved the message
        if (!autoReplied && (risk_level === 'HIGH' || risk_level === 'CRITICAL')) {
          // Prefer GOVERNANCE_ADMIN, fall back to WORKSPACE_OWNER
          let assignedReviewer: string | null = null;
          const { data: govAdmins } = await supabaseAdmin
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId)
            .eq('role', 'GOVERNANCE_ADMIN')
            .limit(1);
          if (govAdmins && govAdmins.length > 0) {
            assignedReviewer = govAdmins[0].user_id;
          } else {
            const { data: owners } = await supabaseAdmin
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', workspaceId)
              .eq('role', 'WORKSPACE_OWNER')
              .limit(1);
            if (owners && owners.length > 0) assignedReviewer = owners[0].user_id;
          }

          await supabaseAdmin.from('inbox_escalations').insert({
            message_id: inserted.id,
            workspace_id: workspaceId,
            escalation_reason: `Auto-escalated: ${risk_level} risk detected by AI classifier`,
            risk_category: 'AUTO_DETECTED',
            risk_level,
            escalated_by: null,
            assigned_reviewer: assignedReviewer,
            is_auto_escalated: true,
          });

          await supabaseAdmin
            .from('inbox_messages')
            .update({ status: 'ESCALATED' })
            .eq('id', inserted.id);

          if (assignedReviewer) {
            const senderName = (payload.sender_name as string) || 'Unknown';
            await notifyEscalationAssigned(assignedReviewer, inserted.id, senderName, risk_level, true);
          }

          console.info(`[Inbox] Auto-escalated message ${inserted.id} (${risk_level}) → reviewer: ${assignedReviewer ?? 'unassigned'}`);
        }
      })
      .catch(err => console.error('[Inbox] classify error:', (err as Error).message));
  }

  return 'new';
}

async function refreshYouTubeToken(accountId: string, refreshToken: string): Promise<string | null> {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.YOUTUBE_CLIENT_ID || '',
        client_secret: env.YOUTUBE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await r.json() as Record<string, unknown>;
    if (data.error || !data.access_token) return null;
    const newToken = data.access_token as string;
    await supabaseAdmin.from('connected_accounts').update({ access_token: newToken }).eq('id', accountId);
    return newToken;
  } catch {
    return null;
  }
}

export const syncPlatformMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.status(403).json({ error: 'Upgrade to Growth to sync live messages' });

    const workspaceId = req.user!.workspace_id as string;

    const { data: accounts } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform, account_handle, page_id, access_token, refresh_token, account_name')
      .eq('workspace_id', workspaceId)
      .in('platform', ['instagram', 'facebook', 'threads', 'youtube', 'twitter', 'linkedin'])
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      return res.json({ success: true, message: 'No social accounts connected. Go to Accounts and connect them first.', synced: 0 });
    }

    // Fetch auto-reply rules once for the whole sync pass
    const { data: rulesData } = await supabaseAdmin
      .from('inbox_auto_reply_rules')
      .select('id, keywords, reply_body, is_active, is_case_sensitive')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);
    const baseRules = (rulesData || []) as AutoReplyRule[];
    // syncOptions is built per-account inside the loop to include recipient account info
    const buildSyncOptions = (account: { access_token: string; account_handle: string | number; account_name: string }) => ({
      userId,
      rules: baseRules,
      accessToken: account.access_token,
      accountHandle: String(account.account_handle),
      recipientAccountHandle: String(account.account_handle),
      recipientAccountName: String(account.account_name || account.account_handle),
    });

    let totalSynced = 0;
    const syncErrors: string[] = [];

    // Subscribe pages and Instagram accounts to webhook events
    for (const account of accounts) {
      try {
        if (account.platform === 'facebook') {
          const subRes = await fetch(
            `${GRAPH_BASE}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed&access_token=${account.access_token}`,
            { method: 'POST' },
          );
          const subData = await subRes.json();
          if (subData.success) {
            console.log(`[Inbox] Facebook Page "${account.account_name}" subscribed to webhook events`);
          } else if (subData.error) {
            console.warn(`[Inbox] Facebook subscription warning: ${subData.error.message}`);
          }
        } else if (account.platform === 'instagram') {
          // Instagram webhook subscription is managed via Meta Developer Console
          // (Instagram use case → Webhooks → subscribe to messages + comments)
          console.log(`[Inbox] Instagram "${account.account_name}" — webhook managed via Dev Console`);
        }
      } catch {
        // non-blocking
      }
    }

    for (const account of accounts) {
      const token = account.access_token as string;
      const platform = account.platform as string;

      try {
        // Validate token — only Meta platforms use the Graph API /me check
        if (['instagram', 'facebook', 'threads'].includes(platform)) {
          const tokenCheck = await graphGet('/me', token, { fields: 'id' });
          if (tokenCheck.error) {
            syncErrors.push(`[${platform}] ${account.account_name}: token invalid — ${tokenCheck.error.message}. Reconnect this account.`);
            continue;
          }
        }
        if (platform === 'youtube') {
          const ytCheck = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const ytData: any = await ytCheck.json();
          if (ytData.error) {
            syncErrors.push(`[youtube] ${account.account_name}: token invalid — ${ytData.error.message}. Reconnect this account.`);
            continue;
          }
        }
        if (platform === 'twitter') {
          const twCheck = await fetch('https://api.x.com/2/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const twData: any = await twCheck.json();
          if (!twCheck.ok || twData.errors) {
            syncErrors.push(`[twitter] ${account.account_name}: token invalid — ${twData.errors?.[0]?.message || twData.title || 'auth failed'}. Reconnect this account.`);
            continue;
          }
        }

        // LinkedIn page tokens use org scopes (r_organization_social), not openid,
        // so /v2/userinfo would always 403. Token validity is checked inside syncLinkedInComments.

        if (platform === 'instagram') {
          // ── Instagram DMs ──────────────────────────────────────────────
          const igConvData = await graphGet(
            `/${account.account_handle}/conversations`,
            token,
            { platform: 'instagram', fields: 'id,messages{id,message,from,created_time}' },
          );

          if (igConvData.error) {
            const code = igConvData.error.code;
            const msg = igConvData.error.message || '';
            if (code === 3 || code === 10 || msg.includes('instagram_manage_messages')) {
              // Surface this as a visible warning — user needs to know
              syncErrors.push(`Instagram DMs (${account.account_name}): instagram_manage_messages permission required. In Meta App Dashboard → App Review → add instagram_manage_messages. Your account must be a Developer/Admin on the app to test in Live mode.`);
            } else {
              syncErrors.push(`Instagram DMs (${account.account_name}): ${msg} (code ${code})`);
            }
          } else {
            for (const conv of (igConvData.data || [])) {
              for (const msg of (conv.messages?.data || [])) {
                if (!msg.message || msg.from?.id === String(account.account_handle)) continue;
                const igDmUsername = msg.from?.username || '';
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'INSTAGRAM',
                  platform_message_id: msg.id,
                  sender_name: igDmUsername || msg.from?.name || 'Instagram User',
                  sender_handle: msg.from?.id || '',
                  message_type: 'DM',
                  message_body: msg.message,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: msg.created_time || new Date().toISOString(),
                }, buildSyncOptions(account));
                if (inserted === 'new') totalSynced++;
              }
            }
          }

          // ── Instagram Comments (last 10 posts) ─────────────────────────
          const mediaData = await graphGet(
            `/${account.account_handle}/media`,
            token,
            { fields: 'id,shortcode,timestamp,comments_count', limit: '10' },
          );

          if (mediaData.error) {
            syncErrors.push(`Instagram Comments (${account.account_name}): ${mediaData.error.message}`);
          } else {
            for (const post of (mediaData.data || [])) {
              if (!post.comments_count || post.comments_count === 0) continue;
              const commentsData = await graphGet(
                `/${post.id}/comments`,
                token,
                { fields: 'id,text,from,timestamp,username' },
              );
              if (commentsData.error) continue;
              for (const comment of (commentsData.data || [])) {
                if (!comment.text || comment.from?.id === String(account.account_handle)) continue;
                const igUsername = comment.from?.username || comment.username || '';
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'INSTAGRAM',
                  platform_message_id: comment.id,
                  sender_name: igUsername || comment.from?.name || 'Instagram User',
                  sender_handle: igUsername || comment.from?.id || '',
                  message_type: 'COMMENT',
                  message_body: comment.text,
                  original_post_id: post.id,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: comment.timestamp || new Date().toISOString(),
                }, buildSyncOptions(account));
                if (inserted === 'new') totalSynced++;
              }
            }
          }

        } else if (platform === 'facebook') {
          // ── Facebook Messenger ─────────────────────────────────────────
          const fbConvData = await graphGet(
            '/me/conversations',
            token,
            { fields: 'id,messages{id,message,from,created_time}' },
          );

          if (fbConvData.error) {
            const code = fbConvData.error.code;
            if (code === 3 || code === 10) {
              syncErrors.push(`Facebook DMs (${account.account_name}): pages_messaging permission required. Add it in Meta App Dashboard.`);
            } else {
              syncErrors.push(`Facebook DMs (${account.account_name}): ${fbConvData.error.message} (code ${code})`);
            }
          } else {
            for (const conv of (fbConvData.data || [])) {
              for (const msg of (conv.messages?.data || [])) {
                if (!msg.message || msg.from?.id === String(account.account_handle)) continue;
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'FACEBOOK',
                  platform_message_id: msg.id,
                  sender_name: msg.from?.name || 'Facebook User',
                  sender_handle: msg.from?.id || '',
                  message_type: 'DM',
                  message_body: msg.message,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: msg.created_time || new Date().toISOString(),
                }, buildSyncOptions(account));
                if (inserted === 'new') totalSynced++;
              }
            }
          }

          // ── Facebook Page Comments ──────────────────────────────────────
          // Must use Page token (not User token) for /me/posts — User token returns
          // personal timeline which has no page posts.
          const postsData = await graphGet(
            '/me/posts',
            token,
            { fields: 'id,created_time,comments{id,message,from,created_time}', limit: '10' },
          );

          if (postsData.error) {
            syncErrors.push(`Facebook Comments (${account.account_name}): ${postsData.error.message} (code ${postsData.error.code})`);
          } else {
            const postCount = postsData.data?.length || 0;
            let commentCount = 0;
            for (const post of (postsData.data || [])) {
              const comments = post.comments?.data || [];
              commentCount += comments.length;
              for (const comment of comments) {
                if (!comment.message) continue;
                const fromId = comment.from?.id;
                if (fromId && fromId === String(account.account_handle)) continue;
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'FACEBOOK',
                  platform_message_id: comment.id,
                  sender_name: comment.from?.name || 'Facebook User',
                  sender_handle: fromId || '',
                  message_type: 'COMMENT',
                  message_body: comment.message,
                  original_post_id: post.id,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: comment.created_time || new Date().toISOString(),
                }, buildSyncOptions(account));
                if (inserted === 'new') totalSynced++;
              }
            }
            console.debug(`[Inbox] Facebook sync: ${account.account_name} — ${postCount} posts, ${commentCount} comments scanned`);
          }
        } else if (platform === 'threads') {
          // ── Threads Replies ────────────────────────────────────────
          // Threads has no DMs. Fetch the user's recent posts, then
          // collect replies (comments) made by others on each post.
          const THREADS_BASE = 'https://graph.threads.net/v1.0';
          const userId_t = String(account.account_handle);
          const ownUsername = (account.account_name as string || '').toLowerCase();
          const threadsDiag: string[] = [];

          threadsDiag.push(`userId=${userId_t} ownUsername=${ownUsername}`);

          // Step 1: get recent posts
          const postsRes = await fetch(
            `${THREADS_BASE}/${userId_t}/threads?fields=id,text,timestamp&limit=20&access_token=${token}`,
          );
          const postsData = await postsRes.json() as Record<string, unknown>;

          if ((postsData.error as Record<string, unknown> | undefined)) {
            const errMsg = (postsData.error as Record<string, string>).message;
            threadsDiag.push(`posts API error: ${errMsg}`);
            syncErrors.push(`Threads (${account.account_name}): ${errMsg}`);
          } else {
            const posts = (postsData.data as Record<string, unknown>[]) || [];
            threadsDiag.push(`found ${posts.length} posts`);

            for (const post of posts) {
              const postId = post.id as string;
              const postText = (post.text as string || '').slice(0, 40);

              const repRes = await fetch(
                `${THREADS_BASE}/${postId}/replies?fields=id,text,username,timestamp&access_token=${token}`,
              );
              const repData = await repRes.json() as Record<string, unknown>;

              if ((repData.error as Record<string, unknown> | undefined)) {
                threadsDiag.push(`post "${postText}": replies error: ${(repData.error as Record<string,string>).message}`);
                continue;
              }

              const replies = (repData.data as Record<string, unknown>[]) || [];
              threadsDiag.push(`post "${postText}": ${replies.length} replies`);

              for (const reply of replies) {
                const replyId   = reply.id as string;
                const text      = (reply.text as string | undefined) || '';
                const username  = (reply.username as string | undefined) || 'Threads User';
                const timestamp = (reply.timestamp as string | undefined) || new Date().toISOString();

                if (!text) { threadsDiag.push(`  reply ${replyId}: skipped (no text)`); continue; }
                if (username.toLowerCase() === ownUsername) { threadsDiag.push(`  reply ${replyId}: skipped (own reply by @${username})`); continue; }

                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'THREADS',
                  platform_message_id: replyId,
                  sender_name: username,
                  sender_handle: username,
                  message_type: 'COMMENT',
                  message_body: text,
                  original_post_id: postId,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: timestamp,
                }, buildSyncOptions(account));
                threadsDiag.push(`  reply ${replyId} from @${username}: inserted=${inserted}`);
                if (inserted === 'new') totalSynced++;
              }
            }
          }
          syncErrors.push(...threadsDiag.map(d => `[Threads debug] ${d}`));
        } else if (platform === 'youtube') {
          // ── YouTube Comments ───────────────────────────────────────────
          const YT_BASE = 'https://www.googleapis.com/youtube/v3';
          let ytToken = token;
          const ytDiag: string[] = [];

          // Step 1: get channel id for this account (auto-refresh on 401)
          const tryChannelFetch = async (t: string) =>
            fetch(`${YT_BASE}/channels?part=id,snippet&mine=true`, {
              headers: { Authorization: `Bearer ${t}` },
            }).then(r => r.json() as Promise<Record<string, unknown>>);

          let channelData = await tryChannelFetch(ytToken);

          // If auth error and we have a refresh token, refresh and retry once
          const ytErr = channelData.error as Record<string, unknown> | undefined;
          if (ytErr && (ytErr.code === 401 || (ytErr.message as string || '').toLowerCase().includes('invalid authentication'))) {
            const refreshToken = account.refresh_token as string | null;
            if (refreshToken) {
              ytDiag.push('access_token expired — refreshing…');
              const newToken = await refreshYouTubeToken(account.id as string, refreshToken);
              if (newToken) {
                ytToken = newToken;
                channelData = await tryChannelFetch(ytToken);
              } else {
                syncErrors.push(`YouTube (${account.account_name}): Token refresh failed — reconnect YouTube in Accounts`);
              }
            } else {
              syncErrors.push(`YouTube (${account.account_name}): Access token expired and no refresh token stored — reconnect YouTube in Accounts`);
            }
          }

          if ((channelData.error as Record<string, unknown> | undefined)) {
            const errMsg = ((channelData.error as Record<string, unknown>).message as string) || 'Unknown error';
            syncErrors.push(`YouTube (${account.account_name}): ${errMsg}`);
          } else {
            const channels = (channelData.items as Record<string, unknown>[]) || [];
            ytDiag.push(`found ${channels.length} channel(s)`);

            for (const channel of channels) {
              const channelId = channel.id as string;

              // Step 2: get recent videos for each channel
              const videosRes = await fetch(
                `${YT_BASE}/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=10`,
                { headers: { Authorization: `Bearer ${ytToken}` } },
              );
              const videosData = await videosRes.json() as Record<string, unknown>;

              if ((videosData.error as Record<string, unknown> | undefined)) {
                ytDiag.push(`channel ${channelId}: videos error: ${((videosData.error as Record<string,unknown>).message as string)}`);
                continue;
              }

              const videoItems = (videosData.items as Record<string, unknown>[]) || [];
              ytDiag.push(`channel ${channelId}: ${videoItems.length} videos`);

              for (const item of videoItems) {
                const videoId = ((item.id as Record<string, string>).videoId);
                if (!videoId) continue;

                // Step 3: get top-level comment threads for each video
                const commentsRes = await fetch(
                  `${YT_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=50`,
                  { headers: { Authorization: `Bearer ${ytToken}` } },
                );
                const commentsData = await commentsRes.json() as Record<string, unknown>;

                if ((commentsData.error as Record<string, unknown> | undefined)) {
                  ytDiag.push(`video ${videoId}: comments error`);
                  continue;
                }

                const commentItems = (commentsData.items as Record<string, unknown>[]) || [];
                ytDiag.push(`video ${videoId}: ${commentItems.length} comment threads`);

                for (const ct of commentItems) {
                  const topComment = ((ct as Record<string, unknown>).snippet as Record<string, unknown>)?.topLevelComment as Record<string, unknown>;
                  if (!topComment) continue;

                  const snippet = topComment.snippet as Record<string, unknown>;
                  const commentId  = topComment.id as string;
                  const authorName = (snippet.authorDisplayName as string) || 'YouTube User';
                  const authorHandle = (snippet.authorChannelUrl as string) || '';
                  const text       = (snippet.textOriginal as string) || (snippet.textDisplay as string) || '';
                  const publishedAt = (snippet.publishedAt as string) || new Date().toISOString();

                  if (!text) { ytDiag.push(`  comment ${commentId}: skipped (no text)`); continue; }

                  const inserted = await insertMessageIfNew(workspaceId, {
                    platform: 'YOUTUBE',
                    platform_message_id: commentId,
                    sender_name: authorName,
                    sender_handle: authorHandle,
                    message_type: 'COMMENT',
                    message_body: text,
                    original_post_id: videoId,
                    status: 'UNREAD',
                    risk_level: 'LOW',
                    sentiment: 'NEUTRAL',
                    received_at: publishedAt,
                  }, buildSyncOptions(account));
                  ytDiag.push(`  comment ${commentId} from "${authorName}": inserted=${inserted}`);
                  if (inserted === 'new') totalSynced++;
                }
              }
            }
          }
          syncErrors.push(...ytDiag.map(d => `[YouTube debug] ${d}`));
        }

        // ── Twitter / X ────────────────────────────────────────────────────────
        if (platform === 'twitter') {
          const twDiag: string[] = [];
          const twitterUserId = account.page_id as string | null;
          twDiag.push(`Twitter user ID: ${twitterUserId || 'MISSING'}`);
          if (!twitterUserId) {
            syncErrors.push(`Twitter (${account.account_name}): numeric user ID missing — reconnect this account to fix`);
          } else {
            // Mentions (last 10)
            const mentionsRes = await fetch(
              `https://api.x.com/2/users/${twitterUserId}/mentions?max_results=10&tweet.fields=author_id,created_at,conversation_id,in_reply_to_user_id&expansions=author_id&user.fields=name,username,profile_image_url`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const mentionsData: any = await mentionsRes.json();
            twDiag.push(`mentions HTTP ${mentionsRes.status}: ${JSON.stringify(mentionsData).slice(0, 200)}`);
            if (mentionsData.errors || !mentionsRes.ok) {
              syncErrors.push(`Twitter mentions (${account.account_name}): ${mentionsData.errors?.[0]?.detail || mentionsData.title || mentionsRes.status}`);
            } else {
              twDiag.push(`mentions found: ${mentionsData.data?.length ?? 0}`);
              const usersMap: Record<string, any> = {};
              for (const u of (mentionsData.includes?.users || [])) usersMap[u.id] = u;
              for (const tweet of (mentionsData.data || [])) {
                const author = usersMap[tweet.author_id] || {};
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'TWITTER',
                  platform_message_id: tweet.id,
                  sender_name: author.name || author.username || 'Twitter User',
                  sender_handle: author.username ? `@${author.username}` : tweet.author_id,
                  sender_avatar_url: author.profile_image_url?.replace('_normal', '') ?? null,
                  message_type: 'MENTION',
                  message_body: tweet.text,
                  original_post_id: tweet.conversation_id || tweet.id,
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: tweet.created_at || new Date().toISOString(),
                }, buildSyncOptions(account));
                twDiag.push(`tweet ${tweet.id} "${tweet.text?.slice(0, 30)}": ${inserted}`);
                if (inserted === 'new') totalSynced++;
              }
            }

            // DMs (last 50 events across all conversations)
            const dmRes = await fetch(
              `https://api.x.com/2/dm_events?dm_event.fields=id,text,created_at,sender_id,dm_conversation_id&expansions=sender_id&user.fields=name,username,profile_image_url&max_results=50&event_types=MessageCreate`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const dmData: any = await dmRes.json();
            if (dmData.errors || !dmRes.ok) {
              syncErrors.push(`Twitter DMs (${account.account_name}): ${dmData.errors?.[0]?.detail || dmData.title || dmRes.status}`);
            } else {
              const dmUsersMap: Record<string, any> = {};
              for (const u of (dmData.includes?.users || [])) dmUsersMap[u.id] = u;
              for (const event of (dmData.data || [])) {
                // Skip messages sent by this account
                if (event.sender_id === twitterUserId) continue;
                const sender = dmUsersMap[event.sender_id] || {};
                const inserted = await insertMessageIfNew(workspaceId, {
                  platform: 'TWITTER',
                  platform_message_id: event.id,
                  sender_name: sender.name || sender.username || 'Twitter User',
                  sender_handle: sender.username ? `@${sender.username}` : event.sender_id,
                  sender_avatar_url: sender.profile_image_url?.replace('_normal', '') ?? null,
                  message_type: 'DM',
                  message_body: event.text || '',
                  status: 'UNREAD',
                  risk_level: 'LOW',
                  sentiment: 'NEUTRAL',
                  received_at: event.created_at || new Date().toISOString(),
                }, buildSyncOptions(account));
                if (inserted === 'new') totalSynced++;
              }
            }
          }
          syncErrors.push(...twDiag.map(d => `[twitter debug] ${d}`));
        }

        // ── LinkedIn Page Comments ─────────────────────────────────────────
        if (platform === 'linkedin') {
          // Only page accounts (URN handles) support community management
          if (!account.account_handle.startsWith('urn:li:organization:')) {
            syncErrors.push(`[linkedin debug] Skipping personal LinkedIn profile ${account.account_name} (only page accounts support comment sync)`);
          } else {
            const liResult = await syncLinkedInComments(
              workspaceId,
              account as any,
              insertMessageIfNew as any,
              buildSyncOptions(account) as any,
            );
            if (liResult.error) {
              syncErrors.push(`LinkedIn (${account.account_name}): ${liResult.error}`);
            } else {
              totalSynced += liResult.synced;
              syncErrors.push(`[linkedin debug] ${account.account_name}: synced ${liResult.synced} comment(s)`);
            }
            for (const d of (liResult.debug || [])) {
              syncErrors.push(`[linkedin debug] ${d}`);
            }
          }
        }

      } catch (err) {
        syncErrors.push(`${platform} (${account.account_name}): ${err instanceof Error ? err.message : 'Fetch failed'}`);
      }
    }

    await logInboxAudit('system', workspaceId, userId, `Platform sync: ${totalSynced} new messages from ${accounts.length} account(s)`);

    const isDebugLine = (e: string) => e.startsWith('[Threads debug]') || e.startsWith('[YouTube debug]') || e.startsWith('[fb-debug]') || e.startsWith('[twitter debug]') || e.startsWith('[linkedin debug]');
    res.json({
      success: true,
      synced: totalSynced,
      accounts: accounts.length,
      errors: syncErrors.filter(e => !isDebugLine(e)),
      debug: syncErrors.filter(isDebugLine).map(e => e.replace(/^\[(Threads|YouTube) debug\] /, '')),
      message: totalSynced > 0
        ? `Synced ${totalSynced} new message(s) from ${accounts.length} account(s).`
        : 'No new messages found.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Post Preview — fetch original post image/caption from Meta ───────────────

async function getAccountToken(workspaceId: string, platform: string): Promise<{ id: string; token: string; refreshToken: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, access_token, refresh_token')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform.toLowerCase())
    .eq('status', 'active')
    .limit(1);
  if (!data || data.length === 0) return null;
  return { id: data[0].id as string, token: data[0].access_token as string, refreshToken: data[0].refresh_token as string | null };
}

export const getPostPreview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (isPreviewOnly(req)) return res.json({ success: false, preview: null });

    const workspaceId = req.user!.workspace_id as string;
    const { id } = req.params;

    const { data: msg } = await supabaseAdmin
      .from('inbox_messages')
      .select('original_post_id, platform')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!msg?.original_post_id) return res.json({ success: true, preview: null });

    const platform = (msg.platform as string).toUpperCase();
    const postId = msg.original_post_id as string;

    // ── YouTube ───────────────────────────────────────────────────────────────
    if (platform === 'YOUTUBE') {
      const acct = await getAccountToken(workspaceId, 'youtube');
      if (!acct) return res.json({ success: true, preview: null });

      let ytToken = acct.token;
      const fetchVideo = (t: string) =>
        fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${postId}`, {
          headers: { Authorization: `Bearer ${t}` },
        }).then(r => r.json() as Promise<Record<string, unknown>>);

      let data = await fetchVideo(ytToken);
      const ytErr = data.error as Record<string, unknown> | undefined;
      if (ytErr && acct.refreshToken) {
        const newToken = await refreshYouTubeToken(acct.id, acct.refreshToken);
        if (newToken) { ytToken = newToken; data = await fetchVideo(ytToken); }
      }
      if (data.error || !data.items) return res.json({ success: true, preview: null });

      const items = data.items as Record<string, unknown>[];
      if (!items.length) return res.json({ success: true, preview: null });

      const snippet = items[0].snippet as Record<string, unknown>;
      const thumbs = snippet.thumbnails as Record<string, Record<string, string>> | undefined;
      return res.json({
        success: true,
        preview: {
          thumb:      thumbs?.medium?.url || thumbs?.default?.url || null,
          image:      thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.medium?.url || null,
          caption:    (snippet.title as string) || null,
          media_type: 'VIDEO',
          post_url:   `https://www.youtube.com/watch?v=${postId}`,
        },
      });
    }

    // ── Threads ───────────────────────────────────────────────────────────────
    if (platform === 'THREADS') {
      const acct = await getAccountToken(workspaceId, 'threads');
      if (!acct) return res.json({ success: true, preview: null });

      const r = await fetch(
        `https://graph.threads.net/v1.0/${postId}?fields=id,text,media_type,media_url,thumbnail_url,permalink&access_token=${acct.token}`,
      );
      const d = await r.json() as Record<string, string>;
      if (d.error) return res.json({ success: true, preview: null });

      const isVideo = d.media_type === 'VIDEO' || d.media_type === 'REEL';
      return res.json({
        success: true,
        preview: {
          thumb:      d.thumbnail_url || (isVideo ? null : d.media_url) || null,
          image:      d.media_url || null,
          caption:    d.text || null,
          media_type: d.media_type || 'TEXT',
          post_url:   d.permalink || null,
        },
      });
    }

    // ── Twitter / X ───────────────────────────────────────────────────────────
    if (platform === 'TWITTER') {
      const acct = await getAccountToken(workspaceId, 'twitter');
      if (!acct) return res.json({ success: true, preview: null });

      const r = await fetch(
        `https://api.twitter.com/2/tweets/${postId}?tweet.fields=text,created_at&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
        { headers: { Authorization: `Bearer ${acct.token}` } },
      );
      const d = await r.json() as Record<string, unknown>;
      if (d.errors || !d.data) return res.json({ success: true, preview: null });

      const tweet = d.data as Record<string, unknown>;
      const mediaItems = ((d.includes as Record<string, unknown>)?.media as Record<string, string>[]) || [];
      const media = mediaItems[0] || null;

      return res.json({
        success: true,
        preview: {
          thumb:      media?.preview_image_url || media?.url || null,
          image:      media?.url || null,
          caption:    (tweet.text as string) || null,
          media_type: media?.type?.toUpperCase() || 'TEXT',
          post_url:   `https://x.com/i/web/status/${postId}`,
        },
      });
    }

    // ── LinkedIn ──────────────────────────────────────────────────────────────
    if (platform === 'LINKEDIN') {
      const acct = await getAccountToken(workspaceId, 'linkedin');
      if (!acct) return res.json({ success: true, preview: null });

      // LinkedIn post IDs stored as URNs (urn:li:ugcPost:...) or plain numeric IDs
      const urn = postId.startsWith('urn:') ? postId : `urn:li:ugcPost:${postId}`;
      const r = await fetch(
        `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(urn)}`,
        { headers: { Authorization: `Bearer ${acct.token}`, 'LinkedIn-Version': '202304' } },
      );
      const d = await r.json() as Record<string, unknown>;
      if (d.status === 404 || d.message) return res.json({ success: true, preview: null });

      const specificContent = (d.specificContent as Record<string, unknown>)?.['com.linkedin.ugc.ShareContent'] as Record<string, unknown> | undefined;
      const media = (specificContent?.media as Record<string, unknown>[])?.[0] || null;
      const description = (specificContent?.shareCommentary as Record<string, string>)?.text || null;
      const thumb = (media?.thumbnails as Record<string, string>[])?.[0]?.url || null;
      const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`;

      return res.json({
        success: true,
        preview: {
          thumb,
          image:      thumb,
          caption:    description,
          media_type: media ? 'IMAGE' : 'TEXT',
          post_url:   postUrl,
        },
      });
    }

    // ── Instagram / Facebook (Meta Graph API) ─────────────────────────────────
    const metaPlatform = platform === 'INSTAGRAM' ? 'instagram' : 'facebook';
    const acct = await getAccountToken(workspaceId, metaPlatform);
    if (!acct) return res.json({ success: true, preview: null });

    const fields = platform === 'INSTAGRAM'
      ? 'media_url,thumbnail_url,caption,media_type,timestamp,permalink'
      : 'message,full_picture,picture,created_time,permalink_url';

    const r = await fetch(`${GRAPH_BASE}/${postId}?fields=${fields}&access_token=${acct.token}`);
    const d = await r.json() as Record<string, string>;
    if (d.error) return res.json({ success: true, preview: null });

    const preview = platform === 'INSTAGRAM' ? {
      thumb:      d.thumbnail_url || d.media_url || null,
      image:      d.media_url || null,
      caption:    d.caption || null,
      media_type: d.media_type || null,
      post_url:   d.permalink || null,
    } : {
      thumb:      d.picture || d.full_picture || null,
      image:      d.full_picture || d.picture || null,
      caption:    d.message || null,
      media_type: 'IMAGE',
      post_url:   d.permalink_url || null,
    };

    res.json({ success: true, preview });
  } catch (error) {
    next(error);
  }
};

