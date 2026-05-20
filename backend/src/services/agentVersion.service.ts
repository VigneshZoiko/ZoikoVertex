import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

const SERVICE = 'AgentVersion';

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  author_id: string;
  author_name: string;
  reason: string;
  change_summary: string;
  config_snapshot: Record<string, unknown>;
  created_at: string;
}

export async function createAgentVersion(
  agentId: string,
  authorId: string,
  reason: string,
  changeSummary: string
): Promise<{ success: boolean; version?: AgentVersion }> {
  try {
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) return { success: false };

    const { data: latestVersion } = await supabaseAdmin
      .from('agent_versions')
      .select('version')
      .eq('agent_id', agentId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersion?.version || 0) + 1;

    const snapshot = {
      name: agent.name,
      type: agent.type,
      autonomy_level: agent.autonomy_level,
      status: agent.status,
      trust_score: agent.trust_score,
      faithfulness_score: agent.faithfulness_score,
      permitted_actions: agent.permitted_actions,
      prohibited_actions: agent.prohibited_actions,
      allowed_platforms: agent.allowed_platforms,
      assigned_brand: agent.assigned_brand,
      markets: agent.markets,
    };

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', authorId)
      .single();

    const { data: version, error: insertError } = await supabaseAdmin
      .from('agent_versions')
      .insert([{
        agent_id: agentId,
        version: nextVersion,
        author_id: authorId,
        author_name: user?.full_name || 'Unknown',
        reason,
        change_summary: changeSummary,
        config_snapshot: snapshot,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    await logToDatabase('info', SERVICE, `Created agent version ${nextVersion} for ${agentId}`, { version });
    return { success: true, version: version as AgentVersion };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to create agent version', { agentId, err });
    return { success: false };
  }
}

export async function getAgentVersions(agentId: string): Promise<AgentVersion[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agentId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get agent versions', { agentId, err });
    return [];
  }
}

export async function rollbackAgentVersion(
  agentId: string,
  versionId: string,
  authorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: version, error: versionError } = await supabaseAdmin
      .from('agent_versions')
      .select('config_snapshot, version')
      .eq('id', versionId)
      .eq('agent_id', agentId)
      .single();

    if (versionError || !version) return { success: false, message: 'Version not found' };

    const snapshot = version.config_snapshot as Record<string, unknown>;

    const { error: updateError } = await supabaseAdmin
      .from('agents')
      .update({
        name: snapshot.name,
        type: snapshot.type,
        autonomy_level: snapshot.autonomy_level,
        status: snapshot.status,
        trust_score: snapshot.trust_score,
        faithfulness_score: snapshot.faithfulness_score,
        permitted_actions: snapshot.permitted_actions,
        prohibited_actions: snapshot.prohibited_actions,
        allowed_platforms: snapshot.allowed_platforms,
        assigned_brand: snapshot.assigned_brand,
        markets: snapshot.markets,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) throw updateError;

    await createAgentVersion(agentId, authorId, `Rollback to version ${version.version}`, `Rolled back from current state to version ${version.version}`);

    await logToDatabase('info', SERVICE, `Rolled back agent ${agentId} to version ${version.version}`, {});
    return { success: true, message: `Rolled back to version ${version.version}` };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to rollback agent version', { agentId, err });
    return { success: false, message: 'Rollback failed' };
  }
}
