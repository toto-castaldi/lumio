-- =============================================================================
-- Migration: top_decks RPC for landing page leaderboard
-- Phase 50, Plan 01: Popular Decks Leaderboard
--
-- Returns the top 10 decks ordered by subscriber count.
-- Public (anon-accessible) for landing page leaderboard display.
-- Uses SECURITY DEFINER to bypass deck_index and user_repositories RLS.
--
-- This is the first public (anon-accessible) RPC in the project.
-- No auth.uid() check — designed for unauthenticated visitors.
-- =============================================================================

CREATE OR REPLACE FUNCTION top_decks()
RETURNS TABLE (
    display_name TEXT,
    subscriber_count BIGINT,
    tags TEXT[],
    language TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        di.display_name,
        COUNT(DISTINCT ur.user_id) AS subscriber_count,
        di.tags,
        di.language
    FROM public.deck_index di
    JOIN public.user_repositories ur
        ON ur.repository_id = di.repository_id
        AND (ur.subfolder_path = di.subfolder_path OR ur.subfolder_path IS NULL)
    GROUP BY di.id, di.display_name, di.tags, di.language
    HAVING COUNT(DISTINCT ur.user_id) > 0
    ORDER BY subscriber_count DESC, di.display_name ASC
    LIMIT 10;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION top_decks() TO anon;
GRANT EXECUTE ON FUNCTION top_decks() TO authenticated;

-- Documentation
COMMENT ON FUNCTION top_decks IS 'Returns the top 10 decks ordered by subscriber count. Public (anon-accessible) for landing page leaderboard. Uses SECURITY DEFINER to bypass deck_index RLS.';
