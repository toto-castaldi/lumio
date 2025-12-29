-- Lumio Phase 2: Initial Schema
-- Creates enum types, helper functions, and core tables for authentication and API keys

-- ============================================
-- ENUM TYPES
-- ============================================

-- LLM Provider types
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic');

-- Sync status for repositories
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'error');

-- Platform types
CREATE TYPE platform AS ENUM ('web', 'mobile');

-- Quality rating for AI-generated questions (-2 to +2)
CREATE TYPE quality_rating AS ENUM ('-2', '-1', '0', '1', '2');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends auth.users with profile data)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookup
CREATE INDEX idx_users_email ON users(email);

-- Trigger for updated_at
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User API Keys table (encrypted LLM API keys)
CREATE TABLE public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider llm_provider NOT NULL,
    encrypted_key TEXT NOT NULL,  -- Encrypted with AES-256
    is_valid BOOLEAN DEFAULT TRUE,
    is_preferred BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each user can only have one key per provider
    UNIQUE(user_id, provider)
);

-- Index for user lookup
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Trigger for updated_at
CREATE TRIGGER set_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE user_api_keys IS 'Encrypted LLM API keys for each user';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'API key encrypted with AES-256-GCM';
COMMENT ON COLUMN user_api_keys.is_preferred IS 'If true, this provider is used by default for question generation';
