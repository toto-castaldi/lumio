# Architecture Patterns

**Domain:** Deck discovery with fulltext search, metadata, and subfolder subscriptions for Lumio flashcard platform
**Researched:** 2026-03-13

## Recommended Architecture

### High-Level System Diagram (Post-Discovery)

```
  Deck Builder Web                                  Mobile App (Android)
  deck.lumio.toto-castaldi.com                     apps/android
 +-----------------------------------+            +----------------------------+
 |  DeckContext + CardContext         |            |  Discovery Screen (NEW)    |
 |  DeckMetadataForm (NEW)           |            |    Search bar + results    |
 |  deck.yaml editor (NEW)          |            |    Subscribe to deck       |
 |                                   |            |  Repos / Cards / Study     |
 +------+--+------------------------+            +------+--------+------------+
        |  |                                            |        |
        |  | deck-commit                                |        |
        |  | (+ commit_yaml action)                     |        | git-sync
        v  v                                            v        v
 +------+--+---------------------------+  +-------------+--------+---------+
 | Supabase Edge Functions             |  | Supabase Edge Functions          |
 |  deck-commit (MODIFIED: +yaml)      |  |  git-sync (EXISTING: no change) |
 +------+------------------------------+  +--------------------------------+
        |                                                ^
        | GitHub Contents API                            | user queries
        v                                                |
 +------+------+                                  +------+-------+
 | lumio-decks  |     Docora monitors             | Supabase DB  |
 | GitHub repo  +---->  webhooks  ---->           |              |
 |              |                     |           | deck_index   |
 | {userId}/    |              +------+------+    | (NEW table)  |
 |   {deck}/    |              | docora-     |    |              |
 |     deck.yaml|              | webhook     +--->+ tsvector/GIN |
 |     *.md     |              | (MODIFIED)  |    | fulltext     |
 +--------------+              +-------------+    +--------------+
```

### Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `deck_index` table | Stores deck metadata for search/browse | **NEW** | Populated by docora-webhook, queried by mobile via RPC |
| `search_decks` RPC | Fulltext search over deck_index with tsvector | **NEW** | Called by mobile app DiscoveryScreen |
| `subscribe_deck` RPC | Creates user_repositories link scoped to subfolder | **NEW** | Called by mobile app after deck selection |
| docora-webhook | Processes deck.yaml files into deck_index rows | **MODIFIED** | Reads GitHub files via Docora, writes to deck_index |
| deck-commit | Handles deck.yaml commit alongside .md files | **MODIFIED** | Called by deck builder, writes to GitHub repo |
| DeckMetadataForm | UI for editing deck.yaml metadata in deck builder | **NEW** | DeckContext provides data, api.ts commits yaml |
| DiscoveryScreen | Mobile search/browse/subscribe screen | **NEW** | Calls search_decks RPC, subscribe_deck RPC |
| DeckDetailScreen | Mobile preview of deck before subscribing | **NEW** | Reads deck_index + card count from RPC |

### Data Flow

**1. Deck Author Creates Metadata (Deck Builder)**

```
Author edits metadata form in DeckDetailPanel
  -> DeckContext saves DeckMetadata state
  -> api.commitYaml() calls deck-commit edge function
    -> deck-commit action: "commit_yaml"
    -> validates path: {userId}/{deckName}/deck.yaml
    -> commits YAML to GitHub via Contents API
  -> Docora detects change in lumio-decks repo
  -> Docora sends webhook to docora-webhook/create or /update
  -> docora-webhook detects "deck.yaml" file
  -> Parses YAML, upserts into deck_index table
  -> deck_index tsvector auto-updates via generated column
```

**2. Mobile User Discovers and Subscribes**

```
User opens Discovery tab in mobile app
  -> DiscoveryScreen renders search bar + category filters
  -> User types search query
  -> App calls search_decks RPC with query text
    -> RPC uses websearch_to_tsquery against deck_index.fts column
    -> Returns matched decks with ts_rank ordering
  -> Results displayed as deck cards (name, description, author, tags, card count)
  -> User taps a deck -> DeckPreviewScreen shows full details
  -> User taps "Subscribe" (Iscriviti)
    -> App calls subscribe_deck RPC
    -> RPC finds or creates repository entry for lumio-decks
    -> RPC creates user_repositories link
    -> RPC stores subfolder_path in new column on user_repositories
  -> Cards from that subfolder appear in user's study material
  -> SRS scheduling applies to those cards on next study session
```

**3. Existing Card Filtering with Subfolder Scope**

```
Study session starts
  -> get_study_session RPC loads cards from user_repositories
  -> For user_repositories with subfolder_path:
    -> WHERE cards.file_path LIKE subfolder_path || '%'
  -> For user_repositories without subfolder_path (legacy):
    -> All cards from that repository (existing behavior)
  -> SRS scheduling, .lumioignore filtering applied as before
```

## New Database Components

### deck_index Table

**Confidence: HIGH** (Postgres tsvector/GIN is well-documented in Supabase, used in production widely)

```sql
CREATE TABLE public.deck_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    subfolder_path TEXT NOT NULL,         -- e.g. "{userId}/{deckName}"
    author_id UUID,                       -- extracted from subfolder path (= userId)
    author_name TEXT,                     -- denormalized from users.display_name
    deck_name TEXT NOT NULL,              -- human-readable name from deck.yaml
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',             -- single category string
    tags TEXT[] DEFAULT '{}',             -- array of tags
    language TEXT DEFAULT 'en',
    card_count INTEGER DEFAULT 0,         -- denormalized, updated on card sync
    is_published BOOLEAN DEFAULT TRUE,    -- author can hide deck from discovery
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Fulltext search vector (weighted: name A, tags B, description C, category C)
    fts tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(deck_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(category, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(author_name, '')), 'D')
    ) STORED,

    UNIQUE(repository_id, subfolder_path)
);

-- GIN index for fulltext search
CREATE INDEX idx_deck_index_fts ON deck_index USING gin(fts);

-- Index for category browsing
CREATE INDEX idx_deck_index_category ON deck_index(category) WHERE is_published = TRUE;

-- Index for author lookup
CREATE INDEX idx_deck_index_author ON deck_index(author_id) WHERE is_published = TRUE;

-- Trigger for updated_at
CREATE TRIGGER set_deck_index_updated_at
    BEFORE UPDATE ON deck_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Why `'simple'` instead of `'english'` for to_tsvector:**
Deck names, tags, and categories are short tokens, not prose. Using `'simple'` avoids stemming artifacts (e.g., "programming" stemmed to "program") that would hurt exact matching on metadata. Multilingual content (IT/EN) also works better with `'simple'` since no language-specific stemmer is applied.

### user_repositories Modification

Add subfolder scoping to the existing many-to-many table:

```sql
ALTER TABLE user_repositories
    ADD COLUMN subfolder_path TEXT;

COMMENT ON COLUMN user_repositories.subfolder_path IS
    'When set, user is subscribed only to cards under this path in the repo. NULL means entire repo (legacy behavior).';
```

**Why a column on user_repositories instead of a separate table:** The user_repositories table already models "user subscribes to repo." Adding subfolder_path extends this relationship minimally. A subfolder subscription is semantically the same as a repo subscription, just scoped. This avoids a new join table and keeps the existing RLS policies functional.

### RLS Policies for deck_index

```sql
ALTER TABLE deck_index ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can search/browse decks
CREATE POLICY "Authenticated users can view published decks"
    ON deck_index FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_published = TRUE);

-- Service role manages deck_index (webhook writes)
CREATE POLICY "Service role can manage deck_index"
    ON deck_index FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');
```

### search_decks RPC

```sql
CREATE OR REPLACE FUNCTION search_decks(
    p_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_language TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    deck_name TEXT,
    description TEXT,
    category TEXT,
    tags TEXT[],
    language TEXT,
    author_name TEXT,
    author_id UUID,
    card_count INTEGER,
    subfolder_path TEXT,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        di.id,
        di.deck_name,
        di.description,
        di.category,
        di.tags,
        di.language,
        di.author_name,
        di.author_id,
        di.card_count,
        di.subfolder_path,
        CASE
            WHEN p_query IS NOT NULL AND p_query <> '' THEN
                ts_rank(di.fts, websearch_to_tsquery('simple', p_query))
            ELSE 1.0
        END AS rank
    FROM deck_index di
    WHERE di.is_published = TRUE
        AND (p_query IS NULL OR p_query = '' OR di.fts @@ websearch_to_tsquery('simple', p_query))
        AND (p_category IS NULL OR di.category = p_category)
        AND (p_language IS NULL OR di.language = p_language)
    ORDER BY rank DESC, di.card_count DESC, di.deck_name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
```

### subscribe_deck RPC

```sql
CREATE OR REPLACE FUNCTION subscribe_deck(
    p_deck_index_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_deck deck_index;
    v_existing_link user_repositories;
    v_result user_repositories;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get deck info
    SELECT * INTO v_deck FROM deck_index WHERE id = p_deck_index_id AND is_published = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deck not found';
    END IF;

    -- Check if user already subscribed to this exact subfolder
    SELECT * INTO v_existing_link
    FROM user_repositories
    WHERE user_id = v_user_id
      AND repository_id = v_deck.repository_id
      AND subfolder_path = v_deck.subfolder_path;

    IF FOUND THEN
        RAISE EXCEPTION 'Already subscribed to this deck';
    END IF;

    -- Create subscription
    INSERT INTO user_repositories (user_id, repository_id, subfolder_path)
    VALUES (v_user_id, v_deck.repository_id, v_deck.subfolder_path)
    RETURNING * INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;
```

## Modified Existing Components

### docora-webhook: deck.yaml Handler

The webhook already handles README.md and .lumioignore as special files. Adding deck.yaml follows the same pattern.

**Integration point:** In both `handleCreate` and `handleUpdate` functions, add a check **before** the .md card check:

```typescript
// deck.yaml - extract and upsert deck metadata into deck_index
if (fileName.toLowerCase() === "deck.yaml") {
    // Parse YAML (import yaml package, same as deck-builder uses)
    const parsed = yamlParse(content);

    // Extract subfolder path: everything before /deck.yaml
    const subfolderPath = filePath.replace(/\/deck\.yaml$/i, '');

    // Extract author_id from subfolder path (first segment is UUID)
    const authorId = subfolderPath.split('/')[0];

    // Lookup author display name
    const { data: authorProfile } = await serviceClient
        .from('users')
        .select('display_name')
        .eq('id', authorId)
        .single();

    // Upsert into deck_index
    await serviceClient
        .from('deck_index')
        .upsert({
            repository_id: repo.id,
            subfolder_path: subfolderPath,
            author_id: authorId,
            author_name: authorProfile?.display_name || 'Unknown',
            deck_name: parsed.name || subfolderPath.split('/').pop(),
            description: parsed.description || '',
            category: parsed.category || '',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            language: parsed.language || 'en',
            is_published: parsed.published !== false,  // default true
        }, { onConflict: 'repository_id,subfolder_path' });

    // Clear error state
    await serviceClient
        .from('repositories')
        .update({
            sync_status: 'synced',
            sync_error_message: null,
            sync_error_type: null,
            is_auth_error: false,
            sync_failed_at: null,
        })
        .eq('id', repo.id);

    return { success: true, message: 'deck.yaml processed' };
}
```

**Also update card_count on each card create/update/delete** by incrementing/decrementing `deck_index.card_count` based on the subfolder the card belongs to. This avoids expensive COUNT queries at search time.

### deck-commit: New `commit_yaml` Action

Add a new action to the existing deck-commit edge function:

```typescript
case "commit_yaml": {
    const { deck_name, content } = body;
    if (!deck_name || content === undefined) {
        return errorResponse("Missing required fields: deck_name, content", 400);
    }

    const yamlPath = `${userId}/${deck_name}/deck.yaml`;

    // Check if file exists (for update SHA)
    const existing = await getYamlFile(yamlPath);

    const result = await commitFile(
        yamlPath,
        content,
        `[deck-builder] Update deck metadata: ${deck_name}`,
        existing?.sha
    );

    return jsonResponse({ success: true, sha: result.sha, commit_sha: result.commit_sha });
}
```

**Path validation change:** The existing `validateUserPath` requires `.md` extension. Add `validateUserYamlPath` that allows `.yaml` specifically for `deck.yaml` files:

```typescript
function validateUserYamlPath(userId: string, filePath: string): string {
    const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    if (normalized.includes('..')) {
        throw new Error('Access denied: path traversal not allowed');
    }
    if (!normalized.startsWith(`${userId}/`)) {
        throw new Error('Access denied: cannot write outside your directory');
    }
    if (!normalized.endsWith('/deck.yaml')) {
        throw new Error('Only deck.yaml files are supported for this action');
    }
    return normalized;
}
```

### Card Filtering with Subfolder Scope

The existing study RPCs and `git-sync` getCards functions filter by `repository_id`. With subfolder subscriptions, the card query needs an additional WHERE clause.

**In get_study_session RPC / getAllCards:**

```sql
-- Current pattern:
WHERE c.repository_id = ANY(v_repo_ids)

-- New pattern (subfolder-aware):
WHERE c.repository_id = ur.repository_id
  AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '/%')
```

This means the existing JOIN through `user_repositories` must be used directly rather than collecting repo_ids into an array. The change is localized to the SQL query inside the RPC.

### deck.yaml File Schema

```yaml
# deck.yaml - Deck metadata for Lumio Discovery
name: "JavaScript Fundamentals"
description: "Core concepts of JavaScript including closures, prototypes, and async patterns"
category: "programming"
tags:
  - javascript
  - web-development
  - fundamentals
language: en
published: true   # default true, set false to hide from discovery
```

**Why a separate deck.yaml instead of extending README.md frontmatter:**
1. README.md currently holds `lumio_format_version` and `description` -- different concern (repo-level metadata vs. per-deck metadata in a shared repo)
2. In the shared repo lumio-decks, each subfolder `{userId}/{deckName}/` is a deck. README.md is at the repo root, not per-deck
3. deck.yaml is explicit and self-documenting; won't confuse the existing README.md processing path
4. The `yaml` package is already used in the deck builder (chosen over `gray-matter` for browser compatibility in v3.0)

## Patterns to Follow

### Pattern 1: SECURITY DEFINER RPCs for Cross-Table Operations

**What:** All new RPCs (search_decks, subscribe_deck) use SECURITY DEFINER to bypass RLS while enforcing auth internally via `auth.uid()`.

**When:** Any operation that crosses table boundaries or needs to read data the user doesn't "own" (e.g., browsing all published decks).

**Why:** Consistent with existing patterns: `upsert_card_review`, `insert_repository`, `insert_user_repository` all use this pattern. The deck_index table has permissive SELECT for authenticated users, but subscribe_deck needs INSERT on user_repositories which has stricter RLS.

**Confidence: HIGH** -- identical to 6+ existing RPCs in the codebase.

### Pattern 2: Edge Function Action Router

**What:** Add new actions to existing edge functions rather than creating new functions.

**When:** The new action shares the same auth context and infrastructure (e.g., deck-commit already has GitHub API helpers).

**Why:** Lumio's deck-commit already has 8 actions routed via `switch(action)`. Adding `commit_yaml` follows this established pattern. Avoids deploying a new function, shares path validation and GitHub API helpers.

**Confidence: HIGH** -- deck-commit already demonstrates this pattern.

### Pattern 3: Webhook Special-File Detection

**What:** In docora-webhook, detect special filenames (deck.yaml) before the generic .md handler, similar to how README.md and .lumioignore are handled today.

**When:** A new file type needs different processing than card files.

**Why:** The webhook handler already has this cascade: `if (readme) -> if (.lumioignore) -> if (.md)`. Adding `if (deck.yaml)` between `.lumioignore` and `.md` keeps the pattern clean.

**Confidence: HIGH** -- identical to existing special-file handling.

### Pattern 4: Denormalized Counts with Sync Updates

**What:** Store `card_count` in deck_index and update it when cards are created/deleted, rather than computing via COUNT(*) at query time.

**When:** The count is displayed in search results where many decks are returned.

**Why:** Same pattern as the original `card_count` column on repositories (later removed in favor of dynamic counting). For discovery, where 20+ results are returned per search, a denormalized count avoids N+1 queries. The docora-webhook already processes each card individually, so incrementing a counter is trivial.

**Confidence: MEDIUM** -- the original card_count was removed in the codebase. However, the discovery use case is different: we need counts for decks we don't own, so dynamic counting would require a complex cross-table query. Denormalized count is the pragmatic choice here.

### Pattern 5: Platform-Level Repository (lumio-decks always present)

**What:** The lumio-decks shared repository is registered once at platform level and always exists in the `repositories` table. Individual users subscribe to subfolders, not the whole repo.

**When:** The system needs a single shared content source that all users can discover from.

**Why:** Today, users manually add repos via the ReposScreen. The shared repo needs to exist independently of any user. It should be seeded via a migration or platform_config entry, not created by user action.

**Confidence: HIGH** -- follows the platform_config pattern from v1.4.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Searching GitHub API Directly from Mobile

**What:** Having the mobile app search GitHub contents for deck discovery.
**Why bad:** GitHub API has rate limits, no fulltext search, requires traversing directory trees. Would be slow and fragile.
**Instead:** Materialize deck metadata in Supabase via webhook sync, search Postgres.

### Anti-Pattern 2: Separate user_deck_subscriptions Table

**What:** Creating a brand-new table for deck subscriptions instead of extending user_repositories.
**Why bad:** Duplicates the subscription concept. The existing card-loading, study-session, and stats RPCs all query `user_repositories`. A parallel table would require modifying every downstream consumer.
**Instead:** Add `subfolder_path` column to user_repositories. NULL means whole-repo (backward compatible). Non-null means subfolder-scoped.

### Anti-Pattern 3: Real-Time Search (Debounce-less)

**What:** Firing an RPC on every keystroke in the search bar.
**Why bad:** Floods the database with queries, most of which are immediately superseded by the next keystroke.
**Instead:** Debounce search input (300ms minimum). Show "searching..." indicator. Cancel in-flight requests on new input.

### Anti-Pattern 4: Client-Side Card Filtering for Subfolder Scope

**What:** Loading all cards from a repository and filtering by subfolder path in the app.
**Why bad:** lumio-decks will contain cards from ALL users. Loading everything would be massive and a data leak.
**Instead:** Filter in SQL with `WHERE file_path LIKE subfolder_path || '/%'`. RLS still applies.

### Anti-Pattern 5: Using deck.yaml Frontmatter in .md Files

**What:** Storing deck-level metadata as frontmatter in individual card files.
**Why bad:** Deck metadata is per-deck, not per-card. Duplicating it in every card file creates update anomalies and parsing overhead.
**Instead:** Single deck.yaml per deck folder. One file, one source of truth.

## Integration Points (Exhaustive List)

### New Components (6)

| # | Component | Type | Location |
|---|-----------|------|----------|
| 1 | `deck_index` table | DB migration | `supabase/migrations/` |
| 2 | `search_decks` RPC | DB function | `supabase/migrations/` |
| 3 | `subscribe_deck` RPC | DB function | `supabase/migrations/` |
| 4 | `DiscoveryScreen` | Mobile screen | `apps/android/screens/` |
| 5 | `DeckPreviewScreen` | Mobile screen | `apps/android/screens/` |
| 6 | `DeckMetadataForm` | Web component | `apps/deck-builder/src/components/` |

### Modified Components (8)

| # | Component | Change | Scope |
|---|-----------|--------|-------|
| 1 | `docora-webhook` | Add deck.yaml handler, update card_count on deck_index | Edge function |
| 2 | `deck-commit` | Add `commit_yaml` action, `validateUserYamlPath` | Edge function |
| 3 | `user_repositories` | Add `subfolder_path` column | DB migration |
| 4 | `user_repositories` UNIQUE constraint | Change to `UNIQUE(user_id, repository_id, subfolder_path)` | DB migration |
| 5 | `git-sync` getCards/getAllCards | Add subfolder_path filtering in WHERE clause | Edge function |
| 6 | Study RPCs (`get_study_session`) | Join through user_repositories with subfolder filter | DB migration |
| 7 | `MainNavigator` | Add Discovery tab | Mobile navigation |
| 8 | `DeckDetailPanel` | Add metadata editing section | Web component |

### Unchanged Components (Verified)

| Component | Why No Change Needed |
|-----------|---------------------|
| `@lumio/core` Deck class | Operates on cards already filtered by repo; subfolder filtering happens upstream in SQL |
| `@lumio/shared` types | New types (DeckMetadata) can be added without changing existing ones |
| Card frontmatter parsing | deck.yaml is a different file; card frontmatter unchanged |
| SRS/SM-2 scheduling | Operates on card_review_schedule rows, independent of discovery |
| Auth system | No auth changes needed |
| Card browse screens | Existing CardList/CardDetail work with any card set |

## Suggested Build Order

Based on dependency analysis:

```
Phase 1: Database Foundation
  1a. Migration: deck_index table + RLS + GIN index
  1b. Migration: user_repositories.subfolder_path column
  1c. Migration: search_decks RPC
  1d. Migration: subscribe_deck RPC
  1e. Seed: lumio-decks repository in repositories table (if not exists)

Phase 2: Backend Integration
  2a. docora-webhook: deck.yaml handler (create + update + delete)
  2b. docora-webhook: card_count updates on deck_index
  2c. deck-commit: commit_yaml action + validateUserYamlPath

Phase 3: Deck Builder Metadata UI
  3a. DeckMetadataForm component (name, description, category, tags, language)
  3b. DeckDetailPanel integration (show/edit metadata form)
  3c. api.ts: commitYaml() function
  3d. DeckContext: load existing deck.yaml on deck select

Phase 4: Mobile Discovery
  4a. DiscoveryScreen with search bar, results list
  4b. DeckPreviewScreen with deck details + subscribe button
  4c. MainNavigator: add Discovery tab (4th tab)
  4d. Subfolder-aware card filtering in study session
  4e. i18n keys for discovery UI (IT/EN)

Phase 5: Polish
  5a. Empty states, loading states, error handling
  5b. Category browse (popular categories)
  5c. "My Published Decks" in deck builder sidebar
```

**Build order rationale:**
- Phase 1 first because everything depends on the schema
- Phase 2 before 3 because the webhook must process deck.yaml before the deck builder can commit them (otherwise the index won't populate)
- Phase 3 before 4 because there must be published decks to discover
- Phase 4 depends on all prior phases
- Phase 5 is polish that can be interleaved

## Scalability Considerations

| Concern | At 10 decks | At 100 decks | At 1,000 decks |
|---------|-------------|--------------|----------------|
| Search latency | Negligible (GIN index) | <10ms | <50ms with GIN |
| deck_index size | Trivial | ~100KB | ~1MB |
| card_count accuracy | Exact (webhook sync) | Exact | Exact (but consider eventual consistency) |
| Search result quality | Good with simple tsquery | Good | May need trigram (pg_trgm) for fuzzy matching |
| Subfolder filtering | Fast (LIKE with index) | Fast | Consider path prefix index if needed |

At current scale (single developer, tens of decks), all patterns are well within Postgres capabilities. The architecture degrades gracefully: GIN indexes handle thousands of documents efficiently, and tsvector weights ensure relevant results bubble up.

## Sources

- [Supabase Full Text Search Documentation](https://supabase.com/docs/guides/database/full-text-search) -- Generated columns, GIN indexes, textSearch client method
- [PostgreSQL 18: Text Search Controls](https://www.postgresql.org/docs/current/textsearch-controls.html) -- setweight, ts_rank, websearch_to_tsquery
- [PostgreSQL 18: Text Search Features](https://www.postgresql.org/docs/current/textsearch-features.html) -- Weight labels, ranking
- [Supabase RPC Reference](https://supabase.com/docs/reference/javascript/rpc) -- TypeScript RPC call patterns
- Existing codebase: docora-webhook, deck-commit, git-sync, shared_repositories migration -- patterns verified by reading source
