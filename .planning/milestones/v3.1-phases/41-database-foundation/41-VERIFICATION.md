---
phase: 41-database-foundation
verified: 2026-03-13T11:15:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 41: Database Foundation Verification Report

**Phase Goal:** Create the database foundation for deck discovery — deck_index table with fulltext search, search RPC, subfolder-aware subscriptions and study RPCs
**Verified:** 2026-03-13T11:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | deck_index table exists with tsvector generated column and GIN index for fulltext search | VERIFIED | `search_vector tsvector GENERATED ALWAYS AS (public.deck_index_search_vector(...)) STORED` in migration 000001; `CREATE INDEX idx_deck_index_search_vector ON public.deck_index USING GIN(search_vector)` confirmed |
| 2 | user_repositories has subfolder_path column with UNIQUE index using COALESCE for NULL handling | VERIFIED | `ADD COLUMN IF NOT EXISTS subfolder_path TEXT` and `CREATE UNIQUE INDEX idx_user_repos_unique ON public.user_repositories(user_id, repository_id, COALESCE(subfolder_path, ''))` in migration 000002 |
| 3 | lumio-decks platform repo exists in repositories table with is_platform=TRUE | VERIFIED | `INSERT INTO public.repositories (..., is_platform) VALUES (..., TRUE) ON CONFLICT (url) DO UPDATE SET is_platform = TRUE` in migration 000003 |
| 4 | Existing user_repositories rows with NULL subfolder_path still work (backward compatible) | VERIFIED | NULL treated as whole-repo subscription; subfolder filter is `(ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')` — NULL short-circuits to include all cards |
| 5 | Platform repo is excluded from normal user repository queries via RLS | VERIFIED | No change to existing RLS; the "Users can view subscribed repositories" policy correctly gates platform repo visibility behind user_repositories row existence |
| 6 | A fulltext search query against deck_index returns ranked results weighted by name > tags > description | VERIFIED | `deck_index_search_vector()` IMMUTABLE function uses `setweight(..., 'A')` for display_name, `'B'` for tags, `'C'` for description; `ts_rank_cd(di.search_vector, v_tsquery)` used for ranking in search_decks RPC |
| 7 | Filtering by tag returns only decks containing that tag | VERIFIED | `AND (p_tag IS NULL OR p_tag = '' OR di.tags @> ARRAY[p_tag])` in search_decks; GIN index on tags column supports array containment |
| 8 | search_decks returns card_count computed at query time (not stored) | VERIFIED | Correlated subquery: `(SELECT COUNT(*) FROM cards c WHERE c.repository_id = di.repository_id AND c.file_path LIKE di.subfolder_path || '%' AND c.is_active = TRUE) AS card_count` |
| 9 | Study RPCs return only cards from the subscribed subfolder when subfolder_path is set | VERIFIED | 5 instances of `AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')` in get_study_cards_for_session; 2 instances in get_due_card_count |
| 10 | Study RPCs return all cards from a repo when subfolder_path is NULL (backward compatible) | VERIFIED | The NULL short-circuit in `subfolder_path IS NULL OR ...` ensures all cards from whole-repo subscriptions are returned unchanged |
| 11 | A user with zero subscriptions sees zero results from study RPCs for the shared repo | VERIFIED | Both RPCs require a JOIN to user_repositories — no subscription row means no cards returned; no platform repo exemption added |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260313000001_deck_index_table.sql` | deck_index table with tsvector/GIN, tags GIN index, updated_at trigger | VERIFIED | File exists, 89 lines, non-trivial. Contains `CREATE TABLE public.deck_index`, GIN indexes, IMMUTABLE wrapper function, RLS policies, trigger, comments |
| `supabase/migrations/20260313000002_user_repositories_subfolder.sql` | subfolder_path column on user_repositories with updated UNIQUE constraint | VERIFIED | File exists, 26 lines. Contains `ADD COLUMN IF NOT EXISTS subfolder_path TEXT`, drops old unique constraint, creates COALESCE-based unique index |
| `supabase/migrations/20260313000003_platform_repo_seed.sql` | is_platform column on repositories, lumio-decks seed row, RLS policy for deck_index | VERIFIED | File exists, 24 lines. Contains `ADD COLUMN IF NOT EXISTS is_platform BOOLEAN`, INSERT with `is_platform=TRUE`, `ON CONFLICT DO UPDATE` |
| `supabase/migrations/20260313000004_search_decks_rpc.sql` | search_decks RPC function with weighted fulltext ranking and tag filter | VERIFIED | File exists, 83 lines. Contains `CREATE OR REPLACE FUNCTION search_decks`, websearch_to_tsquery, ts_rank_cd, correlated card_count subquery, auth check |
| `supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql` | Updated get_study_cards_for_session and get_due_card_count with subfolder filtering | VERIFIED | File exists, 300 lines. Complete reimplementation of both RPCs with DROP + CREATE; subfolder filter on 5 JOINs (get_study_cards_for_session) and 2 JOINs (get_due_card_count) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `20260313000001_deck_index_table.sql` | `public.repositories` | FK `repository_id REFERENCES repositories(id)` | WIRED | Line 31: `repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE` |
| `20260313000002_user_repositories_subfolder.sql` | `public.user_repositories` | `ALTER TABLE ADD COLUMN subfolder_path` | WIRED | Line 8-9: `ALTER TABLE public.user_repositories ADD COLUMN IF NOT EXISTS subfolder_path TEXT` |
| `20260313000003_platform_repo_seed.sql` | `public.repositories` | `INSERT seed row with is_platform=TRUE` | WIRED | Line 12-14: INSERT with `is_platform=TRUE`, ON CONFLICT DO UPDATE SET is_platform = TRUE |
| `search_decks RPC` | `deck_index table` | `SELECT with ts_rank_cd and websearch_to_tsquery` | WIRED | `v_tsquery := websearch_to_tsquery('simple', p_query)` (line 47); `ts_rank_cd(di.search_vector, v_tsquery)` (lines 65, 75); `FROM deck_index di` (line 68) |
| `search_decks RPC` | `cards table` | correlated subquery for card_count | WIRED | Lines 60-63: `(SELECT COUNT(*) FROM cards c WHERE c.repository_id = di.repository_id AND c.file_path LIKE di.subfolder_path || '%' AND c.is_active = TRUE) AS card_count` |
| `get_study_cards_for_session` | `user_repositories.subfolder_path` | subfolder filter on every JOIN | WIRED | 5 occurrences of `AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')` at lines 76, 109, 143, 180, 215 |
| `get_due_card_count` | `user_repositories.subfolder_path` | subfolder filter on every JOIN | WIRED | 2 occurrences at lines 267, 278 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DBSR-01 | 41-01 | Platform has a deck_index table with fulltext search via tsvector/GIN using 'simple' config | SATISFIED | `deck_index_search_vector()` IMMUTABLE function uses `'simple'::regconfig`; GIN index `idx_deck_index_search_vector` created |
| DBSR-02 | 41-02 | Platform has a search_decks RPC with weighted ranking (name > tags > description) and optional category filter | SATISFIED | search_decks RPC created with A/B/C weighted tsvector, ts_rank_cd ranking, `p_tag` filter via array containment |
| DBSR-03 | 41-01 | User can subscribe to a specific deck subfolder in the shared repo (subfolder_path on user_repositories) | SATISFIED | `subfolder_path TEXT` column added to user_repositories; COALESCE-based unique index allows mixed NULL/non-NULL subscriptions per user+repo |
| DBSR-04 | 41-02 | Study RPCs filter cards by subfolder_path when set, so subscribed users see only their chosen deck's cards | SATISFIED | 7 subfolder filter conditions across both study RPCs; NULL short-circuit preserves backward compatibility |
| DBSR-05 | 41-01 | Platform has lumio-decks repo registered at platform level, always synced by Docora | SATISFIED | `is_platform BOOLEAN NOT NULL DEFAULT FALSE` column on repositories; `lumio-decks` seeded with `is_platform=TRUE`, url='https://github.com/toto-castaldi/lumio-decks' |
| STDY-01 | 41-02 | Subscribed shared deck cards appear in user's study sessions with SRS scheduling | SATISFIED | Study RPCs are the query path for all study sessions; subfolder filter enables per-deck subscriptions to feed into SRS scheduling unchanged |

**Orphaned requirements check:** REQUIREMENTS.md Traceability section maps DBSR-01 through DBSR-05 and STDY-01 to Phase 41, all claimed in plans 41-01 and 41-02. No orphaned requirements.

---

### Anti-Patterns Found

None. Grep over all 5 migration files returned no TODO, FIXME, XXX, HACK, PLACEHOLDER, or stub patterns.

---

### Noteworthy Implementation Detail

The SUMMARY documents a deviation from the original PLAN that was correctly auto-fixed: the plan's task specification used `to_tsvector()` and `array_to_string()` inline in the generated column expression, but these functions are STABLE (not IMMUTABLE). PostgreSQL requires IMMUTABLE expressions for generated columns. The executor created an `IMMUTABLE` wrapper function `deck_index_search_vector()` to satisfy this constraint. This is verified in the actual migration file (lines 10-24 of `20260313000001_deck_index_table.sql`).

---

### Human Verification Required

#### 1. supabase db reset applies all 5 migrations cleanly

**Test:** Run `source supabase/.env.local && supabase db reset` in the project root.
**Expected:** All migrations apply in sequence with no errors; final output shows "Finished supabase db reset" or similar success message.
**Why human:** Cannot run the Supabase CLI in this environment; static analysis confirms SQL syntax is structurally correct but runtime migration ordering and constraint conflicts can only be caught by actual execution.

#### 2. search_decks authentication enforcement

**Test:** Call `search_decks('test')` from an unauthenticated client (no JWT).
**Expected:** Returns error "Not authenticated: search_decks requires a valid session" — not an empty result set.
**Why human:** The `auth.uid()` call behavior inside SECURITY DEFINER functions requires live Supabase to verify.

---

### Gaps Summary

No gaps. All 11 observable truths verified at levels 1 (exists), 2 (substantive), and 3 (wired). All 6 requirement IDs from plans 41-01 and 41-02 are satisfied. No orphaned requirements. No anti-patterns detected.

The implementation includes one legitimate auto-fixed deviation (IMMUTABLE wrapper for tsvector generated column) that improves correctness over the plan specification.

---

_Verified: 2026-03-13T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
