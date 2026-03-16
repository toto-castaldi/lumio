---
phase: 43-deck-builder-metadata
plan: 01
subsystem: api
tags: [edge-function, supabase, yaml, deck-metadata, typescript]

# Dependency graph
requires:
  - phase: 42-backend-pipeline
    provides: commit_yaml action and deck-commit edge function
provides:
  - get_yaml server action for fetching deck.yaml content
  - getDeckYaml() client API function with 404-to-null mapping
  - commitYaml() client API function for structured metadata commits
  - DeckMetadata interface exported for UI consumption
affects: [43-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [action-based edge function routing, null-return for 404 pattern]

key-files:
  created: []
  modified:
    - supabase/functions/deck-commit/index.ts
    - apps/deck-builder/src/lib/api.ts
    - apps/deck-builder/src/lib/__tests__/api.test.ts

key-decisions:
  - "get_yaml bypasses validateUserPath (.md-only restriction) same as commit_yaml, using deck_name-based path construction"
  - "getDeckYaml maps data-level 'File not found' error to null return, rethrows all other errors"

patterns-established:
  - "Null-return pattern: getDeckYaml returns null on 404 instead of throwing, matching React convention for optional data"

requirements-completed: [DKBL-02, DKBL-03]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 43 Plan 01: API Layer Summary

**get_yaml server action and getDeckYaml/commitYaml client functions for loading and saving deck.yaml metadata**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T12:40:37Z
- **Completed:** 2026-03-13T12:42:40Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Server-side get_yaml action in deck-commit edge function validates deck_name, constructs path bypassing .md restriction, returns content+sha or 404
- Client getDeckYaml() with null-return on 404 pattern and error propagation for non-404 failures
- Client commitYaml() sends structured DeckMetadata to existing commit_yaml action
- DeckMetadata interface exported for DeckMetadataForm component (Plan 02)
- 5 new tests alongside 21 existing tests, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for getDeckYaml and commitYaml** - `485dc82` (test)
2. **Task 1 (GREEN): get_yaml server action and client API functions** - `0adae36` (feat)

## Files Created/Modified
- `supabase/functions/deck-commit/index.ts` - Added get_yaml case in action switch for fetching deck.yaml by deck_name
- `apps/deck-builder/src/lib/api.ts` - Added getDeckYaml(), commitYaml(), and DeckMetadata interface
- `apps/deck-builder/src/lib/__tests__/api.test.ts` - Added 5 tests: 3 for getDeckYaml (success, 404, error), 2 for commitYaml (success, error)

## Decisions Made
- get_yaml bypasses validateUserPath (.md-only restriction) using direct deck_name-based path construction (`userId/deckName/deck.yaml`), same pattern as commit_yaml
- getDeckYaml maps data-level "File not found" error to null return instead of throwing, following React convention for optional data loading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API layer complete, ready for DeckMetadataForm UI component in Plan 02
- getDeckYaml and commitYaml functions are the exact interface the form will consume
- DeckMetadata interface defines the form's data shape

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 43-deck-builder-metadata*
*Completed: 2026-03-13*
