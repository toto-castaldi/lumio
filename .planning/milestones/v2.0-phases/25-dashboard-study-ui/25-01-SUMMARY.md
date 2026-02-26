---
phase: 25-dashboard-study-ui
plan: 01
subsystem: ui
tags: [react-native, i18n, srs, dashboard, study-session, useFocusEffect]

# Dependency graph
requires:
  - phase: 23-srs-scheduling
    provides: getDueCardCount RPC, SRSStudyCard.isReview field
provides:
  - Due today counter StatCard on Dashboard with contextual icon/color
  - Dynamic study button text showing due card count
  - useFocusEffect-based dashboard refresh on screen focus
  - Review/New badge pill on ProgressBar during study sessions
  - i18n keys for all new UI elements (en + it)
affects: [dashboard, study-session, ux-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [useFocusEffect for screen-return refresh, conditional StatCard icon/color]

key-files:
  created: []
  modified:
    - apps/android/screens/DashboardScreen.tsx
    - apps/android/components/study/ProgressBar.tsx
    - apps/android/screens/StudyScreen.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "useFocusEffect replaces useEffect for dashboard data fetching -- refreshes on every screen focus including return from study"
  - "Due counter shows checkmark-circle-outline (emerald) at 0, alarm-outline (amber) when > 0 for urgency/success feedback"
  - "Badge pill uses inline colors (teal #0d9488 for Review, green #16a34a for New) -- no theme extension needed"
  - "Badge reads directly from session.currentCard.isReview (cast to SRSStudyCard) to avoid stale state"

patterns-established:
  - "useFocusEffect pattern: fetch on focus with cancelled flag for cleanup"
  - "Conditional StatCard: dual icon/color based on value state (0 vs >0)"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 25 Plan 01: Dashboard Study UI Summary

**Due today counter with contextual icon/color on Dashboard, dynamic study button text, and Review/New badge pill during study sessions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T13:17:32Z
- **Completed:** 2026-02-26T13:20:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Dashboard shows "Due Today" StatCard with count from getDueCardCount() RPC, contextual icon (checkmark/emerald at 0, alarm/amber when >0), and "All caught up!" text when no cards are due
- Study button dynamically shows "Study N due cards" when due > 0, falls back to "Start Study Session" when 0
- Dashboard data refreshes on every screen focus via useFocusEffect (not just initial mount)
- ProgressBar displays colored Review (teal) or New (green) badge pill during study sessions, driven by SRSStudyCard.isReview
- All new strings fully localized in both English and Italian

## Task Commits

Each task was committed atomically:

1. **Task 1: Add i18n keys + due counter + dynamic button on Dashboard** - `c4cff16` (feat)
2. **Task 2: Add Review/New badge pill to ProgressBar and wire in StudyScreen** - `c213ea2` (feat)

## Files Created/Modified
- `apps/android/i18n/en.ts` - Added dueToday, allCaughtUp, studyNDueCards, reviewBadge, newBadge keys
- `apps/android/i18n/it.ts` - Added matching Italian translations for all new keys
- `apps/android/screens/DashboardScreen.tsx` - useFocusEffect refresh, getDueCardCount call, due StatCard, dynamic study button
- `apps/android/components/study/ProgressBar.tsx` - Added optional badgeText/isReview props with colored pill rendering
- `apps/android/screens/StudyScreen.tsx` - Wired badge from session.currentCard.isReview to ProgressBar

## Decisions Made
- Used useFocusEffect (not useEffect) so dashboard updates every time user returns from study -- satisfies success criteria for auto-refresh
- Dual icon/color scheme: emerald checkmark for "all caught up" vs amber alarm when cards are due -- provides immediate urgency/success feedback
- Badge colors are inline (teal/green) rather than theme-derived -- badges are semantic SRS indicators, not theme elements
- Cast session.currentCard to SRSStudyCard to access isReview -- avoids adding type to base StudyCard interface

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All dashboard and study UI enhancements in place
- Ready for UAT verification or further UX polish phases

## Self-Check: PASSED

All 5 modified files exist on disk. Both task commits (c4cff16, c213ea2) verified in git log.

---
*Phase: 25-dashboard-study-ui*
*Completed: 2026-02-26*
