/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptDependencyService } from '../PromptDependencyService';
import { DependencyHealthService, DependencyHealthSummary } from '../DependencyHealthService';
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

function calculateRiskLevel(edges: any[]): string {
  let highest = 'NONE';
  for (const edge of edges) {
    if (!edge.health) continue;
    const status = edge.health.status;
    if (status === 'MISSING' || status === 'DELETED') {
      return 'CRITICAL'; // Highest risk level; short-circuit early.
    }
    if (status === 'REVOKED' || status === 'EXPIRED') {
      highest = 'HIGH';
    } else if (
      (status === 'STALE' || status === 'PAUSED' || status === 'ARCHIVED') &&
      highest !== 'HIGH'
    ) {
      highest = 'MEDIUM';
    } else if (status === 'WARNING' && highest !== 'HIGH' && highest !== 'MEDIUM') {
      highest = 'LOW';
    }
  }
  return highest;
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
      policies: extract('policy'),
    };
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

    for (const edge of graph.edges) {
      if (!edge.health) continue;
      const status = edge.health.status;
      if (status === 'MISSING') {
        blockers.push(`Missing dependency: ${edge.dependency_type} (ID: ${edge.target}) could not be resolved.`);
      }
      if (status === 'DELETED') {
        blockers.push(`Deleted dependency: ${edge.dependency_type} (ID: ${edge.target}) has been deleted.`);
      }
      if (status === 'REVOKED') {
        blockers.push(`Revoked dependency: ${edge.dependency_type} (ID: ${edge.target}) access has been revoked.`);
      }
      if (status === 'EXPIRED') {
        blockers.push(`Expired dependency: ${edge.dependency_type} (ID: ${edge.target}) has passed its expiry date.`);
      }
    }

    const affected = this.extractAffectedEntities(graph.nodes);
    const riskLevel = calculateRiskLevel(graph.edges);

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

    for (const edge of targetGraph.edges) {
      if (!edge.health) continue;
      const status = edge.health.status;
      if (status === 'MISSING') {
        blockers.push(`Missing dependency: ${edge.dependency_type} (ID: ${edge.target}) could not be resolved.`);
      }
      if (status === 'DELETED') {
        blockers.push(`Deleted dependency: ${edge.dependency_type} (ID: ${edge.target}) has been deleted.`);
      }
      if (status === 'REVOKED') {
        blockers.push(`Revoked dependency: ${edge.dependency_type} (ID: ${edge.target}) access has been revoked.`);
      }
      if (status === 'EXPIRED') {
        blockers.push(`Expired dependency: ${edge.dependency_type} (ID: ${edge.target}) has passed its expiry date.`);
      }
    }

    const affected = this.extractAffectedEntities(targetGraph.nodes);
    const riskLevel = calculateRiskLevel(targetGraph.edges);

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
    const riskLevel = calculateRiskLevel(graph.edges);

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
    const riskLevel = calculateRiskLevel(graph.edges);

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
