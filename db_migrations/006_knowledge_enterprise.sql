-- Knowledge Enterprise Readiness Migration
-- Adds: pgvector, embedding column, version history, taxonomy defaults, SLA fields, notifications

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. knowledge_chunks: add embedding column
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS re_embed_at TIMESTAMPTZ;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS version_id INTEGER DEFAULT 1;

-- 3. knowledge_chunks: vector index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. knowledge_source_versions: version history table
CREATE TABLE IF NOT EXISTS knowledge_source_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_type TEXT,
  source_url TEXT,
  authority_level TEXT,
  sensitivity_level TEXT,
  risk_tier TEXT,
  jurisdiction TEXT,
  locale TEXT,
  product TEXT,
  brand TEXT,
  channel TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, version)
);

CREATE INDEX IF NOT EXISTS idx_source_versions_source_id ON knowledge_source_versions(source_id);

-- 5. knowledge_sources: add SLA / review fields
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS review_escalated_at TIMESTAMPTZ;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS review_escalated_to TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS review_sla_status TEXT DEFAULT 'on_track' CHECK (review_sla_status IN ('on_track', 'due_soon', 'overdue', 'escalated'));
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS duplicate_fingerprint TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES knowledge_sources(id);
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS parsed_claims JSONB DEFAULT '[]';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'passed', 'failed', 'blocked'));
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS scan_results JSONB DEFAULT '{}';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS retrieval_count INTEGER DEFAULT 0;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 6. knowledge_collections: add lifecycle status + defaults
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS collection_status TEXT DEFAULT 'DRAFT' CHECK (collection_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'RESTRICTED', 'RETIRED'));
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS chunking_defaults JSONB DEFAULT '{"max_chunk_size": 1000, "chunk_overlap": 200, "strategy": "semantic"}';
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS citation_policy TEXT DEFAULT 'optional' CHECK (citation_policy IN ('optional', 'required', 'strict'));
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS retention_policy JSONB DEFAULT '{"retention_days": null, "auto_retire": false}';
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS allowed_source_types TEXT[] DEFAULT ARRAY['PDF','DOCX','PPTX','TXT','CSV','MARKDOWN','MANUAL_ARTICLE'];
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS required_metadata_fields TEXT[] DEFAULT '{}';
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS data_residency TEXT DEFAULT 'auto';

-- 7. knowledge_claims: claim detection table
CREATE TABLE IF NOT EXISTS knowledge_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('performance', 'pricing', 'legal', 'compliance', 'certification', 'integration', 'other')),
  claim_text TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.0,
  category TEXT,
  is_unsupported BOOLEAN DEFAULT FALSE,
  unsupported_reason TEXT,
  conflicting_with UUID REFERENCES knowledge_sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_source_id ON knowledge_claims(source_id);
CREATE INDEX IF NOT EXISTS idx_claims_type ON knowledge_claims(claim_type);

-- 8. knowledge_citations: citation output tracking
CREATE TABLE IF NOT EXISTS knowledge_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_event_id UUID REFERENCES retrieval_events(id) ON DELETE SET NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  version_id INTEGER,
  output_id TEXT,
  agent_id TEXT,
  prompt_id TEXT,
  workflow_id TEXT,
  cited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citations_retrieval ON knowledge_citations(retrieval_event_id);
CREATE INDEX IF NOT EXISTS idx_citations_source ON knowledge_citations(source_id);

-- 9. knowledge_scan_log: scan audit trail
CREATE TABLE IF NOT EXISTS knowledge_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('pii', 'offensive', 'malware', 'duplicate', 'claim', 'stale')),
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB DEFAULT '{}',
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_log_source ON knowledge_scan_log(source_id);

-- 10. retrieval_events: add chunk-level detail columns
ALTER TABLE retrieval_events ADD COLUMN IF NOT EXISTS chunk_ids TEXT[] DEFAULT '{}';
ALTER TABLE retrieval_events ADD COLUMN IF NOT EXISTS source_ids TEXT[] DEFAULT '{}';
ALTER TABLE retrieval_events ADD COLUMN IF NOT EXISTS collection_ids TEXT[] DEFAULT '{}';
ALTER TABLE retrieval_events ADD COLUMN IF NOT EXISTS citation_count INTEGER DEFAULT 0;

-- 11. knowledge_notifications: knowledge-specific notification tracking
CREATE TABLE IF NOT EXISTS knowledge_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'review_overdue', 'review_due_soon', 'conflict_detected',
    'parsing_failed', 'source_expired', 'quarantine',
    'scan_failed', 'approval_required', 'version_created'
  )),
  severity TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  actionable BOOLEAN DEFAULT TRUE,
  action_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_knowledge_notif_workspace ON knowledge_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_notif_type ON knowledge_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_notif_sent ON knowledge_notifications(sent_at DESC);

-- 12. knowledge_conflicts: conflict detection table
CREATE TABLE IF NOT EXISTS knowledge_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ids TEXT[] DEFAULT '{}',
  chunk_ids TEXT[] DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  summary TEXT NOT NULL,
  owner_id TEXT,
  owner_name TEXT,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conflicts_status ON knowledge_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON knowledge_conflicts(severity);

-- 13. knowledge_reviews: review/approval tracking table
CREATE TABLE IF NOT EXISTS knowledge_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('APPROVAL', 'QUALITY', 'COMPLIANCE', 'STALE_REVIEW', 'SECURITY')),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'CHANGES_REQUIRED', 'ESCALATED')),
  comments TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  evidence_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_source ON knowledge_reviews(source_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON knowledge_reviews(reviewer_id);

-- 14. knowledge_access_policies: granular access control rules
CREATE TABLE IF NOT EXISTS knowledge_access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  allowed_agents TEXT[] DEFAULT '{}',
  allowed_prompts TEXT[] DEFAULT '{}',
  allowed_workflows TEXT[] DEFAULT '{}',
  allowed_roles TEXT[] DEFAULT '{}',
  allowed_channels TEXT[] DEFAULT '{}',
  restrictions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_policies_collection ON knowledge_access_policies(collection_id);
CREATE INDEX IF NOT EXISTS idx_access_policies_source ON knowledge_access_policies(source_id);

-- 15. pgvector similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  source_id UUID,
  text TEXT,
  heading_path TEXT,
  citation_anchor TEXT,
  chunk_index INTEGER,
  token_count INTEGER,
  sensitivity_level TEXT,
  score FLOAT,
  title TEXT,
  retrieval_policy TEXT,
  authority_level TEXT,
  expiry_date TIMESTAMPTZ,
  collection_id UUID,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_id,
    kc.text,
    kc.heading_path,
    kc.citation_anchor,
    kc.chunk_index,
    kc.token_count,
    kc.sensitivity_level,
    1 - (kc.embedding <=> query_embedding) AS score,
    ks.title,
    ks.retrieval_policy,
    ks.authority_level,
    ks.expiry_date,
    ks.collection_id,
    ks.status
  FROM knowledge_chunks kc
  JOIN knowledge_sources ks ON ks.id = kc.source_id
  WHERE kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    AND ks.status = 'ACTIVE'
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 16. Helper function for incrementing integer columns
CREATE OR REPLACE FUNCTION increment_int(x int)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$ SELECT x + 1; $$;

-- 17. Helper function for JSONB coalesce merge
CREATE OR REPLACE FUNCTION coalesce_jsonb(base JSONB, update JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(base, '{}'::JSONB) || COALESCE(update, '{}'::JSONB);
$$;
