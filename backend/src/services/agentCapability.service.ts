import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentCapability';

export interface AgentCapability {
  action: string;
  allowed_tools: string[];
  allowed_platforms: string[];
  workflow_steps: string[];
  risk_level: string;
  requires_approval: boolean;
  evidence_required: boolean;
}

const DEFAULT_CAPABILITIES_BY_AUTONOMY: Record<string, AgentCapability[]> = {
  L0: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: [], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
  ],
  L1: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: [], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
  ],
  L2: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: [], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
    { action: 'analyze', allowed_tools: ['retrieve', 'classify'], allowed_platforms: [], workflow_steps: ['analyze'], risk_level: 'medium', requires_approval: true, evidence_required: true },
  ],
  L3: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
    { action: 'analyze', allowed_tools: ['retrieve', 'classify'], allowed_platforms: [], workflow_steps: ['analyze'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'schedule', allowed_tools: ['generate', 'schedule'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['draft', 'schedule'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'report', allowed_tools: ['retrieve', 'aggregate'], allowed_platforms: [], workflow_steps: ['report'], risk_level: 'low', requires_approval: false, evidence_required: true },
  ],
  L4: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram'], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
    { action: 'analyze', allowed_tools: ['retrieve', 'classify'], allowed_platforms: [], workflow_steps: ['analyze'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'schedule', allowed_tools: ['generate', 'schedule'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram'], workflow_steps: ['draft', 'schedule'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'moderate', allowed_tools: ['classify', 'moderate'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['moderate'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'report', allowed_tools: ['retrieve', 'aggregate'], allowed_platforms: [], workflow_steps: ['report'], risk_level: 'low', requires_approval: false, evidence_required: true },
  ],
  L5: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok'], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
    { action: 'analyze', allowed_tools: ['retrieve', 'classify', 'enrich'], allowed_platforms: [], workflow_steps: ['analyze'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'schedule', allowed_tools: ['generate', 'schedule'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok'], workflow_steps: ['draft', 'schedule'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'publish', allowed_tools: ['generate', 'publish'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['draft', 'publish'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'reply', allowed_tools: ['generate', 'reply'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['reply'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'moderate', allowed_tools: ['classify', 'moderate'], allowed_platforms: ['linkedin', 'twitter'], workflow_steps: ['moderate'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'escalate', allowed_tools: ['escalate'], allowed_platforms: [], workflow_steps: ['escalate'], risk_level: 'high', requires_approval: false, evidence_required: true },
    { action: 'report', allowed_tools: ['retrieve', 'aggregate'], allowed_platforms: [], workflow_steps: ['report'], risk_level: 'low', requires_approval: false, evidence_required: true },
  ],
  L6: [
    { action: 'draft', allowed_tools: ['generate'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'pinterest', 'threads'], workflow_steps: ['draft'], risk_level: 'low', requires_approval: false, evidence_required: false },
    { action: 'recommend', allowed_tools: ['generate', 'classify'], allowed_platforms: [], workflow_steps: ['recommend'], risk_level: 'low', requires_approval: false, evidence_required: true },
    { action: 'analyze', allowed_tools: ['retrieve', 'classify', 'enrich'], allowed_platforms: [], workflow_steps: ['analyze'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'schedule', allowed_tools: ['generate', 'schedule'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'pinterest', 'threads'], workflow_steps: ['draft', 'schedule'], risk_level: 'medium', requires_approval: true, evidence_required: true },
    { action: 'publish', allowed_tools: ['generate', 'publish'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'pinterest', 'threads'], workflow_steps: ['draft', 'publish'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'reply', allowed_tools: ['generate', 'reply'], allowed_platforms: ['linkedin', 'twitter', 'facebook'], workflow_steps: ['reply'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'moderate', allowed_tools: ['classify', 'moderate'], allowed_platforms: ['linkedin', 'twitter', 'facebook', 'instagram'], workflow_steps: ['moderate'], risk_level: 'high', requires_approval: true, evidence_required: true },
    { action: 'escalate', allowed_tools: ['escalate'], allowed_platforms: [], workflow_steps: ['escalate'], risk_level: 'high', requires_approval: false, evidence_required: true },
    { action: 'report', allowed_tools: ['retrieve', 'aggregate'], allowed_platforms: [], workflow_steps: ['report'], risk_level: 'low', requires_approval: false, evidence_required: true },
  ],
};

export async function getAgentCapabilities(agentId: string): Promise<{ success: boolean; capabilities: AgentCapability[] }> {
  try {
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('autonomy_level, permitted_actions, prohibited_actions, allowed_platforms')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      return { success: false, capabilities: [] };
    }

    const level = agent.autonomy_level || 'L0';
    const base = DEFAULT_CAPABILITIES_BY_AUTONOMY[level] || DEFAULT_CAPABILITIES_BY_AUTONOMY.L0;

    const permitted = new Set(agent.permitted_actions || []);
    const prohibited = new Set(agent.prohibited_actions || []);

    const capabilities = base
      .filter(cap => !prohibited.has(cap.action))
      .map(cap => ({
        ...cap,
        allowed_tools: permitted.has(cap.action) ? cap.allowed_tools : cap.allowed_tools.filter(t => permitted.has(t)),
      }));

    return { success: true, capabilities };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get agent capabilities', { agentId, err });
    return { success: false, capabilities: [] };
  }
}

export async function updateAgentCapabilities(
  agentId: string,
  capabilities: AgentCapability[]
): Promise<{ success: boolean; message: string }> {
  try {
    const permitted = capabilities.map(c => c.action).filter(a => !['escalate', 'report'].includes(a));
    const prohibited: string[] = [];

    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        permitted_actions: permitted,
        prohibited_actions: prohibited,
        allowed_platforms: [...new Set(capabilities.flatMap(c => c.allowed_platforms))],
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (error) throw error;

    await logToDatabase('info', SERVICE, `Updated capabilities for agent ${agentId}`, { capabilities });
    return { success: true, message: 'Capabilities updated' };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to update capabilities', { agentId, err });
    return { success: false, message: 'Failed to update capabilities' };
  }
}
