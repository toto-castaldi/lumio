---
phase: 31-account-linking
plan: 01
subsystem: auth
tags: [supabase, google-signin, identity-linking, react-native, i18n]

# Dependency graph
requires:
  - phase: 30-email-login
    provides: AuthContext with email auth methods, recovery flow, OTP verification
provides:
  - AuthContext identity linking methods (linkGoogle, unlinkIdentity, refreshUser, sendPasswordSetupOtp, verifyPasswordSetupOtp, setAccountPassword)
  - Connected accounts UI in SettingsScreen
  - SetPassword and SetPasswordOtp navigation routes (placeholders)
  - i18n keys for all account linking UI in EN and IT
affects: [31-account-linking]

# Tech tracking
tech-stack:
  added: []
  patterns: [addPasswordModeRef to suppress PASSWORD_RECOVERY during add-password flow, identity computation from user.identities]

key-files:
  created: []
  modified:
    - apps/android/contexts/AuthContext.tsx
    - apps/android/screens/SettingsScreen.tsx
    - apps/android/navigation/AppNavigator.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Guard PASSWORD_RECOVERY event with addPasswordModeRef to prevent recovery navigation during add-password OTP flow"
  - "Use Supabase linkIdentity with queryParams for Google token exchange instead of direct token parameter"
  - "Identity rows placed inside existing account section (not a separate section) per CONTEXT.md"

patterns-established:
  - "addPasswordModeRef pattern: useRef boolean to suppress auth event handlers during specific flows"
  - "Identity computation from user.identities with hasMultipleIdentities guard for disconnect buttons"

requirements-completed: [LINK-01, LINK-02, LINK-04]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 31 Plan 01: Account Linking Infrastructure & Settings UI Summary

**Identity linking/unlinking methods in AuthContext with connected accounts display in Settings showing Google and Email rows with Add/Disconnect actions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T12:59:57Z
- **Completed:** 2026-03-02T13:04:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- AuthContext exposes 6 new identity linking methods with 3 loading states and addPasswordModeRef guard
- SettingsScreen displays connected accounts rows (Google + Email) inside existing account section with proper link/unlink actions
- Navigation routes for SetPassword and SetPasswordOtp screens registered with placeholder components
- Full i18n coverage in EN and IT for all account linking strings (settings + auth.linking sections)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add identity linking methods to AuthContext + i18n keys + navigation routes** - `a3e67da` (feat)
2. **Task 2: Add connected accounts section to SettingsScreen with link/unlink actions** - `0a3b11e` (feat)

## Files Created/Modified
- `apps/android/contexts/AuthContext.tsx` - Added linkGoogle, unlinkIdentity, refreshUser, sendPasswordSetupOtp, verifyPasswordSetupOtp, setAccountPassword methods with loading states and addPasswordModeRef
- `apps/android/screens/SettingsScreen.tsx` - Added connected accounts rows (Google + Email) inside account section with link/unlink handlers and toast feedback
- `apps/android/navigation/AppNavigator.tsx` - Added SetPassword and SetPasswordOtp routes with placeholder components
- `apps/android/i18n/en.ts` - Added settings.connectedAccounts/google/emailPassword/add/disconnect and auth.linking section
- `apps/android/i18n/it.ts` - Added Italian translations for all new linking keys

## Decisions Made
- Guarded PASSWORD_RECOVERY handler with addPasswordModeRef to prevent recovery navigation interference during add-password OTP flow
- Used Supabase linkIdentity with queryParams approach for Google token exchange
- Placed identity rows inside existing account section per CONTEXT.md (not a separate section)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for Plan 02: SetPassword and SetPasswordOtp screens (real implementations to replace placeholders)
- All auth infrastructure and i18n keys are in place for the password-setting flow

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (a3e67da, 0a3b11e) verified in git log.

---
*Phase: 31-account-linking*
*Completed: 2026-03-02*
