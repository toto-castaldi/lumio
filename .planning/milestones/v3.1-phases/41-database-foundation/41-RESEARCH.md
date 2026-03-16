# Phase 41: Database Foundation - Research

**Researched:** 2026-03-13
**Domain:** PostgreSQL schema design (tsvector fulltext search, subscription model, study RPC updates)
**Confidence:** HIGH

## Summary

Phase 41 introduces three major database changes: (1) a new `deck_index` table with PostgreSQL fulltext search using weighted tsvector and GIN indexing, (2) a subfolder-aware subscription model extending `user_repositories`, and (3) updates to all study RPCs to filter cards by `subfolder_path`. Additionally, a platform-level `lumio-decks` repository must be seeded.

All of this is pure SQL migration work with no new libraries or frameworks. The existing migration conventions (`YYYYMMDD000001_descriptive_name.sql`), SECURITY DEFINER RPC pattern, and RLS policy patterns are well-established and provide clear templates. The tsvector generated column approach is natively supported by PostgreSQL 12+ and well-documented.

**Primary recommendation:** Implement as 4-5 sequential migrations: (1) deck_index table with tsvector/GIN, (2) user_repositories subfolder_path column with updated UNIQUE constraint, (3) updated study RPCs with subfolder filtering, (4) search_decks RPC, (5) platform repo seed data. Test each migration via `supabase db reset`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Tag-based discovery (no category field):** No separate `category` column in deck_index -- categories emerge from tags. Tags stored as TEXT[] in deck_index, normalized to slug format (lowercase, spaces-to-dashes). Max 5 tags per deck (enforced at validation, not DB constraint). Fulltext search weighted: display_name > tags > description (per DBSR-02).
- **Subscription model:** `subfolder_path` TEXT column added to `user_repositories` (not a separate table). UNIQUE constraint on `(user_id, repository_id, subfolder_path)` prevents duplicate subscriptions. SRS progress preserved on unsubscribe. Study RPCs filter cards by subfolder_path: `WHERE c.file_path LIKE subfolder_path || '%'` when subfolder_path IS NOT NULL.
- **deck.yaml schema:** Fields: `display_name` (TEXT, required), `description` (TEXT, required), `tags` (TEXT[], max 5, slug-normalized), `author` (TEXT), `language` (TEXT, ISO 639-1). These fields map 1:1 to deck_index table columns. deck.yaml is the source of truth; deck_index is populated by docora-webhook parsing (Phase 42).
- **Platform repo seeding:** Seed migration inserts lumio-decks record in `repositories` table with URL `https://github.com/toto-castaldi/lumio-decks`. `docora_repository_id` set to NULL initially. No user_id association -- platform-level repo. Repo hidden from user's repository list.
- **deck_index table:** Columns: id (UUID PK), repository_id (FK), subfolder_path (TEXT), display_name (TEXT), description (TEXT), tags (TEXT[]), author (TEXT), language (TEXT), search_vector (tsvector), created_at, updated_at. tsvector config: 'simple' everywhere (no stemming -- multilingual). GIN index on search_vector. Card count computed at query time. search_vector is generated column: weighted combination of display_name (A), tags (B), description (C).

### Claude's Discretion
- Unsubscribe UX pattern (single tap + undo toast vs dialog)
- Exact search_decks RPC signature and pagination approach
- Whether platform repo uses `is_platform` boolean or relies on no user_repositories rows
- Migration ordering and naming conventions
- Index strategy beyond the GIN index on search_vector

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DBSR-01 | Platform has a deck_index table with fulltext search via tsvector/GIN using 'simple' config | Generated column with setweight + GIN index pattern; verified PostgreSQL 12+ support for generated columns with tsvector |
| DBSR-02 | Platform has a search_decks RPC with weighted ranking (name > tags > description) and optional category filter | SECURITY DEFINER RPC pattern established; ts_rank_cd for ranking; tag filter via `@>` array containment |
| DBSR-03 | User can subscribe to a specific deck subfolder in the shared repo (subfolder_path on user_repositories) | ALTER TABLE ADD COLUMN + DROP/RECREATE UNIQUE constraint pattern; existing user_repositories table analyzed |
| DBSR-04 | Study RPCs filter cards by subfolder_path when set, so subscribed users see only their chosen deck's cards | All 3 RPCs analyzed (get_study_cards_for_session, get_due_card_count, upsert_card_review); subfolder filter via LIKE pattern on existing JOIN |
| DBSR-05 | Platform has lumio-decks repo registered at platform level, always synced by Docora | Seed INSERT into repositories; RLS policy update to exclude platform repos from user queries |
| STDY-01 | Subscribed shared deck cards appear in user's study sessions with SRS scheduling | Achieved via DBSR-03 + DBSR-04 combined; user_repositories row + subfolder filter = cards appear in study RPCs |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15 (Supabase) | Database, fulltext search, RPC functions | Already in use; tsvector/GIN are built-in |
| Supabase CLI | latest | Migration management, local dev | Already in use for all migrations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| plpgsql | built-in | RPC function language | All SECURITY DEFINER functions use this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsvector 'simple' | tsvector 'english' | 'simple' is correct for multilingual deck names -- no stemming preserves exact tokens |
| Generated column | Trigger-updated column | Generated column is declarative and maintenance-free; trigger adds complexity |
| LIKE pattern for subfolder | Array containment | LIKE on file_path is simpler and matches existing hierarchical path structure |

## Architecture Patterns

### Recommended Migration Structure
```
supabase/migrations/
  20260313000001_deck_index_table.sql       # deck_index + tsvector + GIN
  20260313000002_user_repositories_subfolder.sql  # subfolder_path + UNIQUE constraint
  20260313000003_study_rpcs_subfolder_filter.sql  # Updated get_study_cards_for_session, get_due_card_count
  20260313000004_search_decks_rpc.sql       # search_decks RPC function
  20260313000005_seed_platform_repo.sql     # lumio-decks seed + is_platform column + RLS update
```

### Pattern 1: Generated tsvector Column with Weighted Fields
**What:** A STORED generated column that automatically computes a weighted tsvector from multiple text columns.
**When to use:** When you need fulltext search with different priority levels across columns.
**Example:**
```sql
-- Source: PostgreSQL 18 docs, Section 12.2 (Tables and Indexes)
-- For TEXT[] tags, use array_to_string to convert to searchable text
ALTER TABLE deck_index ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
) STORED;

CREATE INDEX idx_deck_index_search_vector ON deck_index USING GIN(search_vector);
```

### Pattern 2: Subfolder-Aware JOIN Filter
**What:** Adding an optional subfolder filter to existing JOINs on user_repositories.
**When to use:** When a user subscribes to a subfolder rather than an entire repository.
**Example:**
```sql
-- Existing pattern (current RPCs):
JOIN user_repositories ur ON ur.repository_id = c.repository_id
                          AND ur.user_id = p_user_id

-- Updated pattern with subfolder awareness:
JOIN user_repositories ur ON ur.repository_id = c.repository_id
                          AND ur.user_id = p_user_id
                          AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')
```

### Pattern 3: SECURITY DEFINER Search RPC with Pagination
**What:** A SECURITY DEFINER function that performs fulltext search with ts_rank_cd ranking and cursor-based or offset pagination.
**When to use:** When users need to search across data they may not have RLS access to (deck_index is publicly searchable).
**Example:**
```sql
CREATE OR REPLACE FUNCTION search_decks(
    p_query TEXT DEFAULT NULL,
    p_tag TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    repository_id UUID,
    subfolder_path TEXT,
    display_name TEXT,
    description TEXT,
    tags TEXT[],
    author TEXT,
    language TEXT,
    card_count BIGINT,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        di.id,
        di.repository_id,
        di.subfolder_path,
        di.display_name,
        di.description,
        di.tags,
        di.author,
        di.language,
        (SELECT COUNT(*) FROM cards c
         WHERE c.repository_id = di.repository_id
         AND c.file_path LIKE di.subfolder_path || '%'
         AND c.is_active = TRUE) AS card_count,
        CASE WHEN p_query IS NOT NULL AND p_query != ''
             THEN ts_rank_cd(di.search_vector, websearch_to_tsquery('simple', p_query))
             ELSE 0.0
        END AS rank
    FROM deck_index di
    WHERE
        (p_query IS NULL OR p_query = '' OR di.search_vector @@ websearch_to_tsquery('simple', p_query))
        AND (p_tag IS NULL OR p_tag = '' OR di.tags @> ARRAY[p_tag])
    ORDER BY
        CASE WHEN p_query IS NOT NULL AND p_query != ''
             THEN ts_rank_cd(di.search_vector, websearch_to_tsquery('simple', p_query))
             ELSE 0.0
        END DESC,
        di.display_name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
```

### Pattern 4: Platform Repo Identification
**What:** Using an `is_platform` boolean column to distinguish platform-level repos from user repos.
**When to use:** When a repository has no user_id association and should be hidden from user queries.
**Recommendation:** Use `is_platform BOOLEAN NOT NULL DEFAULT FALSE` column. This is more explicit than relying on "no user_repositories rows" pattern, which could be confused with an orphaned repo. The RLS policy on `repositories` can exclude platform repos from user SELECT queries, while the service role can still access them.
```sql
ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT FALSE;

-- Update RLS: Users only see repos they subscribe to AND that are not platform-only
-- (Platform repos become visible through deck_index search, not through repositories RLS)
```

### Anti-Patterns to Avoid
- **Storing card_count in deck_index:** Card count changes when cards are added/removed. Computing at query time via correlated subquery avoids stale counts and eliminates the need for counter-update triggers.
- **Using language-specific tsvector config:** Deck names are multilingual (Italian, English, etc.). Using 'english' config would stem non-English words incorrectly. 'simple' config only lowercases and splits on whitespace, which is correct for all languages.
- **Creating a separate subscriptions table:** The `user_repositories` table already represents the user-repo relationship. Adding `subfolder_path` to it is the minimal change. A separate table would require updating all JOINs in all RPCs.
- **Using ILIKE for search instead of tsvector:** ILIKE cannot rank results, does not support weighted fields, and performs full table scans. tsvector with GIN index is the correct approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fulltext search | Custom ILIKE queries with ranking logic | PostgreSQL tsvector + ts_rank_cd | Battle-tested, index-backed, handles tokenization and ranking |
| Search tokenization | Custom word splitting and normalization | `to_tsvector('simple', ...)` | Handles edge cases (punctuation, multiple spaces, etc.) |
| Query parsing | Custom search term parser | `websearch_to_tsquery('simple', ...)` | Handles AND/OR/NOT syntax, quotes for phrases |
| Array containment check | Custom tag matching loops | `tags @> ARRAY[p_tag]` with GIN index | Native PostgreSQL array operator, index-accelerated |

**Key insight:** PostgreSQL's built-in fulltext search is more than sufficient for this use case. The deck catalog will be small (hundreds to low thousands of entries), so even without the GIN index, queries would be fast. The GIN index ensures this scales.

## Common Pitfalls

### Pitfall 1: Generated Column Expression Too Complex
**What goes wrong:** PostgreSQL generated columns cannot reference other tables, use subqueries, or call volatile functions.
**Why it happens:** Developers try to include computed data from other tables in the generated column expression.
**How to avoid:** Keep the generated column expression purely based on columns in the same row. The tsvector expression should only reference `display_name`, `tags`, and `description` from the same `deck_index` row.
**Warning signs:** Migration fails with "generation expression is not immutable."

### Pitfall 2: UNIQUE Constraint with NULLable Column
**What goes wrong:** PostgreSQL treats NULLs as distinct in UNIQUE constraints. `UNIQUE(user_id, repository_id, subfolder_path)` would allow multiple rows with `(user1, repo1, NULL)`.
**Why it happens:** The existing rows have `subfolder_path = NULL` (whole-repo subscriptions), and the UNIQUE constraint should still prevent duplicates for those.
**How to avoid:** Use a unique index with `COALESCE`: `CREATE UNIQUE INDEX idx_user_repos_unique ON user_repositories(user_id, repository_id, COALESCE(subfolder_path, ''))`. This treats NULL as empty string for uniqueness purposes. Alternatively, use a partial unique index or the `NULLS NOT DISTINCT` option (PostgreSQL 15+).
**Warning signs:** Duplicate subscription rows with NULL subfolder_path.

### Pitfall 3: LIKE Pattern Without Trailing Separator
**What goes wrong:** `WHERE c.file_path LIKE 'math' || '%'` matches both `math/algebra/card.md` AND `mathematics/card.md`.
**Why it happens:** The subfolder path does not end with `/`, so LIKE matches any prefix.
**How to avoid:** Ensure subfolder_path always ends with `/` (enforced at insert time or in the LIKE pattern): `WHERE c.file_path LIKE subfolder_path || '/%'` or store paths with trailing slash.
**Warning signs:** Cards from unrelated subfolders appearing in study sessions.

### Pitfall 4: Breaking Existing RPC Signatures
**What goes wrong:** `DROP FUNCTION` and `CREATE OR REPLACE FUNCTION` with different parameter lists breaks the RPC interface for connected clients.
**Why it happens:** The study RPCs are called from the mobile app via Supabase REST. Changing parameter names or types requires updating client code.
**How to avoid:** The subfolder filter should be transparent to callers -- it applies based on the `user_repositories` data, not based on new RPC parameters. The RPCs already JOIN on `user_repositories`, so adding the subfolder filter to that JOIN does NOT change the RPC signature.
**Warning signs:** Mobile app errors after migration.

### Pitfall 5: Platform Repo Leaking into User Queries
**What goes wrong:** After seeding the lumio-decks repo, it appears in all users' repository lists even though no user subscribed.
**Why it happens:** The current RLS policy on repositories uses `id IN (SELECT repository_id FROM user_repositories WHERE user_id = auth.uid())`. If no `user_repositories` row exists for the platform repo, it's correctly excluded. BUT if a user subscribes to a deck within it, a `user_repositories` row is created, and the repo becomes visible.
**How to avoid:** This is actually the desired behavior -- when a user subscribes to a subfolder, they should see the repo. The `is_platform` flag is for administrative queries, not for RLS filtering. The existing RLS policy works correctly as-is.
**Warning signs:** None -- the existing pattern is correct.

### Pitfall 6: websearch_to_tsquery vs plainto_tsquery
**What goes wrong:** Using `plainto_tsquery` treats all terms as AND-connected, but does not support operators. Using `to_tsquery` requires manually formatting the query string.
**Why it happens:** Multiple tsquery functions exist with different parsing rules.
**How to avoid:** Use `websearch_to_tsquery('simple', p_query)` -- it handles Google-style search syntax (AND by default, quotes for phrases, `-` for exclusion) and does not require special formatting from the user.
**Warning signs:** Search returning no results for reasonable queries.

## Code Examples

Verified patterns from official PostgreSQL documentation and existing project migrations:

### Migration: Create deck_index Table
```sql
-- Source: PostgreSQL docs 12.2 + project migration conventions
CREATE TABLE public.deck_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    subfolder_path TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    author TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'en',
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(repository_id, subfolder_path)
);

-- GIN index for fulltext search
CREATE INDEX idx_deck_index_search_vector ON deck_index USING GIN(search_vector);

-- Index for tag filtering
CREATE INDEX idx_deck_index_tags ON deck_index USING GIN(tags);

-- Index for repository lookups (webhook updates)
CREATE INDEX idx_deck_index_repository_id ON deck_index(repository_id);

-- updated_at trigger
CREATE TRIGGER set_deck_index_updated_at
    BEFORE UPDATE ON deck_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Migration: Add subfolder_path to user_repositories
```sql
-- Source: Existing user_repositories migration pattern
-- Step 1: Add column
ALTER TABLE public.user_repositories
    ADD COLUMN IF NOT EXISTS subfolder_path TEXT;

-- Step 2: Drop old UNIQUE constraint
ALTER TABLE public.user_repositories
    DROP CONSTRAINT IF EXISTS user_repositories_user_id_repository_id_key;

-- Step 3: Create new UNIQUE index (handles NULL subfolder_path correctly)
-- PostgreSQL 15 supports NULLS NOT DISTINCT
CREATE UNIQUE INDEX idx_user_repos_unique
    ON public.user_repositories(user_id, repository_id, COALESCE(subfolder_path, ''));

COMMENT ON COLUMN public.user_repositories.subfolder_path IS
    'Optional subfolder within a shared repo. NULL = whole repo subscription.';
```

### Study RPC Update: Adding Subfolder Filter to JOIN
```sql
-- The key change to all study RPCs: add subfolder filter to the existing JOIN
-- BEFORE:
--   JOIN user_repositories ur ON ur.repository_id = c.repository_id
--                             AND ur.user_id = p_user_id
-- AFTER:
--   JOIN user_repositories ur ON ur.repository_id = c.repository_id
--                             AND ur.user_id = p_user_id
--                             AND (ur.subfolder_path IS NULL
--                                  OR c.file_path LIKE ur.subfolder_path || '%')

-- This filter is applied in ALL places where user_repositories is JOINed:
-- 1. get_study_cards_for_session: 3 JOINs (due count, overdue query, new cards query)
-- 2. get_due_card_count: 2 JOINs (due count, new count)
-- 3. upsert_card_review: does NOT join user_repositories (no change needed)
```

### Seed: Platform Repository
```sql
-- Source: Project convention for seed data in migrations
INSERT INTO public.repositories (
    url,
    name,
    is_private,
    format_version,
    sync_status,
    is_platform
) VALUES (
    'https://github.com/toto-castaldi/lumio-decks',
    'lumio-decks',
    FALSE,
    1,
    'pending',
    TRUE
) ON CONFLICT (url) DO NOTHING;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `plainto_tsquery` | `websearch_to_tsquery` | PostgreSQL 11 (2018) | Supports Google-style search syntax natively |
| Trigger-updated tsvector | Generated column tsvector | PostgreSQL 12 (2019) | Declarative, no trigger maintenance |
| `NULLS DISTINCT` in UNIQUE | `NULLS NOT DISTINCT` option | PostgreSQL 15 (2022) | Can enforce uniqueness treating NULLs as equal |

**Deprecated/outdated:**
- `ts_rank` (without `_cd`): `ts_rank_cd` (cover density) gives better results for weighted searches
- Manual UNIQUE constraint workarounds for NULLs: PostgreSQL 15 (Supabase's version) supports `NULLS NOT DISTINCT` natively

## Open Questions

1. **subfolder_path trailing slash convention**
   - What we know: Card file_paths look like `userId/deckName/card.md`. Subfolder paths for shared decks would be like `deckName/`.
   - What's unclear: Should subfolder_path be stored with or without trailing `/`? With trailing slash, the LIKE pattern is `subfolder_path || '%'`. Without, it's `subfolder_path || '/%'` (but then exact deck names matching other deck prefixes become a problem, e.g., `math` vs `mathematics`).
   - Recommendation: Store WITH trailing `/` (e.g., `italian-vocabulary/`). This makes the LIKE pattern simpler and avoids prefix collision. Enforce at insert time.

2. **search_decks RPC: websearch_to_tsquery vs plainto_tsquery**
   - What we know: `websearch_to_tsquery` supports quotes and `-` exclusion. `plainto_tsquery` is simpler (AND all terms).
   - What's unclear: Will users expect Google-style search syntax?
   - Recommendation: Use `websearch_to_tsquery` -- it gracefully handles simple queries (just space-separated words treated as AND) while supporting advanced users. No downside.

3. **Platform repo: is_platform boolean vs NULL user pattern**
   - What we know: CONTEXT.md lists this as Claude's discretion. The repo has no `user_id` (was removed in shared repos migration). Currently repos are visible only via `user_repositories` JOIN.
   - What's unclear: Future admin queries might need to filter platform repos.
   - Recommendation: Use `is_platform BOOLEAN NOT NULL DEFAULT FALSE`. Explicit is better than implicit. Costs one column, zero ambiguity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Supabase CLI (db reset + manual SQL verification) |
| Config file | supabase/config.toml |
| Quick run command | `supabase db reset` |
| Full suite command | `supabase db reset && supabase functions serve --env-file supabase/.env.local --no-verify-jwt` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DBSR-01 | deck_index table exists with tsvector/GIN | smoke | `supabase db reset` (migration applies cleanly) | N/A -- migration SQL |
| DBSR-02 | search_decks RPC returns ranked results | manual | SQL via Supabase Studio: `SELECT * FROM search_decks('test query')` | N/A -- RPC SQL |
| DBSR-03 | subfolder_path on user_repositories with UNIQUE constraint | smoke | `supabase db reset` (migration applies cleanly) | N/A -- migration SQL |
| DBSR-04 | Study RPCs filter by subfolder_path | manual | SQL via Supabase Studio: insert test data, call RPCs, verify filtering | N/A -- RPC SQL |
| DBSR-05 | lumio-decks seeded in repositories | smoke | `supabase db reset` then check `SELECT * FROM repositories WHERE is_platform = TRUE` | N/A -- migration SQL |
| STDY-01 | Subscribed deck cards appear in study sessions | manual | End-to-end: subscribe to subfolder, call get_study_cards_for_session | N/A -- RPC SQL |

### Sampling Rate
- **Per task commit:** `supabase db reset` (verifies all migrations apply cleanly)
- **Per wave merge:** Full `supabase db reset` + manual RPC verification via Studio
- **Phase gate:** All migrations apply cleanly + manual verification of search and study RPCs

### Wave 0 Gaps
None -- this phase is pure SQL migrations. No test framework setup needed. Verification is via `supabase db reset` (migrations compile and apply) and manual SQL queries in Supabase Studio.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL 18 Docs: Tables and Indexes (12.2)](https://www.postgresql.org/docs/current/textsearch-tables.html) - Generated tsvector column syntax, GIN index creation
- [PostgreSQL 18 Docs: Controlling Text Search (12.3)](https://www.postgresql.org/docs/current/textsearch-controls.html) - setweight, ts_rank_cd, websearch_to_tsquery
- [PostgreSQL 18 Docs: Text Search Indexes (12.9)](https://www.postgresql.org/docs/current/textsearch-indexes.html) - GIN vs GiST for text search
- [PostgreSQL 18 Docs: Text Search Functions (9.13)](https://www.postgresql.org/docs/current/functions-textsearch.html) - Function signatures and behavior
- Existing project migrations (20260115000001 through 20260305000001) - Established patterns for RPC, RLS, table design

### Secondary (MEDIUM confidence)
- [Supabase Full Text Search Docs](https://supabase.com/docs/guides/database/full-text-search) - Supabase-specific integration patterns
- [OneUpTime: Full Text Search with GIN (2026-01-25)](https://oneuptime.com/blog/post/2026-01-25-full-text-search-gin-postgresql/view) - Recent practical examples

### Tertiary (LOW confidence)
- None -- all findings verified against official PostgreSQL documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pure PostgreSQL, all features verified in official docs
- Architecture: HIGH - Patterns directly derived from existing project migrations and PostgreSQL documentation
- Pitfalls: HIGH - NULL uniqueness, LIKE prefix collision, and generated column immutability are well-documented PostgreSQL behaviors

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- PostgreSQL fulltext search has not changed significantly in years)
