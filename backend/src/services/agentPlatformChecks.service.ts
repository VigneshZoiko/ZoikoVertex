import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentPlatformChecks';

export interface PlatformCheck {
  platform: string;
  check_type: string;
  pass_fail: boolean;
  severity: 'block' | 'warning' | 'info';
  rule_ref?: string;
  blocked_content?: string;
  remediation?: string;
}

const PLATFORM_RULES: Record<string, PlatformCheck[]> = {
  linkedin: [
    { platform: 'linkedin', check_type: 'professional_tone', pass_fail: true, severity: 'warning', rule_ref: 'linkedin-professional-tone', remediation: 'LinkedIn content must maintain professional tone. Avoid casual or overly promotional language.' },
    { platform: 'linkedin', check_type: 'character_limit', pass_fail: true, severity: 'warning', rule_ref: 'linkedin-char-limit', remediation: 'LinkedIn posts have a 3000 character limit.' },
    { platform: 'linkedin', check_type: 'hashtag_limit', pass_fail: true, severity: 'info', rule_ref: 'linkedin-hashtags', remediation: 'LinkedIn recommends 3-5 hashtags maximum.' },
    { platform: 'linkedin', check_type: 'media_rules', pass_fail: true, severity: 'warning', rule_ref: 'linkedin-media', remediation: 'LinkedIn supports images, documents, and video up to 200MB.' },
  ],
  twitter: [
    { platform: 'twitter', check_type: 'character_limit', pass_fail: true, severity: 'block', rule_ref: 'twitter-char-limit', remediation: 'X/Twitter posts are limited to 280 characters.' },
    { platform: 'twitter', check_type: 'sensitive_content', pass_fail: true, severity: 'block', rule_ref: 'twitter-sensitive', remediation: 'Flag content that may be sensitive. Requires content warning label.' },
    { platform: 'twitter', check_type: 'media_count', pass_fail: true, severity: 'warning', rule_ref: 'twitter-media', remediation: 'X/Twitter supports up to 4 images or 1 video per post.' },
  ],
  instagram: [
    { platform: 'instagram', check_type: 'character_limit', pass_fail: true, severity: 'warning', rule_ref: 'instagram-char-limit', remediation: 'Instagram captions have a 2200 character limit.' },
    { platform: 'instagram', check_type: 'hashtag_limit', pass_fail: true, severity: 'info', rule_ref: 'instagram-hashtags', remediation: 'Instagram allows up to 30 hashtags. 5-10 recommended for optimal reach.' },
    { platform: 'instagram', check_type: 'media_rules', pass_fail: true, severity: 'block', rule_ref: 'instagram-media', remediation: 'Instagram supports 1:1, 4:5, and 16:9 aspect ratios for feed posts.' },
    { platform: 'instagram', check_type: 'story_rules', pass_fail: true, severity: 'warning', rule_ref: 'instagram-stories', remediation: 'Instagram Stories require vertical 9:16 video (max 60s) or image.' },
  ],
  facebook: [
    { platform: 'facebook', check_type: 'character_limit', pass_fail: true, severity: 'info', rule_ref: 'facebook-char-limit', remediation: 'Facebook posts have a 5000 character limit.' },
    { platform: 'facebook', check_type: 'ad_claim_rules', pass_fail: true, severity: 'block', rule_ref: 'facebook-ad-claims', remediation: 'Facebook ads with claims require verification. Avoid unsubstantiated claims.' },
  ],
  tiktok: [
    { platform: 'tiktok', check_type: 'video_duration', pass_fail: true, severity: 'block', rule_ref: 'tiktok-duration', remediation: 'TikTok videos must be between 3 seconds and 10 minutes.' },
    { platform: 'tiktok', check_type: 'aspect_ratio', pass_fail: true, severity: 'block', rule_ref: 'tiktok-aspect-ratio', remediation: 'TikTok requires vertical 9:16 video.' },
    { platform: 'tiktok', check_type: 'carousel_limit', pass_fail: true, severity: 'info', rule_ref: 'tiktok-carousel', remediation: 'TikTok carousel posts are limited to 35 images.' },
  ],
  youtube: [
    { platform: 'youtube', check_type: 'video_length', pass_fail: true, severity: 'info', rule_ref: 'youtube-length', remediation: 'Standard YouTube videos can be up to 12 hours. Shorts are max 60 seconds.' },
    { platform: 'youtube', check_type: 'orientation', pass_fail: true, severity: 'warning', rule_ref: 'youtube-orientation', remediation: 'YouTube Shorts require vertical 9:16 video. Standard videos are 16:9.' },
    { platform: 'youtube', check_type: 'metadata_rules', pass_fail: true, severity: 'info', rule_ref: 'youtube-metadata', remediation: 'YouTube requires title, description, and tags. Thumbnail recommended.' },
  ],
  pinterest: [
    { platform: 'pinterest', check_type: 'aspect_ratio', pass_fail: true, severity: 'warning', rule_ref: 'pinterest-aspect-ratio', remediation: 'Pinterest prefers vertical 2:3 aspect ratio for best display.' },
    { platform: 'pinterest', check_type: 'character_limit', pass_fail: true, severity: 'info', rule_ref: 'pinterest-char-limit', remediation: 'Pinterest descriptions have a 500 character limit.' },
    { platform: 'pinterest', check_type: 'no_video_carousel', pass_fail: true, severity: 'block', rule_ref: 'pinterest-no-video-carousel', remediation: 'Pinterest does not support video carousels.' },
  ],
  threads: [
    { platform: 'threads', check_type: 'character_limit', pass_fail: true, severity: 'block', rule_ref: 'threads-char-limit', remediation: 'Threads posts are limited to 500 characters.' },
    { platform: 'threads', check_type: 'media_rules', pass_fail: true, severity: 'warning', rule_ref: 'threads-media', remediation: 'Threads supports single images and videos. No carousel.' },
  ],
};

export function getPlatformRules(platform: string): PlatformCheck[] {
  return PLATFORM_RULES[platform.toLowerCase()] || [];
}

export async function runPlatformChecks(agentId: string, platforms: string[], content?: string): Promise<{ checks: PlatformCheck[]; all_pass: boolean; blocks: PlatformCheck[] }> {
  const allChecks: PlatformCheck[] = [];

  for (const platform of platforms) {
    const rules = getPlatformRules(platform);
    for (const rule of rules) {
      let pass = true;
      if (rule.check_type === 'character_limit' && content && platform === 'twitter') {
        pass = content.length <= 280;
      }
      if (rule.check_type === 'character_limit' && content && platform === 'threads') {
        pass = content.length <= 500;
      }
      allChecks.push({ ...rule, pass_fail: pass });
    }
  }

  const blocks = allChecks.filter(c => c.severity === 'block' && !c.pass_fail);

  try {
    for (const check of allChecks) {
      await supabaseAdmin.from('agent_platform_checks').insert([{
        agent_id: agentId,
        platform: check.platform,
        check_type: check.check_type,
        pass_fail: check.pass_fail,
        severity: check.severity,
        rule_ref: check.rule_ref,
        remediation: check.remediation,
        check_result: { automated: true },
      }]);
    }
  } catch (err) {
    await logToDatabase('warn', SERVICE, 'Could not persist platform checks', { agentId, err });
  }

  const all_pass = blocks.length === 0;
  return { checks: allChecks, all_pass, blocks };
}

export async function getPlatformCheckHistory(agentId: string, platform?: string): Promise<PlatformCheck[]> {
  try {
    let query = supabaseAdmin
      .from('agent_platform_checks')
      .select('*')
      .eq('agent_id', agentId)
      .order('checked_at', { ascending: false });

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PlatformCheck[];
  } catch {
    return [];
  }
}
