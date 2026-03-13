-- Migration: Add subfolder_path to user_repositories
-- Phase 41 Plan 01 Task 2
-- Provides: subfolder_path column on user_repositories with updated UNIQUE constraint

-- Step 1: Add subfolder_path column
-- NULL = whole-repo subscription (existing behavior preserved)
-- Non-NULL = subfolder subscription, always stored WITH trailing '/' (e.g. 'italian-vocabulary/')
ALTER TABLE public.user_repositories
    ADD COLUMN IF NOT EXISTS subfolder_path TEXT;

-- Step 2: Drop the old UNIQUE constraint
-- The old constraint was UNIQUE(user_id, repository_id) which does not account for subfolder
ALTER TABLE public.user_repositories
    DROP CONSTRAINT IF EXISTS user_repositories_user_id_repository_id_key;

-- Step 3: Create new UNIQUE index handling NULL correctly
-- Uses COALESCE to treat NULL as empty string for uniqueness,
-- preventing duplicate NULL subfolder_path rows for the same user+repo
-- while still allowing one NULL row and one or more non-NULL rows per user+repo pair
CREATE UNIQUE INDEX idx_user_repos_unique
    ON public.user_repositories(user_id, repository_id, COALESCE(subfolder_path, ''));

-- Comment
COMMENT ON COLUMN public.user_repositories.subfolder_path IS
    'Optional subfolder within a shared repo. NULL = whole repo subscription. Non-NULL = specific deck subfolder (always stored with trailing slash, e.g. ''italian-vocabulary/'').';
