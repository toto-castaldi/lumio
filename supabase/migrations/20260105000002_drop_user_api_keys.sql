-- Drop user_api_keys table
-- Part of Phase 10: Centralize AI API Keys
-- API keys are now platform-level secrets, not per-user

-- Drop RLS policy first
DROP POLICY IF EXISTS "Users can manage own API keys" ON user_api_keys;

-- Drop the table
DROP TABLE IF EXISTS public.user_api_keys;
