# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v2.0 Spaced Repetition -- Phase 23: SRS Schema & Algorithm

## Current Position

Milestone: v2.0
Phase: 23 of 26 (SRS Schema & Algorithm)
Plan: — (ready to plan)
Status: Ready to plan
Last activity: 2026-02-25 — v2.0 roadmap created (4 phases, 9 requirements mapped)

Progress (v2.0): [░░░░░░░░░░] 0%
Progress (overall): 54/54 plans across 7 milestones shipped, v2.0 starting

## Performance Metrics

**Velocity:**
- Total plans completed: 54 (across v1.1 - v1.7)
- Total milestones shipped: 7
- Timeline: 25 days (2026-01-29 to 2026-02-22)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (39 entries).

Key decisions for v2.0:
- SM-2 algorithm via `supermemo ^2.0.23` (not FSRS -- binary quiz input loses FSRS advantage)
- `card_review_schedule` table name (canonical, agreed across research)
- `DATE` type for `next_review_at` (not `TIMESTAMPTZ`) to avoid timezone flip bugs
- Grade 4 = correct (EF unchanged), Grade 1 = incorrect (EF -0.54), floor 1.3, ceiling 2.5
- SM-2 runs client-side in `@lumio/core/src/srs/sm2.ts` (no edge function -- avoids 50-200ms latency)
- Due cards bypass `cardsPerSession` cap; cap applies only to new cards
- No schedule write on skip -- skipped cards remain "new" for future sessions

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

## Session Continuity

Last session: 2026-02-25
Stopped at: v2.0 roadmap created -- Phase 23 ready to plan
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-25 (v2.0 roadmap created)*
