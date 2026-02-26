---
phase: 24-study-session-integration
verified: 2026-02-26T12:30:00Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed:
    - "Answering a card immediately triggers SRS write-back (no need to press Next)"
    - "Closing the session after answering the last card does not lose that card's review"
    - "Double write-back is still prevented by writtenBackCardIds dedup set"
  gaps_remaining: []
  regressions: []
---

# Phase 24: Study Session Integration Verification Report

**Phase Goal:** Study sessions use SRS card ordering and write back per-card schedules after every answer
**Verified:** 2026-02-26T12:30:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure plan 24-03 (SRS write-back timing fix)

## Re-Verification Context

The initial VERIFICATION.md was marked `passed` but UAT (24-UAT.md) found a real gap: the SRS write-back fired inside `handleNext` rather than inside `handleAnswer`. This meant that if the user answered the last card and closed the session before pressing "Next Card", that card's review was silently dropped. Plan 24-03 fixed this by moving `recordCardReviewWithRetry` from `handleNext` into `handleAnswer`. Commit `154fc3a` applies the fix to `apps/android/hooks/useStudySession.ts`.

This re-verification focuses on the three truths from plan 24-03's `must_haves`, plus a regression check on the original five truths from plans 24-01 and 24-02.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Starting a study session returns overdue cards first, then new cards fill remaining slots | VERIFIED | `get_study_cards_for_session` UNION ALL: overdue ORDER BY `next_review_at ASC`, new cards limited to `GREATEST(0, p_limit - v_due_count)`. Sequential `nextCardIndex` ref in hook preserves DB order. |
| 2 | Answering a card correctly schedules it further ahead; answering incorrectly resets to 1 day | VERIFIED | `upsert_card_review` RPC: `p_quality < 3` resets interval=1, `p_quality >= 3` multiplies by EF. Hook sends `quality = isCorrect ? 4 : 1`. |
| 3 | Overdue cards bypass the session cap; new cards fill remaining slots only | VERIFIED | RPC overdue branch has no LIMIT; new card branch uses `LIMIT GREATEST(0, p_limit - v_due_count)`. |
| 4 | Answering a card immediately triggers SRS write-back (no need to press Next) | VERIFIED | `handleAnswer` (lines 256-273) calls `recordCardReviewWithRetry(card.id, quality, card.contentHash)` fire-and-forget immediately after `setSession`. `handleNext` (lines 207-251) contains zero calls to `recordCardReviewWithRetry` — confirmed by grep (single hit at line 270 inside handleAnswer only). |
| 5 | Closing the session after answering the last card does not lose that card's review | VERIFIED | Write-back fires in `handleAnswer` at answer time. The X-button (`navigation.goBack()`) no longer needs to flush pending reviews because there are none — every answered card's write-back has already been dispatched at answer time. |
| 6 | Double write-back is prevented by writtenBackCardIds dedup set | VERIFIED | Guard `if (!writtenBackCardIds.current.has(card.id))` at line 268; `writtenBackCardIds.current.add(card.id)` at line 269 before the call at line 270. `handleNext` no longer touches this set, so there is no duplicate code path. |

**Score: 6/6 truths verified**

---

## Required Artifacts

### Plan 24-03 Artifacts (Gap Closure — Primary Focus)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/android/hooks/useStudySession.ts` | VERIFIED | 371 lines. `recordCardReviewWithRetry` appears exactly twice: definition at line 65 (module-level helper), call at line 270 (inside `handleAnswer` callback). Zero occurrences inside `handleNext` body (lines 207-251). TypeScript compiles without errors (`pnpm --filter @lumio/android exec -- npx tsc --noEmit` returns clean). |

### Plan 24-01 Artifacts (Regression Check)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `supabase/migrations/20260226000002_upsert_card_review.sql` | VERIFIED (no regression) | File unchanged since initial verification. Contains full SM-2 `upsert_card_review` RPC and `get_study_cards_for_session` with content_hash. |
| `packages/core/src/supabase/study.ts` | VERIFIED (no regression) | `recordCardReview`, `mapSRSStudyCard`, `getStudyCardsForSession` all present. No changes in plan 24-03. |
| `packages/core/src/index.ts` | VERIFIED (no regression) | Exports `recordCardReview`, `getStudyCardsForSession`, `type SRSStudyCard`. No changes in plan 24-03. |

### Plan 24-02 Artifacts (Regression Check)

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/android/screens/StudyScreen.tsx` | VERIFIED (no regression) | `session.overdueCount > 0` condition for breakdown display. No changes in plan 24-03. |
| `apps/android/i18n/en.ts` | VERIFIED (no regression) | `studyingWithBreakdown` key present. No changes in plan 24-03. |
| `apps/android/i18n/it.ts` | VERIFIED (no regression) | `studyingWithBreakdown` key present. No changes in plan 24-03. |

---

## Key Link Verification

### Plan 24-03 Key Links (Primary Focus)

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `handleAnswer` callback | `recordCardReviewWithRetry` | fire-and-forget call inside handleAnswer | WIRED | Line 270: `recordCardReviewWithRetry(card.id, quality, card.contentHash)` inside `handleAnswer` at lines 256-273. Pattern matches plan 24-03 `must_haves.key_links[0].pattern`. |
| `handleNext` callback | `recordCardReviewWithRetry` | MUST NOT be wired (confirmed absent) | CONFIRMED ABSENT | Lines 207-251: `handleNext` body contains only `setSession`, `loadNextQuestion`, and state updates. Zero calls to `recordCardReviewWithRetry`. |

### Plan 24-01 / 24-02 Key Links (Regression Check)

| From | To | Via | Status |
|------|----|-----|--------|
| `useStudySession.ts` | `upsert_card_review` RPC | `recordCardReview` from `@lumio/core` | WIRED (no regression) |
| `useStudySession.ts` | `get_study_cards_for_session` RPC | `getStudyCardsForSession` from `@lumio/core` | WIRED (no regression) |
| `StudyScreen.tsx` | `useStudySession.ts` | `session.overdueCount`, `session.newCount` | WIRED (no regression) |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SRS-01 | 24-01, 24-02, 24-03 | User studia carte schedulate in base alle risposte precedenti (giusto → intervallo più lungo, sbagliato → reset a 1 giorno) | SATISFIED | Plan 24-03 closes the remaining SRS-01 gap: write-back now fires in `handleAnswer`, not `handleNext`. SM-2 RPC unchanged. Quality mapping (`isCorrect ? 4 : 1`) unchanged. The requirement is now fully satisfied end-to-end. |
| SRS-02 | 24-02 | Sessione presenta carte scadute prima, poi nuove carte riempiono i posti restanti | SATISFIED | Unchanged from initial verification. RPC UNION ALL ordering + sequential hook iteration verified. |

No orphaned requirements. Both SRS-01 and SRS-02 are claimed by phase 24 plans and confirmed implemented.

---

## Anti-Patterns Found

### Plan 24-03 Modified File Scan

| File | Pattern Checked | Result |
|------|----------------|--------|
| `apps/android/hooks/useStudySession.ts` | TODO/FIXME/placeholder comments | None found |
| `apps/android/hooks/useStudySession.ts` | Empty handlers (`() => {}`, `console.log` only) | None found — `handleAnswer` has real write-back logic |
| `apps/android/hooks/useStudySession.ts` | `recordCardReviewWithRetry` in handleNext (wrong location) | CONFIRMED ABSENT — zero occurrences in handleNext |
| `apps/android/hooks/useStudySession.ts` | Double-write path (write-back in both handleAnswer and handleNext) | CONFIRMED ABSENT — one call site at line 270 only |

No anti-patterns found.

---

## Commit Verification

| Commit | Plan | Description | Verified |
|--------|------|-------------|---------|
| `4b8678f` | 24-01 | feat: create upsert_card_review RPC | Yes |
| `1b29c66` | 24-01 | feat: add recordCardReview client function | Yes |
| `c9847e4` | 24-02 | feat: refactor useStudySession for SRS ordering | Yes |
| `f843d2f` | 24-02 | feat: update study screen ready state and i18n | Yes |
| `154fc3a` | 24-03 | fix: move SRS write-back from handleNext to handleAnswer | Yes — confirmed by `git show 154fc3a`; 30-line diff in `useStudySession.ts` only |

---

## Human Verification Required

### 1. SRS Schedule Persisted After Answer Without Pressing Next

**Test:** Start a study session, answer a card (tap an answer choice), then immediately press X to close the session without pressing "Next Card."
**Expected:** Open Supabase Studio — `card_review_schedule` has a row for that card with `next_review_at > today`. The card does not reappear at the start of the next session.
**Why human:** Requires live Supabase instance and verifying DB state after a specific close-without-next navigation path — cannot verify statically.

### 2. No Double Write on Normal Answer + Next Flow

**Test:** Answer a card, then press "Next Card." Open Supabase Studio for that card's row in `card_review_schedule`.
**Expected:** Exactly one row for that card; `repetitions = 1`. The dedup set prevents a second write when handleNext executes.
**Why human:** Requires verifying DB row count and write timestamps after a specific sequence of user actions.

### 3. SRS Card Ordering in Next Session

**Test:** Answer all cards in a session correctly. Start a new session immediately.
**Expected:** Those correctly-answered cards do not appear (scheduled for future dates). Only new cards or incorrectly-answered cards are present.
**Why human:** Requires two live sessions with real DB state to confirm ordering and filtering.

### 4. Fire-and-Forget Does Not Block Navigation

**Test:** Answer a card and tap "Next Card."
**Expected:** Screen advances immediately with no visible delay or loading spinner caused by the SRS write-back.
**Why human:** Requires device testing under real network conditions — timing behavior cannot be verified statically.

---

## Gaps Summary

None. All 6 observable truths verified. The UAT-identified gap (write-back firing on Next rather than on Answer) is confirmed fixed by commit `154fc3a`. Both requirements SRS-01 and SRS-02 are fully satisfied. TypeScript compiles cleanly. No anti-patterns detected. No regressions found in previously verified truths.

---

_Verified: 2026-02-26T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
