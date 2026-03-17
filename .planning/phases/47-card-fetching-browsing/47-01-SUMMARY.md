---
phase: 47-card-fetching-browsing
plan: 01
subsystem: api
tags: [supabase, edge-functions, shared-decks, subfolder, card-browsing]

# Dependency graph
requires:
  - phase: 46-shared-deck-subscriptions
    provides: subfolder_path column in user_repositories, shared deck subscription UI
provides:
  - Server-side card filtering by subfolderPath in getCards() edge function
  - Fixed access check using .limit(1) instead of .single() for multi-subscription repos
  - End-to-end subfolderPath wiring from CardListScreen through core API to edge function
affects: [48-study-sessions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Access check with .limit(1) instead of .single() for tables with multiple matching rows"
    - "Server-side file_path prefix filtering for subfolder card scoping"
    - "Conditional body parameter passing (only include subfolderPath when truthy)"

key-files:
  created: []
  modified:
    - supabase/functions/git-sync/index.ts
    - packages/core/src/supabase/repositories.ts
    - apps/android/screens/CardListScreen.tsx

key-decisions:
  - "Used .limit(1) instead of .single() for access check to handle multiple subscriptions to same repo"
  - "Server-side filtering with file_path.startsWith() rather than SQL LIKE for consistency with client-side pattern"
  - "Kept client-side subfolder filtering as safety net alongside new server-side filtering"

patterns-established:
  - "Access check pattern: use .limit(1) when table may have multiple matching rows per user"
  - "Conditional request body: only include optional params when truthy to avoid sending undefined"

requirements-completed: [BROWSE-01, BROWSE-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 47 Plan 01: Card Fetching & Browsing Summary

**Fixed getCards() .single() crash for multi-subscription repos, added server-side subfolder card filtering with end-to-end subfolderPath wiring**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T13:10:45Z
- **Completed:** 2026-03-17T13:13:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed getCards() edge function access check that crashed with .single() when user has multiple subscriptions to the same repository (different subfolders)
- Added server-side card filtering by file_path prefix when subfolderPath is provided, so shared deck users only see their subscribed subfolder's cards
- Wired subfolderPath through the full call chain: CardListScreen -> getRepositoryCards() -> callGitSync() -> getCards()
- Maintained backward compatibility: personal whole-repo browsing works unchanged when no subfolderPath is provided

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix getCards() edge function** - `0003b81` (feat)
2. **Task 2: Wire subfolderPath through client call chain** - `4a1c165` (feat)

## Files Created/Modified
- `supabase/functions/git-sync/index.ts` - Fixed getCards() access check (.limit(1) instead of .single()), added subfolderPath parameter, server-side card filtering, route handler extraction
- `packages/core/src/supabase/repositories.ts` - Added optional subfolderPath parameter to getRepositoryCards(), conditional body parameter passing
- `apps/android/screens/CardListScreen.tsx` - Passes route param subfolderPath to getRepositoryCards()

## Decisions Made
- Used .limit(1) instead of .single() for access check -- .single() throws when multiple rows match, which happens when a user has multiple subfolder subscriptions to the same repository
- Applied server-side file_path prefix filtering using JavaScript .startsWith() rather than SQL LIKE -- consistent with the existing client-side filtering pattern and avoids SQL injection risk with user-provided paths
- Kept existing client-side subfolder filtering in CardListScreen as a safety net -- defense in depth, minimal cost

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt core package for TypeScript resolution**
- **Found during:** Task 2 verification (TypeScript check)
- **Issue:** Android app TypeScript check failed with "Expected 1 arguments, but got 2" because the compiled type declarations in @lumio/core dist/ were stale
- **Fix:** Ran `pnpm --filter @lumio/core run build` to regenerate type declarations with the new subfolderPath parameter
- **Files modified:** packages/core/dist/ (gitignored build output)
- **Verification:** `pnpm --filter @lumio/android exec -- npx tsc --noEmit` passes cleanly
- **Committed in:** N/A (build output is gitignored, only source changes committed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard build step needed for monorepo type resolution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Card fetching with subfolder filtering is complete and ready for study session work in Phase 48
- The server-side filtering ensures shared deck study sessions will also benefit from correct card scoping

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 47-card-fetching-browsing*
*Completed: 2026-03-17*
