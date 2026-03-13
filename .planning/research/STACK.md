# Technology Stack: v3.1 Deck Discovery

**Project:** Lumio - Deck Discovery with Fulltext Search
**Researched:** 2026-03-13
**Overall confidence:** HIGH

## Context

This research focuses exclusively on what is NEW for v3.1 Deck Discovery. The existing stack (Supabase, React Native/Expo, Vite/React, pnpm monorepo) is validated and NOT re-researched. The new capabilities needed are:

1. **Postgres fulltext search** -- tsvector columns, GIN indexes, weighted search on deck metadata
2. **Deck metadata file format** -- YAML deck.yaml in the shared repo, parsed by docora-webhook
3. **Deck index table** -- new Supabase table populated during Docora sync
4. **Mobile discovery UI** -- search bar, result list, deck detail, subscribe action
5. **Deck-builder metadata editor** -- form in web app for deck name, description, category, tags

## Recommended Stack Additions

### Database: Postgres Fulltext Search (tsvector + GIN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL tsvector | Built-in (PG 15+) | Fulltext search tokenization | Already available in Supabase, zero additional cost, battle-tested for this exact use case |
| GIN index | Built-in (PG 15+) | Fast fulltext lookup | Preferred index type for tsvector per Postgres docs -- inverted index with compressed posting lists |
| `websearch_to_tsquery()` | Built-in (PG 11+) | User-friendly query parsing | Handles quoted phrases, OR, negation without requiring manual `&`/`|` operators -- ideal for mobile search bar input |
| `setweight()` | Built-in | Weighted search ranking | Allows deck name (weight A) to rank higher than tags (weight B) and description (weight C) |
| `ts_rank()` | Built-in | Relevance sorting | Ranks results by match quality, critical for meaningful search results |

**Rationale:** Postgres FTS is the right choice because: (a) Supabase already runs PG 15+ with full FTS support, (b) the data volume is small (hundreds to low thousands of decks, not millions), (c) no external service dependency (no Elasticsearch, Algolia, Meilisearch), (d) `websearch_to_tsquery` provides natural search syntax users expect, (e) supabase-js has built-in `.textSearch()` method.

**Confidence:** HIGH -- verified via Supabase official docs and PostgreSQL 18 documentation.

### Database: Deck Index Table Design

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| New `deck_index` table | N/A (migration) | Stores deck metadata for discovery | Separate from `repositories` because decks are subdirectories within the shared repo, not standalone repos |
| Generated tsvector column | Built-in PG | Auto-updating search vector | `GENERATED ALWAYS AS (...)` pattern ensures FTS column stays in sync with source columns without triggers |
| `simple` text search config | Built-in PG | Language-agnostic tokenization | Deck names, tags, and categories are proper nouns and keywords, not natural language prose -- `simple` avoids stemming that would mangle them |

**Recommended schema:**

```sql
CREATE TABLE public.deck_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identity
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    deck_path TEXT NOT NULL,          -- e.g., "{user_id}/{deck_name}"
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Metadata from deck.yaml
    display_name TEXT NOT NULL,       -- Human-friendly deck name
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    card_count INTEGER NOT NULL DEFAULT 0,

    -- FTS column (weighted: name A, category B, tags B, description C)
    fts tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C')
    ) STORED,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(repository_id, deck_path)
);

CREATE INDEX idx_deck_index_fts ON deck_index USING GIN (fts);
CREATE INDEX idx_deck_index_category ON deck_index(category);
CREATE INDEX idx_deck_index_author_id ON deck_index(author_id);
```

**Key decisions:**
- Use `simple` config, not `english` -- deck names like "JavaScript Basics" should match "JavaScript", not be stemmed. `simple` tokenizes and lowercases without stemming, so "JavaScript" becomes token "javascript" and searching for "javascript" matches it exactly.
- Weighted FTS: name is most important (A=1.0), category and tags equally important (B=0.4), description least (C=0.2)
- `author_id` enables "show my decks" and "decks by author X" filters
- `card_count` is denormalized for display without JOIN -- updated by docora-webhook on card create/delete
- Separate from `repositories` table because the shared lumio-decks repo contains many decks from many users; each deck directory is one row in `deck_index`

**Confidence:** HIGH -- standard Postgres patterns, verified with Supabase docs.

### Database: Search RPC Function

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `search_decks` RPC | plpgsql | Fulltext search with ranking | supabase-js `.textSearch()` cannot do `ts_rank` ordering natively -- an RPC gives full control over ranking and pagination |

**Recommended RPC:**

```sql
CREATE OR REPLACE FUNCTION search_decks(
    search_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID, display_name TEXT, description TEXT, category TEXT,
    tags TEXT[], card_count INTEGER, author_display_name TEXT,
    author_avatar_url TEXT, deck_path TEXT, rank REAL
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        di.id, di.display_name, di.description, di.category,
        di.tags, di.card_count,
        u.display_name AS author_display_name,
        u.avatar_url AS author_avatar_url,
        di.deck_path,
        CASE
            WHEN search_query IS NULL OR search_query = '' THEN 0.0::REAL
            ELSE ts_rank(di.fts, websearch_to_tsquery('simple', search_query))
        END AS rank
    FROM deck_index di
    LEFT JOIN users u ON u.id = di.author_id
    WHERE
        (search_query IS NULL OR search_query = '' OR di.fts @@ websearch_to_tsquery('simple', search_query))
        AND (p_category IS NULL OR di.category = p_category)
    ORDER BY
        CASE WHEN search_query IS NULL OR search_query = '' THEN di.card_count ELSE 0 END DESC,
        rank DESC,
        di.display_name ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
```

**Why RPC instead of `.textSearch()`:** The supabase-js `.textSearch()` method works for simple queries but cannot combine `ts_rank` ordering, JOIN with users table for author info, and optional category filtering in a single call. An RPC encapsulates this cleanly and runs server-side. This follows the established pattern in the codebase (e.g., `upsert_card_review`, `get_study_session_cards`).

**Confidence:** HIGH -- follows existing RPC patterns in the codebase.

### Deck Metadata File Format

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `yaml` package | ^2.8.2 | YAML parsing in deck-builder web | Already a dependency in deck-builder (`apps/deck-builder/package.json`), proven with card frontmatter serialization |
| Simple YAML parser in docora-webhook | N/A (edge function) | Parse deck.yaml during sync | Reuse existing `parseFrontmatter()` YAML-parsing logic already in the webhook |

**Recommended deck.yaml format:**

```yaml
display_name: "JavaScript Fundamentals"
description: "Core concepts of JavaScript for beginners"
category: "programming"
tags:
  - javascript
  - beginner
  - web-development
```

**Key decisions:**
- Use `deck.yaml` (not `README.md` frontmatter, not `_deck.yaml`) -- explicit, discoverable, does not conflict with existing README.md handling in docora-webhook which already parses `lumio_format_version` and `description`
- Category is a free-text string, not an enum -- allows organic category emergence; the mobile app can later surface popular categories as filter chips via `SELECT DISTINCT category FROM deck_index`
- Tags are lowercase strings, same convention as card tags
- `display_name` (not `name`) to distinguish from the filesystem deck directory name which has naming constraints (alphanumeric+hyphens only)
- No `lumio_format_version` in deck.yaml -- that belongs in the repo-level README.md (already handled)

**Confidence:** HIGH -- `yaml` package already in use, format mirrors existing card frontmatter conventions.

### Mobile App: Search UI Components

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Native `TextInput` | Built-in (RN 0.81) | Search bar input | No need for external search bar component -- TextInput + Ionicons search icon is consistent with existing app design patterns |
| React Native `FlatList` | Built-in (RN 0.81) | Search results list | Provides virtualized scrolling for potentially hundreds of deck results with `keyExtractor` |
| `useCallback` + debounce | Built-in React | Debounced search | Prevent excessive RPC calls as user types; 300ms debounce is standard |
| `@expo/vector-icons` (Ionicons) | ^15.0.3 (existing) | Search/filter icons | Already in deps, provides search-outline, filter-outline, compass-outline icons |

**No new npm dependencies needed for mobile search UI.** The existing component patterns (TextInput, FlatList, Ionicons, useTheme, useI18n) cover everything.

**New screens needed:**
1. `DiscoveryScreen` -- search bar + results FlatList (new bottom tab)
2. `DeckDetailScreen` -- deck metadata + card list preview + subscribe button (stack screen)

**Navigation integration -- new bottom tab "Discover":**
- Add a 4th bottom tab with compass-outline icon alongside Dashboard, Repos, Settings
- Discovery is a primary user action, not buried behind navigation -- it deserves a tab
- Four tabs is standard for mobile apps (Instagram, Spotify, etc.)
- New type addition to `MainTabParamList`: `Discover: undefined`

**Confidence:** HIGH -- uses only existing RN built-ins and established app patterns.

### Deck Builder: Metadata Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Standard React form inputs | React 19 (existing) | Deck metadata form fields | Name, description, category, tags inputs -- standard Tailwind-styled form components already used in the deck builder |
| `yaml` package | ^2.8.2 (existing) | Serialize deck.yaml | Already used in `frontmatter.ts` for card YAML serialization |

**No new dependencies needed for deck builder metadata editing.** The form for editing display_name, description, category, and tags uses existing React + Tailwind patterns. The `deck-commit` edge function needs a `commit_file` action with path validation relaxed for `.yaml` files.

**Key change needed:** The `deck-commit` edge function's `validateUserPath()` currently requires `.md` extension. It needs to also allow `deck.yaml` files. This is a targeted condition change.

**Confidence:** HIGH -- minimal additions to existing patterns.

### Edge Function: Docora Webhook Enhancement

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing YAML parser in webhook | N/A | Parse deck.yaml during sync | The `parseFrontmatter()` function already handles YAML parsing; for standalone YAML files, parse the entire content as YAML (not frontmatter-delimited) |

**Webhook changes needed:**
1. In `handleCreate` and `handleUpdate`: detect `deck.yaml` files (same pattern as README.md and .lumioignore detection)
2. Parse YAML content to extract display_name, description, category, tags
3. UPSERT into `deck_index` table
4. Update `card_count` in `deck_index` when `.md` cards are created/deleted -- derive deck_path from card file_path by extracting the directory

**No new npm dependencies** -- the existing simple YAML parser in the webhook handles the flat key-value + array structure of deck.yaml.

**Confidence:** HIGH -- follows exact same pattern as README.md handling already in the webhook.

## Zero New Dependencies

| Layer | New npm/Deno deps | Explanation |
|-------|-------------------|-------------|
| Database (Postgres) | None | tsvector, GIN, websearch_to_tsquery are all built-in |
| Edge Functions | None | Existing YAML parser handles deck.yaml |
| Deck Builder (Web) | None | `yaml` already in deps, React forms use existing patterns |
| Mobile App (Android) | None | TextInput, FlatList, Ionicons already available |
| Shared packages | None | New types added to `@lumio/shared` |

**This is a zero-new-dependency milestone.** All capabilities are achieved with existing stack + Postgres built-ins + new database tables/RPCs + new screens using existing component patterns.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Search engine | Postgres FTS (tsvector + GIN) | Algolia / Meilisearch / Typesense | Massive overkill for hundreds of decks. Adds external service dependency, API keys, cost. Postgres FTS handles this scale trivially. |
| Search engine | Postgres FTS | Supabase pg_trgm (trigram similarity) | Trigram is for fuzzy/typo-tolerant matching, not structured fulltext search. FTS with `websearch_to_tsquery` is the right tool for keyword-based deck discovery. Trigram could complement FTS later if typo tolerance is needed. |
| FTS config | `simple` | `english` | `english` stems words -- "JavaScript" could lose precision. `simple` tokenizes and lowercases without stemming, preserving exact keyword matching for technical terms and proper nouns. |
| Deck metadata | deck.yaml (standalone file) | README.md frontmatter (extend existing) | README.md already has `lumio_format_version` and `description` in docora-webhook. Adding more fields creates coupling. deck.yaml is clean separation of deck-level metadata from repo-level metadata. |
| Deck metadata | deck.yaml per deck directory | Single index file at repo root | Per-deck files allow Docora to detect changes per-deck independently. A single index file creates update conflicts when multiple users edit simultaneously via deck-builder. |
| Search UI lib | Built-in TextInput + FlatList | react-native-search-bar / react-native-elements SearchBar | External search bar components add dependency for something trivially built with TextInput + Ionicons. The app already uses custom styled components consistently. |
| New navigation | Bottom tab "Discover" | Floating action button / drawer menu | Discovery is a primary feature. Bottom tab is immediately visible and accessible. |
| RPC vs client query | `search_decks` RPC | supabase-js `.textSearch()` + `.order()` | `.textSearch()` cannot do `ts_rank` ordering, JOIN with users for author info, or optional category filtering in a single call. RPC encapsulates the full query. |
| FTS ranking | `ts_rank()` | `ts_rank_cd()` (cover density) | Cover density ranking is for long documents where word proximity matters. Deck metadata is short text -- standard `ts_rank` is sufficient and simpler. |

## Integration Points

### Existing Components Affected

| Component | Change Needed | Complexity |
|-----------|---------------|------------|
| `deck-commit` edge function | Allow `.yaml` extension in `validateUserPath()` | Low |
| `docora-webhook` edge function | Add `deck.yaml` handler alongside README.md and .lumioignore | Medium |
| `@lumio/shared` types | Add `DeckIndexEntry`, `SearchDecksResult`, `DeckMetadata` types | Low |
| `@lumio/core` repositories.ts or new discovery.ts | Add `searchDecks()` and `subscribeToDeck()` functions | Low |
| `apps/android` MainNavigator | Add Discover tab (4th bottom tab) | Low |
| `apps/android` AppNavigator | Add DeckDetail stack screen | Low |
| `apps/android` i18n | Add ~25-30 new translation keys for discovery UI | Low |
| `apps/deck-builder` DeckProvider/page | Add deck metadata form with deck.yaml commit | Medium |

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `deck_index` table + migration | `supabase/migrations/` | Stores searchable deck metadata |
| `search_decks` RPC | `supabase/migrations/` | Fulltext search with ranking |
| `subscribe_to_deck` RPC | `supabase/migrations/` | Creates user_repositories link scoped to deck path |
| `DiscoveryScreen` | `apps/android/screens/` | Search bar + results list |
| `DeckDetailScreen` | `apps/android/screens/` | Deck info + card preview + subscribe |
| `DeckSearchItem` component | `apps/android/components/` | Result card in discovery list |
| Deck metadata form | `apps/deck-builder/src/components/` | Edit display_name, description, category, tags |

## Configuration

### New Environment Variables

None required. All new functionality uses existing Supabase connection and Docora webhook infrastructure.

### Database Migration

One new migration file covering:
1. `deck_index` table with tsvector generated column and GIN index
2. RLS policies for deck_index (public read for all authenticated users, service role write)
3. `search_decks` RPC function
4. `subscribe_to_deck` RPC function
5. updated_at trigger on deck_index

### Supabase Config

No changes to `supabase/config.toml`. No new extensions needed -- tsvector/GIN are core Postgres.

## Version Compatibility

| Technology | Current Version | Required for v3.1 | Compatible |
|------------|----------------|-------------------|------------|
| PostgreSQL | 15+ (Supabase) | 11+ (for websearch_to_tsquery) | YES |
| @supabase/supabase-js | ^2.45.0 | ^2.0.0 (rpc method) | YES |
| React Native | 0.81.5 | 0.60+ (FlatList, TextInput) | YES |
| Expo | ~54.0.33 | Any | YES |
| yaml (npm) | ^2.8.2 | ^2.0.0 | YES |
| react-navigation | ^7.12.0 | ^6.0.0 | YES |
| Vite | ^7.3.1 | Any | YES |
| React | 19.1.0 | 16.8+ (hooks) | YES |

## Sources

- [Supabase Full Text Search Docs](https://supabase.com/docs/guides/database/full-text-search) -- tsvector, GIN index, generated columns, weighted search
- [Supabase JS textSearch API Reference](https://supabase.com/docs/reference/javascript/textsearch) -- client-side `.textSearch()` method signature and options
- [PostgreSQL 18: Text Search Indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) -- GIN vs GiST index comparison, GIN as preferred type
- [PostgreSQL 18: Tables and Indexes for Text Search](https://www.postgresql.org/docs/current/textsearch-tables.html) -- tsvector column strategies, generated columns
- [Skip Elasticsearch: Full-Text Search in Supabase (DEV Community)](https://dev.to/reclusivecoder/skip-elasticsearch-build-blazing-fast-full-text-search-right-in-supabase-58pf) -- real-world Supabase FTS implementation patterns
- [Supabase Fuzzy Full Text Search (code.build)](https://code.build/p/supabase-fuzzy-full-text-search-BS0SWP) -- pg_trgm comparison with tsvector
- Lumio codebase: `supabase/functions/docora-webhook/index.ts` -- existing webhook patterns for README.md, .lumioignore, YAML parsing
- Lumio codebase: `supabase/functions/deck-commit/index.ts` -- path validation, GitHub API patterns, deck operations
- Lumio codebase: `apps/deck-builder/src/lib/frontmatter.ts` -- YAML parsing with `yaml` package
- Lumio codebase: `packages/shared/src/types/index.ts` -- existing type definitions, Repository, Card, UserRepository
- Lumio codebase: `apps/android/navigation/AppNavigator.tsx` -- screen navigation patterns, RootStackParamList
- Lumio codebase: `apps/android/navigation/MainNavigator.tsx` -- bottom tab navigator, 3 tabs currently
- Lumio codebase: `supabase/migrations/20260115000001_shared_repositories.sql` -- user_repositories pattern, RLS policies
