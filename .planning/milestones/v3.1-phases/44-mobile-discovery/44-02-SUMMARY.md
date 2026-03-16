---
phase: 44-mobile-discovery
plan: 02
subsystem: ui
tags: [react-native, discovery, search, subscriptions, mobile, android, flatlist, debounce]

# Dependency graph
requires:
  - phase: 44-mobile-discovery-01
    provides: searchDecks, subscribeToDeck, unsubscribeFromDeck, getUserDeckSubscriptions, getLanguageFlag, DeckSearchResult, DeckSubscription types, i18n strings
provides:
  - Discovery tab (4th bottom tab with compass icon) in MainNavigator
  - DiscoveryScreen with fulltext search, tag filtering, subscribe/unsubscribe flows
  - DeckCard component for rendering deck search results
  - TagChipBar component for horizontal scrollable tag filter chips
  - Shared deck entries in Repos screen with display_name and compass icon
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-ui-with-set-rollback, debounced-search-with-ref, prefix-matching-tsquery]

key-files:
  created:
    - apps/android/screens/DiscoveryScreen.tsx
    - apps/android/components/DeckCard.tsx
    - apps/android/components/TagChipBar.tsx
    - supabase/migrations/20260316000001_search_decks_prefix_matching.sql
  modified:
    - apps/android/navigation/MainNavigator.tsx
    - apps/android/screens/ReposScreen.tsx

key-decisions:
  - "Prefix matching (:*) on last word in search_decks RPC for search-as-you-type instead of websearch_to_tsquery"
  - "Deduplicate repos by id in ReposScreen to prevent React key collision from multiple subfolder subscriptions"

patterns-established:
  - "Optimistic UI with Set<string> rollback: add key to subscribedKeys Set immediately, revert on error"
  - "Debounced search via useRef setTimeout: 300ms delay on text input, immediate on tag selection"
  - "Prefix tsquery pattern: split words, exact match all but last, :* on last word"

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08]

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 44 Plan 02: Discovery UI Summary

**Complete Discovery tab with search-as-you-type, tag chip filtering, optimistic subscribe/unsubscribe, and shared deck entries in Repos screen**

## Performance

- **Duration:** 8 min (across two sessions with human-verify checkpoint)
- **Started:** 2026-03-16T10:20:00Z
- **Completed:** 2026-03-16T10:57:23Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments
- Built full Discovery tab as 4th bottom tab with compass icon, sticky search bar, tag chip bar, and FlatList of deck cards
- Implemented optimistic subscribe/unsubscribe with Set-based key tracking and toast notifications
- Added shared deck entries to Repos screen with display_name, compass icon, and "Shared deck" badge
- Fixed search_decks RPC to use prefix matching for search-as-you-type (typing "ita" now finds "italian")

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Discovery tab to MainNavigator and create DeckCard + TagChipBar components** - `38a8808` (feat)
2. **Task 2: Create DiscoveryScreen with search, tag filtering, and subscribe/unsubscribe flows** - `b730da9` (feat)
3. **Task 3: Add shared deck entries to Repos screen** - `ffd2455` (feat)
4. **Task 4: Verify Discovery tab on physical device** - `b402092` (fix — verification fixes committed)

## Files Created/Modified
- `apps/android/screens/DiscoveryScreen.tsx` - Discovery screen with search bar, tag chips, FlatList of DeckCards, subscribe/unsubscribe with optimistic UI, empty states
- `apps/android/components/DeckCard.tsx` - Deck search result card with flag, name, description, tags, card count, author, subscribe/unsubscribe button
- `apps/android/components/TagChipBar.tsx` - Horizontal scrollable chip bar with All + top tags, selection state
- `apps/android/navigation/MainNavigator.tsx` - Added 4th Discovery tab with compass icon between Repos and Settings
- `apps/android/screens/ReposScreen.tsx` - Added shared deck entries with display_name and compass icon; deduplicated repos by id
- `supabase/migrations/20260316000001_search_decks_prefix_matching.sql` - Replaces websearch_to_tsquery with prefix matching for search-as-you-type

## Decisions Made
- Switched search_decks RPC from `websearch_to_tsquery` to manual prefix matching (`'word':*`) so partial typing matches during search-as-you-type
- Added deduplication filter in ReposScreen to handle the case where a single repository has multiple subfolder subscriptions appearing as duplicate entries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed search_decks RPC for search-as-you-type**
- **Found during:** Task 4 (physical device verification)
- **Issue:** `websearch_to_tsquery` only matches complete tokens, so typing "ita" in the search bar returned no results for "italian" decks. Search-as-you-type was broken.
- **Fix:** Created new migration replacing the function with prefix matching: splits query into words, applies exact match on all but last word, appends `:*` to last word (e.g., "react des" becomes `'react' & 'des':*`)
- **Files modified:** `supabase/migrations/20260316000001_search_decks_prefix_matching.sql`
- **Verification:** Confirmed on physical device that partial typing now returns matching results
- **Committed in:** `b402092`

**2. [Rule 1 - Bug] Fixed duplicate repos in ReposScreen causing React key collision**
- **Found during:** Task 4 (physical device verification)
- **Issue:** When a repository has multiple subfolder subscriptions, the same repo appeared multiple times in the Repos list, causing React key collision warnings
- **Fix:** Added deduplication filter using `Set<string>` to ensure each repository appears only once by id
- **Files modified:** `apps/android/screens/ReposScreen.tsx`
- **Verification:** Confirmed on physical device that repos appear once even with multiple subfolder subscriptions
- **Committed in:** `b402092`

---

**Total deviations:** 2 auto-fixed (2 bugs found during device verification)
**Impact on plan:** Both fixes necessary for correct search-as-you-type behavior and React key uniqueness. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- v3.1 Deck Discovery milestone is complete: users can discover, search, filter, and subscribe to shared decks from mobile
- All DISC-01 through DISC-08 requirements fulfilled across plans 01 and 02
- No blockers or concerns

## Self-Check: PASSED

All 6 files verified on disk. All 4 task commits (38a8808, b730da9, ffd2455, b402092) found in git log.

---
*Phase: 44-mobile-discovery*
*Completed: 2026-03-16*
