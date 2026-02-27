---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Email Auth
status: unknown
last_updated: "2026-02-27T12:40:05.250Z"
progress:
  total_phases: 18
  completed_phases: 18
  total_plans: 42
  completed_plans: 42
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v2.1 Email Auth -- Phase 28 Auth Context Infrastructure

## Current Position

Milestone: v2.1 Email Auth
Phase: 28 of 31 (Auth Context Infrastructure)
Plan: 2 of 2 in current phase
Status: Phase 28 plan 02 complete
Last activity: 2026-02-27 -- Completed 28-02 Auth i18n Keys

Progress: [####......] 40%

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

Last session: 2026-02-27
Stopped at: Completed 28-01-PLAN.md and 28-02-PLAN.md (parallel execution)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-27 (28-02 Auth i18n Keys completed)*
