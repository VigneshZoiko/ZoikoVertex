-- 1. Create the Safety Signals Table
CREATE TABLE IF NOT EXISTS public.agent_safety_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id VARCHAR(50) UNIQUE NOT NULL,
  tenant_id VARCHAR(50) DEFAULT 'TEN-001' NOT NULL,
  workspace_id UUID NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_event_id VARCHAR(100),
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  source_health_state VARCHAR(20) DEFAULT 'healthy' NOT NULL,
  primary_domain VARCHAR(50) DEFAULT 'Brand' NOT NULL,
  secondary_domains TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  severity VARCHAR(20) DEFAULT 'Low' NOT NULL,
  severity_score INT DEFAULT 0 NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 1.000 NOT NULL,
  reason_codes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  classified_by UUID REFERENCES public.users(id),
  classified_at TIMESTAMP WITH TIME ZONE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Needs Classification' NOT NULL,
  linked_objects JSONB DEFAULT '{}'::JSONB NOT NULL,
  routing_destination VARCHAR(50),
  routing_reason TEXT,
  routed_at TIMESTAMP WITH TIME ZONE,
  sla_due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Safety Actions / Audit Trail Table
CREATE TABLE IF NOT EXISTS public.agent_safety_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES public.agent_safety_signals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id),
  actor_role VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  prior_state JSONB DEFAULT '{}'::JSONB NOT NULL,
  new_state JSONB DEFAULT '{}'::JSONB NOT NULL,
  audit_event_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_safety_signals_workspace ON public.agent_safety_signals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_safety_signals_status ON public.agent_safety_signals(status);
CREATE INDEX IF NOT EXISTS idx_safety_actions_signal ON public.agent_safety_actions(signal_id);
