-- =============================================================================
-- Migration: upsert_card_review RPC + get_study_cards_for_session content_hash
-- Phase 24: Study Session Integration
-- Creates the server-side SM-2 write-back RPC and updates the session RPC
-- to return content_hash for stale detection.
-- =============================================================================

-- SECTION 1: upsert_card_review RPC
-- Records a card review and updates SRS schedule server-side using SM-2 algorithm.
-- Performs an atomic UPSERT into card_review_schedule with computed SM-2 values.
CREATE OR REPLACE FUNCTION upsert_card_review(
    p_user_id UUID,
    p_card_id UUID,
    p_quality INTEGER,
    p_content_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_ef REAL;
    v_old_interval INTEGER;
    v_old_reps INTEGER;
    v_new_ef REAL;
    v_new_interval INTEGER;
    v_new_reps INTEGER;
BEGIN
    -- Validate quality grade (1-5 SM-2 range)
    IF p_quality < 0 OR p_quality > 5 THEN
        RAISE EXCEPTION 'Quality grade must be between 0 and 5, got %', p_quality;
    END IF;

    -- Read current SRS state (defaults if no row exists)
    SELECT
        COALESCE(crs.ease_factor, 2.5),
        COALESCE(crs.interval_days, 0),
        COALESCE(crs.repetitions, 0)
    INTO v_old_ef, v_old_interval, v_old_reps
    FROM card_review_schedule crs
    WHERE crs.user_id = p_user_id AND crs.card_id = p_card_id;

    -- If no row found, use defaults
    IF NOT FOUND THEN
        v_old_ef := 2.5;
        v_old_interval := 0;
        v_old_reps := 0;
    END IF;

    -- Compute new EF using SM-2 formula (always applied regardless of grade)
    v_new_ef := v_old_ef + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    -- Floor 1.3, ceiling 2.5
    v_new_ef := GREATEST(v_new_ef, 1.3);
    v_new_ef := LEAST(v_new_ef, 2.5);

    -- Compute new interval and repetitions
    IF p_quality < 3 THEN
        -- Failure: reset
        v_new_interval := 1;
        v_new_reps := 0;
    ELSE
        -- Success: advance
        IF v_old_reps = 0 THEN
            v_new_interval := 1;
        ELSIF v_old_reps = 1 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(v_old_interval * v_old_ef)::INTEGER;
        END IF;
        v_new_reps := v_old_reps + 1;
    END IF;

    -- Cap interval at 365 days
    v_new_interval := LEAST(v_new_interval, 365);

    -- Atomic UPSERT into card_review_schedule
    INSERT INTO card_review_schedule (
        user_id,
        card_id,
        ease_factor,
        interval_days,
        repetitions,
        next_review_at,
        last_reviewed_at,
        content_hash_snapshot
    )
    VALUES (
        p_user_id,
        p_card_id,
        v_new_ef,
        v_new_interval,
        v_new_reps,
        CURRENT_DATE + (v_new_interval || ' days')::INTERVAL,
        NOW(),
        p_content_hash
    )
    ON CONFLICT (user_id, card_id) DO UPDATE SET
        ease_factor = EXCLUDED.ease_factor,
        interval_days = EXCLUDED.interval_days,
        repetitions = EXCLUDED.repetitions,
        next_review_at = EXCLUDED.next_review_at,
        last_reviewed_at = EXCLUDED.last_reviewed_at,
        content_hash_snapshot = EXCLUDED.content_hash_snapshot;
END;
$$;

COMMENT ON FUNCTION upsert_card_review IS 'Records a card review with server-side SM-2 calculation. Upserts card_review_schedule atomically. Grade >= 3 advances interval via EF multiplication; grade < 3 resets to 1 day.';

-- SECTION 2: Update get_study_cards_for_session to return content_hash
-- PostgreSQL does not allow adding columns to RETURNS TABLE via CREATE OR REPLACE,
-- so we must DROP and re-create the function.
DROP FUNCTION get_study_cards_for_session(UUID, INTEGER);

-- Re-create with content_hash TEXT added to RETURNS TABLE
CREATE OR REPLACE FUNCTION get_study_cards_for_session(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
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
    v_due_count INTEGER;
BEGIN
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
          AND crs.next_review_at::date <= CURRENT_DATE
        GROUP BY c.id
        HAVING COUNT(cq.id) > 0
    ) due_cards;

    -- Step 3: Return overdue cards (all, bypass cap) UNION ALL new cards (fill remaining)
    RETURN QUERY
    -- Overdue cards: all of them, ordered most-overdue first (SRS-04)
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
          AND crs.next_review_at::date <= CURRENT_DATE
        GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                 c.raw_content, c.tags, c.difficulty,
                 crs.ease_factor, crs.interval_days, crs.repetitions,
                 crs.next_review_at, c.content_hash
        HAVING COUNT(cq.id) > 0
        ORDER BY crs.next_review_at ASC
    )

    UNION ALL

    -- New cards: fill remaining slots up to p_limit
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
          AND crs.id IS NULL  -- no review schedule = never reviewed
        GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                 c.raw_content, c.tags, c.difficulty, c.content_hash
        HAVING COUNT(cq.id) > 0
        ORDER BY RANDOM()
        LIMIT GREATEST(0, p_limit - v_due_count)
    );
END;
$$;

COMMENT ON FUNCTION get_study_cards_for_session IS 'Returns study cards: overdue first (all, bypass cap, SRS-04), then new cards up to limit. Deletes stale SRS records (SRS-06). Returns content_hash for write-back snapshot.';
