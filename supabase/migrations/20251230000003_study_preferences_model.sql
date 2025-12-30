-- Lumio Phase 5: Study Preferences - Model Selection
-- Adds preferred provider and model columns for persistence

-- ============================================
-- ALTER TABLE
-- ============================================

-- Add preferred provider column (nullable, as it might not be set initially)
ALTER TABLE public.user_study_preferences
ADD COLUMN IF NOT EXISTS preferred_provider TEXT;

-- Add preferred model column (nullable, as it might not be set initially)
ALTER TABLE public.user_study_preferences
ADD COLUMN IF NOT EXISTS preferred_model TEXT;

-- Make system_prompt nullable (user might only want to save provider/model without custom prompt)
ALTER TABLE public.user_study_preferences
ALTER COLUMN system_prompt DROP NOT NULL;
