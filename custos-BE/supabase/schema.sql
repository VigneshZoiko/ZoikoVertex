CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

-- Users Table
CREATE TABLE IF NOT EXISTS custos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    session_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    user_email TEXT NOT NULL,
    user_name TEXT DEFAULT '',
    company TEXT DEFAULT '',
    employee_id TEXT DEFAULT '',
    title TEXT NOT NULL DEFAULT 'New conversation',
    preview TEXT DEFAULT '',
    message_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Email Rate Limits Table
CREATE TABLE IF NOT EXISTS email_rate_limits (
    key TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 1,
    expire TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- New Prompts Table
CREATE TABLE IF NOT EXISTS new_prompts (
    prompt TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custos_users_email
    ON custos_users (email);

CREATE INDEX IF NOT EXISTS idx_conversations_user_email
    ON conversations (user_email);

CREATE INDEX IF NOT EXISTS idx_conversations_expires_at
    ON conversations (expires_at);

CREATE INDEX IF NOT EXISTS idx_chats_session_id
    ON chats (session_id);

CREATE INDEX IF NOT EXISTS idx_chats_created_at
    ON chats (created_at);

-- Triggers

DROP TRIGGER IF EXISTS trg_custos_users_updated_at ON custos_users;
CREATE TRIGGER trg_custos_users_updated_at
BEFORE UPDATE ON custos_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_chats_updated_at ON chats;
CREATE TRIGGER trg_chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_email_rate_limits_updated_at ON email_rate_limits;
CREATE TRIGGER trg_email_rate_limits_updated_at
BEFORE UPDATE ON email_rate_limits
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();