---
phase: 37-backend-pipeline
plan: 02
subsystem: api
tags: [supabase, edge-function, typescript, vitest, api-client]

# Dependency graph
requires:
  - phase: 37-backend-pipeline
    plan: 01
    provides: deck-commit edge function with 5 actions
  - phase: 36-scaffold-auth
    provides: Supabase client setup and auth infrastructure
provides:
  - Typed client API module for deck-commit edge function (commitFile, deleteFile, getFile, listFiles, listDecks)
  - Exported TypeScript types (FileEntry, DeckEntry, CommitResult, FileContent)
  - CI/CD deployment of deck-commit verified present
affects: [38-deck-management, 39-card-authoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [typed edge function client wrapper, response field extraction for clean typed returns]

key-files:
  created:
    - apps/deck-builder/src/lib/api.ts
    - apps/deck-builder/src/lib/__tests__/api.test.ts
  modified: []

key-decisions:
  - "Extract clean typed objects from edge function responses (strip success field) for type-safe downstream usage"
  - "Private invoke<T> helper centralizes error handling and function invocation -- single point of change"

patterns-established:
  - "Edge function client pattern: private invoke<T> helper + typed public functions extracting specific fields from response"
  - "API test pattern: vi.hoisted mockInvoke for supabase.functions.invoke, test action/body and return values"

requirements-completed: [PIPE-01, PIPE-03]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 37 Plan 02: Client API Module Summary

**Typed API client wrapping deck-commit edge function with 5 functions, 4 exported types, and 11 unit tests using mocked supabase.functions.invoke**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T11:43:25Z
- **Completed:** 2026-03-12T11:45:25Z
- **Tasks:** 2 (1 TDD, 1 already complete from Plan 01)
- **Files modified:** 2

## Accomplishments
- Created typed API module with 5 exported functions matching edge function actions (commitFile, deleteFile, getFile, listFiles, listDecks)
- 4 exported TypeScript types for downstream consumption (FileEntry, DeckEntry, CommitResult, FileContent)
- 11 unit tests covering all functions: correct action/body, return values, error handling
- CI/CD deck-commit deploy line already present (added by Plan 01)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing API tests** - `f7c8299` (test)
2. **Task 1 (GREEN): API module implementation** - `5e966df` (feat)

_TDD task: test commit followed by implementation commit._

_Task 2 (CI/CD update) required no commit -- deck-commit deploy line was already added by Plan 37-01._

## Files Created/Modified
- `apps/deck-builder/src/lib/api.ts` - Typed client API module (73 lines) with 5 functions wrapping supabase.functions.invoke('deck-commit')
- `apps/deck-builder/src/lib/__tests__/api.test.ts` - Unit tests (195 lines) with vi.hoisted mock for supabase.functions.invoke

## Decisions Made
- Extract clean typed objects from edge function responses (strip `success` field) so downstream consumers get type-safe `CommitResult`, `FileContent`, etc. without extra fields
- Private `invoke<T>` helper centralizes error handling: checks both `error` (transport-level) and `data.error` (application-level) in one place

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed response field extraction for commitFile and getFile**
- **Found during:** Task 1 GREEN phase
- **Issue:** Initial implementation returned full edge function response (including `success: true`) but TypeScript types (CommitResult, FileContent) don't include `success`, causing test failures
- **Fix:** Changed commitFile and getFile to explicitly extract typed fields from response (matching listFiles/listDecks pattern)
- **Files modified:** apps/deck-builder/src/lib/api.ts
- **Verification:** All 11 API tests pass
- **Committed in:** `5e966df` (part of GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for type correctness. No scope creep.

## Issues Encountered
None

## User Setup Required

The plan's `user_setup` section documents Docora registration for the shared repo:
- Create shared repo root README.md with `lumio_format_version` frontmatter
- Register shared repo with Docora via git-sync edge function's `add_repository` action
- This is a one-time setup for the Docora-to-AI-questions pipeline

## Next Phase Readiness
- Typed API module ready for Phase 38 (Deck Management) to import and use
- All 5 functions match edge function actions exactly
- Types exported for use in React components and state management
- Phase 37 (Backend Pipeline) is now complete

## Self-Check: PASSED

- FOUND: apps/deck-builder/src/lib/api.ts
- FOUND: apps/deck-builder/src/lib/__tests__/api.test.ts
- FOUND: commit f7c8299
- FOUND: commit 5e966df

---
*Phase: 37-backend-pipeline*
*Completed: 2026-03-12*
