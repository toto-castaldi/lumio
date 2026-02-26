---
phase: 24-study-session-integration
verified: 2026-02-26T10:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 24: Study Session Integration Verification Report

**Phase Goal:** Study sessions use SRS card ordering and write back per-card schedules after every answer
**Verified:** 2026-02-26T10:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Starting a study session returns overdue cards first (next_review_at <= today), then new cards fill remaining slots — not random selection | VERIFIED | `get_study_cards_for_session` in `20260226000002_upsert_card_review.sql` uses UNION ALL with overdue first (ORDER BY crs.next_review_at ASC), new cards fill remaining via `LIMIT GREATEST(0, p_limit - v_due_count)`. `useStudySession.ts` calls `getStudyCardsForSession(limit)` and iterates sequentially via `nextCardIndex.current`. |
| 2 | Answering a card correctly causes that card's next review to be scheduled further in the future; answering incorrectly resets it to 1 day | VERIFIED | `upsert_card_review` RPC: `IF p_quality < 3 THEN v_new_interval := 1, v_new_reps := 0` (reset), else multiplies by EF (`ROUND(v_old_interval * v_old_ef)`). Hook sends `quality = isCorrect ? 4 : 1` to `recordCardReviewWithRetry`. |
| 3 | A session with cardsPerSession=10 and 15 overdue cards shows all 15 overdue cards (due cards bypass the cap), then fills with new cards only if slots remain | VERIFIED | RPC computes `v_due_count` (count of overdue), then UNION ALL overdue cards (no LIMIT on overdue branch) with `LIMIT GREATEST(0, p_limit - v_due_count)` for new cards — overdue bypass cap by design. |
| 4 | The schedule update does not block navigation to the next card (fire-and-forget, same pattern as saveStudySession) | VERIFIED | `recordCardReviewWithRetry(card.id, quality, card.contentHash)` called without `await` inside `setSession` callback in `handleNext`. Module-level helper function with single retry on error. `writtenBackCardIds` dedup set prevents double writes. |
| 5 | Cards whose content has changed since last review (stale snapshot) are treated as new cards, not review cards | VERIFIED | `get_study_cards_for_session` Step 1: `DELETE FROM card_review_schedule crs_del USING cards c_del WHERE crs_del.content_hash_snapshot != c_del.content_hash` — stale rows deleted; card then appears as new (no schedule row). |

**Score: 5/5 truths verified**

---

## Required Artifacts

### Plan 24-01 Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `supabase/migrations/20260226000002_upsert_card_review.sql` | VERIFIED | File exists, 236 lines. Contains `CREATE OR REPLACE FUNCTION upsert_card_review(p_user_id UUID, p_card_id UUID, p_quality INTEGER, p_content_hash TEXT)` with full SM-2 implementation and atomic UPSERT. Also contains re-created `get_study_cards_for_session` with `content_hash TEXT` in RETURNS TABLE. |
| `packages/core/src/supabase/study.ts` | VERIFIED | Contains `recordCardReview` function (lines 544-578), `mapSRSStudyCard` mapping `contentHash: (dbCard.content_hash as string) \|\| ''` (line 438), and `getStudyCardsForSession` (lines 500-534). |
| `packages/core/src/index.ts` | VERIFIED | Exports `recordCardReview`, `getStudyCardsForSession`, and `type SRSStudyCard` in SRS scheduling block (lines 57-62). |

### Plan 24-02 Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/android/hooks/useStudySession.ts` | VERIFIED | 370 lines. Imports `getStudyCardsForSession` and `recordCardReview` from `@lumio/core`. `StudySessionState` includes `overdueCount: number` and `newCount: number`. Uses `nextCardIndex` ref for sequential iteration. No `seenCardIds` or `selectRandomCard` present. |
| `apps/android/screens/StudyScreen.tsx` | VERIFIED | `renderReady()` uses `session.overdueCount > 0` condition (line 202) to switch between `studyingWithBreakdown` and `cardsAvailable` display strings. |
| `apps/android/i18n/en.ts` | VERIFIED | Contains `studyingWithBreakdown: '%{total} cards to study (%{overdue} overdue + %{new} new)'` (line 64). |
| `apps/android/i18n/it.ts` | VERIFIED | Contains `studyingWithBreakdown: '%{total} schede da studiare (%{overdue} da ripassare + %{new} nuove)'` (line 67). |

---

## Key Link Verification

### Plan 24-01 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `packages/core/src/supabase/study.ts` | `20260226000002_upsert_card_review.sql` | RPC call to upsert_card_review | WIRED | `fetch(`${supabaseUrl}/rest/v1/rpc/upsert_card_review`, ...)` at line 557 |
| `packages/core/src/supabase/study.ts` | `20260226000002_upsert_card_review.sql` | content_hash in get_study_cards_for_session response mapped to contentHash | WIRED | `contentHash: (dbCard.content_hash as string) \|\| ''` at line 438 in `mapSRSStudyCard` |

### Plan 24-02 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `apps/android/hooks/useStudySession.ts` | `packages/core/src/supabase/study.ts` | import getStudyCardsForSession (replaces getStudyCardsWithQuestions) | WIRED | Line 4: `getStudyCardsForSession,` in import block. Line 128: `getStudyCardsForSession(limit)` called in `loadInitialData`. No references to `getStudyCardsWithQuestions`. |
| `apps/android/hooks/useStudySession.ts` | `packages/core/src/supabase/study.ts` | import recordCardReview for fire-and-forget write-back | WIRED | Line 6: `recordCardReview,` in import block. Line 71/75: called inside `recordCardReviewWithRetry`. Line 229: `recordCardReviewWithRetry(card.id, quality, card.contentHash)` fired without await in `handleNext`. |
| `apps/android/screens/StudyScreen.tsx` | `apps/android/hooks/useStudySession.ts` | session.overdueCount and session.newCount for ready screen display | WIRED | Lines 202-208: `session.overdueCount` and `session.newCount` accessed in `renderReady()`. `StudySessionState` interface declares both fields. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SRS-01 | 24-01, 24-02 | User studia carte schedulate in base alle risposte precedenti (giusto → intervallo più lungo, sbagliato → reset a 1 giorno) | SATISFIED | `upsert_card_review` RPC implements SM-2 server-side: `grade < 3` resets to interval=1, `grade >= 3` multiplies by EF. Hook sends `quality = isCorrect ? 4 : 1`. Fire-and-forget per-answer call in `handleNext`. |
| SRS-02 | 24-02 | Sessione presenta carte scadute prima, poi nuove carte riempiono i posti restanti | SATISFIED | `get_study_cards_for_session` UNION ALL: overdue cards first (ordered by `next_review_at ASC`, no cap), then new cards limited to `GREATEST(0, p_limit - v_due_count)`. Sequential iteration in hook preserves this order. |

No orphaned requirements detected. Both SRS-01 and SRS-02 are claimed by phase 24 plans and verified implemented.

---

## Anti-Patterns Found

No anti-patterns found across the 7 modified files.

| File | Pattern | Result |
|------|---------|--------|
| `20260226000002_upsert_card_review.sql` | TODO/FIXME, stubs, empty returns | None found |
| `packages/core/src/supabase/study.ts` | TODO/FIXME, stubs | None found (the `return null` at line 201 is in `loadNextQuestion` — correct sentinel for "no more cards") |
| `packages/core/src/index.ts` | Stub exports | None found — all 3 SRS exports present and non-stub |
| `apps/android/hooks/useStudySession.ts` | Random selection preserved, no write-back, stub handlers | None found — `seenCardIds` and `selectRandomCard` fully removed, fire-and-forget wired |
| `apps/android/screens/StudyScreen.tsx` | Breakdown display not wired | None found — `overdueCount > 0` condition live |
| `apps/android/i18n/en.ts` | Missing key | None found |
| `apps/android/i18n/it.ts` | Missing key | None found |

---

## Commit Verification

All task commits from SUMMARY files confirmed in git log:

| Commit | Description |
|--------|-------------|
| `4b8678f` | feat(24-01): create upsert_card_review RPC and add content_hash to get_study_cards_for_session |
| `1b29c66` | feat(24-01): add recordCardReview client function and map content_hash |
| `c9847e4` | feat(24-02): refactor useStudySession for SRS ordering and per-answer write-back |
| `f843d2f` | feat(24-02): update study screen ready state and i18n for SRS session composition |

---

## Human Verification Required

### 1. SRS Schedule Persisted After Answer

**Test:** Start a study session, answer a card correctly. Open Supabase Studio and check `card_review_schedule` — the row for that card should show `interval_days > 0`, `ease_factor` near 2.5, and `next_review_at` set to tomorrow (or 6 days ahead if it is the second review).
**Expected:** Row exists with `repetitions = 1`, `interval_days = 1`, `next_review_at = today + 1 day`.
**Why human:** Requires live Supabase instance and actual answer submission — cannot verify DB writes statically.

### 2. Overdue Cards Appear Before New Cards in Session

**Test:** With a user who has at least one card with `next_review_at <= today` in `card_review_schedule`, start a study session. Observe the first card presented — it should be the overdue card, not a random new card.
**Expected:** The first card shown is the overdue card (most overdue first by `next_review_at ASC`).
**Why human:** Requires live data state and UI walkthrough — cannot verify card ordering from static analysis alone.

### 3. Skip Does Not Write to card_review_schedule

**Test:** Skip a card during a session. Open Supabase Studio — no new row should be inserted or updated in `card_review_schedule` for that card.
**Expected:** `card_review_schedule` is unchanged for the skipped card.
**Why human:** Requires verifying database state after a specific user interaction.

### 4. Fire-and-Forget Does Not Block Navigation

**Test:** Answer a card and tap "Next Card." The screen should advance immediately without any visible delay, even if the SRS write-back is slow.
**Expected:** Navigation to the next card is instant; no loading spinner related to SRS.
**Why human:** Requires testing on a device with network conditions — cannot verify timing behavior statically.

---

## Gaps Summary

None. All 5 observable truths verified, all 7 artifacts substantive and wired, both requirements (SRS-01, SRS-02) satisfied.

---

_Verified: 2026-02-26T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
