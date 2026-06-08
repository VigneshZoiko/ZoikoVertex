import { supabaseAdmin } from '../../shared/supabase';

export class PromptDeploymentService {
  static async listByVersion(versionId: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_deployments')
      .select('*')
      .eq('prompt_version_id', versionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async create(input: {
    prompt_version_id: string;
    environment: string;
    scope_json?: Record<string, unknown>;
    deployed_by?: string;
    release_note?: string;
    rollback_to_version_id?: string;
    evidence_id?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('prompt_deployments')
      .insert({
        prompt_version_id: input.prompt_version_id,
        environment: input.environment,
        scope_json: input.scope_json || {},
        deployed_by: input.deployed_by || null,
        release_note: input.release_note || '',
        rollback_to_version_id: input.rollback_to_version_id || null,
        evidence_id: input.evidence_id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async rollback(deploymentId: string, deployedBy?: string) {
    const deployment = await this.getById(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    const rollbackVersionId = deployment.rollback_to_version_id;
    if (!rollbackVersionId) throw new Error('No rollback target available');

    const { data, error } = await supabaseAdmin
      .from('prompt_deployments')
      .insert({
        prompt_version_id: rollbackVersionId,
        environment: deployment.environment,
        scope_json: deployment.scope_json,
        deployed_by: deployedBy || null,
        release_note: `Rollback from deployment ${deploymentId}`,
        rollback_to_version_id: null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('prompt_deployments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
}
