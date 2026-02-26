---
phase: 24-study-session-integration
plan: 01
subsystem: database, api
tags: [sm2, spaced-repetition, supabase, rpc, plpgsql, typescript]

# Dependency graph
requires:
  - phase: 23-srs-schema-algorithm
    provides: "card_review_schedule table, get_study_cards_for_session RPC, get_due_card_count RPC"
provides:
  - "upsert_card_review RPC: server-side SM-2 write-back with atomic UPSERT"
  - "content_hash column in get_study_cards_for_session response"
  - "recordCardReview() TypeScript client function exported from @lumio/core"
affects: [24-02, study-session-ui, card-review-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-side SM-2 via SECURITY DEFINER RPC, content_hash round-trip for stale detection]

key-files:
  created:
    - supabase/migrations/20260226000002_upsert_card_review.sql
  modified:
    - packages/core/src/supabase/study.ts
    - packages/core/src/index.ts

key-decisions:
  - "SM-2 runs server-side in upsert_card_review RPC (not client-side) for atomic schedule updates"
  - "CURRENT_DATE used for next_review_at base to avoid timezone flip bugs"
  - "DROP + re-create get_study_cards_for_session to add content_hash column (PostgreSQL limitation)"

patterns-established:
  - "Server-side SM-2 RPC pattern: client sends grade + contentHash, server computes schedule atomically"
  - "content_hash round-trip: session RPC returns it, review RPC snapshots it"

requirements-completed: [SRS-01]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 24 Plan 01: SRS Write-Back RPC Summary

**Server-side SM-2 write-back RPC (upsert_card_review) with atomic UPSERT and content_hash round-trip via get_study_cards_for_session**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T09:17:41Z
- **Completed:** 2026-02-26T09:20:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `upsert_card_review` SECURITY DEFINER RPC implementing full SM-2 algorithm server-side
- Updated `get_study_cards_for_session` to return `content_hash` column for write-back snapshot
- Added `recordCardReview()` client function exported from `@lumio/core`
- Updated `mapSRSStudyCard` to populate `contentHash` from RPC response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create upsert_card_review RPC and add content_hash to get_study_cards_for_session** - `4b8678f` (feat)
2. **Task 2: Add recordCardReview client function and update mapSRSStudyCard** - `1b29c66` (feat)

## Files Created/Modified
- `supabase/migrations/20260226000002_upsert_card_review.sql` - SM-2 write-back RPC + updated session RPC with content_hash
- `packages/core/src/supabase/study.ts` - recordCardReview function + mapSRSStudyCard contentHash mapping
- `packages/core/src/index.ts` - recordCardReview re-export from @lumio/core

## Decisions Made
- SM-2 computation runs server-side in the RPC for atomic schedule updates (single transaction)
- Used CURRENT_DATE (not NOW()) for next_review_at base to avoid timezone flip bugs
- DROP + re-create pattern for get_study_cards_for_session since PostgreSQL cannot add columns to RETURNS TABLE via CREATE OR REPLACE

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `upsert_card_review` RPC ready for Plan 24-02 (study session UI integration)
- `recordCardReview()` exported and callable from app code
- `content_hash` available in session cards for stale detection on write-back

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 24-study-session-integration*
*Completed: 2026-02-26*
