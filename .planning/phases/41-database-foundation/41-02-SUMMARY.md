---
phase: 41-database-foundation
plan: 02
subsystem: database
tags: [postgresql, rpc, fulltext-search, tsvector, websearch-to-tsquery, subfolder-filtering, plpgsql]

# Dependency graph
requires:
  - phase: 41-database-foundation
    provides: deck_index table with tsvector/GIN search, subfolder_path on user_repositories
  - phase: 32-session-limit
    provides: get_study_cards_for_session RPC with p_limit enforcement
  - phase: 33-dashboard-counter
    provides: get_due_card_count RPC with p_limit parameter
provides:
  - search_decks RPC with weighted fulltext ranking, tag filtering, and computed card_count
  - subfolder-aware get_study_cards_for_session (5 JOINs filtered)
  - subfolder-aware get_due_card_count (2 JOINs filtered)
affects: [42-webhook-indexing, 44-mobile-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [websearch-to-tsquery-simple-config, ts-rank-cd-weighted-ranking, transparent-subfolder-filter-via-join-condition]

key-files:
  created:
    - supabase/migrations/20260313000004_search_decks_rpc.sql
    - supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql
  modified: []

key-decisions:
  - "Used websearch_to_tsquery (not plainto_tsquery) for Google-style search syntax support in search_decks"
  - "Card count computed at query time via correlated subquery -- not stored in deck_index, per locked decision from research phase"
  - "Subfolder filter added transparently to existing JOINs -- no RPC signature changes, no mobile app code changes needed"

patterns-established:
  - "Transparent subfolder filter: AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%') on every user_repositories JOIN"
  - "Authenticated RPC pattern: SECURITY DEFINER with auth.uid() NULL check + RAISE EXCEPTION"

requirements-completed: [DBSR-02, DBSR-04, STDY-01]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 41 Plan 02: Search RPC and Study Subfolder Filtering Summary

**search_decks RPC with websearch_to_tsquery fulltext ranking and tag filtering, plus transparent subfolder_path filtering on get_study_cards_for_session (5 JOINs) and get_due_card_count (2 JOINs)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T10:52:57Z
- **Completed:** 2026-03-13T10:56:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created search_decks RPC with weighted fulltext search (websearch_to_tsquery + ts_rank_cd), tag filtering (array containment), pagination, and card_count computed at query time
- Updated get_study_cards_for_session with subfolder filter on all 5 user_repositories JOINs -- subfolder subscriptions now return only matching cards
- Updated get_due_card_count with subfolder filter on both user_repositories JOINs -- counts now respect subfolder boundaries
- All migrations apply cleanly, RPC signatures unchanged (zero mobile app changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create search_decks RPC** - `6d75e8d` (feat)
2. **Task 2: Update study RPCs with subfolder filtering** - `5e170a1` (feat)

## Files Created/Modified
- `supabase/migrations/20260313000004_search_decks_rpc.sql` - search_decks RPC: fulltext search with websearch_to_tsquery, tag filtering, card_count correlated subquery, auth.uid() check
- `supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql` - Updated get_study_cards_for_session (5 subfolder filters) and get_due_card_count (2 subfolder filters) with transparent subfolder_path filtering

## Decisions Made
- Used websearch_to_tsquery (not plainto_tsquery) for Google-style search syntax (handles quoted phrases, OR, negation) per research recommendation
- Card count computed at query time via correlated subquery (not stored) per locked decision -- avoids sync complexity between cards table and deck_index
- Subfolder filter applied transparently via JOIN conditions -- no new parameters, no signature changes, backward compatible with NULL subfolder_path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database foundation complete: deck_index table + search_decks RPC + subfolder-aware study RPCs
- Ready for Phase 42 (webhook deck.yaml parsing will upsert into deck_index and invoke search_decks)
- Ready for Phase 44 (mobile discovery UI will call search_decks directly)
- No blockers

## Self-Check: PASSED

All 2 migration files verified on disk. Both task commits (6d75e8d, 5e170a1) verified in git log. All 3 RPC functions verified in database (search_decks: 4 params, get_study_cards_for_session: 3 params, get_due_card_count: 3 params). Subfolder filter count verified: 5 in get_study_cards_for_session, 2 in get_due_card_count.

---
*Phase: 41-database-foundation*
*Completed: 2026-03-13*
