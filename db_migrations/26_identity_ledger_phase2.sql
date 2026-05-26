-- Migration: 26_identity_ledger_phase2.sql
-- Description: Creates identity_delegations, identity_break_glass_sessions and inserts new event types for Evidence Layer Phase 2.

-- 1. Create identity_delegations table
CREATE TABLE IF NOT EXISTS public.identity_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id UUID NOT NULL, -- User/Actor delegating authority
    delegatee_id UUID NOT NULL, -- User/Actor receiving authority
    tenant_id UUID NOT NULL,
    scope JSONB DEFAULT '{}'::jsonb, -- e.g. {"workspace_ids": [...], "roles": [...]}
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, EXPIRED
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID
);

-- Index for querying active delegations
CREATE INDEX idx_identity_delegations_active ON public.identity_delegations(delegatee_id, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_identity_delegations_tenant ON public.identity_delegations(tenant_id);

-- 2. Create identity_break_glass_sessions table
CREATE TABLE IF NOT EXISTS public.identity_break_glass_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ENDED, REVIEWED
    elevated_roles JSONB DEFAULT '[]'::jsonb, -- Roles granted during break-glass
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    review_status VARCHAR(50) DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, APPROVED, FLAGGED
    review_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying break-glass sessions
CREATE INDEX idx_break_glass_sessions_actor ON public.identity_break_glass_sessions(actor_id, status);
CREATE INDEX idx_break_glass_sessions_tenant ON public.identity_break_glass_sessions(tenant_id);

-- 3. Insert new Event Types into event_type_registry
INSERT INTO public.event_type_registry (event_type, category, display_title, description, default_risk_level, default_retention_class) VALUES
    ('delegation.created', 'user_identity', 'Delegation Created', 'A new identity delegation was created.', 'low', 'STANDARD'),
    ('delegation.revoked', 'user_identity', 'Delegation Revoked', 'An identity delegation was explicitly revoked.', 'medium', 'STANDARD'),
    ('delegation.expired', 'user_identity', 'Delegation Expired', 'An identity delegation expired automatically.', 'low', 'STANDARD'),
    ('breakglass.requested', 'system_security', 'Break-Glass Requested', 'A break-glass emergency session was requested.', 'high', 'EXTENDED'),
    ('breakglass.activated', 'system_security', 'Break-Glass Activated', 'A break-glass emergency session became active.', 'critical', 'EXTENDED'),
    ('breakglass.ended', 'system_security', 'Break-Glass Ended', 'A break-glass emergency session was ended.', 'medium', 'EXTENDED'),
    ('breakglass.reviewed', 'system_security', 'Break-Glass Reviewed', 'A break-glass session after-action review was completed.', 'low', 'EXTENDED'),
    ('identity.risk_flagged', 'system_security', 'Identity Risk Flagged', 'An identity risk flag was raised.', 'high', 'EXTENDED')
ON CONFLICT (event_type) DO NOTHING;

-- 4. Set up RLS (Row Level Security)
ALTER TABLE public.identity_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_break_glass_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for delegations" ON public.identity_delegations
    FOR ALL
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "Tenant isolation for break_glass_sessions" ON public.identity_break_glass_sessions
    FOR ALL
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
