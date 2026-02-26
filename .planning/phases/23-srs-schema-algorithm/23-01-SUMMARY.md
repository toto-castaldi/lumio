---
phase: 23-srs-schema-algorithm
plan: 01
subsystem: algorithm
tags: [sm2, supermemo, spaced-repetition, typescript, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "SM2Item, SM2Result, CardReviewSchedule types in @lumio/shared"
  - "SM2_MAX_INTERVAL (365) and SM2_EF_CEILING (2.5) constants in @lumio/shared"
  - "sm2() wrapper function with interval cap and EF ceiling in @lumio/core"
  - "newSM2Item() factory for initial card state in @lumio/core"
affects: [24-srs-study-integration]

# Tech tracking
tech-stack:
  added: [supermemo@2.0.23, vitest@4.0.18]
  patterns: [sm2-wrapper-with-clamps, tdd-red-green-refactor]

key-files:
  created:
    - packages/core/src/srs/sm2.ts
    - packages/core/src/srs/sm2.test.ts
    - packages/core/src/srs/index.ts
  modified:
    - packages/shared/src/types/index.ts
    - packages/shared/src/constants/index.ts
    - packages/core/src/index.ts
    - packages/core/package.json

key-decisions:
  - "Thin wrapper around supermemo: only adds clamps (365-day max interval, 2.5 EF ceiling), no logic changes"
  - "nextReviewAt computed as Date in sm2() return, not stored separately"
  - "vitest added as test framework for @lumio/core (first test file in this package)"

patterns-established:
  - "SRS module pattern: packages/core/src/srs/ directory with barrel index.ts re-export"
  - "SM-2 grade convention: grade 4 = correct, grade 1 = incorrect (all 0-5 accepted)"

requirements-completed: [SRS-03, SRS-05]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 23 Plan 01: SM-2 Algorithm Wrapper Summary

**Pure SM-2 wrapper with 365-day interval cap and 2.5 EF ceiling, TDD-verified with 10 test cases using supermemo@2.0.23**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T08:03:09Z
- **Completed:** 2026-02-26T08:06:25Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- SM2Item, SM2Result, CardReviewSchedule types exported from @lumio/shared
- SM2_MAX_INTERVAL (365) and SM2_EF_CEILING (2.5) constants exported from @lumio/shared
- sm2() wrapper function with interval clamping and EF ceiling, exported from @lumio/core
- 10 test cases covering correct/incorrect sequences, EF floor/ceiling, max interval cap, nextReviewAt date computation, and all grade acceptance

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SM-2 types to @lumio/shared and install supermemo** - `91de40d` (chore)
2. **Task 2 RED: Failing SM-2 tests** - `83ce805` (test)
3. **Task 2 GREEN: SM-2 implementation passing all tests** - `dd5b43e` (feat)

## Files Created/Modified
- `packages/shared/src/types/index.ts` - Added SM2Item, SM2Result, CardReviewSchedule interfaces
- `packages/shared/src/constants/index.ts` - Added SM2_MAX_INTERVAL and SM2_EF_CEILING constants
- `packages/core/package.json` - Added supermemo and vitest dependencies
- `packages/core/src/srs/sm2.ts` - SM-2 wrapper function with clamps
- `packages/core/src/srs/sm2.test.ts` - 10 test cases covering all SM-2 behaviors
- `packages/core/src/srs/index.ts` - Barrel re-export for srs module
- `packages/core/src/index.ts` - Added srs exports to public API

## Decisions Made
- Thin wrapper around supermemo: only adds clamps (365-day max interval, 2.5 EF ceiling), no logic changes to the core algorithm
- nextReviewAt computed inline in sm2() as a Date object, returned as part of SM2Result
- vitest added as test framework for @lumio/core (first test infrastructure in this package)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- sm2() and newSM2Item() are ready to be wired into study sessions by Phase 24
- CardReviewSchedule type is ready for the database migration in Plan 23-02
- All types and functions are exported from @lumio/shared and @lumio/core respectively

## Self-Check: PASSED

All 7 files verified present. All 3 commits verified in git log.

---
*Phase: 23-srs-schema-algorithm*
*Completed: 2026-02-26*
