-- Lumio Phase 4: Study Preferences
-- Stores user-customizable prompts for AI quiz generation

-- ============================================
-- TABLES
-- ============================================

-- User Study Preferences table
CREATE TABLE public.user_study_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_user_study_preferences_updated_at
    BEFORE UPDATE ON user_study_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE user_study_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own study preferences"
    ON user_study_preferences FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own study preferences"
    ON user_study_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own study preferences"
    ON user_study_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own study preferences"
    ON user_study_preferences FOR DELETE
    USING (auth.uid() = user_id);
