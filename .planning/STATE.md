---
gsd_state_version: 1.0
milestone: v3.3
milestone_name: Shared Deck Parity
status: completed
stopped_at: Completed 47-01-PLAN.md
last_updated: "2026-03-17T13:16:53.728Z"
last_activity: 2026-03-17 — Completed 47-01 (Card Fetching & Browsing)
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v3.3 Shared Deck Parity — Phase 47 (Card Fetching & Browsing)

## Current Position

Phase: 47 of 48 (Card Fetching & Browsing)
Plan: 1 of 1 complete
Status: Phase 47 complete
Last activity: 2026-03-17 — Completed 47-01 (Card Fetching & Browsing)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 91 (across v1.1-v3.2)
- Total milestones shipped: 14 (v1.1 through v3.2)
- Timeline: 48 days (2026-01-29 to 2026-03-17)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (96 entries).
Recent decisions affecting current work:
- [Phase 46]: Used discriminated union (kind: 'deck' | 'repo') for type-safe unified FlatList rendering
- [Phase 46]: Skip .lumioignore filtering when subfolderPath is set (shared decks don't have per-user .lumioignore)
- [Phase 46]: Construct fallback Repository object for shared deck CardDetail navigation
- [Phase 47]: Used .limit(1) instead of .single() for access check to handle multiple subscriptions to same repo
- [Phase 47]: Server-side file_path prefix filtering with JS .startsWith() rather than SQL LIKE for subfolder card scoping

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

## Session Continuity

Last session: 2026-03-17T13:14:36.293Z
Stopped at: Completed 47-01-PLAN.md
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-17 (v3.3 roadmap created)*
