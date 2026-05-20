-- 1. Create the Legal Holds Table
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL,
  object_type VARCHAR(50) DEFAULT 'PUBLISH_INTENT',
  matter_ref VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL REFERENCES public.users(id),
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Evidence Packs Table
CREATE TABLE IF NOT EXISTS public.evidence_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose VARCHAR(50) NOT NULL,
  scope_description TEXT NOT NULL,
  format VARCHAR(10) DEFAULT 'JSON',
  status VARCHAR(20) DEFAULT 'READY',
  artifact_count INT DEFAULT 0,
  requester_id UUID NOT NULL REFERENCES public.users(id),
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  export_hash VARCHAR(255) NOT NULL
);

-- 3. Solve the Agent Identity Blocker (Add agent_id to publish_intents)
ALTER TABLE public.publish_intents 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id);
