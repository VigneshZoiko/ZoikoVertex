/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptDependencyService } from '../PromptDependencyService';
import { DependencyHealthSummary } from '../DependencyHealthService';
import { ApprovalInvalidationService, ApprovalValidity } from '../ApprovalInvalidationService';

export interface ImpactAnalysisResult {
  action: 'DEPLOY' | 'ROLLBACK' | 'ARCHIVE' | 'RETIRE';
  affected: {
    agents: string[];
    workflows: string[];
    workflowNodes: string[];
    knowledgeSources: string[];
    tools: string[];
    channels: string[];
    brands: string[];
    policies: string[];
  };
  blockers: string[];
  dependencyHealth: DependencyHealthSummary;
  approvalStatus: ApprovalValidity;
  rollbackDelta: {
    addedDependencies: string[];
    removedDependencies: string[];
  } | null;
  riskLevel: string; // 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

// Risk level is derived from the SINGLE SOURCE OF TRUTH — the dependency-health
// rollup produced by DependencyHealthService.summarize() and carried on the graph
// as graph.summary.highest_severity. We intentionally do NOT recompute a parallel
// severity ladder here; we only surface that value in the upper-case form this
// service's contract (ImpactAnalysisResult.riskLevel) exposes.
function riskLevelFromSummary(summary: DependencyHealthSummary): string {
  return String(summary.highest_severity || 'none').toUpperCase();
}

export class DependencyImpactService {
  private static extractAffectedEntities(nodes: any[]) {
    const extract = (type: string) =>
      nodes.filter((n) => n.type === type).map((n) => n.name || n.id);

    return {
      agents: extract('agent'),
      workflows: extract('workflow'),
      workflowNodes: extract('workflow_node'),
      knowledgeSources: [...extract('knowledge'), ...extract('collection')],
      tools: extract('tool'),
      channels: extract('channel'),
      brands: extract('brand'),
      // policies is populated from any 'policy' node the forward dependency graph
      // surfaces. The field is intentionally PRESERVED in the contract.
      // LIMITATION: the current forward graph (PromptDependencyService.getGraph)
      // does not yet emit a 'policy' node for prompt_tool_permissions.runtime_policy_id,
      // so this resolves to [] today. Surfacing runtime_policy_id as a graph node
      // belongs in the graph traversal layer (out of scope for this service); once
      // it does, policies populates here automatically with no change required.
      policies: extract('policy'),
    };
  }

  /**
   * Blockers are derived from the CANONICAL governance rule that lives in
   * DependencyHealthService.isBlocking(), surfaced per edge as edge.health.blocking.
   * There is deliberately NO local status whitelist here, so mandatory-stale (and
   * any future blocking state) is honoured automatically and stays consistent with
   * the health engine — no duplicated blocker logic.
   */
  private static collectBlockers(edges: any[]): string[] {
    const blockers: string[] = [];
    for (const edge of edges) {
      if (edge.health?.blocking) {
        blockers.push(
          `${edge.health.status} dependency: ${edge.dependency_type} (ID: ${edge.target}) — ${edge.health.reason}`
        );
      }
    }
    return blockers;
  }

  private static calculateRollbackDelta(
    currentEdges: any[],
    targetEdges: any[]
  ): { addedDependencies: string[]; removedDependencies: string[] } {
    const getDependencyKey = (e: any) => `${e.dependency_type || 'unknown'}:${e.target}`;

    const currentKeys = new Set(
      currentEdges
        .filter((e) => e.dependency_type !== 'version')
        .map(getDependencyKey)
    );
    const targetKeys = new Set(
      targetEdges
        .filter((e) => e.dependency_type !== 'version')
        .map(getDependencyKey)
    );

    const addedDependencies: string[] = [];
    const removedDependencies: string[] = [];

    // Added: present in target (rollback target) but missing from current configuration.
    for (const key of targetKeys) {
      if (!currentKeys.has(key)) {
        addedDependencies.push(key);
      }
    }

    // Removed: present in current configuration but missing from target configuration.
    for (const key of currentKeys) {
      if (!targetKeys.has(key)) {
        removedDependencies.push(key);
      }
    }

    return {
      addedDependencies,
      removedDependencies,
    };
  }

  /**
   * Evaluates governance impact when deploying a prompt or prompt version.
   */
  static async analyzeDeploymentImpact(
    promptId: string,
    workspaceId: string,
    opts: { versionId?: string; referenceTime?: string } = {}
  ): Promise<ImpactAnalysisResult> {
    const graph = await PromptDependencyService.getGraph(promptId, workspaceId, opts);
    if (!graph.found) {
      throw new Error(`Prompt with ID ${promptId} not found in workspace ${workspaceId}`);
    }

    let versionId = opts.versionId;
    if (!versionId) {
      const { data: prompt } = await supabaseAdmin
        .from('prompts')
        .select('current_version_id')
        .eq('id', promptId)
        .single();
      versionId = prompt?.current_version_id || undefined;
    }

    let approvalStatus: ApprovalValidity = { valid: true, invalidated: false };
    if (versionId) {
      approvalStatus = await ApprovalInvalidationService.getValidity(versionId);
    }

    const blockers: string[] = [];
    if (!approvalStatus.valid) {
      blockers.push(
        `Invalid approval: ${
          approvalStatus.reason || 'Approval has been invalidated due to dependency changes.'
        }`
      );
    }

    blockers.push(...this.collectBlockers(graph.edges));

    const affected = this.extractAffectedEntities(graph.nodes);
    const riskLevel = riskLevelFromSummary(graph.summary);

    return {
      action: 'DEPLOY',
      affected,
      blockers,
      dependencyHealth: graph.summary,
      approvalStatus,
      rollbackDelta: null,
      riskLevel,
    };
  }

  /**
   * Evaluates governance impact when rolling back to a target version.
   */
  static async analyzeRollbackImpact(
    promptId: string,
    workspaceId: string,
    targetVersionId: string,
    opts: { referenceTime?: string } = {}
  ): Promise<ImpactAnalysisResult> {
    const targetGraph = await PromptDependencyService.getGraph(promptId, workspaceId, {
      versionId: targetVersionId,
      referenceTime: opts.referenceTime,
    });
    if (!targetGraph.found) {
      throw new Error(`Prompt with ID ${promptId} not found in workspace ${workspaceId}`);
    }

    const approvalStatus = await ApprovalInvalidationService.getValidity(targetVersionId);

    const blockers: string[] = [];
    if (!approvalStatus.valid) {
      blockers.push(
        `Invalid approval: ${
          approvalStatus.reason || 'Approval has been invalidated due to dependency changes.'
        }`
      );
    }

    blockers.push(...this.collectBlockers(targetGraph.edges));

    const affected = this.extractAffectedEntities(targetGraph.nodes);
    const riskLevel = riskLevelFromSummary(targetGraph.summary);

    const { data: prompt } = await supabaseAdmin
      .from('prompts')
      .select('current_version_id')
      .eq('id', promptId)
      .single();

    let rollbackDelta: { addedDependencies: string[]; removedDependencies: string[] } = { addedDependencies: [], removedDependencies: [] };
    if (prompt?.current_version_id && prompt.current_version_id !== targetVersionId) {
      const currentGraph = await PromptDependencyService.getGraph(promptId, workspaceId, {
        versionId: prompt.current_version_id,
        referenceTime: opts.referenceTime,
      });
      if (currentGraph.found) {
        rollbackDelta = this.calculateRollbackDelta(currentGraph.edges, targetGraph.edges);
      }
    }

    return {
      action: 'ROLLBACK',
      affected,
      blockers,
      dependencyHealth: targetGraph.summary,
      approvalStatus,
      rollbackDelta,
      riskLevel,
    };
  }

  /**
   * Evaluates governance impact when archiving a prompt.
   */
  static async analyzeArchiveImpact(
    promptId: string,
    workspaceId: string,
    opts: { referenceTime?: string } = {}
  ): Promise<ImpactAnalysisResult> {
    const graph = await PromptDependencyService.getGraph(promptId, workspaceId, opts);
    if (!graph.found) {
      throw new Error(`Prompt with ID ${promptId} not found in workspace ${workspaceId}`);
    }

    const affected = this.extractAffectedEntities(graph.nodes);
    const riskLevel = riskLevelFromSummary(graph.summary);

    return {
      action: 'ARCHIVE',
      affected,
      blockers: [],
      dependencyHealth: graph.summary,
      approvalStatus: { valid: true, invalidated: false },
      rollbackDelta: null,
      riskLevel,
    };
  }

  /**
   * Evaluates governance impact when retiring a prompt.
   */
  static async analyzeRetireImpact(
    promptId: string,
    workspaceId: string,
    opts: { referenceTime?: string } = {}
  ): Promise<ImpactAnalysisResult> {
    const graph = await PromptDependencyService.getGraph(promptId, workspaceId, opts);
    if (!graph.found) {
      throw new Error(`Prompt with ID ${promptId} not found in workspace ${workspaceId}`);
    }

    const affected = this.extractAffectedEntities(graph.nodes);
    const riskLevel = riskLevelFromSummary(graph.summary);

    return {
      action: 'RETIRE',
      affected,
      blockers: [],
      dependencyHealth: graph.summary,
      approvalStatus: { valid: true, invalidated: false },
      rollbackDelta: null,
      riskLevel,
    };
  }
}
