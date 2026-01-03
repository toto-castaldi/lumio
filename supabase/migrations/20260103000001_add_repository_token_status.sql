-- Lumio Phase 9: Private Repository Support
-- Adds token status tracking for private GitHub repositories

-- ============================================
-- ENUM TYPES
-- ============================================

-- Token status enum for tracking PAT validity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'token_status') THEN
        CREATE TYPE token_status AS ENUM ('valid', 'invalid', 'not_required');
    END IF;
END
$$;

-- ============================================
-- ALTER TABLE: repositories
-- ============================================

-- Add token_status column (default 'not_required' for public repos)
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS token_status token_status DEFAULT 'not_required';

-- Add token_error_message column for storing error details when token is invalid
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS token_error_message TEXT;

-- ============================================
-- INDEXES
-- ============================================

-- Index for efficient filtering by token status (e.g., find all repos with invalid tokens)
CREATE INDEX IF NOT EXISTS idx_repositories_token_status
    ON public.repositories(token_status);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.repositories.token_status IS
    'Status of the GitHub PAT: valid (working), invalid (expired/revoked), not_required (public repo)';

COMMENT ON COLUMN public.repositories.token_error_message IS
    'Error message from GitHub when token validation fails (e.g., "Bad credentials", "Token expired")';
