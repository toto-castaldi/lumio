---
phase: 26-history-fix-validation
verified: 2026-02-26T16:00:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "Ease factor floor after repeated wrong answers (Success Criterion 4)"
    expected: "After 20+ consecutive wrong answers on a card, its ease_factor should remain at 1.3 and interval_days at 1. The SM-2 formula in upsert_card_review applies GREATEST(v_new_ef, 1.3) on every call, so the floor holds algorithmically. Verify end-to-end by recording 5+ bad reviews in a row for one card and checking the schedule row."
    why_human: "Requires a running Supabase instance and actual RPC calls; cannot verify runtime accumulation of state from SQL alone."
  - test: "Timezone flip: due counter holds correct at 11pm local time for non-UTC user"
    expected: "At 11pm Rome time (which is already tomorrow UTC), the due counter should reflect TODAY in Rome, not tomorrow. AT TIME ZONE logic is in place. Verify with a scheduled card whose next_review_at is tomorrow UTC but today Rome, confirming it does NOT appear in the counter the night before."
    why_human: "Requires running the app in a controlled timezone (Rome) and checking the counter behavior in real-time near midnight — cannot simulate this with grep."
  - test: "Fresh user sees non-zero due count on first login"
    expected: "A user with no card_review_schedule rows should see a due count matching the number of cards with active questions in their subscribed repositories. The new-card count query (LEFT JOIN WHERE crs.id IS NULL) is implemented. Verify by logging in as a fresh user and confirming the Dashboard shows a non-zero counter."
    why_human: "Requires a real Supabase session with a fresh user account."
---

# Phase 26: History Fix & Validation — Verification Report

**Phase Goal:** Study history shows accurate card counts, and all SRS correctness guarantees are verified end-to-end
**Verified:** 2026-02-26T16:00:00Z
**Status:** human_needed (all automated checks PASSED — 3 items need runtime testing)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths — Plan 01

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `get_due_card_count` accepts p_timezone and uses AT TIME ZONE for date comparison | VERIFIED | migration line 40 (param), 53 (compute v_today), 65 (filter clause) |
| 2 | `get_study_cards_for_session` accepts p_timezone and uses AT TIME ZONE for date comparison | VERIFIED | migration line 100 (param), 127 (compute v_today), 151 and 181 (WHERE clauses) |
| 3 | `upsert_card_review` accepts p_timezone and computes next_review_at using local date | VERIFIED | migration line 241 (param), 258 (compute v_today), 327 (`v_today + interval`) |
| 4 | `get_due_card_count` includes never-reviewed cards in the count for fresh users | VERIFIED | migration lines 68-81: second SELECT with LEFT JOIN + `crs.id IS NULL`, COALESCE sum |
| 5 | `card_review_schedule` has CHECK constraints for ease_factor >= 1.3 and interval_days >= 0 | VERIFIED | migration lines 25-28: chk_ease_factor_floor, chk_interval_floor |
| 6 | Client passes Intl.DateTimeFormat timezone to all three RPCs | VERIFIED | study.ts line 490 (getDueCardCount), 532 (getStudyCardsForSession), 579 (recordCardReview) |

**Plan 01 Score:** 6/6 truths verified

### Observable Truths — Plan 02

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 7 | Each history row shows card count instead of "All repositories" | VERIFIED | StudyHistoryScreen.tsx line 130: `cardCountLabel = t('history.cardCount', { count: item.totalCount })`, rendered at line 146 |
| 8 | History dates display as relative time not absolute dates | VERIFIED | `formatRelativeDate()` at line 28-45, used at line 139 — reuses dashboard.mAgo/hAgo/dAgo i18n keys |
| 9 | Empty state for study history includes a CTA button to start first session | VERIFIED | Lines 200-207: EmptyState with `actionLabel={t('history.startFirstSession')}` and `onAction={() => navigation.goBack()}` |
| 10 | Card count is pluralized correctly (1 card/carta vs N cards/carte) | VERIFIED | en.ts lines 134-137 (one/other), it.ts lines 137-140 (one/other) |

**Plan 02 Score:** 4/4 truths verified (10/10 automated truths total)

**Combined Automated Score:** 10/10 truths verified

---

### Success Criteria Coverage (from ROADMAP.md)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|---------|
| 1 | History rows show "10 cards" / "10 carte" instead of "All repositories" | VERIFIED | `t('history.cardCount', { count: item.totalCount })` in renderSessionItem |
| 2 | Fresh user sees non-zero due count and can start session without error | CODE VERIFIED / RUNTIME NEEDS HUMAN | LEFT JOIN + crs.id IS NULL query added to get_due_card_count; behavior requires live test |
| 3 | Due counter does not flip at wrong time for non-UTC timezone | CODE VERIFIED / RUNTIME NEEDS HUMAN | AT TIME ZONE logic in all 3 RPCs with UTC fallback; timezone flip at 11pm needs live test |
| 4 | After 20 consecutive wrong answers, ease_factor stays at 1.3 (floor) and interval at 1 day | CODE VERIFIED / RUNTIME NEEDS HUMAN | GREATEST(v_new_ef, 1.3) at line 287 + CHECK constraint at line 25; accumulation needs live test |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260226000003_timezone_checks_fresh_user.sql` | Timezone-aware RPCs, fresh-user due count, CHECK constraints | VERIFIED | 342-line migration with all 4 sections present; substantive implementation |
| `packages/core/src/supabase/study.ts` | Client-side timezone passing to RPCs | VERIFIED | `getDeviceTimezone()` at line 421-427; p_timezone in all 3 RPC calls |
| `apps/android/screens/StudyHistoryScreen.tsx` | History screen with card count and relative dates | VERIFIED | `formatRelativeDate()`, `cardCountLabel`, `centerColumn`, `EmptyState` with CTA |
| `apps/android/i18n/en.ts` | English i18n keys for card count pluralization and history CTA | VERIFIED | `startFirstSession`, `cardCount.one`, `cardCount.other`; no `allRepos` key |
| `apps/android/i18n/it.ts` | Italian i18n keys for card count pluralization and history CTA | VERIFIED | `startFirstSession`, `cardCount.one` (carta), `cardCount.other` (carte); no `allRepos` key |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/src/supabase/study.ts` | `get_due_card_count` RPC | POST body with p_timezone | WIRED | line 490: `p_timezone: getDeviceTimezone()` in JSON.stringify |
| `packages/core/src/supabase/study.ts` | `get_study_cards_for_session` RPC | POST body with p_timezone | WIRED | line 532: `p_timezone: getDeviceTimezone()` in JSON.stringify |
| `packages/core/src/supabase/study.ts` | `upsert_card_review` RPC | POST body with p_timezone | WIRED | line 579: `p_timezone: getDeviceTimezone()` in object literal |
| `apps/android/screens/StudyHistoryScreen.tsx` | i18n keys | `t('history.cardCount', { count: item.totalCount })` | WIRED | line 130 calls key, key exists in both en.ts and it.ts |
| `apps/android/screens/StudyHistoryScreen.tsx` | EmptyState component | `actionLabel` + `onAction` props | WIRED | lines 200-207: both props passed, `navigation.goBack()` as action |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| HIST-01 | 26-01-PLAN.md, 26-02-PLAN.md | Storico sessioni mostra conteggio carte al posto di "tutti i repository" | SATISFIED | History rows display `t('history.cardCount', { count: item.totalCount })` — pluralized in EN/IT |

No orphaned requirements: HIST-01 is the only requirement mapped to Phase 26 in REQUIREMENTS.md, and both plans claim it.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No TODOs, FIXMEs, placeholder returns, or stub implementations found in any of the 5 modified files. All implementations are substantive.

---

### Human Verification Required

#### 1. Ease Factor Floor — 20 Consecutive Wrong Answers

**Test:** Start a study session on a card. Answer incorrectly (quality < 3) at least 5 times for the same card across multiple sessions. After each session, check the `card_review_schedule` row in Supabase Studio for that card's `ease_factor` and `interval_days`.

**Expected:** `ease_factor` should never drop below 1.3, and `interval_days` should stay at 1 after each wrong answer. The SM-2 formula (`GREATEST(v_new_ef, 1.3)`) and the CHECK constraint (`chk_ease_factor_floor`) both enforce this.

**Why human:** Requires a running Supabase instance with actual RPC calls and accumulation of review state across sessions. Cannot verify this invariant from SQL text alone.

#### 2. Timezone Correctness — Due Counter at 11pm Local Time

**Test:** Set device timezone to Europe/Rome. Create a card with `next_review_at` set to tomorrow UTC (which is today Rome time after 11pm). Check the Dashboard due counter at 11pm Rome (= midnight UTC or after).

**Expected:** The counter should NOT show this card as due on the previous day. At 11pm Rome, the counter should reflect the user's local "today." The AT TIME ZONE conversion in get_due_card_count ensures this.

**Why human:** Requires device timezone manipulation and real-time observation of counter behavior near midnight — cannot replicate with static code analysis.

#### 3. Fresh User First Session Flow

**Test:** Create a new Supabase account with no prior study history. Subscribe to at least one repository with active cards. Navigate to Dashboard and observe the due count. Tap "Study" and verify the session loads cards (not an empty session or error).

**Expected:** Due count should be greater than 0 (reflecting all never-reviewed cards). Study session should start and show cards normally.

**Why human:** Requires a real fresh user account and a running Supabase instance with data.

---

### Gaps Summary

No gaps found. All automated checks passed. The implementation is complete and correctly wired. Three human verification items are required for runtime behavior that cannot be verified statically: ease factor floor accumulation, timezone boundary behavior, and fresh-user session flow.

---

_Verified: 2026-02-26T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
