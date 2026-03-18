---
phase: 49-deck-builder-navigation
plan: 01
subsystem: ui
tags: [landing-page, navigation, html, css, bilingual, deck-builder]

# Dependency graph
requires: []
provides:
  - Header link to deck builder on landing page
  - Hero CTA outline button to deck builder on landing page
  - Bilingual labels (IT/EN) for both navigation elements
affects: [50-popular-decks-leaderboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Outline button style (.btn-deck-builder) with purple border and hover fill"
    - "Header right-side grouping (.header-right) for link + toggle alignment"
    - "Hero button stacking (.hero-buttons) for multiple CTA layout"

key-files:
  created: []
  modified:
    - apps/landing/index.html
    - apps/landing/styles.css

key-decisions:
  - "Italian label uses 'Crea Mazzo' instead of plan's 'Crea Deck' per user feedback"
  - "No JS changes needed -- existing lang toggle handles new span elements automatically"

patterns-established:
  - "Outline CTA pattern: transparent bg, purple border, fills on hover"
  - "Header-right flex container for grouping multiple right-aligned header items"

requirements-completed: [NAV-01, NAV-02]

# Metrics
duration: 12min
completed: 2026-03-18
---

# Phase 49 Plan 01: Deck Builder Navigation Summary

**Header link and hero CTA button linking to deck.lumio.toto-castaldi.com with bilingual IT/EN labels**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-18T08:51:00Z
- **Completed:** 2026-03-18T09:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added purple "Crea Mazzo" / "Create Deck" link in the header, left of the IT/EN language toggle
- Added purple outline "Crea Mazzo" / "Create Deck" CTA button in the hero section, stacked below the amber "Download APK" button
- Both links open deck.lumio.toto-castaldi.com in a new tab with rel="noopener"
- Responsive layout: hero buttons go full-width on mobile (480px breakpoint)
- Bilingual labels switch automatically with existing language toggle (no JS changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add header link and hero CTA button for deck builder** - `5c081bb` (feat)
2. **Task 1 fix: Italian label correction** - `c493ce4` (fix)
3. **Task 2: Visual verification of landing page navigation** - checkpoint approved by user (no code commit)

## Files Created/Modified
- `apps/landing/index.html` - Added header-right wrapper with deck builder link, hero-buttons container with outline CTA button
- `apps/landing/styles.css` - Added .header-right, .header-link, .hero-buttons, .btn-deck-builder styles with responsive rules

## Decisions Made
- Italian label changed from "Crea Deck" to "Crea Mazzo" per user visual review feedback (more natural Italian)
- No changes to script.js -- the existing language toggle automatically handles all `<span lang>` elements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Italian label "Crea Deck" corrected to "Crea Mazzo"**
- **Found during:** Task 2 (visual verification checkpoint)
- **Issue:** Plan specified "Crea Deck" for Italian label, but user noted "Crea Mazzo" is the correct Italian translation
- **Fix:** Updated both occurrences in index.html (header link and hero button) from "Crea Deck" to "Crea Mazzo"
- **Files modified:** apps/landing/index.html
- **Verification:** User visually confirmed the corrected labels
- **Committed in:** c493ce4

---

**Total deviations:** 1 auto-fixed (1 bug fix for label correctness)
**Impact on plan:** Minor text correction. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landing page now has deck builder navigation, ready for Phase 50 (Popular Decks Leaderboard)
- The landing page structure supports adding new sections below the hero

## Self-Check: PASSED

- FOUND: apps/landing/index.html
- FOUND: apps/landing/styles.css
- FOUND: commit 5c081bb (feat: add deck builder navigation)
- FOUND: commit c493ce4 (fix: Italian label correction)
- FOUND: header-link, btn-deck-builder, Crea Mazzo in HTML
- FOUND: .btn-deck-builder in CSS

---
*Phase: 49-deck-builder-navigation*
*Completed: 2026-03-18*
