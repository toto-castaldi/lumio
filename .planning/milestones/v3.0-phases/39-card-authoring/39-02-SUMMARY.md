---
phase: 39-card-authoring
plan: 02
subsystem: ui
tags: [react, markdown-editor, mdeditor, tailwind, i18n, card-crud, katex]

# Dependency graph
requires:
  - phase: 39-card-authoring
    provides: CardContext CRUD, frontmatter parse/serialize, card-validation, @uiw/react-md-editor dependency
provides:
  - TagInput chip component for tag editing
  - MetadataForm for card title, tags, difficulty, language
  - CardListPanel with card rows, tag badges, difficulty labels
  - CardEditor with MDEditor toolbar (8 buttons), responsive preview, save/delete flow
  - DeckDetailPanel refactored to mail-client layout (card list + editor)
  - Full i18n coverage for card CRUD in EN and IT
affects: [40-deploy-cicd]

# Tech tracking
tech-stack:
  added: [yaml@2.7.1]
  patterns: [mail-client layout for card authoring, responsive MDEditor preview toggle, yaml-based frontmatter parsing]

key-files:
  created:
    - apps/deck-builder/src/components/TagInput.tsx
    - apps/deck-builder/src/components/MetadataForm.tsx
    - apps/deck-builder/src/components/CardListPanel.tsx
    - apps/deck-builder/src/components/CardEditor.tsx
  modified:
    - apps/deck-builder/src/components/DeckDetailPanel.tsx
    - apps/deck-builder/src/i18n/en.ts
    - apps/deck-builder/src/i18n/it.ts
    - apps/deck-builder/src/index.css
    - apps/deck-builder/src/lib/frontmatter.ts
    - apps/deck-builder/src/contexts/CardContext.tsx
    - apps/deck-builder/src/contexts/DeckContext.tsx
    - apps/deck-builder/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Replaced gray-matter with yaml package for browser compatibility (Buffer not available in browser)"
  - "Card count synced in sidebar and header after CRUD operations via DeckContext totalCards state"
  - "Responsive MDEditor: split-pane live preview on desktop, toggle tabs on mobile via matchMedia"
  - "Custom math and image toolbar commands using MDEditor commands API"

patterns-established:
  - "Mail-client layout: narrow card list + flex-1 editor for card authoring"
  - "TagInput chips pattern: Enter to add, X to remove, Backspace for last, auto-lowercase and hyphenate"
  - "MetadataForm collapsible section above editor for structured card metadata"

requirements-completed: [CARD-03, EDIT-01, EDIT-02, EDIT-03]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 39 Plan 02: Card Authoring UI Summary

**Card authoring UI with MDEditor (8-button toolbar, KaTeX math, responsive preview), tag chip input, metadata form, mail-client layout, and full EN/IT i18n coverage**

## Performance

- **Duration:** 8 min (across executor + orchestrator continuation)
- **Started:** 2026-03-12T17:45:00Z
- **Completed:** 2026-03-12T18:12:40Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 13

## Accomplishments
- Built TagInput component with chip add/remove, Backspace last, auto-lowercase/hyphenate
- Built MetadataForm with title validation, TagInput integration, difficulty select, language input
- Built CardListPanel with card rows (title, tags, difficulty), new card button, empty/loading states
- Built CardEditor with MDEditor, 8 toolbar buttons (bold, italic, code, math, heading, list, link, image), KaTeX preview, responsive split/toggle, save/delete flow with SHA tracking
- Refactored DeckDetailPanel into mail-client layout (card list left + editor right, mobile stack)
- Added 46 i18n keys each for EN and IT covering all card CRUD operations
- Fixed gray-matter browser incompatibility by replacing with yaml package
- Fixed card count sync in sidebar/header after CRUD operations

## Task Commits

Each task was committed atomically:

1. **Task 1: TagInput, MetadataForm, CardListPanel + i18n** - `ef21134` (feat)
2. **Task 2: CardEditor + DeckDetailPanel refactor + CSS** - `8d494c9` (feat)
3. **Task 3: Human verification** - approved by user (no commit)

**Orchestrator fixes (part of plan work):**
- `5eaa7ef` - fix: replace gray-matter with yaml for browser compatibility
- `7bdb9bb` - fix: sync card count in sidebar and header after CRUD

## Files Created/Modified
- `apps/deck-builder/src/components/TagInput.tsx` - Chip-based tag input with Enter/Backspace/X controls
- `apps/deck-builder/src/components/MetadataForm.tsx` - Collapsible form for title, tags, difficulty, language
- `apps/deck-builder/src/components/CardListPanel.tsx` - Card list with title, tag badges, difficulty labels
- `apps/deck-builder/src/components/CardEditor.tsx` - MDEditor with toolbar, KaTeX, responsive preview, save/delete
- `apps/deck-builder/src/components/DeckDetailPanel.tsx` - Refactored to mail-client layout
- `apps/deck-builder/src/i18n/en.ts` - 46 card authoring i18n keys (English)
- `apps/deck-builder/src/i18n/it.ts` - 46 card authoring i18n keys (Italian)
- `apps/deck-builder/src/index.css` - MDEditor markdown preview CSS overrides
- `apps/deck-builder/src/lib/frontmatter.ts` - Replaced gray-matter with yaml package
- `apps/deck-builder/src/contexts/CardContext.tsx` - Added card count sync after CRUD
- `apps/deck-builder/src/contexts/DeckContext.tsx` - Added totalCards state for sidebar/header sync
- `apps/deck-builder/package.json` - Added yaml, removed gray-matter
- `pnpm-lock.yaml` - Lock file update

## Decisions Made
- Replaced gray-matter with yaml package: gray-matter depends on Buffer which is not available in browser environments. The yaml package handles YAML parse/stringify directly without Node.js polyfills.
- Card count synced via DeckContext totalCards state: after create/save/delete operations, the card count in the sidebar and header updates reactively.
- Responsive MDEditor: uses window.matchMedia listener for desktop (>=1024px split-pane live preview) vs mobile (toggle tabs between edit and preview).
- Custom MDEditor toolbar commands for math (sigma icon, inserts $$ block) and image URL (image icon, inserts markdown image syntax).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced gray-matter with yaml for browser compatibility**
- **Found during:** Post-Task 2 verification
- **Issue:** gray-matter depends on Buffer which is not defined in browser environments, causing runtime crash
- **Fix:** Replaced gray-matter with yaml package, rewrote parseCard/serializeCard to use yaml.parse/yaml.stringify
- **Files modified:** apps/deck-builder/src/lib/frontmatter.ts, apps/deck-builder/package.json, pnpm-lock.yaml
- **Verification:** App loads and card creation/editing works in browser
- **Committed in:** 5eaa7ef

**2. [Rule 1 - Bug] Synced card count in sidebar and header after CRUD operations**
- **Found during:** Post-Task 2 verification
- **Issue:** Card count in sidebar and header did not update after creating, saving, or deleting cards
- **Fix:** Added totalCards state to DeckContext, updated CardContext to refresh count after CRUD ops
- **Files modified:** apps/deck-builder/src/contexts/CardContext.tsx, apps/deck-builder/src/contexts/DeckContext.tsx
- **Verification:** Card count updates correctly after create/delete operations
- **Committed in:** 7bdb9bb

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correct browser operation. No scope creep.

## Issues Encountered
None beyond the two auto-fixed bugs documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Card authoring UI complete and user-approved -- Phase 39 fully done
- Ready for Phase 40: Deploy & CI/CD to production
- All card CRUD operations working end-to-end through the markdown editor

## Self-Check: PASSED

All 12 files verified present. All 4 commits verified in git log (ef21134, 8d494c9, 5eaa7ef, 7bdb9bb).

---
*Phase: 39-card-authoring*
*Completed: 2026-03-12*
