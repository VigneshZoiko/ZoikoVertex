/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../shared/supabase';
import {
  DependencyHealthService,
  DependencyHealthResult,
  DependencyHealthSummary,
  DependencyInput,
} from './DependencyHealthService';

// ─────────────────────────────────────────────────────────────────────────────
// PromptDependencyService — Batch 3B.6 (Forward Graph Assembly)
//
// Builds the forward dependency graph for a prompt:
//
//   Prompt → Version → { agent, workflow, workflow_node, knowledge, collection,
//                        tool, channel, brand } bindings
//
// Source of truth is the AUTHORITATIVE binding tables only:
//   prompt_bindings, prompt_knowledge_bindings, prompt_tool_permissions.
// Legacy prompt-level fields (linked_agent_id / linked_workflow_id /
// knowledge_sources / tools_permitted) are intentionally NOT read.
//
// Tenant scoping: the root prompt is loaded with an explicit workspace_id match;
// every downstream query is keyed by that prompt's version ids, so the traversal
// can never cross tenant boundaries. Target-entity enrichment (agent/workflow/KB
// names + status) is looked up only by ids that already belong to this tenant's
// bindings — no cross-tenant enumeration.
//
// Performance: all reads are BATCHED (one query per binding table via IN, one
// query per target-entity type via IN) — no N+1.
//
// Health: each dependency edge is classified through DependencyHealthService and
// the result is attached to the edge.
//
// Pure read service: NO routes, controllers, UI, audit, or mutations.
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  status: string;
  workspace_id: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  dependency_type: string;
  environment: string | null;
  health?: DependencyHealthResult;
}

export interface PromptDependencyGraph {
  prompt_id: string;
  workspace_id: string;
  found: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: DependencyHealthSummary;
}

interface ResolvedTargets {
  available: boolean;          // false when the target table/columns could not be read
  map: Map<string, any>;       // id -> row
}

export class PromptDependencyService {
  /** Batch-resolve target entities by id. Degrades gracefully: a failed lookup
   *  (missing table/column) returns available=false so edges are NOT falsely
   *  marked MISSING. */
  private static async resolveTargets(table: string, ids: string[], columns: string): Promise<ResolvedTargets> {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return { available: true, map: new Map() };
    try {
      const { data, error } = await supabaseAdmin.from(table).select(columns).in('id', unique);
      if (error) return { available: false, map: new Map() };
      const map = new Map<string, any>();
      for (const row of data || []) map.set(row.id, row);
      return { available: true, map };
    } catch {
      return { available: false, map: new Map() };
    }
  }

  private static targetName(row: any, fallbackId: string): string {
    return (row && (row.name || row.title || row.tool_name)) || fallbackId;
  }

  /**
   * Assemble the forward dependency graph for a prompt (optionally a single
   * version). Tenant-scoped; returns { nodes, edges, summary }.
   */
  static async getGraph(
    promptId: string,
    workspaceId: string,
    opts: { versionId?: string; referenceTime?: string } = {},
  ): Promise<PromptDependencyGraph> {
    const emptySummary = DependencyHealthService.summarize([]);

    // ── 1. Root prompt — explicit tenant match (no cross-tenant access) ──────
    const { data: prompt, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, workspace_id, name, status, current_version_id, risk_tier')
      .eq('id', promptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!prompt) {
      return { prompt_id: promptId, workspace_id: workspaceId, found: false, nodes: [], edges: [], summary: emptySummary };
    }

    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const addNode = (id: string | null | undefined, type: string, name: string, status: string) => {
      if (!id) return;
      const key = `${type}:${id}`;
      if (!nodes.has(key)) nodes.set(key, { id, type, name, status, workspace_id: workspaceId });
    };

    addNode(prompt.id, 'prompt', prompt.name || prompt.id, prompt.status || 'unknown');

    // ── 2. Versions for this prompt (optionally one) ─────────────────────────
    let vQuery = supabaseAdmin
      .from('prompt_versions')
      .select('id, prompt_id, version_number, created_at')
      .eq('prompt_id', promptId);
    if (opts.versionId) vQuery = vQuery.eq('id', opts.versionId);
    const { data: versions, error: vErr } = await vQuery;
    if (vErr) throw vErr;

    const versionIds = (versions || []).map((v: any) => v.id);
    for (const v of versions || []) {
      const isCurrent = v.id === prompt.current_version_id;
      addNode(v.id, 'version', `v${v.version_number}`, isCurrent ? 'current' : 'historical');
      edges.push({ source: prompt.id, target: v.id, dependency_type: 'version', environment: null });
    }
    if (versionIds.length === 0) {
      return { prompt_id: promptId, workspace_id: workspaceId, found: true, nodes: Array.from(nodes.values()), edges, summary: emptySummary };
    }

    // ── 3. Batch-load all bindings for these versions (no N+1) ───────────────
    const [bindRes, knowRes, toolRes] = await Promise.all([
      supabaseAdmin.from('prompt_bindings').select('*').in('prompt_version_id', versionIds),
      supabaseAdmin.from('prompt_knowledge_bindings').select('*').in('prompt_version_id', versionIds),
      supabaseAdmin.from('prompt_tool_permissions').select('*').in('prompt_version_id', versionIds),
    ]);
    if (bindRes.error) throw bindRes.error;
    if (knowRes.error) throw knowRes.error;
    if (toolRes.error) throw toolRes.error;
    const bindings = bindRes.data || [];
    const knowledge = knowRes.data || [];
    const tools = toolRes.data || [];

    // ── 4. Collect distinct target ids, then batch-resolve names/status ──────
    const agentIds = bindings.map((b: any) => b.agent_id).filter(Boolean);
    const workflowIds = bindings.map((b: any) => b.workflow_id).filter(Boolean);
    const channelIds = bindings.map((b: any) => b.channel_id).filter(Boolean);
    const brandIds = bindings.map((b: any) => b.brand_id).filter(Boolean);
    const kbIds = knowledge.map((k: any) => k.kb_id).filter(Boolean);
    const collectionIds = knowledge.map((k: any) => k.collection_id).filter(Boolean);

    const [agents, workflows, kbs, collections] = await Promise.all([
      this.resolveTargets('agents', agentIds, 'id, name, status'),
      this.resolveTargets('workflow_templates', workflowIds, 'id, name, status'),
      this.resolveTargets('knowledge_bases', kbIds, 'id, name, status'),
      this.resolveTargets('knowledge_collections', collectionIds, 'id, name, status'),
    ]);

    const now = opts.referenceTime;

    const classify = (input: DependencyInput) => DependencyHealthService.classify(input, now);
    const existsFlag = (available: boolean, map: Map<string, any>, id: string): boolean | undefined =>
      available ? map.has(id) : undefined;

    // ── 5. Build edges + nodes from prompt_bindings ──────────────────────────
    for (const b of bindings) {
      if (b.agent_id) {
        const row = agents.map.get(b.agent_id);
        addNode(b.agent_id, 'agent', this.targetName(row, b.agent_id), row?.status || 'unknown');
        edges.push({
          source: b.prompt_version_id, target: b.agent_id, dependency_type: 'agent', environment: b.environment ?? null,
          health: classify({ type: 'agent', id: b.agent_id, exists: existsFlag(agents.available, agents.map, b.agent_id), status: row?.status, effective_from: b.effective_from, effective_to: b.effective_to }),
        });
      }
      if (b.workflow_id) {
        const row = workflows.map.get(b.workflow_id);
        addNode(b.workflow_id, 'workflow', this.targetName(row, b.workflow_id), row?.status || 'unknown');
        edges.push({
          source: b.prompt_version_id, target: b.workflow_id, dependency_type: 'workflow', environment: b.environment ?? null,
          health: classify({ type: 'workflow', id: b.workflow_id, exists: existsFlag(workflows.available, workflows.map, b.workflow_id), status: row?.status, effective_from: b.effective_from, effective_to: b.effective_to }),
        });
      }
      if (b.workflow_node_id) {
        addNode(b.workflow_node_id, 'workflow_node', b.workflow_node_id, 'unknown');
        edges.push({
          source: b.prompt_version_id, target: b.workflow_node_id, dependency_type: 'workflow_node', environment: b.environment ?? null,
          health: classify({ type: 'workflow_node', id: b.workflow_node_id, effective_from: b.effective_from, effective_to: b.effective_to }),
        });
      }
      if (b.channel_id) {
        addNode(b.channel_id, 'channel', b.channel_id, 'unknown');
        edges.push({
          source: b.prompt_version_id, target: b.channel_id, dependency_type: 'channel', environment: b.environment ?? null,
          health: classify({ type: 'channel', id: b.channel_id, effective_from: b.effective_from, effective_to: b.effective_to }),
        });
      }
      if (b.brand_id) {
        addNode(b.brand_id, 'brand', b.brand_id, 'unknown');
        edges.push({
          source: b.prompt_version_id, target: b.brand_id, dependency_type: 'brand', environment: b.environment ?? null,
          health: classify({ type: 'brand', id: b.brand_id, effective_from: b.effective_from, effective_to: b.effective_to }),
        });
      }
    }

    // ── 6. Knowledge bindings (kb + collection) ──────────────────────────────
    for (const k of knowledge) {
      if (k.kb_id) {
        const row = kbs.map.get(k.kb_id);
        addNode(k.kb_id, 'knowledge', this.targetName(row, k.kb_id), row?.status || 'unknown');
        edges.push({
          source: k.prompt_version_id, target: k.kb_id, dependency_type: 'knowledge', environment: null,
          health: classify({ type: 'knowledge', id: k.kb_id, exists: existsFlag(kbs.available, kbs.map, k.kb_id), status: row?.status, expiry_date: row?.expiry_date, review_date: row?.review_date, retrieval_mode: k.retrieval_mode, freshness_rule: k.freshness_rule }),
        });
      }
      if (k.collection_id) {
        const row = collections.map.get(k.collection_id);
        addNode(k.collection_id, 'collection', this.targetName(row, k.collection_id), row?.status || 'unknown');
        edges.push({
          source: k.prompt_version_id, target: k.collection_id, dependency_type: 'collection', environment: null,
          health: classify({ type: 'collection', id: k.collection_id, exists: existsFlag(collections.available, collections.map, k.collection_id), status: row?.status, retrieval_mode: k.retrieval_mode, freshness_rule: k.freshness_rule }),
        });
      }
    }

    // ── 7. Tool permissions (tool_id or tool_name as identity) ───────────────
    for (const t of tools) {
      const toolKey = t.tool_id || `tool:${t.tool_name}`;
      addNode(toolKey, 'tool', t.tool_name || t.tool_id || 'tool', 'declared');
      edges.push({
        source: t.prompt_version_id, target: toolKey, dependency_type: 'tool', environment: null,
        // tool_name is the declared identity, so the dependency is present by definition.
        health: classify({ type: 'tool', id: toolKey, exists: true }),
      });
    }

    const dependencyHealth = edges
      .filter((e) => e.health)
      .map((e) => e.health as DependencyHealthResult);

    return {
      prompt_id: promptId,
      workspace_id: workspaceId,
      found: true,
      nodes: Array.from(nodes.values()),
      edges,
      summary: DependencyHealthService.summarize(dependencyHealth),
    };
  }
}
