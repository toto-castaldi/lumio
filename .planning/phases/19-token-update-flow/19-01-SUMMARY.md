---
phase: 19-token-update-flow
plan: 01
subsystem: api, ui
tags: [edge-functions, docora, react-native, bottom-sheet, pat, token-update]

# Dependency graph
requires:
  - phase: 17-sync-failure-backend
    provides: sync error fields (sync_error_message, sync_error_type, is_auth_error) in repositories table
  - phase: 18-sync-error-display
    provides: visual error indicators in RepoListItem and sync status mapping
provides:
  - update_token action in git-sync edge function (Docora PATCH proxy + DB error clearing)
  - updateRepositoryToken exported from @lumio/core
  - RepoErrorModal bottom-sheet component for error details and PAT input
  - ReposScreen integration routing failed repos to error modal
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [bottom-sheet-modal-with-form, conditional-ui-by-error-type, optimistic-error-clearing]

key-files:
  created:
    - apps/android/components/RepoErrorModal.tsx
  modified:
    - supabase/functions/git-sync/index.ts
    - packages/core/src/supabase/repositories.ts
    - packages/core/src/index.ts
    - apps/android/screens/ReposScreen.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "50% sheet height for error modal (simpler content than 80% card preview modal)"
  - "Optimistic error clearing: sync_status set to synced immediately after Docora token update"
  - "No modification to RepoListItem -- existing visual indicators sufficient for actionability"

patterns-established:
  - "Conditional modal content: auth errors show form input, non-auth errors show info only"
  - "Error modal reuse pattern: same component handles both error types with different UI"

requirements-completed: [TOKEN-01, TOKEN-02, TOKUI-01, TOKUI-02, TOKUI-03]

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 19 Plan 01: Token Update Flow Summary

**End-to-end PAT update flow: git-sync update_token action proxying to Docora PATCH API with optimistic error clearing, plus RepoErrorModal bottom-sheet with conditional PAT input for auth errors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T16:18:33Z
- **Completed:** 2026-02-18T16:23:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Backend update_token action validates input, verifies user ownership, proxies PAT to Docora, and optimistically clears all sync error fields
- updateRepositoryToken function exported from @lumio/core for app consumption
- Bottom-sheet RepoErrorModal with auth-error PAT input and non-auth error info display
- ReposScreen routes taps on failed repos to error modal instead of card list; successful update refreshes repo list
- All user-facing strings translated in EN and IT

## Task Commits

Each task was committed atomically:

1. **Task 1: Add update_token action to git-sync and updateRepositoryToken to @lumio/core** - `6dc81c5` (feat)
2. **Task 2: Create RepoErrorModal bottom-sheet and integrate with ReposScreen** - `26b9742` (feat)

## Files Created/Modified
- `supabase/functions/git-sync/index.ts` - Added docoraUpdateToken function and update_token action handler
- `packages/core/src/supabase/repositories.ts` - Added updateRepositoryToken function
- `packages/core/src/index.ts` - Added updateRepositoryToken to exports
- `apps/android/components/RepoErrorModal.tsx` - New bottom-sheet modal for error details and PAT input
- `apps/android/screens/ReposScreen.tsx` - Integrated RepoErrorModal with conditional onPress routing
- `apps/android/i18n/en.ts` - Added tokenUpdate i18n section (13 keys)
- `apps/android/i18n/it.ts` - Added tokenUpdate i18n section (13 keys)

## Decisions Made
- Used 50% screen height for error modal (simpler content vs 80% for card preview)
- Optimistic error clearing: sync_status reset to "synced" immediately after Docora confirms token update, rather than waiting for next sync cycle
- Did not modify RepoListItem -- existing warning/danger icon colors and error message text already indicate actionability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Token update flow is complete end-to-end
- No blockers or concerns
- Phase 19 is the final phase in v1.6 Sync Error Handling milestone

## Self-Check: PASSED

All 7 files verified present. Both task commits (6dc81c5, 26b9742) verified in git log.

---
*Phase: 19-token-update-flow*
*Completed: 2026-02-18*
