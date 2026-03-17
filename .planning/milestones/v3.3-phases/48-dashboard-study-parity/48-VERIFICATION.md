---
phase: 48-dashboard-study-parity
verified: 2026-03-17T14:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 48: Dashboard Study Parity Verification Report

**Phase Goal:** Shared deck subscriptions are fully counted in dashboard statistics and included in study sessions
**Verified:** 2026-03-17T14:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                     | Status     | Evidence                                                                                    |
|----|-------------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------|
| 1  | Dashboard repo count includes each shared deck subscription as a separate entry           | VERIFIED   | `filteredRepos.length` used as `repositoryCount`; platform + subfolder entries kept         |
| 2  | Dashboard card count includes cards from subscribed shared decks, filtered by subfolder_path | VERIFIED | `card.file_path.startsWith(ur.subfolder_path)` loop in getStats(); Set-based dedup          |
| 3  | Study session cards include shared deck cards (RPCs already have subfolder filter)        | VERIFIED   | Migration 20260313000005 adds `AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')` to all 5 JOINs in get_study_cards_for_session; no is_platform filter |
| 4  | Due card counter on dashboard reflects shared deck cards (RPC already has subfolder filter) | VERIFIED | Migration 20260313000005 adds same subfolder filter to both JOINs in get_due_card_count     |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact                                            | Expected                                        | Status    | Details                                                                                          |
|-----------------------------------------------------|-------------------------------------------------|-----------|--------------------------------------------------------------------------------------------------|
| `supabase/functions/git-sync/index.ts`              | Fixed getStats() including shared deck subscriptions | VERIFIED | Lines 437-513: subfolder_path selected, subscription-aware filter, Set-based card deduplication |
| `supabase/functions/git-sync/getStats.test.ts`      | Unit tests for filter and count logic           | VERIFIED  | 7 Deno tests covering all behavioral cases (created but not listed in PLAN must_haves.artifacts) |
| `supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql` | Study RPCs with subfolder filtering | VERIFIED | 8 occurrences of subfolder filter across both RPCs; 0 occurrences of is_platform                |

---

### Key Link Verification

| From                                      | To                      | Via                                   | Status  | Details                                                                                         |
|-------------------------------------------|-------------------------|---------------------------------------|---------|-------------------------------------------------------------------------------------------------|
| `git-sync/index.ts getStats()`            | `user_repositories` table | `.select()` with `subfolder_path`   | WIRED   | Line 446: `subfolder_path` added to select; line 460: `ur.subfolder_path != null` filter used   |
| `git-sync/index.ts getStats()`            | `cards` table           | `file_path.startsWith(subfolder_path)` | WIRED  | Lines 490-496: `card.file_path.startsWith(ur.subfolder_path)` for shared deck entries           |
| `git-sync/index.ts case "get_stats"`      | `getStats()`            | direct function call                  | WIRED   | Lines 696-701: `case "get_stats"` invokes `getStats(supabase, userId)` and returns result       |
| `packages/core getUserStats()`            | `git-sync "get_stats"` | `callGitSync('get_stats')`            | WIRED   | `repositories.ts` line 128: `callGitSync<...>('get_stats')`                                    |
| `DashboardScreen.tsx`                     | `getUserStats()`        | import + useState display             | WIRED   | Lines 103-108, 131-135: called in both load and refresh; `repositoryCount`/`cardCount` rendered  |
| `DashboardScreen.tsx`                     | `getDueCardCount()`     | import + useState display             | WIRED   | Lines 104, 132: called alongside getUserStats; result sets `dueCount` state                      |
| `useStudySession.ts`                      | `getStudyCardsForSession()` | import + call at line 128        | WIRED   | No client-side is_platform filtering; RPC handles subfolder scoping transparently               |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                       | Status    | Evidence                                                                                   |
|-------------|-------------|-----------------------------------------------------------------------------------|-----------|--------------------------------------------------------------------------------------------|
| STATS-01    | 48-01       | Dashboard repo count includes shared deck subscriptions as separate repos         | SATISFIED | `filteredRepos.length` counts each subscription entry (platform + subfolder = kept)         |
| STATS-02    | 48-01       | Dashboard card count includes shared deck cards filtered by subfolder_path        | SATISFIED | `file_path.startsWith(ur.subfolder_path)` per-subscription loop + Set dedup                |
| STUDY-01    | 48-01       | Shared deck cards appear in study sessions                                        | SATISFIED | Migration 20260313000005: subfolder filter on all 5 JOINs in get_study_cards_for_session   |
| STUDY-02    | 48-01       | "Due today" count includes shared deck cards                                      | SATISFIED | Migration 20260313000005: subfolder filter on both JOINs in get_due_card_count             |

No orphaned requirements found. All 4 requirement IDs from REQUIREMENTS.md map to Phase 48 and are satisfied.

---

### Anti-Patterns Found

No anti-patterns detected in modified files.

- `supabase/functions/git-sync/index.ts`: No TODOs, no placeholder returns, no empty handlers.
- `supabase/functions/git-sync/getStats.test.ts`: Substantive unit tests with 7 cases, not stubs.

---

### Human Verification Required

#### 1. End-to-end dashboard statistics accuracy

**Test:** Log in as a user who has 2 personal repos and 1 shared deck subscription. Open the Dashboard screen.
**Expected:** Repository count shows 3 (not 2). Card count reflects personal repo cards plus the shared deck's cards (scoped to subfolder).
**Why human:** Cannot verify live Supabase RPC output or rendered UI values programmatically.

#### 2. Study session includes shared deck cards

**Test:** With a shared deck subscription active, start a study session.
**Expected:** Cards from the shared deck subfolder appear in the session alongside personal repo cards.
**Why human:** Requires live database state with shared deck subscription rows.

---

### Gaps Summary

None. All automated checks pass. Phase goal is fully achieved in code.

---

## Verification Details

### getStats() function — Level 1/2/3 checks

**Level 1 (Exists):** `supabase/functions/git-sync/index.ts` exists at lines 437-513.

**Level 2 (Substantive):** The function is not a stub:
- SELECT query includes `subfolder_path` (line 446).
- Filter logic at lines 454-461 correctly distinguishes three cases: non-platform repos (always kept), platform + subfolder (shared deck, kept), platform + no subfolder (bare platform, excluded).
- Card counting loop at lines 484-506 uses `file_path.startsWith(ur.subfolder_path)` for shared deck entries.
- `const countedCardIds = new Set<string>()` at line 482 prevents double-counting.
- `repoIds` deduplicated with `[...new Set(...)]` at line 470.
- `repositoryCount = filteredRepos.length` at line 463 counts per subscription, not per unique repo.

**Level 3 (Wired):** `case "get_stats"` at line 696 calls `getStats()` and returns result. `getUserStats()` in `packages/core` calls `callGitSync('get_stats')`. `DashboardScreen.tsx` imports and calls `getUserStats()`, rendering `repositoryCount` and `cardCount`.

### Study RPCs — Level 1/2/3 checks

**Level 1 (Exists):** Migration file `supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql` exists.

**Level 2 (Substantive):** Migration contains 8 occurrences of the subfolder filter (5 in get_study_cards_for_session, 2 in get_due_card_count, plus 1 in the migration header comment). Zero occurrences of `is_platform` — shared deck rows are included by join, not excluded by platform flag.

**Level 3 (Wired):** `getDueCardCount()` in `packages/core/src/supabase/study.ts` calls RPC `get_due_card_count` with `p_user_id`, `p_limit`, `p_timezone` — no client-side card filtering. `getStudyCardsForSession()` calls RPC `get_study_cards_for_session` with same params — no client-side exclusions. Both are called from `DashboardScreen.tsx` and `useStudySession.ts` respectively.

### Commits verified

- `9cd1fe8` — test(48-01): add failing tests for getStats shared deck subscription parity
- `a55472d` — feat(48-01): fix getStats() to include shared deck subscriptions
- `7c8510e` — docs(48-01): complete dashboard study parity plan

---

_Verified: 2026-03-17T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
