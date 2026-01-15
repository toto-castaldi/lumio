-- Lumio Phase 11: Docora Integration
-- Migrates from PULL model (Lumio fetches from GitHub) to PUSH model (Docora sends webhooks)
--
-- Changes:
-- 1. Add docora_repository_id to link Lumio repos with Docora
-- 2. Remove obsolete columns (PAT now goes to Docora, not stored in Lumio)
-- 3. Create webhook_chunks table for handling large file transfers

-- ============================================
-- ADD DOCORA REPOSITORY ID
-- ============================================

-- Add column to link Lumio repository with Docora's repository_id
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS docora_repository_id TEXT;

-- Index for webhook lookups (Docora sends repository_id in payload)
CREATE INDEX IF NOT EXISTS idx_repositories_docora_repository_id
    ON public.repositories(docora_repository_id);

-- Each docora_repository_id should be unique per user (prevent duplicates)
-- Note: docora_repository_id can be NULL for repos not yet synced with Docora
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_docora_repo'
    ) THEN
        ALTER TABLE public.repositories
            ADD CONSTRAINT unique_user_docora_repo
            UNIQUE (user_id, docora_repository_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraint already exists
END $$;

-- ============================================
-- REMOVE OBSOLETE COLUMNS (PAT now goes to Docora)
-- ============================================

-- encrypted_access_token: PAT is now sent to Docora, not stored in Lumio
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS encrypted_access_token;

-- token_status: Docora handles token validation
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS token_status;

-- token_error_message: Docora handles token errors
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS token_error_message;

-- last_commit_sha: Docora tracks commits
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS last_commit_sha;

-- last_synced_at: Webhooks are real-time, no scheduled sync
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS last_synced_at;

-- Drop the token_status index (references dropped column)
DROP INDEX IF EXISTS idx_repositories_token_status;

-- Drop the token_status enum type (no longer used)
DROP TYPE IF EXISTS token_status;

-- ============================================
-- WEBHOOK CHUNKS TABLE (for large files >1MB)
-- ============================================

-- Docora sends files >1MB in 512KB chunks
-- This table stores partial chunks until all parts arrive
CREATE TABLE IF NOT EXISTS public.webhook_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Docora's chunk identifier (groups chunks belonging to same file)
    chunk_id TEXT NOT NULL,

    -- Which repository this chunk belongs to
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,

    -- File path in repository
    file_path TEXT NOT NULL,

    -- Chunk position (0-indexed)
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),

    -- Total number of chunks for this file
    total_chunks INTEGER NOT NULL CHECK (total_chunks > 0),

    -- Base64 encoded chunk content
    content TEXT NOT NULL,

    -- When this chunk was received (for cleanup of stale chunks)
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each chunk can only be stored once
    UNIQUE(chunk_id, chunk_index)
);

-- Index for quick chunk assembly (find all chunks for a chunk_id)
CREATE INDEX IF NOT EXISTS idx_webhook_chunks_chunk_id
    ON public.webhook_chunks(chunk_id);

-- Index for cleanup job (find stale chunks)
CREATE INDEX IF NOT EXISTS idx_webhook_chunks_received_at
    ON public.webhook_chunks(received_at);

-- ============================================
-- ROW LEVEL SECURITY for webhook_chunks
-- ============================================

ALTER TABLE public.webhook_chunks ENABLE ROW LEVEL SECURITY;

-- Service role can manage all chunks (for docora-webhook Edge Function)
CREATE POLICY "Service role can manage chunks"
    ON public.webhook_chunks FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- Users can view chunks for their own repositories (for debugging)
CREATE POLICY "Users can view own chunks"
    ON public.webhook_chunks FOR SELECT
    USING (
        repository_id IN (
            SELECT id FROM public.repositories WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.repositories.docora_repository_id IS
    'Docora repository ID linking this Lumio repo to Docora monitoring service';

COMMENT ON TABLE public.webhook_chunks IS
    'Temporary storage for chunked file transfers from Docora (files >1MB are split into 512KB chunks)';

COMMENT ON COLUMN public.webhook_chunks.chunk_id IS
    'Docora-assigned UUID that groups all chunks belonging to the same file transfer';

COMMENT ON COLUMN public.webhook_chunks.content IS
    'Base64-encoded chunk content (max 512KB decoded)';

-- ============================================
-- RPC FUNCTIONS for card count management
-- ============================================

-- Increment card_count for a repository (used by docora-webhook on CREATE)
CREATE OR REPLACE FUNCTION public.increment_card_count(repo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.repositories
    SET card_count = card_count + 1,
        updated_at = NOW()
    WHERE id = repo_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repository % not found', repo_id;
    END IF;
END;
$$;

-- Decrement card_count for a repository (used by docora-webhook on DELETE)
CREATE OR REPLACE FUNCTION public.decrement_card_count(repo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.repositories
    SET card_count = GREATEST(0, card_count - 1),
        updated_at = NOW()
    WHERE id = repo_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repository % not found', repo_id;
    END IF;
END;
$$;

-- Grant execute to service role (for Edge Functions)
GRANT EXECUTE ON FUNCTION public.increment_card_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_card_count(UUID) TO service_role;

COMMENT ON FUNCTION public.increment_card_count IS
    'Atomically increments card_count for a repository (called by docora-webhook on card creation)';

COMMENT ON FUNCTION public.decrement_card_count IS
    'Atomically decrements card_count for a repository (called by docora-webhook on card deletion)';
