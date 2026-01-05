-- Drop user_study_preferences table
-- Part of Phase 10: Centralize AI API Keys
-- Provider, model and prompt are now platform-level configuration

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view own study preferences" ON user_study_preferences;
DROP POLICY IF EXISTS "Users can insert own study preferences" ON user_study_preferences;
DROP POLICY IF EXISTS "Users can update own study preferences" ON user_study_preferences;
DROP POLICY IF EXISTS "Users can delete own study preferences" ON user_study_preferences;

-- Drop trigger
DROP TRIGGER IF EXISTS set_user_study_preferences_updated_at ON user_study_preferences;

-- Drop the table
DROP TABLE IF EXISTS public.user_study_preferences;
