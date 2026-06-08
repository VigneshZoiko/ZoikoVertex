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
    let rollbackToVersionId = input.rollback_to_version_id || null;

    if (!rollbackToVersionId) {
      try {
        // Fetch prompt_id for this version
        const { data: version } = await supabaseAdmin
          .from('prompt_versions')
          .select('prompt_id')
          .eq('id', input.prompt_version_id)
          .single();

        if (version?.prompt_id) {
          // Get all sibling version IDs for this prompt
          const { data: siblingVersions } = await supabaseAdmin
            .from('prompt_versions')
            .select('id')
            .eq('prompt_id', version.prompt_id);

          if (siblingVersions && siblingVersions.length > 0) {
            const versionIds = siblingVersions.map((v: any) => v.id);

            // Find the latest deployment in the same environment for these version IDs
            const { data: latestDeployments } = await supabaseAdmin
              .from('prompt_deployments')
              .select('prompt_version_id')
              .in('prompt_version_id', versionIds)
              .eq('environment', input.environment)
              .order('created_at', { ascending: false })
              .limit(1);

            if (latestDeployments?.[0]?.prompt_version_id) {
              const candidate = latestDeployments[0].prompt_version_id;
              if (candidate !== input.prompt_version_id) {
                rollbackToVersionId = candidate;
              }
            }
          }
        }
      } catch (err) {
        // Safe fallback in case of query errors
      }
    }

    const { data, error } = await supabaseAdmin
      .from('prompt_deployments')
      .insert({
        prompt_version_id: input.prompt_version_id,
        environment: input.environment,
        scope_json: input.scope_json || {},
        deployed_by: input.deployed_by || null,
        release_note: input.release_note || '',
        rollback_to_version_id: rollbackToVersionId,
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

    // Update parent prompt to point to the rolled back version
    try {
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', rollbackVersionId)
        .single();

      if (version?.prompt_id) {
        await supabaseAdmin
          .from('prompts')
          .update({ current_version_id: rollbackVersionId, updated_at: new Date().toISOString() })
          .eq('id', version.prompt_id);
      }
    } catch (err) {
      // Safe fallback
    }

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
