---
phase: 03-core-screens
plan: 05
subsystem: android-app
tags: [navigation, pat-input, ux-fix, gap-closure]
requires:
  - 03-01 (Dashboard screen with EmptyState)
  - 03-02 (ReposScreen with AddRepoForm)
  - 03-04 (Dark mode theme system)
provides:
  - Working Dashboard-to-Repos navigation from empty state
  - Usable PAT input flow with submit/cancel/dismiss behavior
affects:
  - 04-study-cards (Dashboard navigation pattern reusable for Study screen)
tech-stack:
  added: []
  patterns:
    - useNavigation with BottomTabNavigationProp for typed tab navigation
    - Callback prop pattern for child-to-parent PAT flow control
key-files:
  created: []
  modified:
    - apps/android/screens/DashboardScreen.tsx
    - apps/android/components/AddRepoForm.tsx
    - apps/android/screens/ReposScreen.tsx
key-decisions:
  - PAT-01: PAT input is plain text (not secureTextEntry) since PATs are paste-and-submit tokens, not memorized passwords
duration: ~3 min
completed: 2026-02-07
---

# Phase 3 Plan 5: UAT Gap Closure (Dashboard Navigation + PAT Usability)

Wire Dashboard empty state "Go to Repositories" button to navigate to Repos tab; fix PAT input visibility, add Submit/Cancel buttons, and auto-dismiss on URL change.

## Performance

- Start: 2026-02-07
- End: 2026-02-07
- Duration: ~3 min
- Tasks: 2/2 complete

## Accomplishments

- Dashboard "Go to Repositories" button now navigates to the Repos tab using typed `useNavigation<BottomTabNavigationProp<MainTabParamList>>()`
- PAT TextInput no longer uses `secureTextEntry` -- users can see what they paste
- Added "Cancel" (outline) and "Submit with Token" (filled primary) buttons below PAT input
- Cancel button clears PAT state and hides the PAT prompt via `onCancel` callback
- URL changes in AddRepoForm dismiss the PAT prompt via `onUrlChange` callback
- All colors use `useTheme()` except `#ffffff` on primary backgrounds (per DARK-02 decision)

## Task Details

### Task 1: Wire Dashboard "Go to Repositories" navigation

**Files modified:** `apps/android/screens/DashboardScreen.tsx`

Changes:
- Added imports: `useNavigation` from `@react-navigation/native`, `BottomTabNavigationProp` from `@react-navigation/bottom-tabs`, `MainTabParamList` from `../navigation/MainNavigator`
- Added `const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()` inside component
- Replaced `console.log('Navigate to Repos')` with `navigation.navigate('Repos')`

### Task 2: Fix PAT input usability (visibility, submit, cancel, dismiss)

**Files modified:** `apps/android/components/AddRepoForm.tsx`, `apps/android/screens/ReposScreen.tsx`

Changes in AddRepoForm.tsx:
- Extended `AddRepoFormProps` with `onCancel?: () => void` and `onUrlChange?: (url: string) => void`
- Removed `secureTextEntry` from PAT TextInput
- Added button row with Cancel (outline, calls `onCancel`) and Submit with Token (filled primary, calls `handleSubmit`)
- Added styles: `patButtonRow`, `cancelButton`, `submitButton`, `cancelButtonText`, `submitButtonText`
- URL TextInput `onChangeText` now also calls `onUrlChange?.(text)`

Changes in ReposScreen.tsx:
- Passed `onCancel={() => setShowPatPrompt(false)}` to AddRepoForm
- Passed `onUrlChange={() => setShowPatPrompt(false)}` to AddRepoForm

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `apps/android/screens/DashboardScreen.tsx` | Modified | Added navigation imports and wired empty state button |
| `apps/android/components/AddRepoForm.tsx` | Modified | Removed secureTextEntry, added Submit/Cancel buttons, added onCancel/onUrlChange props |
| `apps/android/screens/ReposScreen.tsx` | Modified | Passed onCancel and onUrlChange callbacks to AddRepoForm |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| PAT-01 | PAT input uses plain text (no secureTextEntry) | PATs are paste-and-submit tokens, not memorized passwords; users need to verify what they pasted |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Phase 3 is now fully complete with all UAT gaps closed:
- Dashboard navigation works end-to-end
- PAT flow is usable with proper visibility and controls
- All screens support light and dark themes
- TypeScript compiles cleanly

Ready to proceed to Phase 4 (Study & Cards).
