 
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentPermissionSets';

export const ACTION_CLASSES = {
  read_only: { label: 'Read Only', level: 0, description: 'Can read approved knowledge and data' },
  recommend_only: { label: 'Recommend Only', level: 1, description: 'Can produce recommendations, no direct action' },
  draft_only: { label: 'Draft Only', level: 2, description: 'Can draft outputs, no external action' },
  schedule_with_approval: { label: 'Schedule With Approval', level: 3, description: 'Can schedule with human approval' },
  publish_with_approval: { label: 'Publish With Approval', level: 4, description: 'Can publish with human approval' },
  auto_publish_low_risk: { label: 'Auto-Publish Low Risk', level: 5, description: 'Can auto-publish low-risk content only' },
  reply_with_approval: { label: 'Reply With Approval', level: 6, description: 'Can reply to engagements with approval' },
  blocked: { label: 'Blocked', level: -1, description: 'No actions permitted' },
};

export const TOOL_DEFINITIONS = {
  read_knowledge: 'Read approved knowledge sources',
  analyze_sources: 'Analyze and summarize source content',
  produce_briefs: 'Produce research briefs and summaries',
  generate_captions: 'Generate post captions',
  generate_outlines: 'Generate content outlines',
  draft_posts: 'Draft social media posts',
  draft_replies: 'Draft engagement replies',
  recommend_escalations: 'Recommend escalation actions',
  recommend_schedule: 'Recommend posting schedule',
  recommend_sequence: 'Recommend channel sequence',
  check_claims: 'Check claims against policy',
  check_prohibited_language: 'Check for prohibited language',
  check_sources: 'Verify source grounding',
  check_policy: 'Check policy compliance',
  analyze_campaigns: 'Analyze campaign performance',
  propose_optimizations: 'Propose performance optimizations',
  generate_reports: 'Generate performance reports',
  cross_brand_policy_review: 'Cross-brand policy review',
  bundle_evidence: 'Bundle evidence records',
  risk_reporting: 'Generate risk reports',
  schedule_posts: 'Schedule posts to platforms',
  publish_posts: 'Publish to platforms',
  reply_auto: 'Auto-reply to engagements',
};

export interface PermissionSet {
  id?: string;
  agent_id: string;
  action_class: string;
  platforms: string[];
  tools: string[];
  scopes: Record<string, unknown>;
  rate_limits: { max_per_hour: number; max_per_day: number };
  spend_limits: { daily: number; monthly: number };
  approval_required: boolean;
  created_by?: string;
}

export async function getPermissionSet(agentId: string): Promise<PermissionSet | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_permission_sets')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as PermissionSet | null;
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get permission set', { agentId, err });
    return null;
  }
}

export async function upsertPermissionSet(agentId: string, set: Partial<PermissionSet>, userId?: string): Promise<{ success: boolean; data?: PermissionSet; message?: string }> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('agent_permission_sets')
      .select('id')
      .eq('agent_id', agentId)
      .limit(1)
      .maybeSingle();

    const payload = {
      agent_id: agentId,
      action_class: set.action_class || 'draft_only',
      platforms: set.platforms || [],
      tools: set.tools || [],
      scopes: set.scopes || {},
      rate_limits: set.rate_limits || { max_per_hour: 10, max_per_day: 100 },
      spend_limits: set.spend_limits || { daily: 0, monthly: 0 },
      approval_required: set.approval_required ?? true,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('agent_permission_sets')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      await logToDatabase('info', SERVICE, `Permission set updated for agent ${agentId}`, { action_class: set.action_class });
      return { success: true, data: data as PermissionSet };
    }

    const { data, error } = await supabaseAdmin
      .from('agent_permission_sets')
      .insert([{ ...payload, created_by: userId || null }])
      .select()
      .single();
    if (error) throw error;
    await logToDatabase('info', SERVICE, `Permission set created for agent ${agentId}`, { action_class: set.action_class });
    return { success: true, data: data as PermissionSet };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to upsert permission set', { agentId, err });
    return { success: false, message: 'Failed to save permission set' };
  }
}

export async function computeDefaultPermissionsFromTemplate(templateId: string): Promise<{ action_class: string; tools: string[]; platforms: string[]; rate_limits: Record<string, unknown> }> {
  try {
    const { data: template } = await supabaseAdmin
      .from('agent_templates')
      .select('default_action_class, default_permissions, default_runtime')
      .eq('id', templateId)
      .single();

    if (!template) {
      return { action_class: 'draft_only', tools: [], platforms: [], rate_limits: {} };
    }

    const perms = template.default_permissions as Record<string, any> || {};
    const runtime = template.default_runtime as Record<string, any> || {};

    return {
      action_class: template.default_action_class || 'draft_only',
      tools: perms.tools || [],
      platforms: perms.platforms || [],
      rate_limits: runtime.rate_limit ? { max_per_hour: runtime.rate_limit, max_per_day: runtime.max_outputs_per_day || 50 } : {},
    };
  } catch {
    return { action_class: 'draft_only', tools: [], platforms: [], rate_limits: {} };
  }
}
