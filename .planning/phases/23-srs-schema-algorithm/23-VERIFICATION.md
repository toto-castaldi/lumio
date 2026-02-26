---
phase: 23-srs-schema-algorithm
verified: 2026-02-26T08:15:38Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 23: SRS Schema & Algorithm Verification Report

**Phase Goal:** The database and algorithm foundation for spaced repetition exists and is validated in isolation
**Verified:** 2026-02-26T08:15:38Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| #  | Truth                                                                                                                                 | Status     | Evidence                                                                                                                                                                                                                        |
|----|---------------------------------------------------------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | `card_review_schedule` table exists with RLS, indexes, and a `content_hash_snapshot` column for stale-content detection               | VERIFIED   | Migration `20260226000001_card_review_schedule.sql` creates the table (line 9), enables RLS (line 53), creates 5 policies (lines 55-73), two indexes (lines 38-43), and the `content_hash_snapshot TEXT` column (line 25).      |
| 2  | `get_due_card_count` RPC returns count using `DATE` comparison, returns 0 for users with no review history                            | VERIFIED   | RPC at line 78 uses `crs.next_review_at::date <= CURRENT_DATE` (line 92) and `RETURN COALESCE(v_count, 0)` (line 94) ensuring 0 for empty history.                                                                             |
| 3  | `get_study_cards_for_session` returns priority-ordered cards (`ORDER BY next_review_at ASC`), uses LEFT JOIN for new users            | VERIFIED   | RPC at line 105 uses `ORDER BY crs.next_review_at ASC` (line 184) for overdue cards, and a LEFT JOIN branch (`LEFT JOIN card_review_schedule crs ... WHERE crs.id IS NULL`, lines 209-212) for new cards with no history.     |
| 4  | Calling `sm2(quality, item)` with quality=4 returns longer interval; quality=1 returns interval=1 and lower EF (floor 1.3); max 365 | VERIFIED   | All 10 tests pass: first correct=1, second=6, third=15; incorrect EF reduced; 20× incorrect EF at 1.3 floor; 100× correct interval ≤ 365; grade 5 EF ceiling at 2.5. `npx vitest run` output: 10 passed.                     |
| 5  | `pnpm build:packages` passes with new types from `@lumio/shared` and new functions from `@lumio/core`                                | VERIFIED   | `pnpm build:packages` completed with zero errors. Both `@lumio/shared` and `@lumio/core` produced CJS, ESM, and DTS outputs successfully.                                                                                      |

**Score:** 5/5 truths verified

---

## Required Artifacts

### Plan 23-01 Artifacts

| Artifact                                      | Provides                                    | Exists | Substantive | Wired  | Status     |
|-----------------------------------------------|---------------------------------------------|--------|-------------|--------|------------|
| `packages/shared/src/types/index.ts`          | SM2Item, SM2Result, CardReviewSchedule      | Yes    | Yes         | Yes    | VERIFIED   |
| `packages/shared/src/constants/index.ts`      | SM2_MAX_INTERVAL (365), SM2_EF_CEILING (2.5)| Yes    | Yes         | Yes    | VERIFIED   |
| `packages/core/src/srs/sm2.ts`                | sm2(), newSM2Item() functions               | Yes    | Yes (51 lines)| Yes  | VERIFIED   |
| `packages/core/src/srs/sm2.test.ts`           | 10-case SM-2 test suite                     | Yes    | Yes (104 lines)| Yes | VERIFIED   |
| `packages/core/src/srs/index.ts`              | Re-exports sm2, newSM2Item                  | Yes    | Yes         | Yes    | VERIFIED   |
| `packages/core/src/index.ts`                  | Public export of srs module                 | Yes    | Yes         | Yes    | VERIFIED   |

### Plan 23-02 Artifacts

| Artifact                                                          | Provides                                      | Exists | Substantive   | Wired | Status   |
|-------------------------------------------------------------------|-----------------------------------------------|--------|---------------|-------|----------|
| `supabase/migrations/20260226000001_card_review_schedule.sql`     | Table, RLS, indexes, 2 RPCs                   | Yes    | Yes (230 lines)| N/A  | VERIFIED |
| `packages/core/src/supabase/study.ts`                             | getDueCardCount, getStudyCardsForSession       | Yes    | Yes (~530 lines)| Yes | VERIFIED |
| `packages/core/src/index.ts`                                      | Exports getDueCardCount, getStudyCardsForSession| Yes  | Yes           | Yes   | VERIFIED |

---

## Key Link Verification

### Plan 23-01 Key Links

| From                                        | To                                          | Via                              | Status  | Detail                                                                               |
|---------------------------------------------|---------------------------------------------|----------------------------------|---------|--------------------------------------------------------------------------------------|
| `packages/core/src/srs/sm2.ts`              | `supermemo` npm package                     | `import { supermemo } from 'supermemo'` | WIRED | Line 1: import confirmed; `supermemo@^2.0.23` in `packages/core/package.json` line 30. |
| `packages/core/src/srs/sm2.ts`              | `packages/shared/src/constants/index.ts`    | SM2_MAX_INTERVAL, SM2_EF_CEILING | WIRED  | Line 3 imports constants; lines 36 and 39 use `Math.min(result.interval, SM2_MAX_INTERVAL)` and `Math.min(result.efactor, SM2_EF_CEILING)`. |
| `packages/core/src/index.ts`                | `packages/core/src/srs/index.ts`            | `export { sm2, newSM2Item } from './srs'` | WIRED | Line 82 of `packages/core/src/index.ts` confirmed. |

### Plan 23-02 Key Links

| From                                         | To                                                               | Via                                           | Status  | Detail                                                                                                          |
|----------------------------------------------|------------------------------------------------------------------|-----------------------------------------------|---------|-----------------------------------------------------------------------------------------------------------------|
| `packages/core/src/supabase/study.ts`        | `supabase/migrations/20260226000001_card_review_schedule.sql`    | RPC call `get_due_card_count`                  | WIRED  | Line 473: `${supabaseUrl}/rest/v1/rpc/get_due_card_count` with POST body `{ p_user_id: userId }`.              |
| `packages/core/src/supabase/study.ts`        | `supabase/migrations/20260226000001_card_review_schedule.sql`    | RPC call `get_study_cards_for_session`         | WIRED  | Line 515: `${supabaseUrl}/rest/v1/rpc/get_study_cards_for_session` with POST body `{ p_user_id, p_limit }`.   |
| `supabase/migrations/…card_review_schedule.sql` | `cards` table                                                 | FOREIGN KEY + JOIN in both RPCs               | WIRED  | Lines 88, 144, 173, 206 use `JOIN cards c ON c.id = crs.card_id`.                                             |
| `supabase/migrations/…card_review_schedule.sql` | `user_repositories` table                                     | JOIN to filter by user's subscribed repos     | WIRED  | Lines 89, 145, 174, 206 use `JOIN user_repositories ur ON ur.repository_id = c.repository_id`.                 |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                              | Status    | Evidence                                                                                                                           |
|-------------|-------------|--------------------------------------------------------------------------|-----------|------------------------------------------------------------------------------------------------------------------------------------|
| SRS-03      | 23-01       | Ease factor adapts per card (EF 2.5 initial, 1.3 floor, 2.5 ceiling)    | SATISFIED | sm2.ts clamps EF to `Math.min(result.efactor, SM2_EF_CEILING)` (line 39). Test "EF ceiling" passes (grade 5 × 10 → EF = 2.5). EF floor enforced by supermemo package. |
| SRS-04      | 23-02       | Most-overdue cards have priority (`ORDER BY next_review_at ASC`)         | SATISFIED | Migration line 184: `ORDER BY crs.next_review_at ASC` in overdue branch of `get_study_cards_for_session`. Comment documents SRS-04. |
| SRS-05      | 23-01       | Maximum interval 365 days                                                | SATISFIED | sm2.ts line 36: `Math.min(result.interval, SM2_MAX_INTERVAL)`. SM2_MAX_INTERVAL = 365 in constants. Test "100 correct answers: interval ≤ 365" passes. |
| SRS-06      | 23-02       | SRS state resets when card content changes (sync from GitHub)            | SATISFIED | Migration lines 133-138: DELETE from `card_review_schedule` where `content_hash_snapshot != c_del.content_hash`. Comment documents SRS-06. |

No orphaned requirements found. Requirements table in REQUIREMENTS.md maps SRS-03/04/05/06 to Phase 23 and marks all as Complete.

---

## Anti-Patterns Found

No anti-patterns detected in any of the 7 files modified in this phase. Scan covered TODO/FIXME/HACK/placeholder/empty-implementation patterns across:

- `packages/core/src/srs/sm2.ts`
- `packages/core/src/srs/sm2.test.ts`
- `packages/core/src/srs/index.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/constants/index.ts`
- `packages/core/src/index.ts`
- `supabase/migrations/20260226000001_card_review_schedule.sql`

The `return null` at line 229 of `study.ts` is in the pre-existing `getPreGeneratedQuestion` function (phase 12) — expected behavior for a nullable return, not a stub.

---

## Human Verification Required

None. All success criteria are verifiable programmatically:

- Algorithm correctness: verified by test suite (10/10 pass)
- Build pass: verified by `pnpm build:packages` output
- SQL correctness: verified by static analysis of migration SQL (RLS enabled, correct DATE cast, COALESCE, ORDER BY ASC, LEFT JOIN, GREATEST)
- Commit integrity: all 5 commits (91de40d, 83ce805, dd5b43e, ce5e898, e36bce8) verified in git history

---

## Commit Verification

| Commit   | Message                                                              | Status    |
|----------|----------------------------------------------------------------------|-----------|
| 91de40d  | chore(23-01): add SM-2 types, constants, and install supermemo       | VERIFIED  |
| 83ce805  | test(23-01): add failing SM-2 algorithm tests                        | VERIFIED  |
| dd5b43e  | feat(23-01): implement SM-2 wrapper with 365-day cap and EF ceiling  | VERIFIED  |
| ce5e898  | feat(23-02): add card_review_schedule table with RLS and SRS RPCs    | VERIFIED  |
| e36bce8  | feat(23-02): add SRS client functions getDueCardCount and getStudyCardsForSession | VERIFIED |

---

## Summary

Phase 23 goal is fully achieved. The database and algorithm foundation for spaced repetition exists and is validated in isolation.

The SM-2 algorithm wrapper (`sm2()` and `newSM2Item()`) is implemented as a thin, tested wrapper over the `supermemo` npm package, enforcing the 365-day interval cap (SRS-05) and 2.5 EF ceiling (SRS-03). All 10 test cases pass. Types (`SM2Item`, `SM2Result`, `CardReviewSchedule`) and constants (`SM2_MAX_INTERVAL`, `SM2_EF_CEILING`) are correctly exported from `@lumio/shared`.

The database migration creates `card_review_schedule` with full RLS (4 user policies + service role), two performance indexes, and two SECURITY DEFINER RPCs: `get_due_card_count` (DATE-based comparison, returns 0 for new users) and `get_study_cards_for_session` (overdue-first ordering via ASC, LEFT JOIN for new users, stale-content deletion). Client wrapper functions `getDueCardCount()` and `getStudyCardsForSession()` are exported from `@lumio/core`.

`pnpm build:packages` completes cleanly with all new types and functions accessible to Phase 24.

---

_Verified: 2026-02-26T08:15:38Z_
_Verifier: Claude (gsd-verifier)_
