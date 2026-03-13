---
phase: 41-database-foundation
plan: 01
subsystem: database
tags: [postgresql, tsvector, fulltext-search, gin-index, migrations, rls]

# Dependency graph
requires:
  - phase: 20-shared-repositories
    provides: user_repositories table, repositories table, RLS policies
provides:
  - deck_index table with tsvector/GIN fulltext search
  - subfolder_path column on user_repositories for per-deck subscriptions
  - is_platform column on repositories for platform-level repos
  - lumio-decks seed row in repositories
  - deck_index_search_vector() immutable wrapper function
affects: [41-02, 42-webhook-indexing, 43-deck-builder-yaml, 44-mobile-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [immutable-wrapper-for-tsvector-generated-column, coalesce-null-unique-index]

key-files:
  created:
    - supabase/migrations/20260313000001_deck_index_table.sql
    - supabase/migrations/20260313000002_user_repositories_subfolder.sql
    - supabase/migrations/20260313000003_platform_repo_seed.sql
  modified: []

key-decisions:
  - "Created immutable wrapper function deck_index_search_vector() because to_tsvector() and array_to_string() are STABLE not IMMUTABLE, which PostgreSQL requires for generated columns"
  - "Used is_platform BOOLEAN column (not implicit NULL pattern) to identify platform repos -- explicit is better than implicit"
  - "Used COALESCE-based unique index instead of NULLS NOT DISTINCT for subfolder_path uniqueness"

patterns-established:
  - "Immutable tsvector wrapper: When using generated columns with tsvector, wrap the entire expression in an IMMUTABLE SQL function"
  - "COALESCE unique index: For nullable columns in unique constraints, use COALESCE in the index expression"

requirements-completed: [DBSR-01, DBSR-03, DBSR-05]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 41 Plan 01: Database Foundation Summary

**deck_index table with weighted tsvector/GIN fulltext search, subfolder-aware subscriptions on user_repositories, and lumio-decks platform repo seed**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T10:44:18Z
- **Completed:** 2026-03-13T10:50:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created deck_index table with auto-generated weighted tsvector search column (A: display_name, B: tags, C: description) using 'simple' config for multilingual support
- Added subfolder_path column to user_repositories with COALESCE-based unique index for NULL-safe uniqueness
- Seeded lumio-decks platform repository with is_platform=TRUE flag
- All 3 migrations apply cleanly via supabase db reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Create deck_index table with fulltext search** - `2cca21a` (feat)
2. **Task 2: Add subfolder_path to user_repositories and seed platform repo** - `a1774a6` (feat)

## Files Created/Modified
- `supabase/migrations/20260313000001_deck_index_table.sql` - deck_index table with tsvector generated column, GIN indexes, RLS policies, updated_at trigger, and immutable wrapper function
- `supabase/migrations/20260313000002_user_repositories_subfolder.sql` - subfolder_path column on user_repositories with COALESCE-based UNIQUE index
- `supabase/migrations/20260313000003_platform_repo_seed.sql` - is_platform column on repositories, lumio-decks seed row

## Decisions Made
- Created `deck_index_search_vector()` IMMUTABLE wrapper function because PostgreSQL generated columns require IMMUTABLE expressions, but `to_tsvector()` is STABLE and `array_to_string()` is STABLE. The wrapper is safe because 'simple' config has no mutable catalog state.
- Used `is_platform BOOLEAN NOT NULL DEFAULT FALSE` column (explicit flag) rather than relying on the absence of user_repositories rows to identify platform repos.
- Used COALESCE-based unique index (`COALESCE(subfolder_path, '')`) instead of PostgreSQL 15's `NULLS NOT DISTINCT` for broader compatibility and clearer semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed immutability requirement for generated tsvector column**
- **Found during:** Task 1 (deck_index table creation)
- **Issue:** `to_tsvector('simple', ...)` and `array_to_string()` are STABLE not IMMUTABLE. PostgreSQL generated columns require IMMUTABLE expressions. Migration failed with "generation expression is not immutable".
- **Fix:** Created `deck_index_search_vector(p_display_name, p_tags, p_description)` IMMUTABLE SQL function wrapping the entire weighted tsvector computation. The function is declared IMMUTABLE which is safe because 'simple' config has no mutable catalog dependencies.
- **Files modified:** `supabase/migrations/20260313000001_deck_index_table.sql`
- **Verification:** `supabase db reset` succeeds, test INSERT produces non-null search_vector
- **Committed in:** 2cca21a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for PostgreSQL generated column immutability requirement. No scope creep. The plan's research (Pitfall 1) identified this exact risk but the provided code examples did not account for it.

## Issues Encountered
- PostgreSQL requires IMMUTABLE expressions for generated columns, but `to_tsvector()` and `array_to_string()` are only STABLE. Solved by wrapping the entire search vector computation in an IMMUTABLE SQL function.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- deck_index table ready for Plan 02 (search_decks RPC and study RPC subfolder filtering)
- Schema foundation complete for Phase 42 (webhook deck.yaml parsing will upsert into deck_index)
- No blockers

## Self-Check: PASSED

All 3 migration files verified on disk. Both task commits (2cca21a, a1774a6) verified in git log. SUMMARY.md exists.

---
*Phase: 41-database-foundation*
*Completed: 2026-03-13*
