-- =============================================================================
-- Migration: Session-aware due count in get_due_card_count
-- Phase 33: Dashboard Counter Auto Label
--
-- Adds p_limit parameter to get_due_card_count.
-- When p_limit IS NULL: returns full count (v_due_count + v_new_count) -- unchanged behavior.
-- When p_limit IS NOT NULL: returns LEAST(total, p_limit) -- capped at session limit.
-- =============================================================================

-- Drop the old signature (UUID, TEXT) from Phase 26 migration
DROP FUNCTION get_due_card_count(UUID, TEXT);

-- Re-create with p_limit DEFAULT NULL for session-aware counting
CREATE OR REPLACE FUNCTION get_due_card_count(
    p_user_id UUID,
    p_limit INTEGER DEFAULT NULL,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE;
    v_due_count INTEGER;
    v_new_count INTEGER;
    v_total INTEGER;
BEGIN
    -- Compute today in the user's timezone, fallback to UTC on invalid tz
    BEGIN
        v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_today := CURRENT_DATE;
    END;

    -- Count 1: Cards with a schedule row that are due today or overdue
    SELECT COUNT(*)::INTEGER INTO v_due_count
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id
                              AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND (crs.next_review_at AT TIME ZONE p_timezone)::DATE <= v_today;

    -- Count 2: Cards with active questions but NO schedule row (never reviewed)
    SELECT COUNT(*)::INTEGER INTO v_new_count
    FROM (
        SELECT c.id
        FROM cards c
        JOIN user_repositories ur ON ur.repository_id = c.repository_id
                                  AND ur.user_id = p_user_id
        JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
        LEFT JOIN card_review_schedule crs ON crs.card_id = c.id
                                           AND crs.user_id = p_user_id
        WHERE c.is_active = TRUE
          AND crs.id IS NULL
        GROUP BY c.id
        HAVING COUNT(cq.id) > 0
    ) new_cards;

    v_total := COALESCE(v_due_count, 0) + COALESCE(v_new_count, 0);

    -- When limit is set, cap at the limit (but never exceed actual available)
    IF p_limit IS NULL THEN
        RETURN v_total;
    ELSE
        RETURN LEAST(v_total, p_limit);
    END IF;
END;
$$;

COMMENT ON FUNCTION get_due_card_count IS 'Returns count of cards due for review today (timezone-aware) PLUS never-reviewed cards with active questions. When p_limit is NULL, returns full count. When p_limit is set, returns LEAST(total, p_limit) to reflect session-capped count.';
