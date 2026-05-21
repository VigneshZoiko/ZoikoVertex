export const AGENT_MODE_TO_AUTONOMY: Record<string, string> = {
  draft_only: 'L0',
  recommend_only: 'L1',
  shadow: 'L2',
  human_approval_required: 'L3',
  limited_autonomy: 'L4',
};

export const AUTONOMY_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;

export type AutonomyLevel = typeof AUTONOMY_LEVELS[number];

export const AUTONOMY_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  L0: { text: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--surface)]', border: 'border-[var(--border)]' },
  L1: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  L2: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  L3: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  L4: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  L5: { text: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
  L6: { text: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
};

export const AGENT_STATES: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--surface)]' },
  IN_REVIEW: { label: 'In Review', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  APPROVED: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ACTIVE: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  RESTRICTED: { label: 'Restricted', color: 'text-rose-400', bg: 'bg-rose-400/10' },
  PAUSED: { label: 'Paused', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  SUSPENDED: { label: 'Suspended', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  PENDING_CERTIFICATION: { label: 'Pending Cert', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  DISABLED: { label: 'Disabled', color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--surface)]' },
  RETIRED: { label: 'Retired', color: 'text-[var(--foreground-muted)]', bg: 'bg-[var(--surface)]' },
};

export const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗', maxChars: 3000 },
  { id: 'x', label: 'X (Twitter)', icon: '✖', maxChars: 280 },
  { id: 'facebook', label: 'Facebook', icon: '👤', maxChars: 63206 },
  { id: 'instagram', label: 'Instagram', icon: '📷', maxChars: 2200 },
  { id: 'tiktok', label: 'TikTok', icon: '♪', maxChars: 2200 },
  { id: 'youtube', label: 'YouTube', icon: '▶', maxChars: 5000 },
  { id: 'blog_cms', label: 'Blog / CMS', icon: '📝', maxChars: 50000 },
  { id: 'internal', label: 'Internal Only', icon: '🏢', maxChars: 100000 },
] as const;

export type ChannelId = (typeof CHANNELS)[number]['id'];

export const AGENT_ACTIONS = [
  { id: 'draft', label: 'Draft', risk: 'low', color: 'emerald' },
  { id: 'recommend', label: 'Recommend', risk: 'low', color: 'emerald' },
  { id: 'analyze', label: 'Analyze', risk: 'medium', color: 'amber' },
  { id: 'schedule', label: 'Schedule', risk: 'medium', color: 'amber' },
  { id: 'publish', label: 'Publish', risk: 'high', color: 'rose' },
  { id: 'reply', label: 'Reply', risk: 'high', color: 'rose' },
  { id: 'moderate', label: 'Moderate', risk: 'high', color: 'rose' },
  { id: 'escalate', label: 'Escalate', risk: 'high', color: 'rose' },
  { id: 'report', label: 'Report', risk: 'low', color: 'emerald' },
  { id: 'export', label: 'Export', risk: 'low', color: 'emerald' },
] as const;

export const AGENT_TYPES = [
  { id: 'content', label: 'Content Agent', description: 'Drafts captions, threads, and articles.' },
  { id: 'research', label: 'Research Agent', description: 'Analyzes trends and competitor signals.' },
  { id: 'optimization', label: 'Optimization Agent', description: 'Recommends posting times and angles.' },
  { id: 'governance', label: 'Governance Agent', description: 'Checks claims and policy compliance.' },
  { id: 'response', label: 'Response Agent', description: 'Drafts community and engagement copy.' },
  { id: 'compliance', label: 'Compliance Agent', description: 'Reviews claims and risk against policy.' },
  { id: 'insight', label: 'Performance Insight Agent', description: 'Analyzes campaign results and proposes optimizations.' },
] as const;

export const AGENT_MODES = [
  { id: 'draft_only', label: 'Draft Only', description: 'May draft content only — no external actions.', targetLevel: 'L0' },
  { id: 'recommend_only', label: 'Recommend Only', description: 'May draft and recommend — execution blocked.', targetLevel: 'L1' },
  { id: 'shadow', label: 'Shadow Mode', description: 'Runs live but output requires human review before use.', targetLevel: 'L2' },
  { id: 'human_approval_required', label: 'Human Approval Required', description: 'Prepares action but blocks execution until approved.', targetLevel: 'L3' },
  { id: 'limited_autonomy', label: 'Limited Autonomy', description: 'Executes pre-approved recurring actions with monitoring.', targetLevel: 'L4' },
] as const;

export const AGENT_TEMPLATES = [
  {
    id: 'content_research',
    label: 'Content Research Agent',
    description: 'Reads approved knowledge, analyzes sources, produces briefs. No publishing.',
    defaultType: 'research',
    defaultMode: 'recommend_only',
    defaultRisk: 'medium',
    defaultActions: ['draft', 'analyze', 'recommend', 'report'],
    defaultProhibited: ['publish', 'reply', 'escalate', 'schedule'],
    defaultChannels: ['internal'],
  },
  {
    id: 'content_drafting',
    label: 'Content Drafting Agent',
    description: 'Drafts posts, captions, outlines, newsletters, and campaign copy. No external action.',
    defaultType: 'content',
    defaultMode: 'draft_only',
    defaultRisk: 'low',
    defaultActions: ['draft', 'recommend', 'analyze'],
    defaultProhibited: ['publish', 'reply', 'schedule', 'escalate'],
    defaultChannels: ['internal', 'linkedin', 'x'],
  },
  {
    id: 'social_response',
    label: 'Social Response Agent',
    description: 'Drafts replies and escalation recommendations. No auto-reply by default.',
    defaultType: 'response',
    defaultMode: 'human_approval_required',
    defaultRisk: 'medium',
    defaultActions: ['draft', 'recommend', 'escalate', 'reply'],
    defaultProhibited: ['publish', 'schedule', 'analyze'],
    defaultChannels: ['linkedin', 'x', 'facebook', 'instagram'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling Recommendation Agent',
    description: 'Recommends schedule and channel sequencing. No posting unless approved.',
    defaultType: 'optimization',
    defaultMode: 'recommend_only',
    defaultRisk: 'low',
    defaultActions: ['analyze', 'recommend', 'schedule'],
    defaultProhibited: ['publish', 'reply', 'escalate'],
    defaultChannels: ['internal'],
  },
  {
    id: 'compliance_review',
    label: 'Compliance Review Agent',
    description: 'Checks claims, prohibited language, source support, risk, and policy fit.',
    defaultType: 'governance',
    defaultMode: 'recommend_only',
    defaultRisk: 'high',
    defaultActions: ['analyze', 'recommend', 'report', 'escalate'],
    defaultProhibited: ['publish', 'draft', 'reply', 'schedule'],
    defaultChannels: ['internal'],
  },
  {
    id: 'performance_insight',
    label: 'Performance Insight Agent',
    description: 'Analyzes campaign results and proposes optimizations. Read-only analytics.',
    defaultType: 'insight',
    defaultMode: 'recommend_only',
    defaultRisk: 'low',
    defaultActions: ['analyze', 'recommend', 'report'],
    defaultProhibited: ['publish', 'draft', 'reply', 'schedule', 'escalate'],
    defaultChannels: ['internal'],
  },
  {
    id: 'smb_starter',
    label: 'SMB Starter Agent',
    description: 'Simple draft, schedule recommendation, and brand-safe social posts for small teams.',
    defaultType: 'content',
    defaultMode: 'human_approval_required',
    defaultRisk: 'medium',
    defaultActions: ['draft', 'recommend', 'schedule'],
    defaultProhibited: ['publish', 'escalate'],
    defaultChannels: ['linkedin', 'x', 'instagram'],
  },
  {
    id: 'enterprise_governance',
    label: 'Enterprise Governance Agent',
    description: 'Cross-brand policy review, evidence bundling, and risk reporting. Restricted to governance roles.',
    defaultType: 'governance',
    defaultMode: 'recommend_only',
    defaultRisk: 'high',
    defaultActions: ['analyze', 'recommend', 'report', 'escalate', 'export'],
    defaultProhibited: ['publish', 'draft', 'reply', 'schedule', 'moderate'],
    defaultChannels: ['internal'],
  },
] as const;