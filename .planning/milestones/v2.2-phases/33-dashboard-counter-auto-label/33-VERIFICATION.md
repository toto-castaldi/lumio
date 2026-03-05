---
phase: 33-dashboard-counter-auto-label
verified: 2026-03-05T10:30:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 33: Dashboard Counter Auto Label — Verification Report

**Phase Goal:** Dashboard and session selector accurately reflect the session-limited experience
**Verified:** 2026-03-05T10:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Dashboard counter shows session-limited count when user has a numeric limit (e.g. limit=20 with 150 due shows '20') | VERIFIED | `DashboardScreen.tsx:60` computes `limit = cardsPerSession === 'auto' ? null : cardsPerSession`; `getDueCardCount(limit)` called at lines 85 and 113; SQL RPC returns `LEAST(v_total, p_limit)` when p_limit is non-null |
| 2  | Dashboard counter shows full available count when user has 'Auto' selected | VERIFIED | When `cardsPerSession === 'auto'`, limit is `null`; `getDueCardCount(null)` triggers SQL `RETURN v_total` (no cap) |
| 3  | Dashboard CTA button text uses the same session-aware count | VERIFIED | Button text at `DashboardScreen.tsx:234-237` uses `dueCount` state — the same value set from `getDueCardCount(limit)` |
| 4  | Session selector displays 'Auto' label with sparkles icon instead of 'All cards' with infinity icon | VERIFIED | `SettingsScreen.tsx:111`: `{ value: 'auto', label: 'Auto', icon: 'sparkles-outline' }` |
| 5  | When fewer cards exist than limit, counter shows actual available count (not the limit) | VERIFIED | SQL RPC: `RETURN LEAST(v_total, p_limit)` — when v_total < p_limit, LEAST returns v_total |
| 6  | Zero due cards still shows 'All caught up!' regardless of limit setting | VERIFIED | `DashboardScreen.tsx:210`: `dueCount === 0 ? t('dashboard.allCaughtUp') : (dueCount ?? '\u2014')` — zero path unchanged |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|---------|--------|---------|
| `supabase/migrations/20260305000001_session_aware_due_count.sql` | get_due_card_count RPC with p_limit parameter | VERIFIED | EXISTS, 73 lines, non-trivial; contains `p_limit INTEGER DEFAULT NULL`, LEAST-based capping, COMMENT ON FUNCTION |
| `packages/core/src/supabase/study.ts` | getDueCardCount accepting optional limit parameter | VERIFIED | EXISTS, substantive; signature `getDueCardCount(limit: number \| null = null)` at line 472; passes `p_limit: limit` in body at line 493 |
| `apps/android/screens/DashboardScreen.tsx` | Session-aware dashboard counter using cardsPerSession | VERIFIED | EXISTS, 288 lines; imports `useStudySettings` at line 20; destructures `cardsPerSession` at line 59; limit computed at line 60 |
| `apps/android/screens/SettingsScreen.tsx` | Auto label with sparkles icon | VERIFIED | EXISTS; line 111: `label: 'Auto', icon: 'sparkles-outline'` |
| `apps/android/i18n/en.ts` | Auto label text | VERIFIED | EXISTS; line 102: `allCards: 'Auto'` |
| `apps/android/i18n/it.ts` | Auto label text | VERIFIED | EXISTS; line 105: `allCards: 'Auto'` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DashboardScreen.tsx` | `packages/core/src/supabase/study.ts` | `getDueCardCount(limit)` | WIRED | `getDueCardCount(limit)` called at lines 85 and 113 of DashboardScreen; limit derived from `cardsPerSession` |
| `packages/core/src/supabase/study.ts` | `supabase/migrations/.../session_aware_due_count.sql` | RPC call with p_limit | WIRED | `p_limit: limit` in JSON body at line 493 of study.ts; SQL RPC consumes `p_limit` for capping at line 64-68 of migration |
| `DashboardScreen.tsx` | `apps/android/contexts/StudySettingsContext.tsx` | `useStudySettings` hook | WIRED | `import { useStudySettings } from '../hooks/useStudySettings'` at line 20; hook re-exports from `StudySettingsContext.tsx`; `cardsPerSession` destructured at line 59 and included in `useFocusEffect` deps at line 105 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DASH-01 | 33-01-PLAN.md | Il counter carte mostra il numero di carte della prossima sessione (rispettando il limite), non il debito totale | SATISFIED | `getDueCardCount(limit)` with numeric limit returns `LEAST(total, limit)` via RPC; dashboard `dueCount` state reflects session-capped value |
| DASH-02 | 33-01-PLAN.md | Con "Auto", il counter mostra il numero reale completo di carte disponibili | SATISFIED | When `cardsPerSession === 'auto'`, limit is `null`; RPC returns full `v_total` with no cap |
| UI-01 | 33-01-PLAN.md | Il selettore rinomina l'opzione "Tutte/∞" in "Auto" con icona appropriata | SATISFIED | `SettingsScreen.tsx` line 111: `label: 'Auto', icon: 'sparkles-outline'` — hardcoded string, not i18n (intentional per plan), both i18n files also updated defensively |

**Orphaned requirements:** None — all Phase 33 requirements (DASH-01, DASH-02, UI-01) are mapped and satisfied.

---

### Anti-Patterns Found

None detected across all 6 modified files. No TODOs, placeholders, stub implementations, or empty handlers found. TypeScript compiles clean for both `@lumio/core` and `@lumio/android` packages (verified live).

---

### Human Verification Required

#### 1. Session-limited counter end-to-end on device

**Test:** Set CardsPerSession to 20 in Settings. Return to Dashboard. Observe the "Due Today" counter.
**Expected:** If total due > 20, counter shows 20. If total due <= 20, counter shows actual count.
**Why human:** Requires live device with Supabase running; cannot verify RPC behavior against real data programmatically.

#### 2. Counter refreshes when limit changes

**Test:** On Dashboard, note the due count. Navigate to Settings, change CardsPerSession to a different value. Navigate back to Dashboard.
**Expected:** Counter updates to reflect the new session limit without requiring a manual pull-to-refresh.
**Why human:** `useFocusEffect` dependency on `cardsPerSession` enables this, but the reactivity chain requires live runtime validation.

#### 3. Auto mode shows full backlog

**Test:** Set CardsPerSession to 'Auto' in Settings. Return to Dashboard.
**Expected:** Counter shows total available cards (same as pre-phase-33 behavior).
**Why human:** Requires live device and known card backlog to confirm no unintended capping.

---

### Summary

Phase 33 goal is fully achieved. All 6 artifacts exist, are substantive, and are correctly wired end-to-end:

- The SQL migration (`20260305000001_session_aware_due_count.sql`) drops the old `get_due_card_count(UUID, TEXT)` signature and recreates it with `p_limit INTEGER DEFAULT NULL`, using `LEAST(v_total, p_limit)` when the limit is set.
- `getDueCardCount` in `packages/core/src/supabase/study.ts` accepts `limit: number | null = null` and passes `p_limit: limit` to the RPC.
- `DashboardScreen.tsx` imports `useStudySettings`, computes `limit` from `cardsPerSession`, and passes it to `getDueCardCount` in both the `useFocusEffect` refresh callback and `handleRefresh`. The `useFocusEffect` dependency array includes `cardsPerSession` so the counter updates reactively when the user changes their session setting.
- `SettingsScreen.tsx` shows `'Auto'` with `'sparkles-outline'` icon for the unlimited option (replacing the previous `'infinite-outline'`).
- Both i18n files updated defensively (`allCards: 'Auto'`).
- Both task commits (`b54c202`, `eccc6a1`) verified in git log.
- TypeScript compiles without errors in both packages.

Requirements DASH-01, DASH-02, and UI-01 are all satisfied. No gaps.

---

_Verified: 2026-03-05T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
