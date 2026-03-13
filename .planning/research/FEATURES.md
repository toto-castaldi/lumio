# Feature Landscape: Deck Discovery

**Domain:** Flashcard deck discovery, search, and subscription within a shared repository ecosystem
**Researched:** 2026-03-13
**Overall confidence:** MEDIUM-HIGH

## Context

Lumio v3.1 adds deck discovery to the mobile app, allowing users to find and subscribe to decks created with the deck builder web app. Content lives in a shared GitHub repo (`lumio-decks`) with user-isolated paths (`{userId}/{deckName}/`). The discovery system introduces fulltext search on deck metadata, a new deck index table, and a per-deck subscription model that replaces the current whole-repository subscription approach for shared content.

### Infrastructure Constraints

- **Shared repo structure:** `{userId}/{deckName}/` directories in `lumio-decks` repo. Each deck contains `.md` card files, `.gitkeep`, and soon `deck.yaml`.
- **Sync pipeline:** deck-commit edge function commits to GitHub API -> Docora monitors repo -> docora-webhook parses files and upserts into DB.
- **Existing tables:** `repositories` (one entry for lumio-decks), `cards` (linked via `repository_id` + `file_path`), `user_repositories` (links users to whole repos), `card_review_schedule`, `card_questions`.
- **Current metadata:** Cards have `CardFrontmatter` (title, tags, difficulty, language). Decks have only `DeckFrontmatter` in README.md (lumio_format_version, description). No deck-level category, tags, or display name.
- **Mobile app navigation:** 3 bottom tabs (Dashboard, Repos, Settings). No discovery/explore tab.

## Table Stakes

Features users expect from any deck discovery system. Missing = the feature feels broken or incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Search bar with text input** | Every discovery interface has one (AnkiWeb, Quizlet, Brainscape). Users type to find decks. | Low | Postgres FTS, deck_index table | Use `websearch_to_tsquery` for natural search syntax (quotes, OR, negation) |
| **Search across deck name** | Primary discovery vector. Users search by topic name. | Low | tsvector column on deck name | Weight A (highest priority in ts_rank) |
| **Search across tags** | Tags are the primary taxonomy. All competitor apps support tag-based discovery. | Low | tsvector column on tags array | Weight C. Tags already exist on cards; extend concept to deck level. |
| **Results list with deck info** | Must show enough info to decide: name, description snippet, card count. AnkiWeb shows title + card count + downloads. Brainscape shows hierarchy with card count. | Med | deck_index table, card count aggregation | Card count is critical -- users judge scope before subscribing |
| **Subscribe to a deck** | Core action. AnkiWeb: "Download". Quizlet: save to library. Brainscape: "Study". Must be single tap. | Med | New `user_deck_subscriptions` table | Cannot reuse `user_repositories` (whole repo); need per-deck granularity |
| **Unsubscribe from a deck** | Symmetry with subscribe. Users must be able to undo. | Low | DELETE from subscription table | Extend existing repo removal pattern |
| **Deck description visible** | Users need context beyond the name. AnkiWeb and Brainscape both show descriptions. | Low | `description` field in deck metadata | Currently only in README.md; needs to move to deck.yaml |
| **Card count per deck** | Signals deck scope and quality. Shown in every competitor app. | Low | COUNT cards per deck path, or denormalized in deck_index | Denormalized count preferred (consistent with existing `card_count` on repositories) |
| **Deck metadata authoring** | Authors must set name, description, category, tags for their decks. Without metadata, there is nothing to search. | Med | deck.yaml file, deck builder UI form, edge function YAML support | Prerequisite for entire discovery chain |
| **Subscribed deck cards in study** | After subscribing, the deck's cards must appear in study sessions alongside other cards. | Med | Path-based card filtering in study RPCs | Cards exist in DB; need to filter by subscribed deck paths |

## Differentiators

Features that set Lumio apart. Not expected, but valued when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Category chip bar** | Quick filter without typing. Brainscape's "Knowledge Genome" categories make browsing feel curated. Horizontal scrollable chip bar is standard mobile pattern. | Med | Category field in deck.yaml, predefined category list | Fixed list (10 categories) prevents inconsistency. Fits in horizontal ScrollView. |
| **Weighted fulltext search** | Smarter relevance than simple text match. Deck name match ranks higher than description match. Supabase/Postgres supports `setweight()` natively with generated tsvector column. | Med | Generated tsvector column with weights A/B/C/D | Name=A, Category=B, Tags=C, Description=D |
| **Author display name on results** | Social proof and attribution. Quizlet shows creator username. | Low | Denormalized `author_name` in deck_index | Avoids JOIN on auth.users at query time |
| **Popular/recently added sort** | Brainscape orders by popularity. AnkiWeb sorts by downloads. Surfaces quality content. | Med | subscriber_count column, created_at timestamp on deck_index | subscriber_count requires increment/decrement triggers |
| **Empty state with suggested decks** | First-time discovery needs guidance, not a blank search. Show popular or recent decks. | Low | Default query: top N by subscriber_count DESC | Simple SELECT. No curation needed at small scale. |
| **Search debounce (300ms)** | Prevents excessive queries while typing. Standard mobile UX pattern. | Low | Client-side debounce in React Native | useEffect + setTimeout pattern, no backend work |
| **Deck preview before subscribing** | Browse a few sample cards before committing. AnkiWeb lacks this (community criticism). | High | RLS bypass for unsubscribed deck cards, card sampling query | Significant: need public read access to cards the user hasn't subscribed to |
| **Subscription count badge** | Show how many users subscribed to a deck. Social proof and quality signal. | Low | subscriber_count already in deck_index (if built) | Display-only, no new queries |

## Anti-Features

Features to explicitly NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full deck download/import (Anki .apkg style)** | Lumio's architecture is live-sync via Docora, not file download. Downloading breaks the update model. | Subscribe to deck subdirectory; Docora handles ongoing sync |
| **Rating/review system** | Premature at current scale (single developer, small user base). Adds moderation burden and spam risk. | Use subscriber count as implicit quality signal |
| **Collaborative editing (AnkiHub-style suggestions)** | Massive complexity (review workflow, merge conflicts, permissions). Out of scope per PROJECT.md. | Deck authors use deck builder; consumers subscribe read-only |
| **User profiles / author pages** | Social features add complexity without proportional value at current scale. | Show author name inline in search results only |
| **Card-level fulltext search** | PROJECT.md explicitly lists "Ricerca fulltext carte" as out of scope. Search operates on deck metadata only. | Deck-level search on name/description/tags/category is sufficient |
| **Infinite scroll / pagination** | Premature optimization. Deck count will be tens to low hundreds for foreseeable future. | Load all results at once. Paginate only if >100 decks becomes a real problem |
| **Deck versioning / changelog** | Git provides history but surfacing it is complex and rarely needed by consumers. | Deck authors handle updates; subscribers get latest automatically via Docora sync |
| **Advanced filters (language, difficulty range, card count range)** | Over-engineering for current scale. Category chips + text search covers 95% of discovery needs. | Add filters only if user feedback demands them |
| **Offline discovery / cached search** | App requires connection for study (existing constraint). Consistent behavior. | Show error state when offline |
| **In-app deck creation from discovery screen** | Discovery is for consuming, not creating. Deck builder web app is the authoring tool. | Show "Create decks at deck.lumio.toto-castaldi.com" link if needed |

## Feature Dependencies

```
deck.yaml metadata authoring (deck builder web)
    |
    v
deck-commit edge function: allow .yaml files
    |
    v
Docora sync detects deck.yaml changes --> fires webhook
    |
    v
docora-webhook: parse deck.yaml --> UPSERT into deck_index table
    |
    v
deck_index table with tsvector + GIN index
    |
    v
search_decks RPC function (fulltext query + optional category filter)
    |
    v
Discovery screen (mobile app): search bar + category chips + results FlatList
    |
    v
Subscribe action --> user_deck_subscriptions table
    |
    v
Study RPCs modified: include cards from subscribed deck paths
    |
    v
Subscribed deck cards appear in study sessions
```

Cross-cutting prerequisite: The `lumio-decks` repo must be registered as a **platform-level repository** (always present for Docora monitoring, not user-added). Without this, deck.yaml changes are never processed.

## Detailed Feature Analysis

### 1. Deck Metadata via deck.yaml

**Current state:** Deck directories contain `.gitkeep`, `.md` card files, and optionally `README.md`. The only deck-level metadata is in README.md frontmatter (`lumio_format_version`, `description`). No structured metadata for category, tags, or deck display name.

**What to build:**
- New `deck.yaml` file per deck directory, authored in deck builder web app
- Schema: `name` (display name, distinct from directory name), `description` (text), `category` (one of predefined list), `tags` (string array)
- deck-commit edge function: extend path validation to allow `.yaml` extension (currently only `.md`)
- New `DeckMetadataForm` component in deck builder (reuse TagInput pattern from card MetadataForm)
- On deck selection, fetch `deck.yaml` if it exists, populate form; on save, serialize to YAML and commit

**Why deck.yaml instead of extending README.md:** README.md serves double duty (Docora format version + description). Adding category/tags to README.md overloads its purpose. A dedicated deck.yaml is cleaner, consistent with standard metadata file conventions, and allows independent parsing in the webhook.

**Complexity:** Medium. Form UI pattern exists (MetadataForm). New file type handling in edge function is straightforward. YAML serialization already uses the `yaml` package in deck builder.

### 2. Deck Index Table

**Current state:** No deck-level index exists. Cards table stores individual cards linked to a repository.

**Schema:**
```sql
CREATE TABLE public.deck_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    deck_path TEXT NOT NULL,           -- e.g., "{userId}/Italian Basics"
    name TEXT NOT NULL,                -- display name from deck.yaml
    description TEXT DEFAULT '',
    category TEXT,                      -- from predefined list
    tags TEXT[] DEFAULT '{}',
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_name TEXT NOT NULL DEFAULT '',
    card_count INTEGER DEFAULT 0,
    subscriber_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fts TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'D')
    ) STORED,
    UNIQUE(repository_id, deck_path)
);

CREATE INDEX idx_deck_index_fts ON deck_index USING GIN (fts);
CREATE INDEX idx_deck_index_category ON deck_index (category);
CREATE INDEX idx_deck_index_author ON deck_index (author_id);
```

**RLS:** All authenticated users can SELECT (public catalog). Only service_role can INSERT/UPDATE/DELETE (populated by webhook only).

**Complexity:** Medium. Straightforward migration. The generated tsvector column with weights is the most critical design decision.

### 3. Docora Webhook Extension for deck.yaml

**Current state:** Webhook handles README.md (deck metadata), .lumioignore (filtering), .md card files, and images. Does NOT handle .yaml files.

**What to build:**
- In `handleCreate`/`handleUpdate`: detect `deck.yaml` files (same pattern as README.md detection)
- Parse YAML content to extract name, description, category, tags
- Derive `deck_path` from file path (remove `/deck.yaml` suffix)
- Extract `author_id` from deck_path prefix (it is the userId UUID)
- Look up author display_name from `users` table for denormalization
- Count .md files in cards table matching the deck_path prefix for card_count
- UPSERT into `deck_index` table
- In `handleDelete` for deck.yaml: remove row from deck_index

**Pattern match:** Follows existing README.md handling pattern very closely. README.md -> update `repositories` row. deck.yaml -> upsert `deck_index` row.

**Complexity:** Medium. Well-patterned after existing README.md flow.

### 4. Platform-Level lumio-decks Repository

**Current state:** lumio-decks is a regular shared repository added manually by users via URL. For discovery to work, it must always be registered so Docora monitors it and populates the deck_index.

**Options:**
1. **Seed migration:** INSERT lumio-decks into `repositories` table if not present. Ensure Docora registration via platform_config or startup script.
2. **Auto-registration:** On first deploy, a seed script registers lumio-decks with Docora and inserts the repository row.

**Recommendation:** Seed migration. A SQL migration ensures lumio-decks repo always exists. The deck_index is readable by all authenticated users regardless of user_repositories links.

**Complexity:** Low. Single INSERT with ON CONFLICT DO NOTHING.

### 5. Search RPC

**What to build:**
```sql
CREATE OR REPLACE FUNCTION search_decks(
    p_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    tags TEXT[],
    author_name TEXT,
    card_count INTEGER,
    subscriber_count INTEGER,
    deck_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT di.id, di.name, di.description, di.category,
           di.tags, di.author_name, di.card_count, di.subscriber_count,
           di.deck_path
    FROM deck_index di
    WHERE
        (p_query IS NULL OR di.fts @@ websearch_to_tsquery('english', p_query))
        AND (p_category IS NULL OR di.category = p_category)
    ORDER BY
        CASE WHEN p_query IS NOT NULL
             THEN ts_rank(di.fts, websearch_to_tsquery('english', p_query))
             ELSE 0 END DESC,
        di.subscriber_count DESC,
        di.name ASC
    LIMIT p_limit;
END;
$$;
```

**Complexity:** Low. Single SQL function, well-documented Postgres pattern.

### 6. Discovery Screen (Mobile App)

**Current state:** 3 bottom tabs (Dashboard, Repos, Settings). No discovery tab.

**What to build:**
- New `DiscoveryScreen` (or `ExploreScreen`)
- Navigation: 4th bottom tab with compass/search icon, or accessible as a screen from Repos tab
- UI layout (top to bottom):
  1. Search bar (TextInput with magnifying glass icon, clear button)
  2. Category chip bar (horizontal ScrollView with pressable chips, "All" default)
  3. Results FlatList: each row shows deck name (bold), description (1-2 lines truncated), card count badge, category badge, author name (subtle)
  4. Empty/initial state: "Search for decks to study" prompt, or show popular decks
  5. Tap result -> navigate to deck detail screen or bottom-sheet with subscribe button
- State: query text, selected category, results array, loading boolean
- API: `supabase.rpc('search_decks', { p_query, p_category })`

**Key UX decisions:**
- Search triggers on text change with 300ms debounce (not on submit)
- Category chips act as filters, combinable with text search
- Results show immediately, no separate "search results" screen
- Subscribe button directly in result row or detail sheet

**Complexity:** Medium-High. New screen with multiple interactive elements, but all patterns exist in the codebase (FlatList in ReposScreen, TextInput, ScrollView chips, bottom-sheet modals).

### 7. Subscription Model

**Current state:** `user_repositories` links users to entire repositories. When studying, cards from all `user_repositories`-linked repos are included. No concept of subscribing to a subdirectory.

**Two approaches:**

| Approach | Pros | Cons |
|----------|------|------|
| **A: Path-based filtering** via `user_deck_subscriptions` table with `deck_path` | No changes to cards table. deck_path already embedded in card file_paths. Simple LIKE filter. | LIKE queries less efficient than JOIN. Study RPCs need modification. |
| **B: Add `deck_id` FK to cards table** | Normalized, efficient JOINs. Clean relational model. | Requires cards table migration. docora-webhook must set deck_id on every card insert/update. More moving parts. |

**Recommendation: Approach A (path-based filtering).** The deck_path is already embedded in every card's `file_path` column (e.g., `{userId}/Italian Basics/card1.md`). A WHERE `file_path LIKE '{deck_path}/%'` filter is sufficient at current scale (hundreds of cards, not millions). Avoids a cards table migration and webhook changes.

**New table:**
```sql
CREATE TABLE user_deck_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_index_id UUID NOT NULL REFERENCES deck_index(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, deck_index_id)
);
```

**Effect on study RPCs:** The `get_study_session` and `count_due_cards` RPCs currently select cards via `user_repositories` JOIN. For deck subscriptions, add a UNION: cards from `user_repositories` (existing whole-repo subscriptions) UNION cards from `user_deck_subscriptions` (filtered by deck_path prefix on file_path).

**Complexity:** Medium. New table is simple; modifying study RPCs is the harder part.

### 8. Deck Builder Metadata Form

**Current state:** MetadataForm exists for cards (title, tags, difficulty, language). No deck-level metadata form.

**What to build:**
- New `DeckMetadataForm` component with fields:
  - Name (text input, display name for discovery)
  - Description (textarea, 2-4 lines)
  - Category (select dropdown from predefined list)
  - Tags (reuse existing TagInput component)
- Integration: render in DeckDetailPanel when a deck is selected
- Load: on deck selection, fetch `{userId}/{deckName}/deck.yaml` via `get_file` action
- Save: serialize to YAML via `yaml` package (already used), commit via `commit_file` action
- deck-commit edge function: extend file path validation to allow `.yaml` extension

**Complexity:** Medium. Reuses existing component patterns. New YAML file type in edge function is a minor change.

## Category Taxonomy

Predefined categories for deck discovery, based on Anki/Brainscape category analysis.

| Category Key | Display (EN) | Display (IT) |
|-------------|-------------|-------------|
| `languages` | Languages | Lingue |
| `sciences` | Sciences | Scienze |
| `math` | Mathematics | Matematica |
| `history` | History | Storia |
| `programming` | Programming | Programmazione |
| `medicine` | Medicine | Medicina |
| `law` | Law | Diritto |
| `business` | Business | Business |
| `arts` | Arts & Culture | Arte e Cultura |
| `other` | Other | Altro |

10 categories. Fits in a horizontal chip bar. "Programming" is a key differentiator for Lumio given its code-highlighting and technical content support.

## MVP Recommendation

**Must have (ships with v3.1):**

1. **deck.yaml metadata authoring** in deck builder (name, description, category, tags)
2. **deck_index table** with tsvector fulltext search (weighted: name A, category B, tags C, description D)
3. **Docora webhook extension** to parse deck.yaml and populate deck_index
4. **Platform-level lumio-decks** repo registration (seed migration)
5. **search_decks RPC** function
6. **Discovery screen** in mobile app with search bar + results list
7. **Subscribe/unsubscribe** with user_deck_subscriptions table
8. **Subscribed deck cards in study sessions** (path-based filtering in study RPCs)

**Defer to v3.2 or later:**

| Feature | Reason to Defer |
|---------|----------------|
| Category chip bar | Search alone covers discovery. Add as UX polish in follow-up. |
| Subscriber count tracking | Requires trigger-based increment/decrement. Add when content volume justifies popularity ranking. |
| Popular/featured decks empty state | Requires enough decks to curate. Start with "search to discover" prompt. |
| Deck preview before subscribing | High complexity (RLS bypass for unsubscribed cards). Defer until user feedback demands it. |
| Author display name | Requires denormalization strategy and users table lookup. Can start with "Anonymous" and add names incrementally. |
| Sort options (popular, recent) | One default sort (relevance) is sufficient for MVP. |

## Sources

- [AnkiWeb Shared Decks](https://ankiweb.net/shared/decks) -- category browse + search discovery model
- [Anki Forums -- Improve AnkiWeb Searching](https://forums.ankiweb.net/t/search-all-shared-decks-improve-ankiweb-searching/66193) -- community feedback on discovery UX gaps
- [AnkiHub -- Collaborative Anki Decks](https://www.ankihub.net/) -- subscription model: subscribe to deck, receive updates automatically
- [AnkiHub Community -- Subscribing to a Deck](https://community.ankihub.net/t/subscribing-to-a-deck/103686) -- subscription mechanics and sync updates
- [Brainscape -- How to Search & Browse](https://brainscape.zendesk.com/hc/en-us/articles/115002383732-How-do-I-search-browse-public-flashcards) -- marketplace with Knowledge Genome categories, popularity ranking
- [Quizlet -- Finding Flashcard Sets](https://help.quizlet.com/hc/en-us/articles/360029772872-Finding-flashcard-sets) -- search with filters (school, term count, user type)
- [Supabase Full Text Search Docs](https://supabase.com/docs/guides/database/full-text-search) -- tsvector, GIN index, websearch_to_tsquery, weighted search, generated columns
- [PostgreSQL Text Search Indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) -- GIN vs GiST tradeoffs, GIN preferred for text search
- [A Quick Look at Anki's Shared Decks Feature](https://locxter.net/articles/a-quick-look-at-ankis-shared-decks-feature.html) -- zero-account download, varying quality
- [Modern Flashcard App UI/UX Design 2025](https://medium.com/@prajapatisuketu/modern-flashcard-app-ui-ux-design-2025-4545294a17b4) -- mobile flashcard UX patterns
- Lumio codebase analysis: docora-webhook/index.ts, deck-commit/index.ts, shared_repositories migration, DeckContext.tsx, MetadataForm.tsx, CardFrontmatter/DeckFrontmatter types in @lumio/shared
