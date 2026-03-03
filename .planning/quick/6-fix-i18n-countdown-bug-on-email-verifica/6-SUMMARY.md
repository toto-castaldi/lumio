---
phase: quick-6
plan: 01
subsystem: ui
tags: [i18n, i18n-js, react-native, interpolation]

# Dependency graph
requires: []
provides:
  - "Fixed i18n countdown interpolation on all OTP screens"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use i18n-js native interpolation via options object instead of manual .replace()"

key-files:
  created: []
  modified:
    - apps/android/screens/OtpVerificationScreen.tsx
    - apps/android/screens/ForgotPasswordScreen.tsx
    - apps/android/screens/UpdatePasswordScreen.tsx
    - apps/android/screens/SetPasswordOtpScreen.tsx

key-decisions:
  - "Used i18n-js native interpolation (t('key', { seconds: value })) instead of manual .replace() -- aligns with library's designed API"

patterns-established:
  - "i18n interpolation: always pass variables via t() options object, never chain .replace() on translated strings"

requirements-completed: [FIX-I18N-COUNTDOWN]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Quick Task 6: Fix i18n Countdown Bug Summary

**Fixed OTP countdown timer interpolation across 4 screens by replacing manual .replace() with i18n-js native interpolation options**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-03T11:25:34Z
- **Completed:** 2026-03-03T11:26:07Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Fixed countdown timer showing `[missing "seconds" value]` instead of actual seconds on all OTP screens
- Replaced broken `.replace('%{seconds}', String(cooldown))` pattern with `t('auth.otp.resendIn', { seconds: cooldown })` in 4 files
- Countdown now correctly displays "Reinvia tra 51s" (IT) / "Resend in 51s" (EN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace manual .replace() with i18n-js native interpolation in all 4 screens** - `d771d4b` (fix)

## Files Created/Modified
- `apps/android/screens/OtpVerificationScreen.tsx` - Fixed countdown interpolation (line 247)
- `apps/android/screens/ForgotPasswordScreen.tsx` - Fixed countdown interpolation (line 170)
- `apps/android/screens/UpdatePasswordScreen.tsx` - Fixed countdown interpolation (line 320)
- `apps/android/screens/SetPasswordOtpScreen.tsx` - Fixed countdown interpolation (line 273)

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Verification Results
1. `grep -rn ".replace('%{seconds}'" apps/android/screens/` -- 0 results (PASS)
2. `grep -rn "t('auth.otp.resendIn', { seconds:" apps/android/screens/` -- 4 results (PASS)

## Self-Check: PASSED

All 4 modified files exist. Commit d771d4b verified. Summary file created.

---
*Quick Task: 6-fix-i18n-countdown-bug-on-email-verifica*
*Completed: 2026-03-03*
