import { supabaseAdmin } from '../../shared/supabase';
import { logToDatabase } from '../../shared/databaseLogger';
import crypto from 'crypto';

const SERVICE = 'AgentEvidence';

export interface GroundingRef {
  source_id: string;
  snippet: string;
  relevance_score: number;
  output_dependency: boolean;
}

export interface PolicyCheck {
  policy_id: string;
  policy_version: string;
  result: 'pass' | 'warning' | 'block';
  reason_code: string;
  recommendation: string;
  checked_at: string;
}

export interface HumanAction {
  actor_id: string;
  actor_name: string;
  action: string;
  reason?: string;
  timestamp: string;
}

export interface PlatformResponse {
  platform: string;
  external_id: string;
  status: string;
  posted_at: string;
}

export interface CreateEvidenceBundleRequest {
  agent_id: string;
  object_type: string;
  object_id: string;
  input: Record<string, unknown>;
  prompt_version: string;
  knowledge_refs: GroundingRef[];
  policy_results: PolicyCheck[];
  human_actions: HumanAction[];
  output: Record<string, unknown>;
  platform_response: PlatformResponse | null;
}

export interface EvidenceBundle {
  bundle_id: string;
  agent_id: string;
  object_type: string;
  object_id: string;
  integrity_hash: string;
  created_at: string;
  prompt_version: string;
  linked_resources: Record<string, unknown>;
}

export async function createEvidenceBundle(
  req: CreateEvidenceBundleRequest
): Promise<{ success: boolean; bundle?: EvidenceBundle; message?: string }> {
  try {
    const bundle_id = `bundle-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const hash_input = JSON.stringify({
      bundle_id,
      agent_id: req.agent_id,
      object_type: req.object_type,
      object_id: req.object_id,
      input: req.input,
      prompt_version: req.prompt_version,
      created_at: new Date().toISOString(),
    });
    const integrity_hash = crypto.createHash('sha256').update(hash_input).digest('hex');

    const { data: bundle, error } = await supabaseAdmin
      .from('evidence_bundles')
      .insert([{
        bundle_id,
        agent_id: req.agent_id,
        object_type: req.object_type,
        object_id: req.object_id,
        integrity_hash,
        prompt_version: req.prompt_version,
        linked_resources: {
          knowledge_refs: req.knowledge_refs,
          policy_results: req.policy_results,
          human_actions: req.human_actions,
          platform_response: req.platform_response,
        },
        input_hash: crypto.createHash('sha256').update(JSON.stringify(req.input)).digest('hex'),
        output_hash: crypto.createHash('sha256').update(JSON.stringify(req.output)).digest('hex'),
      }])
      .select()
      .single();

    if (error) throw error;

    await logToDatabase('info', SERVICE, `Evidence bundle created: ${bundle_id}`, { bundle_id });
    return {
      success: true,
      bundle: {
        bundle_id,
        agent_id: req.agent_id,
        object_type: req.object_type,
        object_id: req.object_id,
        integrity_hash,
        created_at: new Date().toISOString(),
        prompt_version: req.prompt_version,
        linked_resources: {
          knowledge_refs: req.knowledge_refs,
          policy_results: req.policy_results,
          human_actions: req.human_actions,
          platform_response: req.platform_response,
        },
      },
    };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to create evidence bundle', { err });
    return { success: false, message: 'Failed to create evidence bundle' };
  }
}

export async function getEvidenceBundles(agentId: string): Promise<EvidenceBundle[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('evidence_bundles')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get evidence bundles', { agentId, err });
    return [];
  }
}

export async function getEvidenceBundle(bundleId: string): Promise<EvidenceBundle | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('evidence_bundles')
      .select('*')
      .eq('bundle_id', bundleId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get evidence bundle', { bundleId, err });
    return null;
  }
}