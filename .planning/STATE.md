---
gsd_state_version: 1.0
milestone: v3.2
milestone_name: Deck Management UX
status: in-progress
stopped_at: Completed 46-02-PLAN.md (Phase 46 complete)
last_updated: "2026-03-17T09:53:21Z"
last_activity: 2026-03-17 — Completed 46-02 (Shared Deck UI)
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 46 - Shared Deck Interaction

## Current Position

Phase: 46 of 46 (Shared Deck Interaction)
Plan: 2 of 2
Status: Phase 46 complete
Last activity: 2026-03-17 — Completed 46-02 (Shared Deck UI)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 88 (70 across v1.1-v2.3 + 10 in v3.0 + 8 in v3.1)
- Total milestones shipped: 13 (v1.1 through v3.1)
- Timeline: 47 days (2026-01-29 to 2026-03-16)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (92 entries).
v3.1 decisions archived -- see PROJECT.md for full table.
- [Phase 45]: Used post-query array filter for is_platform exclusion (simpler than nested Supabase filter syntax)
- [Phase 45]: Used sentinel error string PLATFORM_REPO for client-side detection of platform repo rejection
- [Phase 46]: Used SECURITY DEFINER RPC for atomic unsubscribe (deletes card_review_schedule + user_repositories in single transaction)
- [Phase 46]: Kept existing unsubscribeFromDeck for backward compatibility, added new unsubscribeDeckRpc alongside
- [Phase 46]: Used discriminated union (kind: 'deck' | 'repo') for type-safe unified FlatList rendering
- [Phase 46]: Skip .lumioignore filtering when subfolderPath is set (shared decks don't have per-user .lumioignore)
- [Phase 46]: Construct fallback Repository object for shared deck CardDetail navigation

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
| Phase 41 P01 | 5min | 2 tasks | 3 files |
| Phase 41 P02 | 3min | 2 tasks | 2 files |
| Phase 42 P02 | 1min | 1 tasks | 1 files |
| Phase 42 P01 | 2min | 2 tasks | 1 files |
| Phase 43 P01 | 2min | 1 tasks | 3 files |
| Phase 43 P02 | 5min | 3 tasks | 4 files |
| Phase 44 P01 | 2min | 2 tasks | 4 files |
| Phase 44 P02 | 8min | 4 tasks | 6 files |
| Phase 45 P01 | 2min | 2 tasks | 5 files |
| Phase 46 P01 | 2min | 2 tasks | 6 files |
| Phase 46 P02 | 4min | 2 tasks | 3 files |

## Session Continuity

Last session: 2026-03-17T09:53:21Z
Stopped at: Completed 46-02-PLAN.md (Phase 46 complete)

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-17 (v3.2 roadmap created)*
