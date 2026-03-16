---
phase: 42-backend-pipeline
plan: 01
subsystem: api
tags: [deno, edge-functions, yaml-parsing, webhook, deck-index, upsert]

# Dependency graph
requires:
  - phase: 41-database-foundation
    provides: deck_index table with tsvector/GIN fulltext search, UNIQUE(repository_id, subfolder_path)
provides:
  - deck.yaml detection and parsing in docora-webhook handleCreate/handleUpdate/handleDelete
  - deck_index upsert on deck.yaml create/update
  - deck_index deletion on deck.yaml removal
  - parseYaml() wrapper for pure YAML parsing
  - LANGUAGE_WHITELIST constant for ISO 639-1 validation
affects: [42-02-commit-yaml, 43-deck-builder-yaml, 44-mobile-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [parseYaml-wrapper-for-pure-yaml, deck-yaml-file-routing-in-webhook]

key-files:
  created: []
  modified:
    - supabase/functions/docora-webhook/index.ts

key-decisions:
  - "Reused parseFrontmatter() via parseYaml() wrapper (wraps content in --- delimiters) instead of importing a YAML library -- deck.yaml uses simple key-value + array syntax"
  - "LANGUAGE_WHITELIST extracted as module-level constant shared by both handleCreate and handleUpdate branches"
  - "Both handleCreate and handleUpdate use UPSERT (not INSERT/UPDATE) for idempotent out-of-order webhook delivery"

patterns-established:
  - "deck.yaml file routing: fileName === 'deck.yaml' exact match inserted after .lumioignore and before .md catch-all"
  - "parseYaml wrapper: Wrap pure YAML in frontmatter delimiters to reuse existing parseFrontmatter()"

requirements-completed: [PIPE-01, PIPE-02]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 42 Plan 01: Backend Pipeline Summary

**deck.yaml detection and indexing in docora-webhook -- upsert on create/update, delete on removal, with tag normalization, language whitelist, and silent skip for missing required fields**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T11:48:16Z
- **Completed:** 2026-03-13T11:49:55Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added deck.yaml handling to handleCreate, handleUpdate, and handleDelete in docora-webhook edge function
- Implemented parseYaml() wrapper that reuses existing parseFrontmatter() for pure YAML files
- deck_index upsert with tag normalization (lowercase slug, max 5), language validation (ISO 639-1 whitelist), and silent skip for missing display_name/description
- deck_index row deletion when deck.yaml is removed from repository

## Task Commits

Each task was committed atomically:

1. **Task 1: Add parseYaml wrapper and deck.yaml handling to handleCreate and handleUpdate** - `7894168` (feat)
2. **Task 2: Add deck.yaml deletion to handleDelete** - `2f0b4ff` (feat)

## Files Created/Modified
- `supabase/functions/docora-webhook/index.ts` - Added LANGUAGE_WHITELIST constant, parseYaml() wrapper, deck.yaml branches in handleCreate/handleUpdate (upsert) and handleDelete (delete)

## Decisions Made
- Reused parseFrontmatter() via parseYaml() wrapper instead of importing a YAML library -- the existing simple parser handles all deck.yaml field types (strings, arrays)
- Extracted LANGUAGE_WHITELIST as a module-level constant to avoid duplication between handleCreate and handleUpdate
- Both create and update handlers use UPSERT for idempotent webhook processing (handles out-of-order delivery per research pitfall #3)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- docora-webhook now fully processes deck.yaml files for all CRUD operations
- Ready for Plan 02 (deck-commit commit_yaml action) which writes deck.yaml to Git
- The full pipeline loop is: deck-commit writes YAML -> Docora sends webhook -> docora-webhook upserts deck_index

## Self-Check: PASSED

All files verified on disk. Both task commits (7894168, 2f0b4ff) verified in git log. SUMMARY.md exists.

---
*Phase: 42-backend-pipeline*
*Completed: 2026-03-13*
