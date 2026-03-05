---
phase: 32-rpc-session-limit-enforcement
plan: 01
subsystem: database, api
tags: [postgresql, rpc, spaced-repetition, session-limit, typescript]

# Dependency graph
requires:
  - phase: 26-history-fix-validation
    provides: get_study_cards_for_session RPC with timezone-aware logic
provides:
  - get_study_cards_for_session RPC with p_limit DEFAULT NULL and total cap enforcement
  - getStudyCardsForSession TS function accepting null | number
  - CardsPerSession type with 'auto' replacing 'all'
  - Backward-compatible AsyncStorage migration for 'all' to 'auto'
affects: [33-dashboard-session-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [IF/ELSE branching in plpgsql for nullable limit parameter, null-pass-through for RPC defaults]

key-files:
  created:
    - supabase/migrations/20260304000001_session_limit_enforcement.sql
  modified:
    - packages/core/src/supabase/study.ts
    - apps/android/lib/studySettings.ts
    - apps/android/hooks/useStudySession.ts
    - apps/android/contexts/StudySettingsContext.tsx
    - apps/android/screens/SettingsScreen.tsx

key-decisions:
  - "IF/ELSE block in plpgsql for NULL vs non-NULL p_limit (cleaner than COALESCE with large sentinel)"
  - "p_limit DEFAULT NULL matches production unlimited behavior as safe default"

patterns-established:
  - "Nullable RPC parameters: pass null from TS, PostgreSQL uses DEFAULT NULL for unlimited behavior"
  - "AsyncStorage backward-compat migration: read old value, return new enum value"

requirements-completed: [SESS-01, SESS-02]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 32 Plan 01: RPC Session Limit Enforcement Summary

**End-to-end session card limit: RPC caps total to p_limit with overdue-first priority, frontend passes null for auto and numeric for capped**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T22:07:18Z
- **Completed:** 2026-03-04T22:10:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- SQL RPC `get_study_cards_for_session` now enforces total card cap: when p_limit is set, overdue cards are capped at p_limit with new cards filling remaining slots
- When p_limit is NULL (auto mode), all overdue and new cards are returned with no limit
- CardsPerSession type renamed from 'all' to 'auto' with backward-compatible AsyncStorage migration
- Frontend hook translates 'auto' to null and numeric values pass through directly to the RPC

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration and core TS** - `153e1d9` (feat)
2. **Task 2: Rename CardsPerSession and update hook** - `8c602b4` (feat)

## Files Created/Modified
- `supabase/migrations/20260304000001_session_limit_enforcement.sql` - New RPC with IF/ELSE for NULL vs capped p_limit
- `packages/core/src/supabase/study.ts` - getStudyCardsForSession accepts null | number, JSDoc updated
- `apps/android/lib/studySettings.ts` - CardsPerSession type: 'auto' replaces 'all', backward-compat load
- `apps/android/hooks/useStudySession.ts` - Hook default 'auto', limit translation: 'auto' -> null
- `apps/android/contexts/StudySettingsContext.tsx` - Default state changed to 'auto'
- `apps/android/screens/SettingsScreen.tsx` - Study option value changed from 'all' to 'auto'

## Decisions Made
- Used IF/ELSE block in plpgsql rather than COALESCE with a large sentinel value -- cleaner separation of unlimited vs capped logic
- p_limit DEFAULT NULL chosen as the safe default since it matches existing production behavior (unlimited)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Session limit enforcement is complete end-to-end
- Phase 33 can proceed with dashboard counter changes and "Auto" label rename in UI

## Self-Check: PASSED

All 6 files verified present. Both task commits (153e1d9, 8c602b4) verified in git log.

---
*Phase: 32-rpc-session-limit-enforcement*
*Completed: 2026-03-04*
