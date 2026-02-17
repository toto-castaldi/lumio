-- Lumio Phase 17: Sync Failure Backend
-- Adds sync failure tracking columns to repositories table
-- Enables the docora-webhook to store sync failure details and auto-recover
--
-- Changes:
-- 1. Add 'failed' value to sync_status enum
-- 2. Add sync_error_type, is_auth_error, sync_failed_at columns
-- 3. Add comments on new columns

-- ============================================
-- ADD 'failed' TO sync_status ENUM
-- ============================================

-- PostgreSQL allows ALTER TYPE ADD VALUE IF NOT EXISTS outside explicit transactions.
-- Supabase migrations detect this pattern and run appropriately.
ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'failed';

-- ============================================
-- ADD SYNC FAILURE COLUMNS
-- ============================================

-- Raw error type string from Docora (e.g., "auth_error", "rate_limit", "network_error")
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS sync_error_type TEXT;

-- Boolean flag for quick auth error detection (used by Phase 19 token update UI)
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS is_auth_error BOOLEAN NOT NULL DEFAULT FALSE;

-- Timestamp of when the sync failure occurred
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS sync_failed_at TIMESTAMPTZ;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.repositories.sync_error_type IS
    'Docora raw error_type string from sync_failed webhook (e.g., auth_error, rate_limit, network_error)';

COMMENT ON COLUMN public.repositories.is_auth_error IS
    'Whether the sync failure is an authentication error, computed by webhook handler for Phase 19 token update UI';

COMMENT ON COLUMN public.repositories.sync_failed_at IS
    'Timestamp when the sync failure was recorded, set by sync_failed webhook handler';
