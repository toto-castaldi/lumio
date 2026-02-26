---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Spaced Repetition
status: unknown
last_updated: "2026-02-26T08:17:08.916Z"
progress:
  total_phases: 17
  completed_phases: 17
  total_plans: 40
  completed_plans: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v2.0 Spaced Repetition -- Phase 24: Study Session Integration

## Current Position

Milestone: v2.0
Phase: 24 of 26 (Study Session Integration)
Plan: 2 of 2 complete
Status: Phase Complete
Last activity: 2026-02-26 — Plan 24-02 (SRS Study Session Integration) completed

Progress (v2.0): [████░░░░░░] 40%
Progress (overall): 58/58 plans (54 shipped v1.1-v1.7 + 4 of 4 in Phase 23-24)

## Performance Metrics

**Velocity:**
- Total plans completed: 58 (54 across v1.1-v1.7 + 4 in v2.0)
- Total milestones shipped: 7
- Timeline: 29 days (2026-01-29 to 2026-02-26)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 23    | 01   | 3min     | 2     | 7     |
| 23    | 02   | 3min     | 2     | 3     |
| 24    | 01   | 2min     | 2     | 3     |
| 24    | 02   | 2min     | 2     | 4     |

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
- Thin sm2() wrapper around supermemo: only adds 365-day max interval and 2.5 EF ceiling clamps
- vitest added as @lumio/core test framework; SRS module at packages/core/src/srs/
- content_hash_snapshot uses cards.content_hash (full file SHA-256) for stale detection -- simpler than question-only hash
- Overdue cards bypass p_limit cap; limit applies only to new card slots
- SECURITY DEFINER RPCs with (select auth.uid()) RLS pattern for performance
- upsert_card_review RPC runs SM-2 server-side for atomic schedule updates (not client-side)
- CURRENT_DATE for next_review_at base in upsert to avoid timezone flip bugs
- DROP + re-create get_study_cards_for_session to add content_hash (PostgreSQL RETURNS TABLE limitation)
- Sequential card iteration replaces random selection to preserve SRS ordering (overdue first, then new)
- Fire-and-forget recordCardReview with single retry and writtenBackCardIds dedup set
- effectiveLimit = totalCards (overdue cards already bypass cap in RPC)
- Progress bar uses answeredCount/totalCards for accurate tracking

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

Last session: 2026-02-26
Stopped at: Completed 24-02-PLAN.md (SRS Study Session Integration)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-26 (Plan 24-02 complete)*
