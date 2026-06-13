 
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { getAgentVersions } from './agentVersion.service';
import { getSafetyResults } from './agentSafetyPolicy.service';
import { listAgentIncidents } from './agentIncidents.service';
import { evaluateAllGates } from './agentGovernanceGates.service';
import { getActivationChecklist } from './agentLinkedResources.service';
import { getPermissionSet } from './agentPermissionSets.service';
import { getPlatformCheckHistory } from './agentPlatformChecks.service';

const SERVICE = 'AgentProfile';

export interface AgentFullProfile {
  agent: Record<string, unknown>;
  versions: any[];
  permissions: any;
  safety_results: any[];
  platform_checks: any[];
  incidents: any[];
  governance_gates: {
    gates: any[];
    all_passed: boolean;
    blockers: string[];
  };
  activation_checklist: any;
  incident_count: number;
}

export async function getFullAgentProfile(agentId: string): Promise<AgentFullProfile> {
  const empty = {
    agent: {},
    versions: [],
    permissions: null,
    safety_results: [],
    platform_checks: [],
    incidents: [],
    governance_gates: { gates: [], all_passed: false, blockers: ['Agent not found'] },
    activation_checklist: { all_complete: false, blockers: ['Agent not found'] },
    incident_count: 0,
  };

  try {
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select(`
        *,
        primary_dri:users!primary_dri_id(full_name, email),
        backup_dri:users!backup_dri_id(full_name, email)
      `)
      .eq('id', agentId)
      .single();

    if (error || !agent) return empty;

    const [versions, permissions, safetyResults, platformChecks, incidents, governanceGates, activationChecklist] = await Promise.all([
      getAgentVersions(agentId),
      getPermissionSet(agentId),
      getSafetyResults(agentId),
      getPlatformCheckHistory(agentId),
      listAgentIncidents(agentId).catch(() => []),
      evaluateAllGates(agentId),
      getActivationChecklist(agentId),
    ]);

    const openIncidents = incidents.filter(i => i.status === 'OPEN');

    return {
      agent,
      versions,
      permissions,
      safety_results: safetyResults,
      platform_checks: platformChecks,
      incidents,
      governance_gates: governanceGates,
      activation_checklist: activationChecklist,
      incident_count: openIncidents.length,
    };
  } catch (err) {
    await logToDatabase('error', SERVICE, 'Failed to get full agent profile', { agentId, err });
    return empty;
  }
}
