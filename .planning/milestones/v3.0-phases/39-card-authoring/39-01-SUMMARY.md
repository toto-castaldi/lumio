---
phase: 39-card-authoring
plan: 01
subsystem: ui
tags: [gray-matter, frontmatter, validation, context, react, tdd]

# Dependency graph
requires:
  - phase: 38-deck-management
    provides: DeckContext, api.ts CRUD functions, main.tsx provider tree
provides:
  - parseCard/serializeCard/generateCardTemplate frontmatter utilities
  - slugify/validateCardTitle card validation utilities
  - CardContext with card CRUD state management (useCard hook)
  - @uiw/react-md-editor, gray-matter, katex dependencies installed
affects: [39-card-authoring]

# Tech tracking
tech-stack:
  added: [gray-matter@4.0.3, "@uiw/react-md-editor@4.0.11", katex@0.16.38, "@types/katex"]
  patterns: [TDD red-green for utility libraries, CardContext mirrors DeckContext pattern]

key-files:
  created:
    - apps/deck-builder/src/lib/frontmatter.ts
    - apps/deck-builder/src/lib/card-validation.ts
    - apps/deck-builder/src/lib/__tests__/frontmatter.test.ts
    - apps/deck-builder/src/lib/__tests__/card-validation.test.ts
    - apps/deck-builder/src/contexts/CardContext.tsx
  modified:
    - apps/deck-builder/package.json
    - apps/deck-builder/src/main.tsx

key-decisions:
  - "gray-matter works in jsdom/Vite without Buffer polyfill -- no extra config needed"
  - "CardContext auto-selects newly created card via setTimeout micro-task after refreshCards"
  - "De-slugify filenames to titles with title case for CardState display"

patterns-established:
  - "CardContext mirrors DeckContext: createContext, useCallback, useMemo, toast error pattern"
  - "TDD for utility functions: write tests first, then implement"

requirements-completed: [CARD-01, CARD-02, CARD-04, CARD-05, CARD-06]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 39 Plan 01: Card Data Layer Summary

**Frontmatter parse/serialize via gray-matter, slugify/validate utilities with 18 TDD tests, and CardContext CRUD provider wired into app tree**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T17:39:50Z
- **Completed:** 2026-03-12T17:44:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed gray-matter, @uiw/react-md-editor, katex dependencies for card authoring
- Built frontmatter.ts with parseCard, serializeCard, generateCardTemplate (round-trip tested)
- Built card-validation.ts with slugify and validateCardTitle (i18n error keys)
- Created CardContext with full CRUD (create, save, delete, refresh) following DeckContext pattern
- Wired CardProvider inside DeckProvider in main.tsx ProtectedLayout
- All 100 tests pass (18 new + 82 existing), TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `4172495` (test)
2. **Task 1 (GREEN): Frontmatter + validation implementation** - `31807db` (feat)
3. **Task 2: CardContext + main.tsx wiring** - `92dcebf` (feat)

_Note: Task 1 used TDD with RED/GREEN commits_

## Files Created/Modified
- `apps/deck-builder/src/lib/frontmatter.ts` - parseCard, serializeCard, generateCardTemplate using gray-matter
- `apps/deck-builder/src/lib/card-validation.ts` - slugify, validateCardTitle, MAX_CARD_TITLE_LENGTH
- `apps/deck-builder/src/lib/__tests__/frontmatter.test.ts` - 8 tests for frontmatter operations
- `apps/deck-builder/src/lib/__tests__/card-validation.test.ts` - 10 tests for slugify and validation
- `apps/deck-builder/src/contexts/CardContext.tsx` - CardProvider and useCard hook with CRUD
- `apps/deck-builder/package.json` - Added gray-matter, @uiw/react-md-editor, katex, @types/katex
- `apps/deck-builder/src/main.tsx` - CardProvider added inside DeckProvider

## Decisions Made
- gray-matter works in jsdom/Vite without Buffer polyfill -- no extra vite.config.ts changes needed
- CardContext auto-selects newly created card via setTimeout micro-task after refreshCards completes
- De-slugify filenames to titles via title case for CardState display (strip .md, hyphens to spaces)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest 4 does not support `-x` flag (replaced with `--bail 1`) -- minor CLI difference, no impact

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CardContext ready for card editor UI (Plan 02+)
- frontmatter utilities ready for markdown editor integration
- @uiw/react-md-editor installed and available for editor component

## Self-Check: PASSED

All 6 files verified present. All 3 commits verified in git log.

---
*Phase: 39-card-authoring*
*Completed: 2026-03-12*
