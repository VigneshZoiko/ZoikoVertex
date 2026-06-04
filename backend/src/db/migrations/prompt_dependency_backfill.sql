-- ============================================================
-- ZoikoVertex - Prompt Governance Dependency Backfill
--
-- Batch 3A / Phase 4: convert the LEGACY denormalized dependency fields on
-- `prompts` into normalized rows in the authoritative dependency tables so the
-- (future) Dependency Graph engine has real data.
--
-- Source (legacy)            ->  Authoritative target
--   prompts.linked_agent_id     ->  prompt_bindings.agent_id
--   prompts.linked_workflow_id  ->  prompt_bindings.workflow_id
--   prompts.knowledge_sources[] ->  prompt_knowledge_bindings.kb_id   (UUID entries only)
--   prompts.tools_permitted[]   ->  prompt_tool_permissions.tool_name
--
-- Bindings attach to the prompt's CURRENT version (prompt_versions row), which
-- is how the dependency tables are keyed.
--
-- Guarantees:
--   * IDEMPOTENT  — every insert is guarded by NOT EXISTS; safe to re-run.
--   * SAFE        — insert-only; never updates/deletes existing rows; the
--                   legacy columns are left untouched as a fallback.
--   * WORKSPACE-AWARE — operates per prompt (which carries workspace_id); the
--                   binding tables inherit tenancy via prompt_version -> prompt.
--
-- Non-UUID knowledge_sources entries cannot map to the uuid kb_id column and
-- are intentionally skipped; a NOTICE reports how many were skipped so they can
-- be reconciled manually.
-- Scope: Prompt Governance tables only.
-- ============================================================

-- ── 1. Agent bindings from prompts.linked_agent_id ──────────────────────────
INSERT INTO prompt_bindings (prompt_version_id, agent_id, environment)
SELECT p.current_version_id, p.linked_agent_id, 'production'
FROM prompts p
WHERE p.current_version_id IS NOT NULL
  AND p.linked_agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prompt_bindings b
    WHERE b.prompt_version_id = p.current_version_id
      AND b.agent_id = p.linked_agent_id
  );

-- ── 2. Workflow bindings from prompts.linked_workflow_id ────────────────────
INSERT INTO prompt_bindings (prompt_version_id, workflow_id, environment)
SELECT p.current_version_id, p.linked_workflow_id, 'production'
FROM prompts p
WHERE p.current_version_id IS NOT NULL
  AND p.linked_workflow_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prompt_bindings b
    WHERE b.prompt_version_id = p.current_version_id
      AND b.workflow_id = p.linked_workflow_id
  );

-- ── 3. Knowledge bindings from prompts.knowledge_sources[] (UUID entries) ───
INSERT INTO prompt_knowledge_bindings (prompt_version_id, kb_id, retrieval_mode)
SELECT p.current_version_id, src::uuid, 'optional'
FROM prompts p
CROSS JOIN LATERAL unnest(COALESCE(p.knowledge_sources, '{}')) AS src
WHERE p.current_version_id IS NOT NULL
  AND src ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM prompt_knowledge_bindings k
    WHERE k.prompt_version_id = p.current_version_id
      AND k.kb_id = src::uuid
  );

-- Report knowledge_sources that could not be mapped (non-UUID identifiers).
DO $$
DECLARE
  skipped integer;
BEGIN
  SELECT count(*) INTO skipped
  FROM prompts p
  CROSS JOIN LATERAL unnest(COALESCE(p.knowledge_sources, '{}')) AS src
  WHERE p.current_version_id IS NOT NULL
    AND src !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND length(trim(src)) > 0;
  IF skipped > 0 THEN
    RAISE NOTICE 'Dependency backfill: % non-UUID knowledge_sources entries skipped (no kb_id mapping). Reconcile manually.', skipped;
  END IF;
END $$;

-- ── 4. Tool permissions from prompts.tools_permitted[] ──────────────────────
INSERT INTO prompt_tool_permissions (prompt_version_id, tool_name)
SELECT p.current_version_id, trim(src)
FROM prompts p
CROSS JOIN LATERAL unnest(COALESCE(p.tools_permitted, '{}')) AS src
WHERE p.current_version_id IS NOT NULL
  AND length(trim(src)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM prompt_tool_permissions tp
    WHERE tp.prompt_version_id = p.current_version_id
      AND tp.tool_name = trim(src)
  );

-- ── 5. Backfill coverage summary ────────────────────────────────────────────
DO $$
DECLARE
  b_cnt integer;
  k_cnt integer;
  t_cnt integer;
BEGIN
  SELECT count(*) INTO b_cnt FROM prompt_bindings;
  SELECT count(*) INTO k_cnt FROM prompt_knowledge_bindings;
  SELECT count(*) INTO t_cnt FROM prompt_tool_permissions;
  RAISE NOTICE 'Dependency tables after backfill: bindings=%, knowledge=%, tools=%', b_cnt, k_cnt, t_cnt;
END $$;

NOTIFY pgrst, 'reload schema';
