-- =============================================================================
-- Migration: search_decks prefix matching
-- Phase 44: Mobile Discovery
--
-- Fix: websearch_to_tsquery matches only complete tokens, so typing "ita"
-- does not find "italian". Switch to prefix matching (`:*`) on the last
-- word so search-as-you-type works naturally.
--
-- Strategy: split query into words, join all but last with `&`, append `:*`
-- to the last word. Example: "react des" → 'react' & 'des':*
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
    v_words TEXT[];
    v_prefix_query TEXT;
BEGIN
    -- Verify caller is authenticated (fail loudly per project rules)
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated: search_decks requires a valid session';
    END IF;

    -- Build tsquery with prefix matching on last word for search-as-you-type
    IF p_query IS NOT NULL AND trim(p_query) != '' THEN
        v_words := string_to_array(trim(regexp_replace(p_query, '\s+', ' ', 'g')), ' ');

        IF array_length(v_words, 1) = 1 THEN
            -- Single word: prefix match
            v_prefix_query := quote_literal(v_words[1]) || ':*';
        ELSE
            -- Multiple words: exact match on all but last, prefix on last
            v_prefix_query := '';
            FOR i IN 1..array_length(v_words, 1) - 1 LOOP
                IF i > 1 THEN
                    v_prefix_query := v_prefix_query || ' & ';
                END IF;
                v_prefix_query := v_prefix_query || quote_literal(v_words[i]);
            END LOOP;
            v_prefix_query := v_prefix_query || ' & ' || quote_literal(v_words[array_length(v_words, 1)]) || ':*';
        END IF;

        v_tsquery := to_tsquery('simple', v_prefix_query);
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

COMMENT ON FUNCTION search_decks IS 'Searches deck_index for deck discovery with prefix matching. Parameters: p_query (prefix-aware fulltext search — last word gets :* for search-as-you-type), p_tag (exact tag match using array containment), p_limit (default 20), p_offset (default 0). Returns ranked results with card_count computed at query time. When both p_query and p_tag are provided, both filters apply (AND logic). When neither is provided, returns all decks ordered by display_name.';
