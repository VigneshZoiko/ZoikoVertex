-- Knowledge Base Database Migration
-- Run this SQL against your Supabase database to create required tables

-- Knowledge Collections (governed grouping of knowledge sources)
CREATE TABLE IF NOT EXISTS knowledge_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  owner_name VARCHAR(255),
  scope VARCHAR(255),
  risk_tier VARCHAR(50) DEFAULT 'MEDIUM',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  retrieval_policy VARCHAR(50) DEFAULT 'ALLOWED',
  review_cadence INTEGER,
  source_count INTEGER DEFAULT 0,
  agent_count INTEGER DEFAULT 0,
  workflow_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  type VARCHAR(100) DEFAULT 'AI_LIBRARY',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Sources (individual documents/articles/URLs)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  kb_id UUID,
  source_type VARCHAR(50) DEFAULT 'MANUAL_ARTICLE',
  title VARCHAR(500) NOT NULL,
  content TEXT,
  source_url TEXT,
  file_path TEXT,
  owner_id UUID,
  owner_name VARCHAR(255),
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'DRAFT',
  authority_level VARCHAR(50) DEFAULT 'DRAFT_INTERNAL',
  sensitivity_level VARCHAR(50) DEFAULT 'INTERNAL',
  risk_tier VARCHAR(50) DEFAULT 'MEDIUM',
  retrieval_policy VARCHAR(50) DEFAULT 'ALLOWED',
  locale VARCHAR(50),
  jurisdiction VARCHAR(100),
  product VARCHAR(255),
  brand VARCHAR(255),
  channel VARCHAR(100),
  review_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  evidence_id UUID,
  chunk_count INTEGER DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Chunks (semantic sections of sources)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version_id UUID,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  heading_path TEXT,
  token_count INTEGER DEFAULT 0,
  embedding_id UUID,
  citation_anchor VARCHAR(255),
  hash VARCHAR(255),
  sensitivity_level VARCHAR(50) DEFAULT 'INTERNAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Embeddings (vector store references)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  model_id VARCHAR(255) NOT NULL,
  vector_store_id VARCHAR(255),
  embedding_version INTEGER DEFAULT 1,
  reembed_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Access Policies (per-collection or per-source agent/workflow/prompt controls)
CREATE TABLE IF NOT EXISTS knowledge_access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  allowed_agents UUID[],
  allowed_prompts UUID[],
  allowed_workflows UUID[],
  allowed_roles VARCHAR(100)[],
  allowed_channels VARCHAR(100)[],
  restrictions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retrieval Events (agent access logs)
CREATE TABLE IF NOT EXISTS retrieval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  agent_id UUID,
  agent_name VARCHAR(255),
  prompt_id UUID,
  workflow_id UUID,
  query TEXT NOT NULL,
  filters JSONB,
  returned_chunks INTEGER DEFAULT 0,
  blocked_chunks INTEGER DEFAULT 0,
  reason_codes VARCHAR(255)[],
  latency_ms INTEGER DEFAULT 0,
  output_id UUID,
  evidence_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Reviews (approval/rejection records)
CREATE TABLE IF NOT EXISTS knowledge_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  review_type VARCHAR(50) NOT NULL,
  decision VARCHAR(50) NOT NULL,
  comments TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evidence_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Conflicts (contradictory or duplicate knowledge)
CREATE TABLE IF NOT EXISTS knowledge_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ids UUID[] NOT NULL,
  chunk_ids UUID[],
  severity VARCHAR(50) DEFAULT 'MEDIUM',
  summary TEXT NOT NULL,
  owner_id UUID,
  owner_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'OPEN',
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_workspace ON knowledge_collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_status ON knowledge_collections(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_collections_type ON knowledge_collections(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_collection ON knowledge_sources(collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_authority ON knowledge_sources(authority_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_expiry ON knowledge_sources(expiry_date);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_chunk ON knowledge_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_model ON knowledge_embeddings(model_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_events_agent ON retrieval_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_events_created ON retrieval_events(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_source ON knowledge_reviews(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_reviewer ON knowledge_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_conflicts_status ON knowledge_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_conflicts_severity ON knowledge_conflicts(severity);

-- Enable RLS
ALTER TABLE knowledge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Knowledge collections can be viewed by workspace members" ON knowledge_collections FOR SELECT USING (true);
CREATE POLICY "Knowledge sources can be viewed by workspace members" ON knowledge_sources FOR SELECT USING (true);
CREATE POLICY "Knowledge chunks can be viewed by workspace members" ON knowledge_chunks FOR SELECT USING (true);
CREATE POLICY "Knowledge embeddings can be viewed by workspace members" ON knowledge_embeddings FOR SELECT USING (true);
CREATE POLICY "Access policies can be viewed by workspace members" ON knowledge_access_policies FOR SELECT USING (true);
CREATE POLICY "Retrieval events can be viewed by workspace members" ON retrieval_events FOR SELECT USING (true);
CREATE POLICY "Knowledge reviews can be viewed by workspace members" ON knowledge_reviews FOR SELECT USING (true);
CREATE POLICY "Knowledge conflicts can be viewed by workspace members" ON knowledge_conflicts FOR SELECT USING (true);
