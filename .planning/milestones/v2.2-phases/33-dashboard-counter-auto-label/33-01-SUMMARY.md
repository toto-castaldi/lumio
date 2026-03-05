---
phase: 33-dashboard-counter-auto-label
plan: 01
subsystem: database, ui
tags: [postgresql, rpc, react-native, dashboard, session-limit, i18n]

# Dependency graph
requires:
  - phase: 32-rpc-session-limit-enforcement
    provides: get_study_cards_for_session RPC with p_limit, CardsPerSession 'auto' type
provides:
  - get_due_card_count RPC with p_limit DEFAULT NULL for session-aware counting
  - getDueCardCount TS function accepting optional limit parameter
  - Session-aware dashboard counter using cardsPerSession setting
  - Auto label with sparkles icon in settings selector
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [session-aware count capping via LEAST(total, p_limit) in plpgsql]

key-files:
  created:
    - supabase/migrations/20260305000001_session_aware_due_count.sql
  modified:
    - packages/core/src/supabase/study.ts
    - apps/android/screens/DashboardScreen.tsx
    - apps/android/screens/SettingsScreen.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Used LEAST(total, p_limit) for count capping -- simpler than IF/ELSE with separate queries since we only need a scalar cap"
  - "Hardcoded 'Auto' in SettingsScreen label (universal across languages) while still updating i18n values defensively"

patterns-established:
  - "Session-aware RPC count: same nullable limit pattern from Phase 32 applied to count RPC"

requirements-completed: [DASH-01, DASH-02, UI-01]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 33 Plan 01: Dashboard Counter Auto Label Summary

**Session-aware dashboard counter capped by cardsPerSession setting, Auto label with sparkles icon replacing All cards/infinity**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T09:09:44Z
- **Completed:** 2026-03-05T09:13:13Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- SQL RPC `get_due_card_count` now accepts p_limit: when set, returns LEAST(total, p_limit) so dashboard reflects session-capped count
- DashboardScreen imports `useStudySettings` and passes the session limit to `getDueCardCount`, updating reactively when setting changes
- Settings selector shows "Auto" with sparkles-outline icon instead of "All cards" with infinity icon
- Both i18n files updated defensively for any other code referencing `settings.allCards`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add p_limit to get_due_card_count RPC and update core TS** - `b54c202` (feat)
2. **Task 2: Wire dashboard to session-aware count and rename Auto label** - `eccc6a1` (feat)

## Files Created/Modified
- `supabase/migrations/20260305000001_session_aware_due_count.sql` - New RPC with p_limit DEFAULT NULL, LEAST-based capping
- `packages/core/src/supabase/study.ts` - getDueCardCount accepts optional limit parameter, passes p_limit to RPC
- `apps/android/screens/DashboardScreen.tsx` - Imports useStudySettings, passes limit to getDueCardCount in both refresh paths
- `apps/android/screens/SettingsScreen.tsx` - Auto option: 'Auto' label with sparkles-outline icon
- `apps/android/i18n/en.ts` - allCards value changed from 'All cards' to 'Auto'
- `apps/android/i18n/it.ts` - allCards value changed from 'Tutte le schede' to 'Auto'

## Decisions Made
- Used LEAST(total, p_limit) for count capping in SQL -- simpler than duplicating the full query logic since we only need a scalar cap on the already-computed total
- Hardcoded 'Auto' string directly in SettingsScreen (not through i18n) since "Auto" is universal; still updated i18n values defensively for any other consumers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard counter is session-aware end-to-end
- Phase 33 is the final phase in the v2.2 milestone; all session limit features complete

## Self-Check: PASSED

All 6 files verified present. Both task commits (b54c202, eccc6a1) verified in git log.

---
*Phase: 33-dashboard-counter-auto-label*
*Completed: 2026-03-05*
