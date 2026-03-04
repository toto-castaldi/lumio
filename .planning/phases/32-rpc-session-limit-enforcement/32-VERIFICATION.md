---
phase: 32-rpc-session-limit-enforcement
verified: 2026-03-04T23:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 32: RPC Session Limit Enforcement Verification Report

**Phase Goal:** Enforce session card limits end-to-end — RPC caps total cards to p_limit with overdue-first priority, frontend passes null for Auto and numeric for capped sessions, CardsPerSession type renames 'all' to 'auto' with backward-compatible migration.
**Verified:** 2026-03-04T23:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User who selects 20 cards receives at most 20 cards, even if 50 are available | VERIFIED | Migration line 177: `LIMIT p_limit` on overdue branch; new-cards branch: `LIMIT GREATEST(0, p_limit - v_overdue_returned)` |
| 2 | Overdue cards always appear before new cards, oldest overdue first | VERIFIED | Both branches (NULL and capped) use `ORDER BY crs.next_review_at ASC` on the overdue SELECT, UNION ALL with new cards after |
| 3 | When limit is 20 and 30 overdue exist, only the 20 most-overdue are returned with 0 new cards | VERIFIED | `v_overdue_returned := LEAST(v_due_count, p_limit)` (line 144); new-card slot = `GREATEST(0, 20 - 20) = 0` |
| 4 | User with Auto selected receives all available cards with no cap | VERIFIED | `IF p_limit IS NULL` branch returns all overdue + all new with no LIMIT clauses; hook passes `null` when `cardsPerSession === 'auto'` |
| 5 | When fewer cards exist than the chosen limit, all available cards are returned without error | VERIFIED | `GREATEST(0, p_limit - v_overdue_returned)` is always non-negative; no LIMIT 0 error — PostgreSQL LIMIT 0 returns 0 rows cleanly |
| 6 | Existing users with 'all' stored in AsyncStorage seamlessly migrate to 'auto' behavior | VERIFIED | `loadCardsPerSession` line 23: `if (stored === 'all' \|\| stored === 'auto') return 'auto'` |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260304000001_session_limit_enforcement.sql` | Updated RPC with p_limit DEFAULT NULL and total cap enforcement | VERIFIED | 218 lines; `p_limit INTEGER DEFAULT NULL`; IF/ELSE branching; LIMIT enforcement in capped branch; COMMENT ON FUNCTION updated |
| `packages/core/src/supabase/study.ts` | getStudyCardsForSession accepting null \| number | VERIFIED | Line 512: `export async function getStudyCardsForSession(limit: number \| null = null)`; line 534: `p_limit: limit` in JSON body |
| `apps/android/lib/studySettings.ts` | CardsPerSession type with 'auto' instead of 'all' | VERIFIED | Line 10: `export type CardsPerSession = 10 \| 20 \| 50 \| 'auto'`; no 'all' in type definition |
| `apps/android/hooks/useStudySession.ts` | Hook translating 'auto' to null for RPC call | VERIFIED | Line 123: `const limit = cardsPerSession === 'auto' ? null : cardsPerSession`; line 128: `getStudyCardsForSession(limit)` |
| `apps/android/contexts/StudySettingsContext.tsx` | Default state changed to 'auto' | VERIFIED | Line 33: `useState<CardsPerSession>('auto')` |
| `apps/android/screens/SettingsScreen.tsx` | Study option value changed from 'all' to 'auto' | VERIFIED | Line 111: `{ value: 'auto', label: t('settings.allCards'), icon: 'infinite-outline' }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/android/hooks/useStudySession.ts` | `packages/core/src/supabase/study.ts` | `getStudyCardsForSession(limit)` for auto (null) and capped (N) | WIRED | Imported line 4, called line 128 with `limit` variable derived from `cardsPerSession === 'auto' ? null : cardsPerSession` |
| `packages/core/src/supabase/study.ts` | `supabase/migrations/20260304000001_session_limit_enforcement.sql` | `p_limit` parameter passed as JSON null or integer | WIRED | Line 534: `body: JSON.stringify({ p_user_id: userId, p_limit: limit, p_timezone: ... })` — null serializes to JSON null, integer passes through |
| `apps/android/lib/studySettings.ts` | `apps/android/hooks/useStudySession.ts` | CardsPerSession type consumed by hook | WIRED | Hook imports `type { CardsPerSession }` from `'../lib/studySettings'` (line 14), uses it as parameter type (line 87) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| SESS-01 | 32-01-PLAN.md | La RPC rispetta il limite scelto: scadute first (più vecchie prima), poi nuove, totale mai oltre p_limit | SATISFIED | Capped branch in SQL: overdue `ORDER BY next_review_at ASC LIMIT p_limit`, new cards `LIMIT GREATEST(0, p_limit - v_overdue_returned)` |
| SESS-02 | 32-01-PLAN.md | Con limite "Auto", la RPC restituisce tutte le carte (comportamento attuale invariato) | SATISFIED | NULL branch returns all overdue + all new with no LIMIT; hook maps 'auto' to null; default parameter in RPC is NULL |

No orphaned requirements — REQUIREMENTS.md confirms SESS-01 and SESS-02 are mapped exclusively to Phase 32, both marked `[x]` complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

No TODO/FIXME comments, no placeholder returns, no sentinel values (9999 removed), no remaining `CardsPerSession = ... 'all'` type references in any production path.

The only `'all'` string in production code is in `loadCardsPerSession` as a migration-compat read guard (`stored === 'all'`), which is intentional and correct per the plan.

### Human Verification Required

None required for this phase. All behaviors are verifiable statically:
- SQL branching logic (NULL vs capped) is deterministic and fully readable in the migration
- TypeScript types are checked at compile time
- The backward-compat migration for `'all'` -> `'auto'` is a simple string equality check

### Gaps Summary

No gaps. All six truths are verified with complete artifact existence, substantive implementation (not stubs), and correct wiring end-to-end. Both commits (`153e1d9`, `8c602b4`) exist in git history.

---

_Verified: 2026-03-04T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
