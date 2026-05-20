-- Migration: 12_data_connectors.sql
-- Create Data Connectors and Sync Logs schema with RLS

CREATE TABLE IF NOT EXISTS public.data_connectors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL, -- 'SUPABASE_TABLE' | 'REST_API'
  connection_config   JSONB NOT NULL DEFAULT '{}',
  mapping_config      JSONB NOT NULL DEFAULT '{}',
  sync_schedule       TEXT NOT NULL DEFAULT 'manual',
  status              TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'INACTIVE' | 'SYNCING'
  last_sync_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.connector_sync_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id        UUID NOT NULL REFERENCES public.data_connectors(id) ON DELETE CASCADE,
  status              TEXT NOT NULL, -- 'SUCCESS' | 'FAILED'
  records_synced      INTEGER NOT NULL DEFAULT 0,
  error_message       TEXT,
  duration_ms         INTEGER NOT NULL DEFAULT 0,
  logs                JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies for data_connectors
DROP POLICY IF EXISTS data_connectors_all_policy ON public.data_connectors;
CREATE POLICY data_connectors_all_policy ON public.data_connectors
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Create Policies for connector_sync_logs
DROP POLICY IF EXISTS connector_sync_logs_all_policy ON public.connector_sync_logs;
CREATE POLICY connector_sync_logs_all_policy ON public.connector_sync_logs
FOR ALL
TO authenticated
USING (
  connector_id IN (
    SELECT id FROM public.data_connectors WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);
