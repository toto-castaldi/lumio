-- Lumio Phase 3: Scheduled Sync with pg_cron
--
-- NOTE: pg_cron requires:
-- 1. Supabase Pro plan or higher
-- 2. pg_net extension for HTTP calls
--
-- If this migration fails, you can configure the scheduled sync
-- manually via the Supabase Dashboard:
-- 1. Go to Database > Extensions and enable pg_cron and pg_net
-- 2. Go to Database > Cron Jobs and create a new job
-- 3. Use the SQL below as reference

-- Enable extensions (may require manual enablement on dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule hourly repository sync check
-- Runs every hour at minute 0
-- This calls the git-sync Edge Function with action "check_updates"
DO $$
BEGIN
  -- Remove existing job if present
  PERFORM cron.unschedule('sync-repositories-hourly');
EXCEPTION
  WHEN undefined_function THEN
    -- pg_cron not available, skip
    RAISE NOTICE 'pg_cron not available. Please configure scheduled sync manually via Supabase Dashboard.';
    RETURN;
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Create the scheduled job
-- NOTE: You may need to update the URL and service_role_key
-- via Supabase Dashboard > Database > Cron Jobs
DO $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get the project URL from environment (if available)
  -- In production, configure this via Supabase Dashboard
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'sync-repositories-hourly',
      '0 * * * *',  -- Every hour at minute 0
      format(
        $cron$
        SELECT net.http_post(
          url := '%s/functions/v1/git-sync',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
          body := '{"action": "check_updates"}'::jsonb
        );
        $cron$,
        supabase_url,
        service_key
      )
    );
    RAISE NOTICE 'Scheduled sync job created successfully';
  ELSE
    RAISE NOTICE 'Supabase URL or service key not configured. Please set up the cron job manually via Supabase Dashboard.';
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available. Please configure scheduled sync manually via Supabase Dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating cron job: %. Please configure manually via Supabase Dashboard.', SQLERRM;
END $$;

-- ============================================
-- MANUAL CONFIGURATION INSTRUCTIONS
-- ============================================
--
-- If automatic setup fails, configure via Supabase Dashboard:
--
-- 1. Enable Extensions:
--    - Go to Database > Extensions
--    - Enable "pg_cron" and "pg_net"
--
-- 2. Create Cron Job:
--    - Go to Database > Cron Jobs
--    - Click "Create a new cron job"
--    - Name: sync-repositories-hourly
--    - Schedule: 0 * * * * (every hour)
--    - Command:
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/git-sync',
--        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--        body := '{"action": "check_updates"}'::jsonb
--      );
--
-- Replace:
--   - YOUR_PROJECT_REF with your Supabase project reference
--   - YOUR_SERVICE_ROLE_KEY with your service role key (from Settings > API)
