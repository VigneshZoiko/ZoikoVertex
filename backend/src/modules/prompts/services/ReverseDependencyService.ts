/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// ReverseDependencyService — Batch 3B.10 (Reverse Dependency Traversal)
//
// The inverse of PromptDependencyService.getGraph(). Given a TARGET entity
// (agent / workflow / workflow_node / channel / brand / knowledge / collection /
// tool / policy), it answers "which prompts depend on this?".
//
// Source of truth is the AUTHORITATIVE binding tables only:
//   prompt_bindings, prompt_knowledge_bindings, prompt_tool_permissions.
//
// Tenant isolation: the binding tables carry NO workspace_id — they key on
// prompt_version_id. The ONLY safe boundary is the chain
//     prompt_version_id → prompt_versions.prompt_id → prompts.workspace_id
// with an explicit workspace match at the prompts step. Any dependent whose
// prompt does not belong to the caller's workspace is DROPPED, so a foreign
// target id can never reveal — or even hint at the existence of — out-of-tenant
// prompts.
//
// Performance: a fixed query budget regardless of result size —
//   1 binding query + 1 prompt_versions query + 1 prompts query. No N+1.
//
// Pure read service: NO routes, controllers, UI, audit, mutations, or
// deployment/runtime side-effects.
// ─────────────────────────────────────────────────────────────────────────────

export type ReverseTargetType =
  | 'agent'
  | 'workflow'
  | 'workflow_node'
  | 'channel'
  | 'brand'
  | 'knowledge'
  | 'collection'
  | 'tool'
  | 'policy';

export interface ReverseDependent {
  prompt_id: string;
  prompt_name: string;
  prompt_status: string;
  version_id: string;
  version_number: number | null;
  is_current_version: boolean;
  dependency_type: ReverseTargetType;
  environment: string | null;
}

export interface ReverseDependencyResult {
  target: { type: ReverseTargetType; id: string };
  workspace_id: string;
  dependents: ReverseDependent[];
  summary: { prompt_count: number; version_count: number; binding_count: number };
}

// A binding row reduced to what reverse traversal needs.
interface BindingRef {
  prompt_version_id: string;
  environment: string | null;
}

// Maps a target type to the binding table + target column. Only prompt_bindings
// carries an environment; knowledge/tool/policy edges have none (null).
const SIMPLE_SOURCES: Record<
  Exclude<ReverseTargetType, 'tool'>,
  { table: string; column: string; hasEnvironment: boolean }
> = {
  agent: { table: 'prompt_bindings', column: 'agent_id', hasEnvironment: true },
  workflow: { table: 'prompt_bindings', column: 'workflow_id', hasEnvironment: true },
  workflow_node: { table: 'prompt_bindings', column: 'workflow_node_id', hasEnvironment: true },
  channel: { table: 'prompt_bindings', column: 'channel_id', hasEnvironment: true },
  brand: { table: 'prompt_bindings', column: 'brand_id', hasEnvironment: true },
  knowledge: { table: 'prompt_knowledge_bindings', column: 'kb_id', hasEnvironment: false },
  collection: { table: 'prompt_knowledge_bindings', column: 'collection_id', hasEnvironment: false },
  policy: { table: 'prompt_tool_permissions', column: 'runtime_policy_id', hasEnvironment: false },
};

export class ReverseDependencyService {
  /** ── ONE binding query ── resolve the binding rows that reference targetId. */
  private static async queryBindings(targetType: ReverseTargetType, targetId: string): Promise<BindingRef[]> {
    if (targetType === 'tool') {
      // Tool identity is tool_id first; fall back to tool_name ONLY when the row
      // has no tool_id. Expressed as a single OR filter so it stays one query.
      const { data, error } = await supabaseAdmin
        .from('prompt_tool_permissions')
        .select('prompt_version_id')
        .or(`tool_id.eq.${targetId},and(tool_id.is.null,tool_name.eq.${targetId})`);
      if (error) throw error;
      return ((data as any[]) || []).map((r) => ({ prompt_version_id: r.prompt_version_id, environment: null }));
    }

    const src = SIMPLE_SOURCES[targetType];
    if (!src) return [];
    const columns = src.hasEnvironment ? 'prompt_version_id, environment' : 'prompt_version_id';
    const { data, error } = await supabaseAdmin.from(src.table).select(columns).eq(src.column, targetId);
    if (error) throw error;
    return ((data as any[]) || []).map((r) => ({
      prompt_version_id: r.prompt_version_id,
      environment: src.hasEnvironment ? (r.environment ?? null) : null,
    }));
  }

  /**
   * Core reverse traversal. Returns the prompts (and versions) in the caller's
   * workspace that depend on the given target. Tenant-scoped; no N+1.
   */
  static async getDependents(
    targetType: ReverseTargetType,
    targetId: string,
    workspaceId: string,
  ): Promise<ReverseDependencyResult> {
    const empty: ReverseDependencyResult = {
      target: { type: targetType, id: targetId },
      workspace_id: workspaceId,
      dependents: [],
      summary: { prompt_count: 0, version_count: 0, binding_count: 0 },
    };
    if (!targetId) return empty;

    // 1. Binding rows referencing the target.
    const bindings = await this.queryBindings(targetType, targetId);
    const versionIds = Array.from(new Set(bindings.map((b) => b.prompt_version_id).filter(Boolean)));
    if (versionIds.length === 0) return empty;

    // 2. Resolve versions → prompt_id + version_number (one batched query).
    const { data: versions, error: vErr } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, prompt_id, version_number')
      .in('id', versionIds);
    if (vErr) throw vErr;
    const versionMap = new Map<string, { prompt_id: string | null; version_number: number | null }>();
    for (const v of (versions as any[]) || []) {
      versionMap.set(v.id, { prompt_id: v.prompt_id ?? null, version_number: v.version_number ?? null });
    }
    const promptIds = Array.from(
      new Set(((versions as any[]) || []).map((v) => v.prompt_id).filter(Boolean)),
    );
    if (promptIds.length === 0) return empty;

    // 3. Resolve prompts WITH the tenant gate (one batched query). Prompts not in
    //    the caller's workspace are absent from the map, so their bindings drop.
    const { data: prompts, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, name, status, current_version_id, workspace_id')
      .in('id', promptIds)
      .eq('workspace_id', workspaceId);
    if (pErr) throw pErr;
    const promptMap = new Map<string, any>();
    for (const p of (prompts as any[]) || []) promptMap.set(p.id, p);

    // 4. Assemble dependents, dropping anything outside the caller's workspace.
    const dependents: ReverseDependent[] = [];
    const promptSet = new Set<string>();
    const versionSet = new Set<string>();

    for (const b of bindings) {
      const v = versionMap.get(b.prompt_version_id);
      if (!v || !v.prompt_id) continue;
      const p = promptMap.get(v.prompt_id);
      if (!p) continue; // tenant boundary: prompt not in caller workspace → dropped.

      dependents.push({
        prompt_id: p.id,
        prompt_name: p.name || p.id,
        prompt_status: p.status || 'unknown',
        version_id: b.prompt_version_id,
        version_number: v.version_number,
        is_current_version: b.prompt_version_id === p.current_version_id,
        dependency_type: targetType,
        environment: b.environment,
      });
      promptSet.add(p.id);
      versionSet.add(b.prompt_version_id);
    }

    return {
      target: { type: targetType, id: targetId },
      workspace_id: workspaceId,
      dependents,
      summary: {
        prompt_count: promptSet.size,
        version_count: versionSet.size,
        binding_count: dependents.length,
      },
    };
  }

  // ── Typed convenience wrappers ──────────────────────────────────────────────
  static getPromptsByAgent(agentId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('agent', agentId, workspaceId);
  }

  static getPromptsByWorkflow(workflowId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('workflow', workflowId, workspaceId);
  }

  static getPromptsByWorkflowNode(workflowNodeId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('workflow_node', workflowNodeId, workspaceId);
  }

  static getPromptsByKnowledge(kbId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('knowledge', kbId, workspaceId);
  }

  static getPromptsByCollection(collectionId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('collection', collectionId, workspaceId);
  }

  static getPromptsByTool(toolIdOrName: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('tool', toolIdOrName, workspaceId);
  }

  static getPromptsByChannel(channelId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('channel', channelId, workspaceId);
  }

  static getPromptsByBrand(brandId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('brand', brandId, workspaceId);
  }

  static getPromptsByPolicy(policyId: string, workspaceId: string): Promise<ReverseDependencyResult> {
    return this.getDependents('policy', policyId, workspaceId);
  }
}
