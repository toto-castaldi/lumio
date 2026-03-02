---
phase: 30-email-login-password-reset
plan: 01
subsystem: auth
tags: [supabase, react-native, otp, password-reset, navigation]

# Dependency graph
requires:
  - phase: 29-email-signup-verification
    provides: AuthContext email methods, AuthNavigator 3-screen stack, LoginScreen with email progressive disclosure
provides:
  - verifyRecoveryOtp method in AuthContext (type: 'recovery')
  - updatePassword with global signOut for session invalidation
  - AuthNavigator 5-screen stack (Login, SignUp, OtpVerification, ForgotPassword, UpdatePassword)
  - AppNavigator recovery navigation guard
  - LoginScreen forgot password navigation and resend verification for unverified emails
affects: [30-02-PLAN password reset screens]

# Tech tracking
tech-stack:
  added: []
  patterns: [recovery-navigation-guard, global-signout-on-password-change]

key-files:
  created: []
  modified:
    - apps/android/contexts/AuthContext.tsx
    - apps/android/navigation/AuthNavigator.tsx
    - apps/android/navigation/AppNavigator.tsx
    - apps/android/screens/LoginScreen.tsx
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts

key-decisions:
  - "verifyRecoveryOtp transitions recoveryState to 'updating' so navigation guard keeps user in auth flow"
  - "updatePassword calls signOut({ scope: 'global' }) to invalidate ALL sessions across devices"
  - "Placeholder components used for ForgotPassword/UpdatePassword routes (Plan 02 builds real screens)"

patterns-established:
  - "Recovery navigation guard: AppNavigator shows AuthNavigator when recoveryState !== 'idle' even if authenticated"
  - "Resend verification pattern: showResendLink state toggled on emailNotConfirmed error, navigates to OTP screen"

requirements-completed: [AUTH-04, AUTH-05]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 30 Plan 01: Auth Infrastructure for Password Reset Summary

**Recovery OTP verification, global signOut on password change, 5-screen auth navigator with recovery guard, and resend verification for unverified email logins**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T09:35:10Z
- **Completed:** 2026-03-02T09:38:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- AuthContext exposes verifyRecoveryOtp (type: 'recovery') for password reset OTP flow
- updatePassword invalidates ALL sessions via signOut({ scope: 'global' }) then resets recovery state
- AuthNavigator expanded to 5-screen stack with ForgotPassword and UpdatePassword routes
- AppNavigator guards recovery flow: shows auth screens when recoveryState !== 'idle' even if authenticated
- LoginScreen "Forgot password?" navigates to ForgotPassword screen (replaces console.log placeholder)
- Unverified email login shows resend verification link that calls resendOtp and navigates to OTP screen

## Task Commits

Each task was committed atomically:

1. **Task 1: Add verifyRecoveryOtp and update updatePassword** - `19a9a47` (feat)
2. **Task 2: Expand AuthNavigator, recovery guard, wire forgot password and resend** - `2a4f09c` (feat)

## Files Created/Modified
- `apps/android/contexts/AuthContext.tsx` - Added verifyRecoveryOtp method, updated updatePassword with global signOut
- `apps/android/navigation/AuthNavigator.tsx` - Added ForgotPassword and UpdatePassword routes with placeholder components
- `apps/android/navigation/AppNavigator.tsx` - Added recovery navigation guard using recoveryState
- `apps/android/screens/LoginScreen.tsx` - Wired forgot password navigation, added resend verification for unverified emails
- `apps/android/i18n/en.ts` - Added resendVerification and verificationResent keys
- `apps/android/i18n/it.ts` - Added Italian translations for resend verification

## Decisions Made
- verifyRecoveryOtp transitions recoveryState to 'updating' (not updatePassword) so the state machine is clean
- updatePassword calls signOut({ scope: 'global' }) to invalidate ALL sessions across devices per CONTEXT.md
- Placeholder components used for ForgotPassword/UpdatePassword routes — Plan 02 builds the real screens
- Resend verification navigates to OtpVerification screen so user can enter the new code immediately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for 30-02: ForgotPassword and UpdatePassword screen implementation
- All plumbing in place: routes, navigation guard, context methods, i18n keys
- Placeholder components in AuthNavigator will be replaced by real screens in Plan 02

## Self-Check: PASSED

All 6 modified files verified on disk. Both task commits (19a9a47, 2a4f09c) confirmed in git log.

---
*Phase: 30-email-login-password-reset*
*Completed: 2026-03-02*
