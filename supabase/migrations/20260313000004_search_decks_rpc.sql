-- =============================================================================
-- Migration: search_decks RPC for deck discovery
-- Phase 41, Plan 02: Database Foundation
--
-- Provides fulltext search across deck_index with weighted ranking,
-- tag filtering, and computed card_count. This is the core API for
-- the mobile discovery UI (Phase 44).
--
-- Uses websearch_to_tsquery for Google-style search syntax support.
-- Uses 'simple' config for multilingual deck name matching (no stemming).
-- Card count is computed at query time via correlated subquery (not stored).
-- =============================================================================

CREATE OR REPLACE FUNCTION search_decks(
    p_query TEXT DEFAULT NULL,
    p_tag TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    repository_id UUID,
    subfolder_path TEXT,
    display_name TEXT,
    description TEXT,
    tags TEXT[],
    author TEXT,
    language TEXT,
    card_count BIGINT,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_tsquery tsquery;
BEGIN
    -- Verify caller is authenticated (fail loudly per project rules)
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated: search_decks requires a valid session';
    END IF;

    -- Build tsquery once if query provided
    IF p_query IS NOT NULL AND p_query != '' THEN
        v_tsquery := websearch_to_tsquery('simple', p_query);
    END IF;

    RETURN QUERY
    SELECT
        di.id,
        di.repository_id,
        di.subfolder_path,
        di.display_name,
        di.description,
        di.tags,
        di.author,
        di.language,
        (SELECT COUNT(*) FROM cards c
         WHERE c.repository_id = di.repository_id
         AND c.file_path LIKE di.subfolder_path || '%'
         AND c.is_active = TRUE) AS card_count,
        CASE
            WHEN v_tsquery IS NOT NULL THEN ts_rank_cd(di.search_vector, v_tsquery)
            ELSE 0.0::REAL
        END AS rank
    FROM deck_index di
    WHERE
        -- Fulltext filter (when query provided)
        (v_tsquery IS NULL OR di.search_vector @@ v_tsquery)
        -- Tag filter (when tag provided)
        AND (p_tag IS NULL OR p_tag = '' OR di.tags @> ARRAY[p_tag])
    ORDER BY
        CASE WHEN v_tsquery IS NOT NULL THEN ts_rank_cd(di.search_vector, v_tsquery) END DESC NULLS LAST,
        di.display_name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_decks IS 'Searches deck_index for deck discovery. Parameters: p_query (fulltext search using websearch_to_tsquery with simple config), p_tag (exact tag match using array containment), p_limit (default 20), p_offset (default 0). Returns ranked results with card_count computed at query time. When both p_query and p_tag are provided, both filters apply (AND logic). When neither is provided, returns all decks ordered by display_name.';
