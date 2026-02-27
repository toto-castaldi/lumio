---
phase: 27-foundation-database
plan: 02
subsystem: database
tags: [plpgsql, supabase, trigger, auth, email, avatar]

# Dependency graph
requires:
  - phase: 02-auth
    provides: "Original handle_new_user trigger and public.users table"
provides:
  - "Provider-aware handle_new_user trigger supporting email and Google OAuth signups"
  - "Email-derived display_name with separator-to-space and title case"
  - "Auto-generated avatar URL via ui-avatars.com with Lumio brand color"
affects: [28-auth-ui, 31-account-linking]

# Tech tracking
tech-stack:
  added: [ui-avatars.com]
  patterns: [provider-aware-trigger, email-prefix-display-name]

key-files:
  created:
    - supabase/migrations/20260227000001_email_auth_trigger.sql
  modified: []

key-decisions:
  - "Use raw_app_meta_data->>'provider' for explicit provider detection instead of null-checking metadata fields"
  - "Use initcap() for title case -- edge cases like digits or single chars handled as-is per user decision"
  - "Fixed Lumio purple #7C3AED for all email avatar backgrounds (not per-user unique)"

patterns-established:
  - "Provider-aware trigger: check raw_app_meta_data->>'provider' with COALESCE default 'email'"
  - "Email display name: split_part + replace separators + initcap"

requirements-completed: [INFRA-01]

# Metrics
duration: 1min
completed: 2026-02-27
---

# Phase 27 Plan 02: Email Auth Trigger Summary

**Provider-aware handle_new_user trigger deriving display_name from email prefix with initcap and generating ui-avatars.com avatar with Lumio brand color (#7C3AED)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T10:17:34Z
- **Completed:** 2026-02-27T10:18:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced handle_new_user function with provider-aware logic using raw_app_meta_data
- Google OAuth path preserved exactly (full_name/name COALESCE, avatar_url from metadata)
- Email signup path derives display_name from email prefix: dots, underscores, hyphens replaced with spaces, then initcap
- Email signup path generates ui-avatars.com URL with Lumio purple background, white text, 128px, bold

## Task Commits

Each task was committed atomically:

1. **Task 1: Create provider-aware handle_new_user migration** - `f31fabf` (feat)

## Files Created/Modified
- `supabase/migrations/20260227000001_email_auth_trigger.sql` - Provider-aware handle_new_user trigger function replacing the original Google-only version

## Decisions Made
- Used `raw_app_meta_data->>'provider'` for explicit provider detection with COALESCE default `'email'` for safety
- Used DECLARE block with typed variables for clean separation of provider logic
- Updated COMMENT ON FUNCTION to document both provider paths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database trigger is ready to handle email signups alongside Google OAuth
- No migration rollback needed -- uses CREATE OR REPLACE FUNCTION (additive)
- Ready for auth UI phase (28) to implement email signup flow

## Self-Check: PASSED

- FOUND: supabase/migrations/20260227000001_email_auth_trigger.sql
- FOUND: commit f31fabf
- FOUND: 27-02-SUMMARY.md

---
*Phase: 27-foundation-database*
*Completed: 2026-02-27*
