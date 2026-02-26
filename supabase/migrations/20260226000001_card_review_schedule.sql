-- =============================================================================
-- Migration: card_review_schedule
-- Phase 23: Spaced Repetition - SRS Schema & Algorithm
-- Creates the per-user per-card SRS scheduling table, indexes, RLS policies,
-- and two SECURITY DEFINER RPCs for due-card counting and session loading.
-- =============================================================================

-- SECTION 1: Table
CREATE TABLE public.card_review_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- SM-2 algorithm state
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,

    -- Scheduling (TIMESTAMPTZ per user decision, cast to DATE for comparison)
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,

    -- Stale content detection (SRS-06)
    -- Snapshots cards.content_hash at upsert time; compared at session load
    content_hash_snapshot TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One schedule per user per card
    UNIQUE(user_id, card_id)
);

-- SECTION 2: Indexes

-- Primary query index: find due cards for a user
CREATE INDEX idx_crs_user_due
    ON card_review_schedule(user_id, next_review_at);

-- Lookup by user+card (for upsert in Phase 24)
CREATE INDEX idx_crs_user_card
    ON card_review_schedule(user_id, card_id);

-- SECTION 3: updated_at trigger (reuse existing function)
CREATE TRIGGER set_card_review_schedule_updated_at
    BEFORE UPDATE ON card_review_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SECTION 4: RLS policies
-- Use (select auth.uid()) pattern for performance (single evaluation per query)
ALTER TABLE card_review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review schedule"
    ON card_review_schedule FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own review schedule"
    ON card_review_schedule FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own review schedule"
    ON card_review_schedule FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own review schedule"
    ON card_review_schedule FOR DELETE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage card_review_schedule"
    ON card_review_schedule FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- SECTION 5: get_due_card_count RPC
-- Returns count of cards due for review today (next_review_at::date <= CURRENT_DATE)
-- Returns 0 for users with no review history (COALESCE handles NULL)
CREATE OR REPLACE FUNCTION get_due_card_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id
                              AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND crs.next_review_at::date <= CURRENT_DATE;

    RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION get_due_card_count IS 'Returns count of cards due for review today (next_review_at::date <= CURRENT_DATE)';

-- SECTION 6: get_study_cards_for_session RPC
-- Returns priority-ordered cards for a study session:
-- 1. Deletes stale schedule rows (content changed since last review) -- SRS-06
-- 2. Returns all overdue cards ordered by next_review_at ASC (most overdue first) -- SRS-04
-- 3. Fills remaining slots with new cards (no schedule row) in random order
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
    repetitions INTEGER
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
            crs.repetitions
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
                 crs.next_review_at
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
            0 AS repetitions
        FROM cards c
        JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                  AND ur.user_id = p_user_id
        JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
        LEFT JOIN card_review_schedule crs ON crs.card_id = c.id
                                           AND crs.user_id = p_user_id
        WHERE c.is_active = TRUE
          AND crs.id IS NULL  -- no review schedule = never reviewed
        GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content,
                 c.raw_content, c.tags, c.difficulty
        HAVING COUNT(cq.id) > 0
        ORDER BY RANDOM()
        LIMIT GREATEST(0, p_limit - v_due_count)
    );
END;
$$;

COMMENT ON FUNCTION get_study_cards_for_session IS 'Returns study cards: overdue first (all, bypass cap, SRS-04), then new cards up to limit. Deletes stale SRS records (SRS-06).';

-- SECTION 7: Table comments
COMMENT ON TABLE card_review_schedule IS 'Per-user per-card SRS scheduling state. Phase 23: Spaced Repetition.';
COMMENT ON COLUMN card_review_schedule.ease_factor IS 'SM-2 ease factor. Initial 2.5, floor 1.3, ceiling 2.5.';
COMMENT ON COLUMN card_review_schedule.interval_days IS 'Days until next review. Max 365.';
COMMENT ON COLUMN card_review_schedule.next_review_at IS 'TIMESTAMPTZ for scheduling. Due check: next_review_at::date <= CURRENT_DATE.';
COMMENT ON COLUMN card_review_schedule.content_hash_snapshot IS 'Snapshot of cards.content_hash at last review. Mismatch triggers SRS reset.';
