 
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentTemplates';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agent_type: string;
  default_action_class: string;
  default_governance: Record<string, unknown>;
  default_permissions: Record<string, unknown>;
  default_runtime: Record<string, unknown>;
  required_approvers: string[];
  risk_tier: string;
  is_active: boolean;
}

export async function listTemplates(): Promise<AgentTemplate[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_templates')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as AgentTemplate[];
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to list templates', { err });
    return [];
  }
}

export async function getTemplate(templateId: string): Promise<AgentTemplate | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as AgentTemplate;
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get template', { templateId, err });
    return null;
  }
}

export async function createAgentFromTemplate(
  templateId: string,
  overrides: {
    name: string;
    workspace_id: string;
    org_id: string;
    primary_dri_id: string;
    assigned_brand?: string;
  },
  userId: string
): Promise<{ success: boolean; agent?: any; message?: string }> {
  try {
    const template = await getTemplate(templateId);
    if (!template) return { success: false, message: 'Template not found' };

    const perms = template.default_permissions as Record<string, any> || {};
    const runtime = template.default_runtime as Record<string, any> || {};

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert([{
        name: overrides.name,
        type: template.agent_type,
        purpose: template.description,
        status: 'DRAFT',
        autonomy_level: 'L0',
        risk_level: template.risk_tier,
        workspace_id: overrides.workspace_id,
        org_id: overrides.org_id,
        primary_dri_id: overrides.primary_dri_id,
        assigned_brand: overrides.assigned_brand || null,
        permitted_actions: perms.tools || [],
        prohibited_actions: [],
        linked_channels: perms.platforms || [],
        evidence_required: true,
        approval_required: template.required_approvers.length > 0,
        trust_score: 0,
        faithfulness_score: 0,
        template_id: templateId,
        mode: template.default_action_class,
        runtime_controls: {
          rate_limit: runtime.rate_limit || 50,
          token_budget: runtime.token_budget || 50000,
          environment: 'sandbox',
          channel_scope: perms.platforms || [],
        },
      }])
      .select()
      .single();

    if (error) throw error;

    const { createAgentVersion } = await import('./agentVersion.service');
    await createAgentVersion(agent.id, userId, 'Agent created from template', `Created from template: ${template.name}`);

    await logToDatabase('info', SERVICE, `Agent ${agent.id} created from template ${template.name}`, { templateId });
    return { success: true, agent };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to create agent from template', { templateId, err });
    return { success: false, message: 'Failed to create agent from template' };
  }
}
