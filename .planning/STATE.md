---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Spaced Repetition
status: unknown
last_updated: "2026-02-26T22:13:46.144Z"
progress:
  total_phases: 20
  completed_phases: 20
  total_plans: 46
  completed_plans: 46
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v2.0 Spaced Repetition -- Phase 26: History Fix & Validation

## Current Position

Milestone: v2.0
Phase: 26 of 26 (History Fix & Validation)
Plan: 2 of 2 complete
Status: Phase Complete
Last activity: 2026-02-26 — Plan 26-01 (Timezone-aware SRS RPCs) completed

Progress (v2.0): [████████░░] 80%
Progress (overall): 62/62 plans (54 shipped v1.1-v1.7 + 8 of 8 in Phase 23-26)

## Performance Metrics

**Velocity:**
- Total plans completed: 62 (54 across v1.1-v1.7 + 8 in v2.0)
- Total milestones shipped: 7
- Timeline: 29 days (2026-01-29 to 2026-02-26)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 23    | 01   | 3min     | 2     | 7     |
| 23    | 02   | 3min     | 2     | 3     |
| 24    | 01   | 2min     | 2     | 3     |
| 24    | 02   | 2min     | 2     | 4     |
| 24    | 03   | 1min     | 1     | 1     |
| 25    | 01   | 3min     | 2     | 5     |
| 26    | 01   | 3min     | 2     | 2     |
| 26    | 02   | 2min     | 2     | 3     |

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
- SRS write-back fires in handleAnswer (immediate) not handleNext (deferred) -- last-card-then-close no longer loses review
- useFocusEffect replaces useEffect for dashboard data fetching -- refreshes on every screen focus including return from study
- Due counter: emerald checkmark at 0, amber alarm when >0 -- urgency/success feedback
- Badge pill inline colors (teal Review, green New) -- semantic SRS indicators, not theme elements
- History card count replaces "All repositories" (repositoryName always null) -- shows meaningful info
- Relative dates in history reuse dashboard i18n keys (dashboard.justNow/mAgo/hAgo/dAgo) -- DRY
- AT TIME ZONE with fallback to CURRENT_DATE on invalid timezone (non-critical degradation)
- Fresh-user due count includes never-reviewed cards (LEFT JOIN WHERE crs.id IS NULL)
- Safety UPDATE before CHECK constraints to fix pre-existing violating rows

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
Stopped at: Completed 26-01-PLAN.md (Timezone-aware SRS RPCs)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-26 (Plan 26-01 complete)*
