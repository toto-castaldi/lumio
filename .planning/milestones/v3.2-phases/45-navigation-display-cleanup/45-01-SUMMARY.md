---
phase: 45-navigation-display-cleanup
plan: 01
subsystem: ui, api
tags: [react-native, navigation, edge-functions, supabase, i18n]

# Dependency graph
requires:
  - phase: 44-discovery-shared-decks
    provides: Discovery tab, is_platform column, shared repository architecture
provides:
  - Discovery tab promoted to 2nd position in bottom navigation
  - Platform repos hidden from repository list and dashboard stats
  - Server-side guard preventing manual addition of platform repos
  - Info toast guiding users to Discovery for platform decks
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sentinel error pattern: edge function throws typed error string, client matches and shows contextual toast"
    - "Post-query filtering for joined Supabase queries using is_platform field"

key-files:
  created: []
  modified:
    - apps/android/navigation/MainNavigator.tsx
    - supabase/functions/git-sync/index.ts
    - apps/android/screens/ReposScreen.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Used post-query array filter for is_platform exclusion rather than Supabase nested filter syntax (simpler, more readable)"
  - "Used sentinel error string PLATFORM_REPO for client-side detection of platform repo rejection"

patterns-established:
  - "Sentinel error pattern: edge function throws Error('SENTINEL_STRING'), client matches message exactly to show specific UX"

requirements-completed: [NAV-01, REPO-01]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 45 Plan 01: Navigation & Display Cleanup Summary

**Discovery tab promoted to 2nd nav position, platform repos hidden from repo list/stats with server-side add guard and info toast**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T07:37:22Z
- **Completed:** 2026-03-17T07:39:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Discovery tab is now 2nd in bottom navigation (Dashboard, Discovery, Repos, Settings)
- Platform repos (is_platform=true) excluded from getRepositories and getStats server responses
- Server-side guard in addRepository rejects platform repo URLs with PLATFORM_REPO sentinel error
- Client-side handling shows info toast guiding user to Discovery tab instead of error message
- Both EN and IT translations added for platform repo rejection toast

## Task Commits

Each task was committed atomically:

1. **Task 1: Reorder tabs and filter platform repos from server responses** - `b6e237e` (feat)
2. **Task 2: Add platform-repo guard with info toast on rejection** - `8386876` (feat)

## Files Created/Modified
- `apps/android/navigation/MainNavigator.tsx` - Tab order changed: Discovery moved from 3rd to 2nd position
- `supabase/functions/git-sync/index.ts` - getRepositories/getStats filter is_platform, addRepository guards platform repos
- `apps/android/screens/ReposScreen.tsx` - PLATFORM_REPO error handling with info toast
- `apps/android/i18n/en.ts` - Added platformRepoTitle/platformRepoBody keys
- `apps/android/i18n/it.ts` - Added platformRepoTitle/platformRepoBody keys (Italian)

## Decisions Made
- Used post-query array filtering for is_platform exclusion in both getRepositories and getStats (cleaner than nested Supabase filter syntax on joined queries)
- Used sentinel error string "PLATFORM_REPO" for client detection, matching the existing pattern of checking error.message for specific strings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Navigation cleanup complete, ready for any remaining plans in phase 45
- Platform repo filtering is server-side, so deck-builder web app also benefits automatically

## Self-Check: PASSED

All 5 modified files verified present. Both task commits (b6e237e, 8386876) verified in git log.

---
*Phase: 45-navigation-display-cleanup*
*Completed: 2026-03-17*
