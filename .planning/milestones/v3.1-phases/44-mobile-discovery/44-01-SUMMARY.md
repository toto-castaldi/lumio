---
phase: 44-mobile-discovery
plan: 01
subsystem: api
tags: [supabase, rest-api, i18n, discovery, search, subscriptions]

# Dependency graph
requires:
  - phase: 41-db-discovery
    provides: search_decks RPC, deck_index table, user_repositories subfolder_path column
provides:
  - searchDecks function for fulltext deck search via RPC
  - subscribeToDeck / unsubscribeFromDeck for user_repositories management
  - getUserDeckSubscriptions with display_name enrichment from deck_index
  - getLanguageFlag utility for ISO 639-1 to emoji mapping
  - DeckSearchResult and DeckSubscription TypeScript types
  - EN and IT i18n strings for Discovery UI (17 keys each)
affects: [44-02-mobile-discovery-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [client-side join for tables without FK relationship, 409-as-success for idempotent subscriptions]

key-files:
  created:
    - packages/core/src/supabase/discovery.ts
  modified:
    - packages/core/src/index.ts
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Client-side join between user_repositories and deck_index (no FK, PostgREST cannot embed)"
  - "409 conflict treated as success for subscribeToDeck (idempotent double-tap handling)"
  - "Title-cased subfolder_path as fallback display_name for orphaned subscriptions"

patterns-established:
  - "Discovery REST pattern: direct fetch to /rest/v1/ endpoints with Bearer + apikey headers"
  - "Two-step enrichment: fetch subscriptions then deck_index, join client-side via Map lookup"

requirements-completed: [DISC-02, DISC-04, DISC-05, DISC-06, DISC-08]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 44 Plan 01: Discovery Data Layer Summary

**Discovery data layer with searchDecks RPC, subscribe/unsubscribe via user_repositories REST, and display_name enrichment from deck_index client-side join**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T09:56:02Z
- **Completed:** 2026-03-16T09:58:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created discovery.ts with 5 exported functions and 2 types following existing study.ts patterns
- getUserDeckSubscriptions enriches subscriptions with display_name via two-step fetch and client-side Map join
- Added 17 discovery i18n keys in both EN and IT with matching interpolation variables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create discovery data layer in @lumio/core** - `ff45012` (feat)
2. **Task 2: Add discovery i18n strings for EN and IT** - `0a8f2d3` (feat)

## Files Created/Modified
- `packages/core/src/supabase/discovery.ts` - Discovery data layer: search, subscribe, unsubscribe, subscriptions with enrichment, language flags
- `packages/core/src/index.ts` - Re-exports all discovery functions and types
- `apps/android/i18n/en.ts` - English discovery strings (navigation.discovery + discovery section)
- `apps/android/i18n/it.ts` - Italian discovery strings matching EN key structure

## Decisions Made
- Client-side join between user_repositories and deck_index because PostgREST cannot embed without FK relationship
- 409 HTTP conflict treated as success in subscribeToDeck for idempotent double-tap handling
- Fallback display_name derived from subfolder_path: strip trailing slash, replace hyphens with spaces, title-case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Discovery data layer complete, ready for Plan 02 (Discovery screen UI)
- All functions exported from @lumio/core, consumable via `import { searchDecks, ... } from '@lumio/core'`
- All i18n keys ready for the Discovery screen components

## Self-Check: PASSED

All 5 files verified on disk. Both task commits (ff45012, 0a8f2d3) found in git log.

---
*Phase: 44-mobile-discovery*
*Completed: 2026-03-16*
