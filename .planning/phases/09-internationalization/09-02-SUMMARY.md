---
phase: 09-internationalization
plan: 02
subsystem: ui
tags: [i18n, i18n-js, t-function, screen-translation, interpolation, useCallback-deps]

# Dependency graph
requires:
  - phase: 09-01
    provides: "useI18n hook, t() function, EN/IT translation files with ~85 keys"
provides:
  - "All 5 remaining screen files translated via t() calls"
  - "LoginScreen: tagline, error, button, accessibility label translated"
  - "DashboardScreen: stat labels, relative time, empty state, study button translated"
  - "ReposScreen: all Toast.show, Alert.alert, and empty state strings translated"
  - "StudyScreen: all 4 states + header + bottom bars translated"
  - "StudySummaryScreen: title, score, stat labels, return button translated"
  - "MainNavigator: tab titles translated"
affects: [09-03, all-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [t-parameter-for-module-level-functions, useCallback-t-dependency, useEffect-t-dependency]

key-files:
  created: []
  modified:
    - apps/android/screens/LoginScreen.tsx
    - apps/android/screens/DashboardScreen.tsx
    - apps/android/screens/ReposScreen.tsx
    - apps/android/screens/StudyScreen.tsx
    - apps/android/screens/StudySummaryScreen.tsx
    - apps/android/navigation/MainNavigator.tsx

key-decisions:
  - "formatLastStudied accepts t as parameter (module-level function outside component cannot use hooks)"
  - "t added to useCallback/useEffect dependency arrays to ensure locale changes propagate to callbacks"
  - "Card content and AI-generated quiz questions intentionally left untranslated (I18N-04)"

patterns-established:
  - "Module-level helper functions that need translations accept t as a parameter"
  - "Imperative calls (Toast.show, Alert.alert) call t() at invocation time inside handlers"
  - "useCallback dependencies include t when handler references translation strings"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 9 Plan 2: Screen Translation Summary

**All 5 remaining screens (Login, Dashboard, Repos, Study, StudySummary) translated from hardcoded English to t() calls with i18n-js interpolation for dynamic values**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-09T17:53:41Z
- **Completed:** 2026-02-09T18:00:04Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced every hardcoded English string across all 5 screen files with t() translation calls
- Dynamic strings use i18n-js %{variable} interpolation (repo names, card counts, time durations)
- Imperative calls (Toast.show, Alert.alert) invoke t() at call time inside handlers for correct locale
- Module-level formatLastStudied function accepts t parameter since it cannot use hooks
- Added t to useCallback and useEffect dependency arrays to ensure locale changes trigger re-renders

## Task Commits

Each task was committed atomically:

1. **Task 1: Translate LoginScreen, DashboardScreen, and ReposScreen** - `55302d1` (feat)
2. **Task 2: Translate StudyScreen and StudySummaryScreen** - `4467960` (feat)

## Files Created/Modified
- `apps/android/screens/LoginScreen.tsx` - Translated tagline, sign-in button, error fallback, config warning, accessibility label
- `apps/android/screens/DashboardScreen.tsx` - Translated stat labels, relative time via t-parameter pattern, empty state, study button
- `apps/android/screens/ReposScreen.tsx` - Translated all Toast.show (add/delete/error), Alert.alert (delete confirm), empty state
- `apps/android/screens/StudyScreen.tsx` - Translated all 4 states (loading, no_cards, ready, studying) + completed + header + bottom bars + quit alert
- `apps/android/screens/StudySummaryScreen.tsx` - Translated title, score label, correct/incorrect/skipped/time labels, return button
- `apps/android/navigation/MainNavigator.tsx` - Translated tab bar titles (Repositories, Settings)

## Decisions Made
- **formatLastStudied t-parameter:** Since formatLastStudied is a module-level function defined outside the component, it cannot call useI18n(). Instead, the component passes t as a parameter. This is the correct pattern for helper functions outside React component scope.
- **Dependency arrays:** Added t to useCallback deps for fetchRepos, handleAddRepo, handleDeleteRepo, and to useEffect deps for the beforeRemove quit alert. The t function is recreated when locale changes (via useCallback([locale]) in the context), which correctly causes these callbacks to use updated translations.
- **Card content untranslated:** Card content and AI-generated quiz questions are intentionally NOT translated -- they remain in their original language per I18N-04 requirement.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All screen-level UI text is now translated -- every screen responds to language changes
- Plan 09-03 can proceed to translate remaining component-level strings (AddRepoForm, QuizCard, CardPreviewModal, etc.)
- After 09-03, 100% of user-visible UI text will be internationalized

## Self-Check: PASSED

- All 6 modified files verified on disk
- Commit 55302d1 (Task 1) verified in git log
- Commit 4467960 (Task 2) verified in git log
- TypeScript compilation passes cleanly
- useI18n imported and t() destructured in all 5 screen files + MainNavigator

---
*Phase: 09-internationalization*
*Completed: 2026-02-09*
