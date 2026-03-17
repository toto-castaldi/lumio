---
gsd_state_version: 1.0
milestone: v3.4
milestone_name: Landing Page Enhancement
status: active
stopped_at: null
last_updated: "2026-03-17T16:00:00.000Z"
last_activity: 2026-03-17 — Milestone v3.4 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Planning next milestone

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-17 — Milestone v3.4 started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 93 (across v1.1-v3.3)
- Total milestones shipped: 15 (v1.1 through v3.3)
- Timeline: 48 days (2026-01-29 to 2026-03-17)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (101 entries).
v3.3 decisions archived — see PROJECT.md for full table.
- [Phase 47]: Used .limit(1) instead of .single() for access check to handle multiple subscriptions to same repo
- [Phase 47]: Server-side file_path prefix filtering with JS .startsWith() rather than SQL LIKE for subfolder card scoping
- [Phase 48]: Each shared deck subscription counts as separate repository in repositoryCount
- [Phase 48]: Card deduplication via Set for overlapping subscriptions in getStats()

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix version consistency: sync root package.json, add APK upload to CI, show build ref v1.7+42.abc1234 in apps | 2026-02-23 | 8e265b7 | [1-fix-version-consistency-sync-root-packag](./quick/1-fix-version-consistency-sync-root-packag/) |
| 2 | Fix APK download: add create-release CI job with softprops/action-gh-release, create v1.7 release with lumio.apk | 2026-02-23 | d4036ea | [2-fix-apk-download-github-release-apk-is-o](./quick/2-fix-apk-download-github-release-apk-is-o/) |
| 3 | Fix APK version display: pass BUILD_NUMBER and GIT_SHA env vars to build-apk CI job | 2026-02-23 | 54b502f | [3-fix-apk-version-display-pass-build-numbe](./quick/3-fix-apk-version-display-pass-build-numbe/) |
| 4 | Fix version.ts: hardcode build metadata as string literals (not process.env) | 2026-02-23 | 353f6fa | [4-fix-version-ts-hardcode-build-number-and](./quick/4-fix-version-ts-hardcode-build-number-and/) |
| 5 | ho provato la registrazione utente con mail. come da screenshot che trovi nella cartella /home/toto/tmp/screenshot (ultimo file) la UI si comporta bene. Il problema è che NON ho ricevuto email | 2026-03-03 | a1bd90a | [5-ho-provato-la-registrazione-utente-con-m](./quick/5-ho-provato-la-registrazione-utente-con-m/) |
| 6 | Fix i18n countdown interpolation bug on OTP verification screens | 2026-03-03 | d771d4b | [6-fix-i18n-countdown-bug-on-email-verifica](./quick/6-fix-i18n-countdown-bug-on-email-verifica/) |
| 8 | Navigate to Login after successful password update | 2026-03-04 | 6870913 | [8-navigate-to-home-after-successful-passwo](./quick/8-navigate-to-home-after-successful-passwo/) |
| 9 | Use git tag version when higher than STATE.md | 2026-03-04 | 262e189 | [9-use-git-tag-version-when-higher-than-sta](./quick/9-use-git-tag-version-when-higher-than-sta/) |
| Phase 47 P01 | 2min | 2 tasks | 3 files |
| Phase 48 P01 | 2min | 2 tasks | 2 files |
| 260317-l9s | Restrict CI/CD to tag-push-only trigger | 2026-03-17 | cac601d | [260317-l9s-ci-cd-trigger-solo-su-push-tag](./quick/260317-l9s-ci-cd-trigger-solo-su-push-tag/) |

## Session Continuity

Last session: 2026-03-17T14:22:16Z
Stopped at: Completed quick/260317-l9s
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-17 (quick task 260317-l9s completed)*
