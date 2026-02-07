---
phase: 03-core-screens
plan: 03
subsystem: ui, repos
tags: [repository-management, swipeable, flatlist, toast, gesture-handler, react-native]

# Dependency graph
requires:
  - phase: 03-core-screens/01
    provides: "@lumio/core singleton, theme system, GestureHandlerRootView, Toast"
provides:
  - "RepoListItem with swipe-to-delete and private repo indicator"
  - "AddRepoForm with URL validation and PAT prompt for private repos"
  - "ReposScreen with FlatList, pull-to-refresh, empty state, CRUD operations"
affects: [03-core-screens/04, 04-study-cards]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Swipeable list items via react-native-gesture-handler", "Toast notifications for CRUD feedback", "Auto-detection of private repos with PAT fallback"]

key-files:
  created:
    - "apps/android/components/RepoListItem.tsx"
    - "apps/android/components/AddRepoForm.tsx"
  modified:
    - "apps/android/screens/ReposScreen.tsx"

key-decisions: []

patterns-established:
  - "Swipeable + ref pattern: close swipeable before triggering action callback"
  - "Error-based private repo detection: 404/not-found triggers PAT prompt"
  - "FlatList with contentContainerStyle flexGrow for centered empty state"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 03: Repository Management Screen Summary

**Swipeable repo list with add form (URL + PAT fallback), delete confirmation, pull-to-refresh, and themed empty state**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-07T08:37:25Z
- **Completed:** 2026-02-07T08:38:56Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 rewritten)

## Accomplishments
- Created RepoListItem component with Swipeable gesture for delete, lock icon for private repos, truncated URL display
- Created AddRepoForm component with GitHub URL validation, loading state, and conditional PAT input for private repos
- Rewrote ReposScreen from placeholder to full CRUD screen: FlatList of repos, add form, swipe-to-delete with Alert confirmation, pull-to-refresh, Toast notifications, loading spinner, themed empty state
- All components use useTheme() for dark mode support -- zero hardcoded colors

## Task Details

### Task 1: Create RepoListItem and AddRepoForm components

**RepoListItem** (`apps/android/components/RepoListItem.tsx`):
- Swipeable row using legacy `Swipeable` from react-native-gesture-handler (Reanimated version not available since react-native-reanimated is not a dependency)
- Right swipe action reveals red delete button with trash icon
- Row displays repo name (semibold), lock icon for private repos, truncated URL
- Ref-based close() call before triggering onDelete callback

**AddRepoForm** (`apps/android/components/AddRepoForm.tsx`):
- URL TextInput with GitHub URL regex validation
- Add button with ActivityIndicator during loading
- Conditional PAT section shown when `showPatPrompt` is true
- PAT input is secureTextEntry for privacy
- Form clears on successful submission

### Task 2: Rewrite ReposScreen with full repository management

**ReposScreen** (`apps/android/screens/ReposScreen.tsx`):
- Uses `getUserRepositories`, `addRepository`, `deleteRepository` from `@lumio/core`
- State: repositories, isLoading, isRefreshing, isAdding, showPatPrompt
- `handleAddRepo`: calls addRepository with optional PAT; on 404/private error without PAT, enables PAT prompt; on success shows Toast and refetches
- `handleDeleteRepo`: Alert.alert confirmation dialog; on confirm deletes and shows Toast
- FlatList with pull-to-refresh via onRefresh/refreshing
- EmptyState component (already existed from 03-02) for empty list
- Loading spinner during initial fetch
- All colors from useTheme()

## Files Created/Modified
- `apps/android/components/RepoListItem.tsx` (created) - Swipeable repo row with lock icon and delete action
- `apps/android/components/AddRepoForm.tsx` (created) - URL input with PAT prompt for private repos
- `apps/android/screens/ReposScreen.tsx` (rewritten) - Full repository management screen

## Decisions Made
None -- plan executed as written.

## Deviations from Plan

None -- plan executed exactly as written. The EmptyState component referenced in the plan already existed from 03-02.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Repository management screen is fully functional for CRUD operations
- Swipe-to-delete pattern established and reusable for other list screens
- EmptyState pattern consistent across screens
- Ready for 03-04 (Settings/Profile screen) to complete Phase 3 core screens

---
*Phase: 03-core-screens*
*Completed: 2026-02-07*
