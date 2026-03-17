---
phase: 46-shared-deck-interaction
plan: 01
subsystem: database, api
tags: [postgres, rpc, supabase, i18n, react-native, navigation]

# Dependency graph
requires:
  - phase: 23-spaced-repetition
    provides: card_review_schedule table
  - phase: 41-deck-discovery-data-model
    provides: user_repositories subfolder_path column
provides:
  - Atomic unsubscribe_deck RPC function
  - Client-side unsubscribeDeckRpc function in @lumio/core
  - Extended CardList route params with optional subfolderPath
  - Complete EN/IT i18n keys for unsubscribe flows
affects: [46-02-shared-deck-interaction]

# Tech tracking
tech-stack:
  added: []
  patterns: [SECURITY DEFINER RPC for atomic multi-table delete, PostgREST RPC call pattern]

key-files:
  created:
    - supabase/migrations/20260317000001_unsubscribe_deck_rpc.sql
  modified:
    - packages/core/src/supabase/discovery.ts
    - packages/core/src/index.ts
    - apps/android/navigation/AppNavigator.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Used SECURITY DEFINER RPC for atomic unsubscribe (deletes card_review_schedule + user_repositories in single transaction)"
  - "Kept existing unsubscribeFromDeck function for backward compatibility, added new unsubscribeDeckRpc alongside it"

patterns-established:
  - "Atomic multi-table cleanup via SECURITY DEFINER RPC: delete dependent rows first, then parent row"

requirements-completed: [DECK-01, DECK-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 46 Plan 01: Backend & Data Layer Summary

**Atomic unsubscribe_deck RPC with client function, CardList subfolder routing, and EN/IT i18n keys for deck unsubscribe flows**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T09:43:07Z
- **Completed:** 2026-03-17T09:45:37Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created atomic unsubscribe_deck SECURITY DEFINER RPC that deletes both card_review_schedule entries and user_repositories subscription in a single transaction
- Added unsubscribeDeckRpc client function in discovery.ts and re-exported from @lumio/core
- Extended RootStackParamList CardList type with optional subfolderPath for shared deck card browsing
- Added all 6 unsubscribe i18n keys in both English and Italian

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unsubscribe_deck RPC migration and client function** - `a13dd13` (feat)
2. **Task 2: Extend CardList route params and add i18n keys** - `a72b8c3` (feat)

## Files Created/Modified
- `supabase/migrations/20260317000001_unsubscribe_deck_rpc.sql` - Atomic unsubscribe_deck RPC function
- `packages/core/src/supabase/discovery.ts` - Added unsubscribeDeckRpc client function
- `packages/core/src/index.ts` - Re-exported unsubscribeDeckRpc
- `apps/android/navigation/AppNavigator.tsx` - Added optional subfolderPath to CardList params
- `apps/android/i18n/en.ts` - Added 6 unsubscribe i18n keys in repos section
- `apps/android/i18n/it.ts` - Added 6 unsubscribe i18n keys in repos section

## Decisions Made
- Used SECURITY DEFINER RPC for atomic unsubscribe to ensure no partial failures (card_review_schedule deleted but user_repositories still exists, or vice versa)
- Kept existing unsubscribeFromDeck function intact for backward compatibility; new unsubscribeDeckRpc added alongside it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend RPC and client function ready for 46-02 (frontend UI plan) to consume
- CardList route params extended for subfolder-aware navigation
- All i18n keys in place for unsubscribe confirmation dialog and toast messages

## Self-Check: PASSED

All 6 files verified present. Both task commits (a13dd13, a72b8c3) verified in git log.

---
*Phase: 46-shared-deck-interaction*
*Completed: 2026-03-17*
