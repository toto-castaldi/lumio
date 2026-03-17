---
phase: 47-card-fetching-browsing
verified: 2026-03-17T00:00:00Z
status: passed
score: 3/3 must-haves verified
gaps: []
human_verification:
  - test: "Subscribe to two subfolders of the same repo, open each from the repo list, and browse cards"
    expected: "Each deck shows only cards from its respective subfolder, not duplicate or merged card lists"
    why_human: "Cannot simulate multi-subscription scenario with grep; requires a live Supabase instance with test data"
  - test: "Open a personal whole-repo subscription and browse its cards"
    expected: "All repository cards are returned without subfolder filtering (backward compatible)"
    why_human: "Backward-compatibility check requires live data to confirm no regression"
---

# Phase 47: Card Fetching & Browsing Verification Report

**Phase Goal:** Users can browse cards in shared deck subscriptions the same way they browse cards in personal repositories
**Verified:** 2026-03-17
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User taps a shared deck and sees only cards belonging to that deck's subfolder, not all cards from the entire repository | VERIFIED | `getCards()` filters by `card.file_path.startsWith(subfolderPath)` (line 560 of index.ts); `CardListScreen` also applies client-side safety filter (lines 73-76) |
| 2 | `getCards()` succeeds when user has multiple subfolder subscriptions to the same repository (no `.single()` error) | VERIFIED | `.single()` replaced with `.limit(1)` at line 542 of index.ts; access check uses an array result with `userRepos.length === 0` guard |
| 3 | Personal whole-repo browsing still works unchanged (backward compatible) | VERIFIED | `subfolderPath` is optional throughout the chain; when absent, full card list returned and Deck `.getActiveCards()` applied (CardListScreen lines 67-70) |

**Score:** 3/3 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/git-sync/index.ts` | `getCards()` with optional `subfolderPath`, access check without `.single()`, server-side file_path filtering | VERIFIED | Lines 525-563: signature contains `subfolderPath?: string`, access check uses `.limit(1)`, filter via `.startsWith()` |
| `packages/core/src/supabase/repositories.ts` | `getRepositoryCards()` accepting optional `subfolderPath` and passing it to edge function | VERIFIED | Lines 169-180: signature `(repositoryId: string, subfolderPath?: string)`, conditional `body.subfolderPath = subfolderPath` |
| `apps/android/screens/CardListScreen.tsx` | `CardListScreen` passes `subfolderPath` to `getRepositoryCards()` | VERIFIED | Line 42: `getRepositoryCards(repoId, subfolderPath)` — param already destructured from `route.params` on line 32 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/android/screens/CardListScreen.tsx` | `packages/core/src/supabase/repositories.ts` | `getRepositoryCards(repoId, subfolderPath)` | WIRED | Line 42 passes both params; `subfolderPath` from `route.params` (line 32) |
| `packages/core/src/supabase/repositories.ts` | `supabase/functions/git-sync/index.ts` | `callGitSync('get_cards', { repositoryId, subfolderPath })` | WIRED | Lines 170-177: body built conditionally, passed to `callGitSync` |
| `supabase/functions/git-sync/index.ts` | `user_repositories` table | Access check with `subfolder_path` filter via `.eq("subfolder_path", subfolderPath)` | WIRED | Lines 532-542: conditional `.eq("subfolder_path", subfolderPath)` applied before `.limit(1)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BROWSE-01 | 47-01-PLAN.md | Utente può aprire un mazzo condiviso dalla lista repo e vedere le carte filtrate per subfolder | SATISFIED | Full call chain wired: CardListScreen passes `subfolderPath` → `getRepositoryCards()` → edge function filters by `file_path.startsWith(subfolderPath)` |
| BROWSE-02 | 47-01-PLAN.md | Edge function `getCards()` gestisce multiple subscriptions allo stesso repository senza errore | SATISFIED | `.single()` replaced with `.limit(1)` in `getCards()` access check; array result guards against 0 rows |

No orphaned requirements — REQUIREMENTS.md maps only BROWSE-01 and BROWSE-02 to Phase 47, both claimed by plan 01 and both satisfied.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/git-sync/index.ts` | 379, 409, 757, 774 | `.single()` usage in other functions | Info | Not a regression — these are different functions (unsubscribe, sync) doing unique-key lookups where `.single()` is appropriate |

No blocking anti-patterns. No TODOs, FIXMEs, or placeholders in any of the three modified files.

---

## Human Verification Required

### 1. Multi-subscription subfolder browsing

**Test:** In a test account, subscribe to two different subfolders of the same repository (e.g., `science/` and `history/`). From the shared decks list, open each subscription's card list.
**Expected:** The `science/` deck shows only cards with `file_path` starting with `science/`; the `history/` deck shows only cards with `file_path` starting with `history/`. No cross-contamination, no crash.
**Why human:** Cannot simulate multiple-subscription DB state with static analysis; requires a live Supabase instance with seeded test data.

### 2. Backward compatibility — personal whole-repo browsing

**Test:** Open a personal repository (no `subfolderPath`) and browse its cards.
**Expected:** All active cards from the full repository are returned. The `.lumioignore` filtering via `Deck.getActiveCards()` still applies. No regressions from the `subfolderPath` plumbing.
**Why human:** Runtime behavior with real data needed to confirm the `!subfolderPath` code path is exercised correctly end-to-end.

---

## Gaps Summary

No gaps. All three must-have truths are verified, all three artifacts exist with substantive implementations, and all three key links are wired end-to-end. Both BROWSE-01 and BROWSE-02 requirements are satisfied. No blocker anti-patterns found.

Commits documented in SUMMARY.md were confirmed present in git log:
- `0003b81` — feat(47-01): fix getCards() edge function for subfolder-based shared decks
- `4a1c165` — feat(47-01): wire subfolderPath through client call chain

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
