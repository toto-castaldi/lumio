---
phase: 26-history-fix-validation
plan: 01
subsystem: database
tags: [postgres, timezone, srs, sm2, check-constraints, plpgsql]

# Dependency graph
requires:
  - phase: 23-srs-schema
    provides: card_review_schedule table, get_due_card_count, get_study_cards_for_session RPCs
  - phase: 24-study-session
    provides: upsert_card_review RPC, content_hash in session RPC
provides:
  - Timezone-aware get_due_card_count RPC (p_timezone param, includes new cards)
  - Timezone-aware get_study_cards_for_session RPC (AT TIME ZONE logic)
  - Timezone-aware upsert_card_review RPC (local date for next_review_at)
  - CHECK constraints on card_review_schedule (ease_factor, interval_days)
  - Client-side getDeviceTimezone() helper passing IANA timezone to all RPCs
affects: [study-session, dashboard, srs]

# Tech tracking
tech-stack:
  added: []
  patterns: [AT TIME ZONE for timezone-aware date comparison, BEGIN...EXCEPTION fallback for invalid timezone]

key-files:
  created:
    - supabase/migrations/20260226000003_timezone_checks_fresh_user.sql
  modified:
    - packages/core/src/supabase/study.ts

key-decisions:
  - "AT TIME ZONE with fallback to CURRENT_DATE on invalid timezone string (non-critical degradation)"
  - "Fresh-user due count includes never-reviewed cards with active questions (LEFT JOIN WHERE crs.id IS NULL)"
  - "Safety UPDATE before CHECK constraints to fix any pre-existing violating rows"

patterns-established:
  - "Timezone-aware RPC pattern: p_timezone TEXT DEFAULT 'UTC' with BEGIN...EXCEPTION fallback"
  - "Client-side getDeviceTimezone() using Intl.DateTimeFormat with UTC fallback"

requirements-completed: [HIST-01]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 26 Plan 01: Timezone-aware SRS RPCs Summary

**Timezone-aware SRS RPCs with AT TIME ZONE logic, fresh-user due count including never-reviewed cards, and CHECK constraints on card_review_schedule**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T15:35:46Z
- **Completed:** 2026-02-26T15:39:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- All three SRS RPCs (get_due_card_count, get_study_cards_for_session, upsert_card_review) now accept p_timezone and use AT TIME ZONE for date comparisons
- Fresh users see a non-zero due count because never-reviewed cards with active questions are included
- Defense-in-depth CHECK constraints prevent ease_factor < 1.3 and interval_days < 0
- Client passes device timezone via Intl.DateTimeFormat to all RPCs automatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQL migration for timezone-aware RPCs, fresh-user due count, and CHECK constraints** - `c0b618f` (feat)
2. **Task 2: Pass device timezone from client to all three SRS RPCs** - `d0ea819` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260226000003_timezone_checks_fresh_user.sql` - Migration with CHECK constraints, timezone-aware RPCs, fresh-user due count
- `packages/core/src/supabase/study.ts` - Added getDeviceTimezone() helper; passes p_timezone to all three RPC calls

## Decisions Made
- AT TIME ZONE with silent fallback to CURRENT_DATE on invalid timezone (non-critical degradation, not an error)
- Fresh-user due count uses LEFT JOIN card_review_schedule WHERE crs.id IS NULL to find never-reviewed cards
- Safety UPDATE runs before CHECK constraints to fix any pre-existing violating rows without migration failure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All SRS RPCs are timezone-aware and backward-compatible (default 'UTC')
- Ready for Phase 26 Plan 02 (validation/testing)

## Self-Check: PASSED

- FOUND: supabase/migrations/20260226000003_timezone_checks_fresh_user.sql
- FOUND: packages/core/src/supabase/study.ts
- FOUND: c0b618f (Task 1 commit)
- FOUND: d0ea819 (Task 2 commit)
- CHECK constraints verified in database: chk_ease_factor_floor, chk_interval_floor
- RPC signatures verified: all three accept p_timezone TEXT DEFAULT 'UTC'

---
*Phase: 26-history-fix-validation*
*Completed: 2026-02-26*
