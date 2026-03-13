-- Migration: Add is_platform column and seed lumio-decks platform repository
-- Phase 41 Plan 01 Task 2
-- Provides: is_platform column on repositories, lumio-decks seed row

-- Step 1: Add is_platform column to repositories
-- Explicit flag to identify platform-level repos (not owned by any user)
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Seed the lumio-decks platform repository
-- ON CONFLICT DO UPDATE ensures existing row gets the is_platform flag
INSERT INTO public.repositories (url, name, is_private, format_version, sync_status, is_platform)
VALUES ('https://github.com/toto-castaldi/lumio-decks', 'lumio-decks', FALSE, 1, 'pending', TRUE)
ON CONFLICT (url) DO UPDATE SET is_platform = TRUE;

-- Comment
COMMENT ON COLUMN public.repositories.is_platform IS
    'TRUE for platform-level repositories (e.g. lumio-decks). Platform repos are not owned by any user. Users discover decks within them via the deck_index search and subscribe to individual subfolders.';

-- NOTE: No RLS policy changes needed on repositories table.
-- The existing "Users can view subscribed repositories" policy correctly handles this:
-- platform repos only become visible when a user subscribes to a subfolder within them
-- (creates a user_repositories row). This is the desired behavior.
