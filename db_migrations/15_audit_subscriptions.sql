-- ZoikoVertex Audit Trail Streaming & Subscriptions
-- Section 18: Real-time event subscriptions via SSE and webhooks

CREATE TABLE IF NOT EXISTS public.audit_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('sse', 'webhook', 'siem')),
  endpoint_url TEXT,
  secret TEXT,
  event_filters JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'DISABLED')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_delivery_at TIMESTAMP WITH TIME ZONE,
  delivery_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audit_subscriptions_workspace ON public.audit_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_subscriptions_status ON public.audit_subscriptions(status);

ALTER TABLE public.audit_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions in their workspace"
ON public.audit_subscriptions FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
);

CREATE POLICY "Admins can manage subscriptions in their workspace"
ON public.audit_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.workspace_id = audit_subscriptions.workspace_id
    AND workspace_members.role IN ('ADMIN', 'WORKSPACE_OWNER')
  )
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
);

SELECT 'Audit subscriptions migration applied successfully!' as status;
