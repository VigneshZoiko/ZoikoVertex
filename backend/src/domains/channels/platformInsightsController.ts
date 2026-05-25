/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

interface PlatformInsight {
  platform: string;
  account_handle: string;
  account_name: string;
  avatar_url: string | null;
  followers: number | null;
  impressions_7d: number | null;
  reach_7d: number | null;
  has_insights: boolean;
}

function sumValues(data: any[], name: string): number | null {
  const metric = data?.find((m: any) => m.name === name);
  if (!metric) return null;
  // Time-series metrics use values[]
  if (metric.values?.length) return metric.values.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
  // Total-value metrics (e.g. Threads followers_count, likes)
  if (metric.total_value?.value != null) return metric.total_value.value;
  return null;
}

async function fetchFacebookInsights(handle: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  const basicRes = await fetch(
    `https://graph.facebook.com/v19.0/${handle}?fields=name,fan_count,followers_count&access_token=${token}`
  );
  const basic: any = await basicRes.json();
  if (basic.error) return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };

  const followers: number | null = basic.followers_count ?? basic.fan_count ?? null;

  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const insRes = await fetch(
    `https://graph.facebook.com/v19.0/${handle}/insights?metric=page_views_total&period=day&since=${since}&until=${until}&access_token=${token}`
  );
  const ins: any = await insRes.json();
  if (ins.error) return { followers, impressions_7d: null, reach_7d: null, has_insights: false };

  const views = sumValues(ins.data, 'page_views_total');

  return {
    followers,
    impressions_7d: views,
    reach_7d: null,
    has_insights: true,
  };
}

async function fetchInstagramInsights(handle: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  const basicRes = await fetch(
    `https://graph.facebook.com/v19.0/${handle}?fields=username,followers_count,media_count&access_token=${token}`
  );
  const basic: any = await basicRes.json();
  if (basic.error) return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };

  const followers: number | null = basic.followers_count ?? null;

  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const insRes = await fetch(
    `https://graph.facebook.com/v19.0/${handle}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${token}`
  );
  const ins: any = await insRes.json();
  if (ins.error) return { followers, impressions_7d: null, reach_7d: null, has_insights: false };

  return {
    followers,
    impressions_7d: null,
    reach_7d: sumValues(ins.data, 'reach'),
    has_insights: true,
  };
}

async function fetchPinterestInsights(handle: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  const pinterestBase = 'https://api.pinterest.com';

  const profileRes = await fetch(`${pinterestBase}/v5/user_account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile: any = await profileRes.json();
  if (profile.code || profile.status >= 400) return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };

  const followers: number | null = profile.follower_count ?? null;

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const analyticsRes = await fetch(
    `${pinterestBase}/v5/user_account/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=IMPRESSION,SAVE`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const analytics: any = await analyticsRes.json();

  // If analytics call fails, still mark as connected — followers were retrieved successfully
  if (analytics.code || !analytics.all?.summary_metrics) {
    return { followers, impressions_7d: null, reach_7d: null, has_insights: true };
  }

  const impressions: number | null = analytics.all.summary_metrics.IMPRESSION ?? null;
  const saves: number | null = analytics.all.summary_metrics.SAVE ?? null;

  return { followers, impressions_7d: impressions, reach_7d: saves, has_insights: true };
}

async function fetchThreadsInsights(handle: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  const base = 'https://graph.threads.net/v1.0';

  // Follower count (lifetime metric)
  const followersRes = await fetch(
    `${base}/${handle}/threads_insights?metric=followers_count&period=lifetime&access_token=${token}`
  );
  const followersData: any = await followersRes.json();
  if (followersData.error) return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };

  const followers: number | null = sumValues(followersData.data, 'followers_count');

  // 7-day views + likes
  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const insRes = await fetch(
    `${base}/${handle}/threads_insights?metric=views,likes&period=day&since=${since}&until=${until}&access_token=${token}`
  );
  const ins: any = await insRes.json();
  if (ins.error) return { followers, impressions_7d: null, reach_7d: null, has_insights: false };

  return {
    followers,
    impressions_7d: sumValues(ins.data, 'views'),
    reach_7d: sumValues(ins.data, 'likes'),
    has_insights: true,
  };
}

async function fetchYouTubeInsights(token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  // Channel stats — subscriber count
  const statsRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const statsData: any = await statsRes.json();
  if (statsData.error || !statsData.items?.length) {
    return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };
  }

  const stats = statsData.items[0].statistics;
  const followers: number | null = stats.subscriberCount != null ? Number(stats.subscriberCount) : null;

  // 7-day views via YouTube Analytics API
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const analyticsData: any = await analyticsRes.json();
  if (analyticsData.error || !analyticsData.rows?.length) {
    return { followers, impressions_7d: null, reach_7d: null, has_insights: false };
  }

  const views: number | null = analyticsData.rows?.[0]?.[0] ?? null;
  const watchMinutes: number | null = analyticsData.rows?.[0]?.[1] ?? null;

  return { followers, impressions_7d: views, reach_7d: watchMinutes, has_insights: true };
}

async function fetchTwitterInsights(userId: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  // User profile — followers count
  const userRes = await fetch(
    `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const userData: any = await userRes.json();
  if (userData.errors || !userData.data) return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };

  const followers: number | null = userData.data.public_metrics?.followers_count ?? null;

  // Tweets from last 7 days — impressions + engagements
  const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=public_metrics,created_at&max_results=100&start_time=${startTime}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const tweetsData: any = await tweetsRes.json();
  if (tweetsData.errors || !tweetsRes.ok) {
    return { followers, impressions_7d: null, reach_7d: null, has_insights: followers !== null };
  }

  const tweets: any[] = tweetsData.data || [];
  let impressions = 0;
  let engagements = 0;
  for (const tweet of tweets) {
    const m = tweet.public_metrics || {};
    impressions += m.impression_count ?? 0;
    engagements += (m.like_count ?? 0) + (m.retweet_count ?? 0) + (m.reply_count ?? 0) + (m.quote_count ?? 0);
  }

  return {
    followers,
    impressions_7d: impressions,
    reach_7d: engagements,
    has_insights: true,
  };
}

async function fetchLinkedInInsights(handle: string, token: string): Promise<Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>> {
  // handle is the org URN, e.g. "urn:li:organization:12345"
  const encodedUrn = encodeURIComponent(handle);
  const sizeRes = await fetch(
    `https://api.linkedin.com/v2/networkSizes/${encodedUrn}?edgeType=CompanyFollowedByMember`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const sizeData: any = await sizeRes.json();
  if (sizeData.serviceErrorCode || sizeData.status >= 400) {
    return { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };
  }

  const followers: number | null = sizeData.firstDegreeSize ?? null;

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const statsRes = await fetch(
    `https://api.linkedin.com/v2/organizationPageStatistics?q=timeIntervals&organizationUrn=${encodedUrn}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${since}&timeIntervals.timeRange.end=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const stats: any = await statsRes.json();
  if (stats.serviceErrorCode || stats.status >= 400 || !stats.elements?.length) {
    return { followers, impressions_7d: null, reach_7d: null, has_insights: false };
  }

  const impressions = stats.elements.reduce((acc: number, el: any) => acc + (el.totalPageStatistics?.views?.allPageViews?.pageViews ?? 0), 0);
  const reach = stats.elements.reduce((acc: number, el: any) => acc + (el.totalPageStatistics?.views?.allPageViews?.uniquePageViews ?? 0), 0);

  return { followers, impressions_7d: impressions, reach_7d: reach, has_insights: true };
}

export const getPlatformReach = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.json({ success: true, data: [] });

    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('platform, account_handle, account_name, avatar_url, access_token, page_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .in('platform', ['facebook', 'instagram', 'linkedin', 'pinterest', 'threads', 'youtube', 'twitter']);

    if (error) throw error;
    if (!accounts?.length) return res.json({ success: true, data: [] });

    const results = await Promise.allSettled(
      accounts.map(async (acc): Promise<PlatformInsight> => {
        let insight: Omit<PlatformInsight, 'platform' | 'account_handle' | 'account_name' | 'avatar_url'>;

        if (acc.platform === 'facebook') {
          insight = await fetchFacebookInsights(acc.account_handle, acc.access_token);
        } else if (acc.platform === 'instagram') {
          insight = await fetchInstagramInsights(acc.account_handle, acc.access_token);
        } else if (acc.platform === 'linkedin') {
          insight = await fetchLinkedInInsights(acc.account_handle, acc.access_token);
        } else if (acc.platform === 'pinterest') {
          insight = await fetchPinterestInsights(acc.account_handle, acc.access_token);
        } else if (acc.platform === 'threads') {
          insight = await fetchThreadsInsights(acc.account_handle, acc.access_token);
        } else if (acc.platform === 'youtube') {
          insight = await fetchYouTubeInsights(acc.access_token);
        } else if (acc.platform === 'twitter') {
          // page_id stores the Twitter numeric user ID
          const twitterUserId = (acc as any).page_id || acc.account_handle;
          insight = await fetchTwitterInsights(twitterUserId, acc.access_token);
        } else {
          insight = { followers: null, impressions_7d: null, reach_7d: null, has_insights: false };
        }

        return {
          platform: acc.platform,
          account_handle: acc.account_handle,
          account_name: acc.account_name,
          avatar_url: acc.avatar_url ?? null,
          ...insight,
        };
      })
    );

    const data: PlatformInsight[] = results
      .filter((r): r is PromiseFulfilledResult<PlatformInsight> => r.status === 'fulfilled')
      .map((r) => r.value);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
