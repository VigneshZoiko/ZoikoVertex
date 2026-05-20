-- 1. Add metadata column to agents table to store boundaries
ALTER TABLE agents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Create execution_logs table for auditing AI actions
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    status          TEXT NOT NULL, -- 'SUCCESS', 'BLOCKED', 'FAILED'
    latency_ms      INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_agent ON agent_execution_logs(agent_id, created_at DESC);
