
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';

const LI_REST = 'https://api.linkedin.com/rest';
const LI_V2   = 'https://api.linkedin.com/v2';
const LI_VERSION = '202406';

function liHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': LI_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };
}

async function liGet(url: string, token: string): Promise<any> {
  const res = await fetch(url, { headers: liHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn({ status: res.status, url, body }, '[LinkedIn] GET failed');
    const isPerm = res.status === 401 || res.status === 403;
    return { error: { status: res.status, message: body, permission_denied: isPerm } };
  }
  return res.json();
}

async function getLinkedInAccount(accountId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('connected_accounts')
    .select('id, account_handle, account_name, access_token')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .eq('platform', 'linkedin')
    .eq('status', 'active')
    .single();
  return data as { id: string; account_handle: string; account_name: string; access_token: string } | null;
}

// ── GET /api/v1/linkedin/:accountId/feed ─────────────────────────────────────
// Returns latest posts from the LinkedIn page with social action counts.

export const getLinkedInPageFeed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const account = await getLinkedInAccount(String(req.params.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: 'LinkedIn account not found or expired' });

    const { account_handle: orgUrn, access_token: token } = account;
    const encodedOrg = encodeURIComponent(orgUrn);

    // Fetch recent posts from the page
    const postsData = await liGet(
      `${LI_REST}/posts?author=${encodedOrg}&count=20`,
      token,
    );
    if (postsData.error) {
      return res.json({ success: true, data: { posts: [], error: postsData.error.message, permission_denied: postsData.error.permission_denied } });
    }

    const elements: any[] = postsData.elements || [];

    // Fetch social actions for each post (likes, comments, shares) in parallel
    const posts = await Promise.all(
      elements.map(async (el: any) => {
        const postUrn = el.id as string;
        let likes = 0, comments = 0, shares = 0; const impressions = 0;

        try {
          const actions = await liGet(
            `${LI_REST}/socialActions/${encodeURIComponent(postUrn)}`,
            token,
          );
          if (!actions.error) {
            likes      = actions.likesSummary?.totalLikes ?? 0;
            comments   = actions.commentsSummary?.totalFirstLevelComments ?? 0;
            shares     = actions.sharesSummary?.totalShares ?? 0;
          }
        } catch { /* ignore */ }

        // Extract text from commentary or specificContent
        let text = el.commentary || '';
        if (!text && el.content?.article?.description) text = el.content.article.description;

        // Extract media thumbnail
        let thumbnail: string | null = null;
        const mediaArr = el.content?.multiImage?.images || el.content?.media || [];
        if (Array.isArray(mediaArr) && mediaArr.length > 0) {
          thumbnail = mediaArr[0]?.id || null;
        }
        if (!thumbnail && el.content?.article?.thumbnail) {
          thumbnail = el.content.article.thumbnail;
        }

        return {
          urn:         postUrn,
          text:        text.slice(0, 500),
          published_at: el.publishedAt ? new Date(el.publishedAt).toISOString() : null,
          likes,
          comments,
          shares,
          impressions,
          lifecycle:   el.lifecycleState || 'PUBLISHED',
          visibility:  el.visibility || 'PUBLIC',
          thumbnail,
          post_url:    `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/`,
        };
      }),
    );

    return res.json({ success: true, data: { posts, org_urn: orgUrn, account_name: account.account_name } });
  } catch (err) { next(err); }
};

// ── GET /api/v1/linkedin/:accountId/analytics ────────────────────────────────
// Returns page-level analytics: followers, impressions, engagement, share stats.

export const getLinkedInPageAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const account = await getLinkedInAccount(String(req.params.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: 'LinkedIn account not found' });

    const { account_handle: orgUrn, access_token: token } = account;
    const encodedOrg = encodeURIComponent(orgUrn);

    // Parallel: follower count + follower stats + share stats
    const [sizeData, followerStats, shareStats] = await Promise.all([
      liGet(`${LI_V2}/networkSizes/${encodedOrg}?edgeType=CompanyFollowedByMember`, token),
      liGet(`${LI_REST}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}`, token),
      liGet(`${LI_REST}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}`, token),
    ]);

    const totalFollowers: number = sizeData.firstDegreeSize ?? null;

    // Aggregate follower gains (last 30 data points)
    const followerElements: any[] = followerStats.elements || [];
    const totalOrganicGain  = followerElements.reduce((s: number, e: any) => s + (e.followerGains?.organicFollowerGain ?? 0), 0);
    const totalPaidGain     = followerElements.reduce((s: number, e: any) => s + (e.followerGains?.paidFollowerGain ?? 0), 0);

    // Aggregate share statistics
    const shareEl = (shareStats.elements || [])[0]?.totalShareStatistics || {};
    const totalImpressions = shareEl.impressionCount ?? null;
    const totalClicks      = shareEl.clickCount ?? null;
    const totalLikes       = shareEl.likeCount ?? null;
    const totalComments    = shareEl.commentCount ?? null;
    const totalShares      = shareEl.shareCount ?? null;
    const engagementRate   = shareEl.engagement ?? null;

    // Follower demographics (industry, seniority, geo) if available
    const followerByIndustry: { label: string; count: number }[] = [];
    const followerBySeniority: { label: string; count: number }[] = [];
    for (const el of followerElements) {
      if (el.followerCountsBySeniority) {
        for (const [k, v] of Object.entries(el.followerCountsBySeniority as Record<string, number>)) {
          const existing = followerBySeniority.find(x => x.label === k);
          if (existing) existing.count += v;
          else followerBySeniority.push({ label: k, count: v });
        }
      }
      if (el.followerCountsByIndustry) {
        for (const [k, v] of Object.entries(el.followerCountsByIndustry as Record<string, number>)) {
          const existing = followerByIndustry.find(x => x.label === k);
          if (existing) existing.count += v;
          else followerByIndustry.push({ label: k, count: v });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        followers: {
          total:        totalFollowers,
          organic_gain: totalOrganicGain,
          paid_gain:    totalPaidGain,
          by_seniority: followerBySeniority.sort((a, b) => b.count - a.count).slice(0, 8),
          by_industry:  followerByIndustry.sort((a, b) => b.count - a.count).slice(0, 8),
        },
        content: {
          impressions:      totalImpressions,
          clicks:           totalClicks,
          likes:            totalLikes,
          comments:         totalComments,
          shares:           totalShares,
          engagement_rate:  engagementRate,
        },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/v1/linkedin/:accountId/comments?postUrn=... ─────────────────────
// Returns comments on a specific LinkedIn post.

export const getLinkedInPostComments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const postUrn = req.query.postUrn as string;
    if (!postUrn) return res.status(400).json({ error: 'postUrn query param required' });

    const account = await getLinkedInAccount(String(req.params.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: 'LinkedIn account not found' });

    const commentsData = await liGet(
      `${LI_REST}/comments?parentEntity=${encodeURIComponent(postUrn)}&count=50`,
      account.access_token,
    );

    if (commentsData.error) {
      return res.json({ success: true, data: { comments: [], error: commentsData.error.message, permission_denied: commentsData.error.permission_denied } });
    }

    const comments = ((commentsData.elements || []) as any[]).map((c: any) => ({
      urn:          c.id,
      actor_urn:    c.actor,
      actor_name:   c.$actor?.localizedFirstName
        ? `${c.$actor.localizedFirstName} ${c.$actor.localizedLastName || ''}`.trim()
        : 'LinkedIn Member',
      actor_image:  c.$actor?.profilePicture?.displayImage || null,
      text:         c.message?.text || '',
      created_at:   c.created?.time ? new Date(c.created.time).toISOString() : null,
      likes:        c.likesSummary?.totalLikes ?? 0,
      reply_count:  c.commentsSummary?.totalFirstLevelComments ?? 0,
    }));

    return res.json({ success: true, data: { comments } });
  } catch (err) { next(err); }
};

// ── POST /api/v1/linkedin/:accountId/reply ───────────────────────────────────
// Posts a comment on a LinkedIn post (as the organization page).

export const replyToLinkedInPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const { postUrn, text } = req.body as { postUrn: string; text: string };
    if (!postUrn || !text?.trim()) return res.status(400).json({ error: 'postUrn and text required' });

    const account = await getLinkedInAccount(String(req.params.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: 'LinkedIn account not found' });

    const { account_handle: orgUrn, access_token: token } = account;

    const postRes = await fetch(`${LI_REST}/comments`, {
      method: 'POST',
      headers: liHeaders(token),
      body: JSON.stringify({
        actor:   orgUrn,
        object:  postUrn,
        message: { text: text.trim() },
      }),
    });

    if (!postRes.ok) {
      const body = await postRes.text().catch(() => '');
      logger.warn({ status: postRes.status, body }, '[LinkedIn] Reply failed');
      return res.status(400).json({ error: `LinkedIn API error: ${postRes.status}`, details: body });
    }

    const commentUrn = postRes.headers.get('x-restli-id') || '';
    return res.json({ success: true, data: { comment_urn: commentUrn } });
  } catch (err) { next(err); }
};

// ── DELETE /api/v1/linkedin/:accountId/comment ───────────────────────────────
// Deletes a comment from a LinkedIn post (moderation).

export const deleteLinkedInComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'No workspace' });

    const commentUrn = (req.query.commentUrn as string) || (req.body as any)?.commentUrn;
    if (!commentUrn) return res.status(400).json({ error: 'commentUrn query param required' });

    const account = await getLinkedInAccount(String(req.params.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: 'LinkedIn account not found' });

    const delRes = await fetch(
      `${LI_REST}/comments/${encodeURIComponent(commentUrn)}`,
      { method: 'DELETE', headers: liHeaders(account.access_token) },
    );

    if (!delRes.ok && delRes.status !== 204) {
      const body = await delRes.text().catch(() => '');
      return res.status(400).json({ error: `LinkedIn delete failed: ${delRes.status}`, details: body });
    }

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// In-memory throttle: prevent hammering LinkedIn's rate-limited comments endpoint.
// Keyed by `${workspaceId}:${accountId}`, value is the timestamp of the last sync.
const _liSyncThrottle = new Map<string, number>();
// 30 min auto-throttle. With 10 posts × max 48 syncs/day = 480... but frontend
// fires every 15 min so real max = 96 calls/day. Well within ~100 limit.
const LI_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes between auto comment syncs

// ── Sync helper called from inboxController.syncPlatformMessages ──────────────
// Pulls comments from recent LinkedIn page posts into inbox_messages.
// Rate limit note: LinkedIn's v2 socialActions/comments has ~100 calls/day per token.
// With up to 10 posts × 1 call each = 10 calls/sync, 30-min throttle = max 48 syncs/day.

export async function syncLinkedInComments(
  workspaceId: string,
  account: { id: string; account_handle: string; account_name: string; access_token: string },
  insertFn: (wsId: string, payload: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<string>,
  syncOpts: Record<string, unknown>,
): Promise<{ synced: number; error?: string; debug: string[] }> {
  const { account_handle: orgUrn, access_token: token } = account;
  const debug: string[] = [];

  // Throttle: skip if last sync was within LI_SYNC_INTERVAL_MS
  const throttleKey = `${workspaceId}:${account.id}`;
  const lastSync = _liSyncThrottle.get(throttleKey) ?? 0;
  const msSince = Date.now() - lastSync;
  if (msSince < LI_SYNC_INTERVAL_MS) {
    const minutesLeft = Math.ceil((LI_SYNC_INTERVAL_MS - msSince) / 60_000);
    debug.push(`throttled — next sync in ~${minutesLeft} min (rate-limit protection)`);
    return { synced: 0, debug };
  }
  _liSyncThrottle.set(throttleKey, Date.now());

  // Fetch recent posts — try REST API first, fall back to v2 ugcPosts.
  // Only fetch last 5 posts: 5 calls/sync × max 12 syncs/day = 60 calls, within the ~100/day limit.
  const encodedOrg = encodeURIComponent(orgUrn);

  let postsData = await liGet(`${LI_REST}/posts?author=${encodedOrg}&count=10`, token);

  if (postsData.error) {
    debug.push(`REST /posts failed (${postsData.error.status}) — trying v2 ugcPosts`);
    const encodedAuthorList = `List(${encodeURIComponent(orgUrn)})`;
    const v2Res = await fetch(
      `${LI_V2}/ugcPosts?q=authors&authors=${encodedAuthorList}&count=10`,
      { headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' } },
    );
    if (v2Res.ok) {
      postsData = await v2Res.json();
      debug.push(`v2 ugcPosts succeeded`);
    } else {
      const body = await v2Res.text().catch(() => '');
      const msg = typeof postsData.error.message === 'string' ? postsData.error.message : JSON.stringify(postsData.error);
      return { synced: 0, error: `LinkedIn posts fetch failed: REST=${postsData.error.status} v2=${v2Res.status} — ${msg}`, debug };
    }
  }

  const posts: any[] = postsData.elements || [];
  debug.push(`found ${posts.length} post(s) on page`);
  let synced = 0;
  let rateLimited = false;

  for (const post of posts) {
    if (rateLimited) break; // stop early — all remaining requests will also 429

    const postUrn = post.id as string;

    // Try REST comments first (requires Community Management API product — now added to app).
    // Fall back to v2 socialActions if REST returns 404 (token issued before product was added).
    let commentsData = await liGet(
      `${LI_REST}/comments?parentEntity=${encodeURIComponent(postUrn)}&count=50`,
      token,
    );
    if (commentsData.error) {
      debug.push(`REST comments failed for ${postUrn} (${commentsData.error.status}) — trying v2 socialActions`);
      const v2CommRes = await fetch(
        `${LI_V2}/socialActions/${encodeURIComponent(postUrn)}/comments?count=50`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' } },
      );
      if (v2CommRes.ok) {
        commentsData = await v2CommRes.json();
      } else {
        if (v2CommRes.status === 429) {
          rateLimited = true;
          debug.push(`rate limited (429) — v2 daily quota exhausted. Reconnect LinkedIn account to use Community Management API (already added to app).`);
          _liSyncThrottle.delete(throttleKey);
        } else {
          debug.push(`v2 comments also failed for ${postUrn}: ${v2CommRes.status}`);
        }
        continue;
      }
    }

    const allComments = (commentsData.elements || []) as any[];
    // Filter out comments made by the org itself
    const external = allComments.filter((c: any) => c.actor !== orgUrn);
    debug.push(`post ${postUrn}: ${allComments.length} comment(s), ${external.length} external`);

    for (const c of external) {
      const actorUrn = (c.actor as string) || '';
      // REST API may include actor expansion via $actor or actor~
      const actorProfile = c.$actor || c['actor~'];
      const actorName = actorProfile?.localizedFirstName
        ? `${actorProfile.localizedFirstName} ${actorProfile.localizedLastName || ''}`.trim()
        : 'LinkedIn Member';
      const text = c.message?.text || '';
      if (!text) {
        debug.push(`  skipping comment ${c.id} — empty text`);
        continue;
      }

      // c.id from REST API is already a full URN: urn:li:comment:(postUrn,commentId)
      // This is the correct format for the reply endpoint in inboxController
      const result = await insertFn(
        workspaceId,
        {
          platform:            'LINKEDIN',
          platform_message_id: c.id,
          sender_name:         actorName,
          sender_handle:       actorUrn,
          message_type:        'COMMENT',
          message_body:        text,
          original_post_id:    postUrn,
          status:              'UNREAD',
          risk_level:          'LOW',
          sentiment:           'NEUTRAL',
          received_at:         c.created?.time ? new Date(c.created.time).toISOString() : new Date().toISOString(),
        },
        syncOpts,
      );
      debug.push(`  comment ${c.id}: ${result}`);
      if (result === 'new') synced++;
    }
  }

  return { synced, debug };
}
