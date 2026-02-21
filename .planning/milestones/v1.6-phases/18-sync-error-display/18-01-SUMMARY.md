---
phase: 18-sync-error-display
plan: 01
subsystem: ui
tags: [react-native, sync-status, error-display, i18n, theme]

# Dependency graph
requires:
  - phase: 17-sync-failure-backend
    provides: "sync_error_type, is_auth_error, sync_failed_at DB columns and webhook handler"
provides:
  - "SyncStatus type with 'failed' value"
  - "Repository interface with syncErrorType, isAuthError, syncFailedAt fields"
  - "mapRepository mapping for all new sync error fields"
  - "Warning/warningLight colors in theme (amber palette)"
  - "Sync status i18n translations (EN/IT)"
  - "RepoListItem with full sync status visualization (failed/syncing/pending/synced)"
affects: [19-token-update-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: ["amber-for-auth-errors-red-for-system-errors color coding pattern"]

key-files:
  created: []
  modified:
    - packages/shared/src/types/index.ts
    - packages/core/src/supabase/repositories.ts
    - supabase/functions/git-sync/index.ts
    - apps/android/lib/theme.ts
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts
    - apps/android/components/RepoListItem.tsx

key-decisions:
  - "Auth errors use amber warning color (user-fixable), non-auth errors use red danger color (system issue)"
  - "Error message shown as third line below URL, making failed repos visually taller"
  - "Syncing state uses ActivityIndicator spinner + text, pending uses clock icon + text"

patterns-established:
  - "Warning color pattern: colors.warning for user-actionable issues, colors.danger for system errors"
  - "Sync status indicator pattern: trailing icons in repo list row for visual state"

requirements-completed: [ERRDSP-01, ERRDSP-02]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 18 Plan 01: Sync Error Display Summary

**Sync error indicators in repo list with amber/red color coding, status icons for all sync states, and i18n error messages in EN/IT**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T16:01:27Z
- **Completed:** 2026-02-18T16:04:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended SyncStatus type and Repository interface with Phase 17 error fields (syncErrorType, isAuthError, syncFailedAt)
- Added warning/warningLight amber colors to both light and dark theme palettes
- RepoListItem now displays distinct visual indicators for all 4 sync states: synced (clean), syncing (spinner), pending (clock), failed (warning/alert icons)
- Auth errors displayed in amber (user-fixable), non-auth errors in red (system issue)
- Error message from Docora shown as third line below URL for failed repos
- Added sync status i18n translations in both English and Italian

## Task Commits

Each task was committed atomically:

1. **Task 1: Update types, mapping, edge function types, theme, and i18n** - `cb6c24f` (feat)
2. **Task 2: Add sync status indicators and error messages to RepoListItem** - `61e2ec8` (feat)

## Files Created/Modified
- `packages/shared/src/types/index.ts` - Added 'failed' to SyncStatus, syncErrorType/isAuthError/syncFailedAt to Repository
- `packages/core/src/supabase/repositories.ts` - Added mapping for new sync error fields in mapRepository
- `supabase/functions/git-sync/index.ts` - Updated local SyncStatus and Repository types with 'failed' and error fields
- `apps/android/lib/theme.ts` - Added warning (#f59e0b) and warningLight (#FEF3C7) to light/dark palettes
- `apps/android/i18n/en.ts` - Added syncStatus section with pending/syncing/authError/syncError/unknownError
- `apps/android/i18n/it.ts` - Added matching Italian syncStatus translations
- `apps/android/components/RepoListItem.tsx` - Full sync status visualization with icons, colors, and error messages

## Decisions Made
- Auth errors use amber warning color (user-fixable in Phase 19), non-auth errors use red danger color (system issue)
- Error message renders as third line below URL, making failed repo rows visually taller to draw attention
- Syncing uses both ActivityIndicator spinner icon and "Syncing..." text label
- No "tap to update token" hint since Phase 19 (token update flow) isn't built yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sync error display is complete, ready for Phase 19 (token update flow) which will add actionable UI for auth errors
- Warning color palette established for reuse in future auth-related UX

## Self-Check: PASSED

All 8 files verified present. Both task commits (cb6c24f, 61e2ec8) verified in git log.

---
*Phase: 18-sync-error-display*
*Completed: 2026-02-18*
