---
phase: 23-srs-schema-algorithm
plan: 02
subsystem: database
tags: [postgres, rls, rpc, spaced-repetition, supabase, typescript]

# Dependency graph
requires:
  - "23-01: SM2Item, SM2Result, CardReviewSchedule types in @lumio/shared"
provides:
  - "card_review_schedule table with RLS policies for user-scoped SRS state"
  - "get_due_card_count RPC returning due card count (next_review_at::date <= CURRENT_DATE)"
  - "get_study_cards_for_session RPC with overdue-first ordering and stale content detection"
  - "getDueCardCount() and getStudyCardsForSession() client functions in @lumio/core"
  - "SRSStudyCard interface extending StudyCard with isReview, easeFactor, intervalDays, repetitions"
affects: [24-srs-study-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [security-definer-rpc, rls-select-auth-uid-pattern, union-all-priority-ordering]

key-files:
  created:
    - supabase/migrations/20260226000001_card_review_schedule.sql
  modified:
    - packages/core/src/supabase/study.ts
    - packages/core/src/index.ts

key-decisions:
  - "content_hash_snapshot uses cards.content_hash (SHA-256 of full file) for stale detection -- broader than question-only hash but simpler and leverages existing infrastructure"
  - "Overdue cards bypass p_limit cap entirely; limit applies only to new card slots"
  - "v_due_count computed via subquery wrapping GROUP BY to correctly count cards not question rows"

patterns-established:
  - "SRS RPC pattern: SECURITY DEFINER functions with p_user_id parameter, joining card_review_schedule -> cards -> user_repositories -> card_questions"
  - "Priority UNION ALL pattern: overdue cards (ordered ASC) UNION ALL new cards (random, LIMIT remaining)"

requirements-completed: [SRS-04, SRS-06]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 23 Plan 02: SRS Database Schema & RPCs Summary

**card_review_schedule table with RLS, get_due_card_count and get_study_cards_for_session RPCs implementing overdue-first ordering (SRS-04) and stale content detection (SRS-06), with TypeScript client wrappers in @lumio/core**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T08:08:35Z
- **Completed:** 2026-02-26T08:11:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- card_review_schedule table with SM-2 state columns, indexes, updated_at trigger, and full RLS (SELECT/INSERT/UPDATE/DELETE per user + service role ALL)
- get_due_card_count RPC returning 0 for no history, correct count for overdue cards joined through cards/user_repositories
- get_study_cards_for_session RPC: stale row deletion (SRS-06), overdue-first ordering (SRS-04), new card fill with GREATEST(0, limit - due_count)
- getDueCardCount() and getStudyCardsForSession() client functions exported from @lumio/core with SRSStudyCard type

## Task Commits

Each task was committed atomically:

1. **Task 1: Create card_review_schedule migration with table, RLS, indexes, and RPCs** - `ce5e898` (feat)
2. **Task 2: Add client wrapper functions and update exports** - `e36bce8` (feat)

## Files Created/Modified
- `supabase/migrations/20260226000001_card_review_schedule.sql` - Table, indexes, trigger, RLS policies, get_due_card_count and get_study_cards_for_session RPCs
- `packages/core/src/supabase/study.ts` - SRSStudyCard interface, mapSRSStudyCard mapper, getDueCardCount and getStudyCardsForSession functions
- `packages/core/src/index.ts` - Added getDueCardCount, getStudyCardsForSession, SRSStudyCard to exports

## Decisions Made
- content_hash_snapshot uses cards.content_hash (SHA-256 of full file) for stale detection -- broader than question-only hash but simpler and leverages existing infrastructure
- Overdue cards bypass p_limit cap entirely; limit applies only to new card slots (per user decision in CONTEXT.md)
- v_due_count computed via subquery wrapping GROUP BY to correctly count distinct cards rather than question rows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Supabase was not running; started it before db reset. Normal development flow, not a plan deviation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- card_review_schedule table and RPCs are ready for Phase 24 to wire into the study flow
- getDueCardCount() can be called from UI to show due card badge
- getStudyCardsForSession() replaces getStudyCardsWithQuestions() as the session loader in Phase 24
- SM-2 state (ease_factor, interval_days, repetitions) flows through SRSStudyCard to enable client-side SM-2 computation after answer

## Self-Check: PASSED

All 3 files verified present. All 2 commits verified in git log.

---
*Phase: 23-srs-schema-algorithm*
*Completed: 2026-02-26*
