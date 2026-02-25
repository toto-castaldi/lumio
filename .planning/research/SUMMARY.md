# Project Research Summary

**Project:** Lumio v2.0 — Spaced Repetition System
**Domain:** SRS algorithm integration into existing React Native flashcard app
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

Lumio v2.0 adds a spaced repetition system to an existing, functional flashcard app. The domain is well-understood: SM-2, invented by Piotr Wozniak in 1987 and used by Anki for over a decade, is the correct algorithm for this use case. Lumio's quiz model is binary correct/incorrect (multiple choice), which maps cleanly to SM-2 quality grades 4 (correct) and 1 (incorrect). The more powerful FSRS algorithm is explicitly ruled out because it requires 4-level user ratings to outperform SM-2 — binary input destroys its advantage. The recommended package is `supermemo ^2.0.23`, a 2KB pure-TypeScript SM-2 implementation with zero dependencies and no native rebuild required.

The architecture change is surgical: one new database table (`card_review_schedule` with 6 core columns), two new Supabase RPC functions, one new `@lumio/core` module (`sm2.ts`), and targeted modifications to 4 existing files (`useStudySession.ts`, `DashboardScreen.tsx`, `StudyScreen.tsx`, `StudyHistoryScreen.tsx`). No new React Native packages are required beyond the `supermemo` npm package. The SM-2 computation runs client-side in `@lumio/core` — fire-and-forget, 30 lines of pure math — and the schedule is persisted to Supabase via UPSERT. The existing `study_sessions` table is left completely untouched.

The primary risks are schema design decisions that cannot be changed after shipping: `due_date` must be stored as `DATE` (not `TIMESTAMPTZ`) to avoid timezone-related "due today" bugs, SRS state must reset when card content changes (Docora webhook updates `cards.updated_at` — this signal must trigger stale-schedule invalidation), and card selection must use LEFT JOIN (not INNER JOIN) to avoid a cold-start bug where new users see 0 cards due. All three are solvable at the data model phase before writing application code.

## Key Findings

### Recommended Stack

The existing Lumio stack (Expo SDK 54, React Native 0.81, react-navigation, Supabase, TypeScript) requires only one new package: `supermemo ^2.0.23`. All other SRS requirements — dashboard counter, session badge, card mix logic — are implemented using existing StyleSheet patterns, Ionicons, and Supabase RPC conventions already in the project. No native rebuild is required.

**Core technologies:**
- `supermemo ^2.0.23`: SM-2 algorithm — correct algorithm for binary quiz input, 2KB pure TypeScript, no native dependencies, install with `pnpm --filter @lumio/core add supermemo`
- Supabase `card_review_schedule` table: per-user per-card SRS state (interval, ease_factor, repetitions, next_review_at) — indexed on `(user_id, next_review_at)` for efficient due-card queries
- `packages/core/src/srs/sm2.ts` (new file): client-side SM-2 computation, called synchronously in `handleNext()` with fire-and-forget DB write

**Explicitly rejected:**
- `ts-fsrs` (FSRS v6): requires 4-level ratings; binary quiz input loses its scheduling advantage over SM-2; requires 7+ DB columns vs 3
- Edge function for SM-2 calculation: adds 50-200ms latency per card answer for trivial math; `study-planner` edge function stub can be deleted

### Expected Features

**Must have (table stakes):**
- Per-card scheduling based on answer correctness — correct = longer interval, wrong = resets to 1 day; without this, Lumio remains a random quiz
- Due cards queue (review before new) — most overdue cards first, then new cards fill remaining session slots
- Dashboard "cards due today" counter — primary motivator for daily study; every SRS app shows this prominently on the home screen
- Session mix: due cards + new cards — automatic proportioning with no user configuration (leverages existing `cardsPerSession` presets)
- Review/New indicator during study — small "Review" / "New" badge near progress bar; sets user expectations per card
- Study history: show card count instead of "All repositories" — existing bug fix (`StudyHistoryScreen` always shows null `repository_name`; independent of SRS work)

**Should have (differentiators):**
- Automatic due/new proportioning — no Anki-style "new cards per day" setting; proportioning is implicit from session limit (due cards fill slots first)
- Easiness factor per card (adaptive difficulty) — EF starts at 2.5, decreases on wrong answers, floor at 1.3, ceiling at 2.5; 365-day maximum interval cap
- Overdue card priority boost — `ORDER BY next_review_at ASC` in RPC ensures most-overdue cards surface first within each session

**Defer to future milestone:**
- FSRS algorithm upgrade (needs 400+ reviews per user to calibrate; migrate later when review data exists)
- Push notifications for due cards (out of scope per PROJECT.md)
- Per-card statistics detail (individual review history, EF curve)
- Full SM-2 grade scale (0-5 buttons) — redundant given binary multiple-choice quiz
- Undo/reschedule button — undermines algorithm integrity; existing forward-only study flow aligns with this

### Architecture Approach

The architecture follows a strict layered dependency chain: database schema first (migration), then shared types, then core library functions, then app hook changes, then UI. SM-2 runs client-side in `@lumio/core/src/srs/sm2.ts` to avoid per-card-answer network latency. The DB write is fire-and-forget (same pattern as existing `saveStudySession`). The `study_sessions` table is append-only and untouched. Card ordering (due-first, new-second) is handled in a new Supabase RPC function, not in client code. All modifications are additive — no existing functionality is removed.

**Major components:**
1. `supabase/migrations/YYYYMMDD_card_review_schedule.sql` — New table + `get_due_card_count` RPC + `get_study_cards_for_session` RPC; all SRS schema in one migration file with RLS, indexes, and stale-content snapshot column
2. `packages/core/src/srs/sm2.ts` (new) — Pure SM-2 function: takes `{quality, easeFactor, interval, repetitions}`, returns `{easeFactor, interval, repetitions, nextReviewAt}`
3. `packages/core/src/supabase/study.ts` (modified) — Three new exports: `updateReviewSchedule()`, `getDueCardCount()`, `getStudyCardsForSession()`
4. `apps/android/hooks/useStudySession.ts` (modified) — Replaces `selectRandomCard()` with due-first-then-new ordering; calls `updateReviewSchedule()` fire-and-forget in `handleNext()`; tracks `isReview` flag per card
5. UI modifications (3 screens) — `DashboardScreen` (new "Cards Due" StatCard), `StudyScreen` (Review/New badge), `StudyHistoryScreen` (card count bug fix)

**Key patterns to follow:**
- UPSERT pattern: `Prefer: resolution=merge-duplicates` on `card_review_schedule` REST writes (first review creates row, subsequent reviews update it; single code path)
- Fire-and-forget DB write: schedule update does not block navigation to next card, same as existing `saveStudySession` pattern
- Progressive type extension: add optional SRS fields to `StudyCard` interface, not a new type (backward compatible)
- Server-side ordering, client-side algorithm: RPC returns priority-ordered cards; SM-2 math stays in app for zero latency

### Critical Pitfalls

1. **`due_date` stored as TIMESTAMPTZ instead of DATE** — PostgreSQL `NOW()` returns UTC; users in non-UTC timezones see "due today" counters flip at wrong local times. Store as `DATE`, compare with `CURRENT_DATE`. This is a schema decision; incorrect type requires a non-trivial migration after data exists.

2. **Stale SRS state after card content changes** — Cards synced from GitHub get updated content but keep their old ease factor and interval; a card the user "mastered" at old content appears 60 days out despite containing new material. Fix: store `card_updated_at` snapshot in `card_review_schedule`; compare to `cards.updated_at` on session load; reset to "new" if stale. The Docora webhook already signals content changes.

3. **Cold-start: new users see 0 cards** — If card selection uses INNER JOIN on `card_review_schedule`, users with no review history get an empty session (0 due cards, no new cards shown). Fix: LEFT JOIN with `WHERE crs.id IS NULL` for new-card identification; lazy initialization (create review row on first answer, not upfront).

4. **Session limit blocks due cards** — `cardsPerSession` setting (10/20/50) was designed for random selection. With SRS, due cards must bypass the cap: show all due cards first, then fill remaining slots with new cards. Implement limit as "new cards per session" cap, not total session cap.

5. **Ease factor spiraling to 1.3 floor ("ease hell")** — Binary wrong answer (q=1) decreases EF by 0.54 per review. Without explicit floor at 1.3 AND ceiling at 2.5 enforced in application code (not just DB constraint), cards spiral into near-daily repetition. Also enforce maximum interval cap of 365 days to prevent "lost" cards.

## Implications for Roadmap

The dependency chain is strict: schema must exist before core library, core library before hook changes, hook changes before UI. Four phases map to this dependency graph. Schema design decisions are the highest-risk point — all critical pitfalls manifest at the data model layer.

### Phase 1: Database Schema + SM-2 Algorithm Core
**Rationale:** Everything downstream depends on the `card_review_schedule` table and SM-2 function existing. The schema decisions (DATE vs TIMESTAMPTZ, FK cascade policy, indexes, content-change snapshot column, RLS) are the highest-risk choices in the feature — wrong decisions here require data migrations. All five critical pitfalls are addressed at this layer. This phase has zero UI impact and can be validated in isolation.
**Delivers:** Supabase migration file (`card_review_schedule` table + RLS + indexes + stale-content column), `get_due_card_count` RPC, `get_study_cards_for_session` RPC, `packages/core/src/srs/sm2.ts` pure function, new types in `packages/shared/src/types/index.ts`, new exports in `packages/core/src/supabase/study.ts`, passing `pnpm build:packages`
**Addresses:** Per-card scheduling foundation (table stakes), dashboard counter RPC, session card selection RPC, stale content detection
**Avoids:** Pitfalls 1 (timezone), 2 (stale content), 3 (cold-start), 5 (ease floor) — all schema/algorithm decisions made here

### Phase 2: Study Session Integration (SRS Card Selection + Schedule Write)
**Rationale:** The core behavioral change. Study sessions now use due-first ordering and write back schedule state after each answer. This is the largest application-layer change and has the most regression risk (modifying existing study flow). Isolating it in its own phase allows targeted testing of SRS behavior without UI noise.
**Delivers:** Modified `useStudySession.ts` that selects cards via `getStudyCardsForSession()`, calls `updateReviewSchedule()` fire-and-forget after each answer, tracks `isReview` flag per card in session state; `supermemo` package installed in `@lumio/core`
**Uses:** `supermemo` package, `sm2.ts`, `updateReviewSchedule()`, `getStudyCardsForSession()` from Phase 1
**Implements:** Fire-and-forget pattern, UPSERT pattern, server-side ordering + client-side algorithm separation
**Avoids:** Pitfall 4 (session limit blocking due cards — due cards bypass `cardsPerSession` cap here)

### Phase 3: Dashboard + Study Screen UI
**Rationale:** Visible user value surfaces in this phase. Dashboard due counter and study-session Review/New badge make SRS visible to the user. Both depend on Phase 1 (RPC for due count) and Phase 2 (`isReview` flag) but are contained UI changes with low regression risk. i18n strings for new UI elements added here.
**Delivers:** New "Cards Due" StatCard on `DashboardScreen` (icon `"refresh-outline"`, orange/amber color), Review/New badge on `StudyScreen` near progress bar, i18n strings in `apps/android/i18n/en.ts` and `it.ts` (`dashboard.dueForReview`, `study.reviewBadge`, `study.newBadge`)
**Uses:** `getDueCardCount()` from Phase 1, `isReview` card flag from Phase 2, existing StatCard pattern from `DashboardScreen`

### Phase 4: Study History Fix + End-to-End Validation
**Rationale:** The study history bug fix (`StudyHistoryScreen` showing "All repositories" instead of card count) is fully independent of SRS — it reads `total_count` instead of `repository_name`. Bundled here as polish before final validation. Validation confirms all pitfall-prevention measures work end-to-end using the checklist from PITFALLS.md.
**Delivers:** Fixed `StudyHistoryScreen` (shows "N cards" / "N carte" not "All repositories" / "Tutti i repository"), end-to-end validation checklist pass: timezone counter test (11pm/midnight/1am local), cold-start test (fresh user account), due-card limit test (15 due + limit=10 shows all 15), ease floor test (20 wrong answers keeps EF at 1.3), app-reinstall SRS persistence test
**Note:** The history fix could ship independently in any phase — it has zero SRS dependencies and is the lowest-risk change in the milestone.

### Phase Ordering Rationale

- Schema before code: `card_review_schedule` table must exist in Supabase local before any TypeScript can call the RPC or UPSERT. `pnpm build:packages` runs between Phase 1 and Phase 2.
- PITFALLS.md explicitly orders pitfall prevention by phase: data model phase addresses timezone, cold-start, stale state, and RLS; session selection phase addresses the limit bypass; UI phase addresses UX pitfalls (badge, backlog display).
- ARCHITECTURE.md "Suggested Build Order" matches this four-phase structure exactly (DB + algorithm, session integration, dashboard/UI, validation).
- The study history fix is confirmed independent: FEATURES.md dependency graph states "Study history display fix — INDEPENDENT, no dependencies on card_progress."
- No phase requires parallelism; each depends on the previous.

### Research Flags

Phases with standard patterns (skip additional research-phase):
- **Phase 1 (schema):** SM-2 algorithm is 35+ years documented; DB patterns (UPSERT, RLS, indexed DATE queries, SECURITY DEFINER RPCs) are established Supabase patterns already used in the codebase; no research needed
- **Phase 2 (session hook):** Existing `useStudySession.ts` patterns are fully understood from codebase analysis; fire-and-forget write pattern already used in `saveStudySession`; no novel integration
- **Phase 3 (dashboard UI):** StatCard pattern already exists in `DashboardScreen`; straightforward addition following established component patterns
- **Phase 4 (history fix + validation):** Single-line display change; validation follows checklist from PITFALLS.md "Looks Done But Isn't" section

No phases require `/gsd:research-phase` during planning. Research confidence is HIGH across all areas. All implementation patterns are either already present in the codebase or verified from authoritative sources.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `supermemo` version 2.0.23 verified via npm registry; algorithm fit to binary quiz confirmed by codebase analysis; no native deps confirmed; FSRS rejection rationale solid |
| Features | HIGH | SM-2 is original-source documented (Wozniak 1987); Anki open-source reference for UX patterns; all integration points verified by reading actual source files |
| Architecture | HIGH | Based on direct codebase analysis of all affected files; established Supabase UPSERT/RLS/RPC patterns already in the codebase; no novel integration points |
| Pitfalls | HIGH | Timezone bug is a documented SM-2 implementation failure mode; cold-start and stale-state patterns drawn from Lumio-specific behaviors (Docora webhook, immutable study_sessions, `is_active` card soft-delete) |

**Overall confidence:** HIGH

### Gaps to Address

- **Table name consistency:** STACK.md uses `user_card_progress`, FEATURES.md uses `card_progress`, ARCHITECTURE.md uses `card_review_schedule`. Three researchers named the table independently. Pick one name in Phase 1 and use it consistently everywhere. Recommendation: `card_review_schedule` (most descriptive, ARCHITECTURE.md has the most complete schema design including proper indexes and FK decisions).

- **Stale content reset column:** PITFALLS.md recommends a `card_updated_at_snapshot` column; STACK.md does not mention it. Add it to the Phase 1 migration. Simplest approach: store `cards.updated_at` at time of last review; reset SRS in the session selection RPC if `cards.updated_at > card_review_schedule.last_reviewed_at`. No webhook changes needed for v2.0.

- **Skipped cards behavior:** ARCHITECTURE.md maps skipped = quality 0 (treated as wrong, interval resets to 1 day). FEATURES.md says "skipped cards remain untracked in card_progress." These conflict. Recommendation: do NOT write `card_review_schedule` on skip (FEATURES.md position); skipped cards remain "new" and reappear in future sessions naturally. Penalizing users for skipping discourages exploration of unfamiliar content.

- **Grade mapping for correct answers:** STACK.md uses grade 5 for correct. FEATURES.md uses grade 4. ARCHITECTURE.md uses grade 4. The `supermemo` package accepts 0-5. With q=5, `EF' = EF + 0.1` (EF grows over time). With q=4, `EF' = EF + 0.0` (EF stays stable). Recommendation: use grade 4 for correct (EF unchanged, simpler mental model) and grade 1 for incorrect (EF decreases by 0.54). This matches the FEATURES.md and ARCHITECTURE.md consensus.

## Sources

### Primary (HIGH confidence)
- Lumio codebase direct analysis: `apps/android/hooks/useStudySession.ts`, `packages/core/src/supabase/study.ts`, `packages/shared/src/types/index.ts`, `apps/android/screens/DashboardScreen.tsx`, `apps/android/screens/StudyScreen.tsx`, `apps/android/screens/StudyHistoryScreen.tsx`, `supabase/migrations/20260211000001_study_sessions.sql`, `supabase/migrations/20260123000001_card_questions.sql`, `supabase/migrations/20260115000001_shared_repositories.sql`, `apps/android/lib/studySettings.ts`
- [SM-2 Algorithm Original Specification](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) — Piotr Wozniak 1987; formulas verified
- [supermemo npm registry](https://registry.npmjs.org/supermemo) — version 2.0.23, published 2025-03-20, verified
- [supermemo GitHub (VienDinhCom/supermemo)](https://github.com/VienDinhCom/supermemo) — API verified: `SuperMemoItem {interval, repetition, efactor}`, grade range 0-5
- [Anki Manual - Studying](https://docs.ankiweb.net/studying.html) — session UX reference: card queue order, due counts
- [Supabase RLS best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — RLS policy patterns

### Secondary (MEDIUM confidence)
- [FSRS vs SM-2 Guide (MemoForge 2025)](https://memoforge.app/blog/fsrs-vs-sm2-anki-algorithm-guide-2025/) — FSRS 20-30% more efficient for nuanced grading; SM-2 appropriate for binary input
- [SM-2 low interval hell (BlueRaja)](https://www.blueraja.com/blog/477/a-better-spaced-repetition-learning-algorithm-sm2) — ease factor floor pitfalls
- [Effective Spaced Repetition (Borretti)](https://borretti.me/article/effective-spaced-repetition) — UX anti-patterns and backlog anxiety
- [FSRS Algorithm Journey (open-spaced-repetition wiki)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/spaced-repetition-algorithm:-a-three%E2%80%90day-journey-from-novice-to-expert) — algorithm evolution context
- [Spaced Repetition UX (Pine Substack)](https://pine.substack.com/p/designing-spaced-repetition-systems) — UX anti-patterns

### Tertiary (LOW confidence)
- [UTC timezone bug patterns](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03) — general DATE vs TIMESTAMPTZ pattern applied to Lumio context

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
