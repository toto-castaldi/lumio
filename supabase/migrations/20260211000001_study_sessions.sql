-- Study Sessions table for tracking completed study sessions
-- Part of Phase 15: Study Stats

-- ============================================
-- CREATE TABLE
-- ============================================

CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_name TEXT,  -- NULL = all repositories (current behavior)
    correct_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_completed_at ON study_sessions(completed_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own study sessions
CREATE POLICY "Users can view own study sessions"
    ON study_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own study sessions
CREATE POLICY "Users can insert own study sessions"
    ON study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies: study sessions are immutable history

-- ============================================
-- PLATFORM CONFIG: study_history_limit
-- ============================================

INSERT INTO platform_config (key, value) VALUES
    ('study_history_limit', '10');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE study_sessions IS 'Immutable log of completed study sessions';
COMMENT ON COLUMN study_sessions.repository_name IS 'Display name of the studied repo, NULL = all repositories';
COMMENT ON COLUMN study_sessions.duration_seconds IS 'Total session duration in seconds';
