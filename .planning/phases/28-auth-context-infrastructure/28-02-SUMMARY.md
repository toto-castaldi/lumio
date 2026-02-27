---
phase: 28-auth-context-infrastructure
plan: 02
subsystem: ui
tags: [i18n, react-native, auth, translations, italian]

# Dependency graph
requires:
  - phase: none
    provides: existing i18n infrastructure (en.ts, it.ts, DeepStringify type)
provides:
  - auth.login.* i18n keys (EN + IT) for email login screen
  - auth.signup.* i18n keys (EN + IT) for signup screen
  - auth.reset.* i18n keys (EN + IT) for password reset screen
  - auth.updatePassword.* i18n keys (EN + IT) for update password screen
affects: [29-auth-screens, 30-auth-flows]

# Tech tracking
tech-stack:
  added: []
  patterns: [auth-namespace-i18n-keys]

key-files:
  created: []
  modified:
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "Keys organized by screen: auth.login.*, auth.signup.*, auth.reset.*, auth.updatePassword.*"
  - "Italian translations use informal tu tone per CONTEXT.md decision"
  - "Error messages guide user to corrective action (e.g., Try signing in instead)"

patterns-established:
  - "Auth i18n namespace: auth.{screen}.{key} convention for all auth-related screens"

requirements-completed: [INFRA-06]

# Metrics
duration: 1min
completed: 2026-02-27
---

# Phase 28 Plan 02: Auth i18n Keys Summary

**~30 auth i18n keys across 4 sub-namespaces (login, signup, reset, updatePassword) in EN and IT with DeepStringify type validation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T12:37:26Z
- **Completed:** 2026-02-27T12:38:44Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added auth.login.* namespace with 9 keys (email/password labels, sign-in, forgot password, error messages)
- Added auth.signup.* namespace with 12 keys (create account, email verification, password validation)
- Added auth.reset.* namespace with 8 keys (reset flow, code sent, rate limiting)
- Added auth.updatePassword.* namespace with 9 keys (new password, success confirmation)
- Italian translations use informal "tu" tone throughout
- DeepStringify type constraint validates EN/IT structural parity at compile time

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth i18n keys to EN and IT translation files** - `a68b847` (feat)

## Files Created/Modified
- `apps/android/i18n/en.ts` - Added auth namespace with ~38 English keys across 4 sub-namespaces
- `apps/android/i18n/it.ts` - Added matching auth namespace with Italian translations (informal "tu" tone)

## Decisions Made
- Keys organized by screen (auth.login.*, auth.signup.*, auth.reset.*, auth.updatePassword.*) for clear mapping to future screen components
- Italian translations use informal "tu" tone (e.g., "Controlla la tua email" not "Controlli la Sua email") per CONTEXT.md
- Error messages include guidance text (e.g., "Try signing in instead" / "Prova ad accedere") for better UX
- Added `or`/`oppure` separator key for login screen layout between Google and email auth
- Added `rateLimited` key for Supabase's `over_email_send_rate_limit` error code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in AuthContext.tsx (missing signUpWithEmail, signInWithEmail, etc. properties) -- this is from plan 28-01 scope, not related to i18n changes. No i18n-related TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth i18n keys ready for immediate use by Phase 29-30 auth screens
- Screens can reference `t('auth.login.signIn')`, `t('auth.signup.title')`, etc.
- DeepStringify ensures any future key additions to EN will require matching IT additions

## Self-Check: PASSED

- FOUND: apps/android/i18n/en.ts
- FOUND: apps/android/i18n/it.ts
- FOUND: 28-02-SUMMARY.md
- FOUND: commit a68b847

---
*Phase: 28-auth-context-infrastructure*
*Completed: 2026-02-27*
