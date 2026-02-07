---
phase: 03-core-screens
plan: 04
subsystem: ui
tags: [dark-mode, theme, settings, react-native, accessibility]

# Dependency graph
requires:
  - phase: 03-core-screens
    plan: 01
    provides: ThemeProvider, useTheme hook, light/dark palettes, AsyncStorage persistence
provides:
  - "Dark mode toggle in Settings (system/light/dark options)"
  - "Theme-aware LoginScreen (adapts to dark mode)"
  - "Theme-aware OfflineBanner (uses danger color from theme)"
  - "All existing screens now support dark mode consistently"
affects: [04-study-cards]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Inline style merging with theme colors", "Data-driven option rendering for theme picker"]

key-files:
  created: []
  modified:
    - "apps/android/screens/SettingsScreen.tsx"
    - "apps/android/screens/LoginScreen.tsx"
    - "apps/android/components/OfflineBanner.tsx"

key-decisions:
  - "DARK-01: Google brand colors (#4285F4) kept hardcoded per brand guidelines, all other LoginScreen colors use theme"
  - "DARK-02: OfflineBanner text stays white (#ffffff) for contrast against danger background in both themes"

patterns-established:
  - "Theme option picker pattern: data array of {value, label, icon} mapped to TouchableOpacity rows with checkmark indicator"
  - "Inline style override pattern: [styles.static, { dynamicProp: colors.value }] for theme-aware components"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 3 Plan 04: Dark Mode Toggle and Theme Application Summary

**Dark mode toggle with system/light/dark options in Settings, theme colors applied to LoginScreen and OfflineBanner for consistent dark mode support**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-07
- **Completed:** 2026-02-07
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Rewrote SettingsScreen with ScrollView layout containing user info, appearance section with system/light/dark toggle, logout button, and app version footer
- All SettingsScreen colors are dynamic via useTheme() -- no hardcoded color values except white text on colored buttons
- Added Ionicons for each theme option (phone-portrait-outline, sunny-outline, moon-outline) with checkmark indicator for selected preference
- Theme preference persists via AsyncStorage (already wired in ThemeContext from 03-01)
- LoginScreen background, logo, tagline, error text, loading indicator, and config warning all use theme colors
- Google Sign-In button retains brand colors (#4285F4) per brand guidelines
- OfflineBanner background uses theme danger color instead of hardcoded orange

## Task Details

### Task 1: Enhance SettingsScreen with dark mode toggle
- Replaced flat View layout with ScrollView for scrollable content
- Added "Appearance" section header with uppercase styling
- Created data-driven theme picker: array of ThemeOption objects mapped to TouchableOpacity rows
- Each row shows icon + label, with checkmark when selected
- Rows separated by hairline borders using theme border color
- Logout button uses theme danger color
- Added "Lumio v1.0.0" version footer

### Task 2: Apply theme colors to LoginScreen and OfflineBanner
- LoginScreen: imported useTheme, replaced hardcoded #ffffff bg with colors.background, #3B82F6 logo with colors.primary, #6B7280 tagline with colors.textSecondary, #ef4444 error with colors.danger, ActivityIndicator color with colors.primary
- OfflineBanner: imported useTheme, replaced hardcoded #f97316 background with colors.danger

## Files Modified

- `apps/android/screens/SettingsScreen.tsx` -- Complete rewrite: ScrollView layout, useTheme integration, Appearance section with system/light/dark toggle, dynamic colors, Ionicons, version footer
- `apps/android/screens/LoginScreen.tsx` -- Added useTheme import, replaced 5 hardcoded color references with theme colors, kept Google brand colors unchanged
- `apps/android/components/OfflineBanner.tsx` -- Added useTheme import, replaced hardcoded orange background with colors.danger

## Decisions Made

- **DARK-01:** Google Sign-In button colors (#4285F4, white) remain hardcoded per Google brand guidelines. All other LoginScreen colors use theme values.
- **DARK-02:** OfflineBanner and logout button text stays white (#ffffff) for guaranteed contrast against colored backgrounds in both light and dark themes.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- All existing screens (Dashboard, Settings, Login) and components (OfflineBanner, StatCard, EmptyState) now support dark mode
- Theme toggle is accessible from Settings tab
- New screens added in future plans should follow the same useTheme() pattern established here

---
*Phase: 03-core-screens*
*Completed: 2026-02-07*
