---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Email Auth
status: in-progress
last_updated: "2026-03-02T09:44:32Z"
progress:
  total_phases: 19
  completed_phases: 19
  total_plans: 45
  completed_plans: 45
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v2.1 Email Auth -- Phase 30 Email Login & Password Reset

## Current Position

Milestone: v2.1 Email Auth
Phase: 30 of 31 (Email Login & Password Reset)
Plan: 2 of 2 in current phase (COMPLETE)
Status: Phase 30 Complete
Last activity: 2026-03-02 -- Completed 30-02 Password Reset Screens

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 62 (across v1.1-v2.0)
- Total milestones shipped: 8
- Timeline: 29 days (2026-01-29 to 2026-02-26)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 27 | 01 | 1min | 2 | 3 |
| 27 | 02 | 1min | 1 | 1 |
| 28 | 02 | 1min | 1 | 2 |
| Phase 28 P01 | 2min | 1 tasks | 1 files |
| 29 | 01 | 3min | 2 | 5 |
| 29 | 02 | 2min | 2 | 3 |
| 30 | 01 | 3min | 2 | 6 |
| 30 | 02 | 3min | 2 | 3 |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (50 entries).
- [Phase 27]: OTP templates use table-based layout with inline CSS for email client compatibility
- [Phase 27]: Use raw_app_meta_data provider field for explicit provider detection in handle_new_user trigger
- [Phase 28]: Auth i18n keys organized by screen: auth.login.*, auth.signup.*, auth.reset.*, auth.updatePassword.*
- [Phase 28]: Italian translations use informal "tu" tone for auth screens
- [Phase 28]: Error messages include corrective action guidance
- [Phase 28]: Guard GoogleSignin.signOut() with hasPreviousSignIn() for email-only user safety
- [Phase 28]: Persist recovery state to AsyncStorage to survive app restarts during password reset flow
- [Phase 29]: Email-first progressive disclosure: email + Continue button reveals password field
- [Phase 29]: Dual-auth layout with equal visual weight: Google button -> separator -> email form
- [Phase 29]: Read-only email field with pencil icon as back affordance in password step
- [Phase 29]: Single password field with eye toggle, no confirm password (display name from email prefix)
- [Phase 29]: OTP wrong code triggers shake animation + clear digits for polished retry UX
- [Phase 29]: OTP back button navigates to Login (not signup) since user already signed up
- [Phase 29]: First OTP digit box allows maxLength=6 for paste support
- [Phase 30]: verifyRecoveryOtp transitions to 'updating' state; updatePassword calls signOut({ scope: 'global' })
- [Phase 30]: Recovery navigation guard keeps user in auth flow even when authenticated during password reset
- [Phase 30]: Resend verification navigates to OtpVerification for immediate code entry
- [Phase 30]: Single password field on UpdatePasswordScreen, no confirm password (per CONTEXT.md)
- [Phase 30]: Two-phase screen pattern: OTP verification transitions to password entry within same component

### Pending Todos

None.

### Blockers/Concerns

- **Phase 31 gate:** SecureStore JWT size for dual-identity users must be measured during Phase 27. If over 1500 bytes, MMKV+SecureStore pattern needed before account linking.
- **Phase 31 spike:** linkIdentity() native behavior is MEDIUM confidence -- browser PKCE flow vs native SDK needs testing. Fallback: Supabase automatic same-email merging.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix version consistency: sync root package.json, add APK upload to CI, show build ref v1.7+42.abc1234 in apps | 2026-02-23 | 8e265b7 | [1-fix-version-consistency-sync-root-packag](./quick/1-fix-version-consistency-sync-root-packag/) |
| 2 | Fix APK download: add create-release CI job with softprops/action-gh-release, create v1.7 release with lumio.apk | 2026-02-23 | d4036ea | [2-fix-apk-download-github-release-apk-is-o](./quick/2-fix-apk-download-github-release-apk-is-o/) |
| 3 | Fix APK version display: pass BUILD_NUMBER and GIT_SHA env vars to build-apk CI job | 2026-02-23 | 54b502f | [3-fix-apk-version-display-pass-build-numbe](./quick/3-fix-apk-version-display-pass-build-numbe/) |
| 4 | Fix version.ts: hardcode build metadata as string literals (not process.env) | 2026-02-23 | 353f6fa | [4-fix-version-ts-hardcode-build-number-and](./quick/4-fix-version-ts-hardcode-build-number-and/) |

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 30-02-PLAN.md
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-02 (30-02 Password Reset Screens completed)*
