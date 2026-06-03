-- ============================================================
-- ZoikoVertex - Prompt Governance Dependency Graph foundation
--
-- Batch 3B.1: database foundation for ApprovalInvalidationService and the
-- (later) dependency graph / reverse-traversal engine.
--
-- This patch is ADDITIVE ONLY:
--   * reverse-lookup indexes on the dependency binding tables
--   * approval-invalidation columns on `prompts`
--   * an optional read-model view over the three binding tables
--
-- It does NOT modify existing columns, drop anything, change types, or move
-- data. No tenant-isolation surface changes (binding tables remain scoped via
-- prompt_versions -> prompts, which the view exposes for convenience).
--
-- Scope: Prompt Governance tables only. Does not touch Agent Studio, Workflows,
-- Knowledge Base, Agent Operations, the runtime engine, the audit ledger, or
-- the Evidence Vault.
-- Idempotent: safe to re-run. Production compatible.
-- ============================================================

-- Guard: ensure target tables exist (no-op if already present from prior
-- Prompt Governance migrations). Never drops or alters existing definitions.
CREATE TABLE IF NOT EXISTS prompt_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS prompt_knowledge_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS prompt_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- ── 1. Reverse-lookup indexes ───────────────────────────────────────────────
-- Existing indexes are all keyed by prompt_version_id (forward direction).
-- Reverse traversal ("which prompts depend on this agent / workflow / KB /
-- tool?") and dependency-health joins scan by the TARGET id, so each target
-- column needs its own index to stay fast as the binding tables grow.
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_agent
  ON prompt_bindings (agent_id);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_workflow
  ON prompt_bindings (workflow_id);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_workflow_node
  ON prompt_bindings (workflow_node_id);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_channel
  ON prompt_bindings (channel_id);
CREATE INDEX IF NOT EXISTS idx_prompt_bindings_brand
  ON prompt_bindings (brand_id);
CREATE INDEX IF NOT EXISTS idx_prompt_knowledge_bindings_kb
  ON prompt_knowledge_bindings (kb_id);
CREATE INDEX IF NOT EXISTS idx_prompt_knowledge_bindings_collection
  ON prompt_knowledge_bindings (collection_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tool_permissions_tool
  ON prompt_tool_permissions (tool_id);

-- ── 2. Approval-invalidation columns on prompts ─────────────────────────────
-- The core Batch 3B governance rule (Doc 3 §7): "Approval status must be
-- invalidated when risk-impacting sections are changed after approval."
-- A risk-impacting dependency change after the latest approval sets these.
-- NULL = approval currently valid (or never approved).
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS approval_invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_invalidated_reason text;

-- Partial index: fast lookup of prompts whose approval is currently invalidated.
CREATE INDEX IF NOT EXISTS idx_prompts_approval_invalidated
  ON prompts (approval_invalidated_at)
  WHERE approval_invalidated_at IS NOT NULL;

-- ── 3. Optional read model: normalized dependency edges ─────────────────────
-- Low-risk, idempotent (CREATE OR REPLACE VIEW), zero stored data. Unifies the
-- three binding tables into one edge shape and exposes prompt_id + workspace_id
-- (resolved via prompt_versions -> prompts) so graph and reverse-traversal
-- queries can filter by tenant without re-deriving the join each time.
CREATE OR REPLACE VIEW prompt_dependency_edges AS
  SELECT
    b.id                AS binding_id,
    'binding'           AS source_table,
    CASE WHEN b.agent_id IS NOT NULL THEN 'agent'
         WHEN b.workflow_id IS NOT NULL THEN 'workflow'
         WHEN b.workflow_node_id IS NOT NULL THEN 'workflow_node'
         WHEN b.channel_id IS NOT NULL THEN 'channel'
         WHEN b.brand_id IS NOT NULL THEN 'brand'
         ELSE 'binding' END                       AS dependency_type,
    COALESCE(b.agent_id, b.workflow_id, b.workflow_node_id, b.channel_id, b.brand_id) AS dependency_id,
    NULL::text          AS dependency_name,
    b.environment       AS environment,
    b.prompt_version_id AS version_id,
    pv.prompt_id        AS prompt_id,
    p.workspace_id      AS workspace_id,
    b.created_at        AS created_at
  FROM prompt_bindings b
  LEFT JOIN prompt_versions pv ON pv.id = b.prompt_version_id
  LEFT JOIN prompts p          ON p.id = pv.prompt_id

  UNION ALL
  SELECT
    k.id,
    'knowledge_binding',
    'knowledge',
    COALESCE(k.kb_id, k.collection_id),
    NULL::text,
    NULL::text,
    k.prompt_version_id,
    pv.prompt_id,
    p.workspace_id,
    k.created_at
  FROM prompt_knowledge_bindings k
  LEFT JOIN prompt_versions pv ON pv.id = k.prompt_version_id
  LEFT JOIN prompts p          ON p.id = pv.prompt_id

  UNION ALL
  SELECT
    t.id,
    'tool_permission',
    'tool',
    t.tool_id,
    t.tool_name,
    NULL::text,
    t.prompt_version_id,
    pv.prompt_id,
    p.workspace_id,
    t.created_at
  FROM prompt_tool_permissions t
  LEFT JOIN prompt_versions pv ON pv.id = t.prompt_version_id
  LEFT JOIN prompts p          ON p.id = pv.prompt_id;

NOTIFY pgrst, 'reload schema';
