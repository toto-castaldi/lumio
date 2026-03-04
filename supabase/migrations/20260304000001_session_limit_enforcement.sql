-- =============================================================================
-- Migration: Session limit enforcement in get_study_cards_for_session
-- Phase 32: RPC Session Limit Enforcement
--
-- Changes p_limit DEFAULT from 10 to NULL (unlimited by default).
-- When p_limit IS NULL: returns ALL overdue + ALL new cards (Auto mode).
-- When p_limit IS NOT NULL: caps total to p_limit, overdue-first priority.
-- =============================================================================

-- Drop the old signature (UUID, INTEGER, TEXT) from previous migration
DROP FUNCTION get_study_cards_for_session(UUID, INTEGER, TEXT);

-- Re-create with p_limit DEFAULT NULL and total-cap enforcement
CREATE OR REPLACE FUNCTION get_study_cards_for_session(
    p_user_id UUID,
    p_limit INTEGER DEFAULT NULL,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS TABLE (
    card_id UUID,
    repository_id UUID,
    file_path TEXT,
    title TEXT,
    content TEXT,
    raw_content TEXT,
    tags TEXT[],
    difficulty INTEGER,
    question_count BIGINT,
    is_review BOOLEAN,
    ease_factor REAL,
    interval_days INTEGER,
    repetitions INTEGER,
    content_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE;
    v_due_count INTEGER;
    v_overdue_returned INTEGER;
BEGIN
    -- Compute today in the user's timezone, fallback to UTC on invalid tz
    BEGIN
        v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_today := CURRENT_DATE;
    END;

    -- Step 1: Delete stale schedule rows (SRS-06)
    -- When card content changes, the hash changes, and SRS state resets.
    -- The card then appears as "new" (no schedule row).
    DELETE FROM card_review_schedule crs_del
    USING cards c_del
    WHERE crs_del.card_id = c_del.id
      AND crs_del.user_id = p_user_id
      AND crs_del.content_hash_snapshot IS NOT NULL
      AND crs_del.content_hash_snapshot != c_del.content_hash;

    -- Step 2: Count overdue cards to compute new-card slots
    SELECT COUNT(*) INTO v_due_count FROM (
        SELECT c.id
        FROM card_review_schedule crs
        JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
        JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                  AND ur.user_id = p_user_id
        JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
        WHERE crs.user_id = p_user_id
          AND (crs.next_review_at AT TIME ZONE p_timezone)::DATE <= v_today
        GROUP BY c.id
        HAVING COUNT(cq.id) > 0
    ) due_cards;

    -- Step 3: Return cards with limit enforcement
    IF p_limit IS NULL THEN
        -- Auto/unlimited: return ALL overdue + ALL new cards
        RETURN QUERY
        -- Overdue cards: all of them, ordered most-overdue first
        (
            SELECT
                c.id AS card_id,
                c.repository_id,
                c.file_path,
                c.title,
                c.content,
                c.raw_content,
                c.tags,
                c.difficulty,
                COUNT(cq.id) AS question_count,
                TRUE AS is_review,
                crs.ease_factor,
                crs.interval_days,
                crs.repetitions,
                c.content_hash
            FROM card_review_schedule crs
            JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
            JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                      AND ur.user_id = p_user_id
            JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
            WHERE crs.user_id = p_user_id
              AND (crs.next_review_at AT TIME ZONE p_timezone)::DATE <= v_today
            GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                     c.raw_content, c.tags, c.difficulty,
                     crs.ease_factor, crs.interval_days, crs.repetitions,
                     crs.next_review_at, c.content_hash
            HAVING COUNT(cq.id) > 0
            ORDER BY crs.next_review_at ASC
        )

        UNION ALL

        -- New cards: all of them (no limit)
        (
            SELECT
                c.id AS card_id,
                c.repository_id,
                c.file_path,
                c.title,
                c.content,
                c.raw_content,
                c.tags,
                c.difficulty,
                COUNT(cq.id) AS question_count,
                FALSE AS is_review,
                2.5::REAL AS ease_factor,
                0 AS interval_days,
                0 AS repetitions,
                c.content_hash
            FROM cards c
            JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                      AND ur.user_id = p_user_id
            JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
            LEFT JOIN card_review_schedule crs ON crs.card_id = c.id
                                               AND crs.user_id = p_user_id
            WHERE c.is_active = TRUE
              AND crs.id IS NULL
            GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                     c.raw_content, c.tags, c.difficulty, c.content_hash
            HAVING COUNT(cq.id) > 0
            ORDER BY RANDOM()
        );
    ELSE
        -- Capped: total cards <= p_limit, overdue-first priority
        v_overdue_returned := LEAST(v_due_count, p_limit);

        RETURN QUERY
        -- Overdue cards: capped at p_limit, ordered most-overdue first
        (
            SELECT
                c.id AS card_id,
                c.repository_id,
                c.file_path,
                c.title,
                c.content,
                c.raw_content,
                c.tags,
                c.difficulty,
                COUNT(cq.id) AS question_count,
                TRUE AS is_review,
                crs.ease_factor,
                crs.interval_days,
                crs.repetitions,
                c.content_hash
            FROM card_review_schedule crs
            JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
            JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                      AND ur.user_id = p_user_id
            JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
            WHERE crs.user_id = p_user_id
              AND (crs.next_review_at AT TIME ZONE p_timezone)::DATE <= v_today
            GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                     c.raw_content, c.tags, c.difficulty,
                     crs.ease_factor, crs.interval_days, crs.repetitions,
                     crs.next_review_at, c.content_hash
            HAVING COUNT(cq.id) > 0
            ORDER BY crs.next_review_at ASC
            LIMIT p_limit
        )

        UNION ALL

        -- New cards: fill remaining slots
        (
            SELECT
                c.id AS card_id,
                c.repository_id,
                c.file_path,
                c.title,
                c.content,
                c.raw_content,
                c.tags,
                c.difficulty,
                COUNT(cq.id) AS question_count,
                FALSE AS is_review,
                2.5::REAL AS ease_factor,
                0 AS interval_days,
                0 AS repetitions,
                c.content_hash
            FROM cards c
            JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                      AND ur.user_id = p_user_id
            JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
            LEFT JOIN card_review_schedule crs ON crs.card_id = c.id
                                               AND crs.user_id = p_user_id
            WHERE c.is_active = TRUE
              AND crs.id IS NULL
            GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                     c.raw_content, c.tags, c.difficulty, c.content_hash
            HAVING COUNT(cq.id) > 0
            ORDER BY RANDOM()
            LIMIT GREATEST(0, p_limit - v_overdue_returned)
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION get_study_cards_for_session IS 'Returns study cards for a session. When p_limit is NULL, returns all cards (unlimited). When p_limit is set, caps total to p_limit with overdue-first priority. Deletes stale SRS records (SRS-06). Returns content_hash for write-back snapshot.';
