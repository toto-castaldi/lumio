---
phase: 48-dashboard-study-parity
plan: 01
subsystem: api
tags: [supabase, edge-functions, shared-decks, statistics, study-rpcs]

# Dependency graph
requires:
  - phase: 47-card-fetching-browsing
    provides: "Shared deck card fetching with subfolder_path filtering"
provides:
  - "getStats() includes shared deck subscriptions in repo and card counts"
  - "Study RPCs verified to include shared deck cards via subfolder filtering"
affects: [dashboard, study-session]

# Tech tracking
tech-stack:
  added: []
  patterns: ["subfolder_path prefix filtering for shared deck card counting", "Set-based deduplication for overlapping subscriptions"]

key-files:
  created:
    - supabase/functions/git-sync/getStats.test.ts
  modified:
    - supabase/functions/git-sync/index.ts

key-decisions:
  - "Each shared deck subscription counts as a separate repository in repositoryCount"
  - "Shared deck subscriptions skip lumioignore filtering (per Phase 46 decision)"
  - "Card deduplication via Set avoids double-counting across overlapping subscriptions"

patterns-established:
  - "Subscription-level counting: iterate per user_repositories entry, not per unique repository_id"
  - "Subfolder prefix filtering: use file_path.startsWith(subfolder_path) for shared deck card scoping"

requirements-completed: [STATS-01, STATS-02, STUDY-01, STUDY-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 48 Plan 01: Dashboard Study Parity Summary

**Fixed getStats() to count shared deck subscriptions in repo/card stats and verified study RPCs already include shared deck cards via subfolder_path filtering**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T13:48:02Z
- **Completed:** 2026-03-17T13:50:46Z
- **Tasks:** 2
- **Files modified:** 1 (+ 1 test file created)

## Accomplishments
- getStats() now includes shared deck subscriptions in repositoryCount (each subscription = 1 repo)
- Card counting uses subfolder_path prefix filtering for shared decks and lumioignore for personal repos
- Set-based deduplication prevents double-counting cards across overlapping subscriptions
- Verified study RPCs (get_study_cards_for_session, get_due_card_count) already have correct subfolder filtering from migration 20260313000005

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix getStats() to include shared deck subscriptions** - `9cd1fe8` (test) + `a55472d` (feat)
2. **Task 2: Verify study RPCs include shared deck cards** - No commit (verification-only, no code changes)

**Plan metadata:** TBD (docs: complete plan)

_Note: Task 1 used TDD with separate test and implementation commits_

## Files Created/Modified
- `supabase/functions/git-sync/index.ts` - Updated getStats() with subfolder_path selection, subscription-aware filtering, and Set-based card deduplication
- `supabase/functions/git-sync/getStats.test.ts` - Unit tests for filterRepos and countCards logic (7 test cases)

## Decisions Made
- Each shared deck subscription counts as a separate repository in repositoryCount -- consistent with how users perceive their deck library
- Shared deck subscriptions skip lumioignore filtering (per Phase 46 decision) -- shared decks don't have per-user .lumioignore
- Card deduplication via Set<string> prevents inflated counts when subscriptions overlap (e.g., subscribing to both "decks/" and "decks/math/")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 requirements (STATS-01, STATS-02, STUDY-01, STUDY-02) satisfied
- Dashboard statistics now correctly reflect shared deck subscriptions
- Study sessions already include shared deck cards -- no further work needed
- Milestone v3.3 (Shared Deck Parity) should be complete after this phase

## Self-Check: PASSED

All artifacts verified:
- supabase/functions/git-sync/index.ts: FOUND
- supabase/functions/git-sync/getStats.test.ts: FOUND
- 48-01-SUMMARY.md: FOUND
- Commit 9cd1fe8 (test): FOUND
- Commit a55472d (feat): FOUND

---
*Phase: 48-dashboard-study-parity*
*Completed: 2026-03-17*
