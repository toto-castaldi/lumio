# Project Research Summary

**Project:** Lumio v3.1 — Deck Discovery
**Domain:** Fulltext search, deck metadata, subfolder subscriptions, and mobile discovery UI
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

Lumio v3.1 adds a discovery layer to an established flashcard platform. The architecture is a metadata materialization pipeline: deck authors publish structured metadata (deck.yaml) via the existing deck-builder web app, Docora detects file changes and fires webhooks, the docora-webhook edge function parses YAML and populates a new `deck_index` table with weighted tsvector fulltext search, and the mobile app exposes a Discovery tab backed by a `search_decks` RPC. The core technical choices are Postgres built-in FTS (tsvector + GIN + websearch_to_tsquery with `'simple'` config), path-based subfolder subscription modeled as a new `subfolder_path` column on `user_repositories`, and zero new npm/Deno dependencies — every required capability exists in the current stack.

The recommended approach follows five clear phases derived from architectural dependencies: database schema first (everything else depends on it), then backend edge function enhancements, then deck-builder metadata UI, then mobile discovery screens, and finally polish. The subscription model is the highest-stakes design decision: subscribing to a subfolder of the shared lumio-decks repo must be threaded through every existing study RPC or users either see all decks from all authors (data pollution) or see nothing at all. The research is unambiguous — use `user_repositories.subfolder_path` to scope existing RPCs rather than a parallel subscription table, and use FK with CASCADE from a proper `deck_index` table to guarantee orphan cleanup.

The two highest risks for this milestone are: (1) study RPCs not updated for subfolder scope, breaking the study pipeline for subscribed decks; (2) RLS on the deck index inadvertently following the `user_repositories`-gated pattern, making all decks invisible to non-subscribers. Both must be addressed in the first database migration and tested with a fresh zero-subscription user. All other pitfalls are implementation-level (debounce, YAML parsing, path normalization, schema versioning) and are fully preventable with known patterns.

## Key Findings

### Recommended Stack

This milestone is a zero-new-dependency addition to the existing Supabase + React Native + Vite/React + pnpm monorepo stack. All new capabilities are achieved with Postgres built-ins and existing packages.

See `.planning/research/STACK.md` for the full technology analysis.

**Core technologies:**

- **PostgreSQL tsvector + GIN index**: Fulltext search engine — already available in Supabase PG 15+, zero external service dependency, handles low-thousands-of-decks scale trivially
- **`websearch_to_tsquery('simple', ...)`**: Query parser — handles quoted phrases, OR, negation without client-side escaping; `simple` config avoids stemming that mangles technical and multilingual deck names
- **`setweight()` + GENERATED ALWAYS tsvector column**: Weighted search ranking — deck name (A), category+tags (B), description (C); auto-updates without triggers
- **`search_decks` RPC (plpgsql)**: Server-side search function — needed because supabase-js `.textSearch()` cannot combine `ts_rank` ordering, user JOINs, and optional category filtering in a single client call
- **`yaml` npm package (existing)**: YAML parsing/serialization — already in deck-builder deps; use `npm:yaml@2` in docora-webhook for deck.yaml (NOT the hand-rolled frontmatter parser)

**Version requirements:** PostgreSQL 11+ for `websearch_to_tsquery` (Supabase runs PG 15+, fully compatible).

### Expected Features

See `.planning/research/FEATURES.md` for the full feature analysis with competitor references.

**Must have (table stakes for v3.1):**

- Search bar with fulltext search across deck name, tags, and description
- Results list showing deck name, description snippet, card count, and author
- Subscribe and unsubscribe action (single-tap)
- Deck metadata authoring in deck builder (display name, description, category, tags)
- Subscribed deck cards appearing in study sessions (path-based filtering)
- Platform-level lumio-decks repository always registered for Docora monitoring

**Should have (differentiators):**

- Weighted search ranking (name > tags > description)
- Category chip bar for browse-without-typing (10 predefined categories: languages, sciences, math, history, programming, medicine, law, business, arts, other)
- Empty state with meaningful guidance (three distinct states: no decks, search no results, all subscribed)
- Search debounce (300ms) with stale-result cancellation
- `schema_version: 1` in deck.yaml from day one (prevents future migration pain)

**Defer to v3.2 or later:**

- Subscriber count tracking (requires trigger-based increment/decrement)
- Deck preview before subscribing (requires RLS bypass for unsubscribed cards — high complexity)
- Popularity and featured sort (needs enough content to be useful)
- Author profile pages (social feature premature at current scale)
- Card-level fulltext search (explicitly out of scope per PROJECT.md)
- Infinite scroll and pagination (current deck volume does not warrant it)

### Architecture Approach

The system introduces a materialized deck metadata index populated asynchronously via the existing Docora webhook pipeline. The mobile app never queries GitHub directly — all discovery data is served from Postgres. Subfolder subscription is modeled as an additive `subfolder_path` column on the existing `user_repositories` table, keeping all downstream study RPCs on a single join path with a NULL check for backward compatibility.

See `.planning/research/ARCHITECTURE.md` for the full component diagram, data flow, and RPC implementations.

**Major components:**

1. **`deck_index` table** — stores deck metadata (display name, description, category, tags, author info) with a GENERATED ALWAYS tsvector column using `'simple'` config and a GIN index; populated exclusively by docora-webhook (service_role write, authenticated-user read)
2. **`search_decks` RPC** — SECURITY DEFINER function accepting plain text query and optional category filter; returns ranked results with author info; handles `websearch_to_tsquery` conversion and prefix matching server-side
3. **`subscribe_deck` RPC** — SECURITY DEFINER function that creates a `user_repositories` row with `subfolder_path` set; validates the deck exists and user is not already subscribed
4. **docora-webhook enhancement** — adds `deck.yaml` handler (detected before the `.md` handler, using `npm:yaml@2` for parsing) to UPSERT into deck_index on CREATE/UPDATE and DELETE the row on file DELETE
5. **deck-commit enhancement** — adds `commit_yaml` action with `validateUserYamlPath()` restricting writes to `{userId}/{deckName}/deck.yaml` paths only
6. **DiscoveryScreen + DeckPreviewScreen** — new React Native screens using existing TextInput, FlatList, and Ionicons patterns; 4th bottom tab with compass icon
7. **DeckMetadataForm** — new deck-builder component reusing the existing TagInput pattern; integrates into DeckDetailPanel; reads/writes deck.yaml via the `commit_yaml` action

**Patterns to follow:**

- SECURITY DEFINER RPCs for cross-table operations (identical to 6+ existing RPCs)
- Edge function action router — add actions to existing functions, not new functions
- Webhook special-file detection cascade: README.md -> .lumioignore -> deck.yaml -> .md -> images
- Denormalized author name in deck_index (looked up by webhook on upsert, avoids JOIN at query time)
- Card counts computed at query time via correlated subquery, NOT stored in deck_index (avoids GIN write amplification from per-card webhook updates)

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for the full 18-pitfall analysis with detection and prevention patterns.

1. **Subfolder subscription silently breaks the study pipeline** — Study RPCs join through `user_repositories` using repo-level scope. A subfolder subscription without RPC updates either floods study with all authors' cards or shows zero cards. Prevention: add `subfolder_path` column to `user_repositories`, update ALL study RPCs to filter by `file_path LIKE subfolder_path || '/%'` when `subfolder_path IS NOT NULL`. Test with a fresh subscriber before merging.

2. **Wrong RLS on deck_index makes discovery return zero results** — The existing RLS template gates SELECT on `user_repositories` membership. Copying this to `deck_index` creates a chicken-and-egg problem (must subscribe to see decks). Prevention: `USING (auth.uid() IS NOT NULL)` for SELECT; write-only via service_role. Test with a zero-subscription user.

3. **Missing deck.yaml handler in docora-webhook** — YAML files hit the catch-all "ignore" branch in the current webhook handler. The entire feature chain (index never populated, discovery always empty) breaks silently. Prevention: add the handler as a first-class case alongside README.md and .lumioignore.

4. **tsvector config mismatch kills GIN index usage** — Using `'english'` in the generated column and `'simple'` in the query (or vice versa) causes Postgres to fall back to a seq scan. Prevention: use `'simple'` everywhere. Verify with `EXPLAIN ANALYZE`.

5. **Hand-rolled YAML parser in docora-webhook cannot parse deck metadata** — The existing `parseFrontmatter()` handles simple card frontmatter only; multi-line descriptions and flow-style arrays break it silently. Prevention: use `npm:yaml@2` for deck.yaml files exclusively; keep hand-rolled parser for .md card files.

## Implications for Roadmap

Based on research, the dependency chain is strictly sequential: schema -> backend -> deck-builder UI -> mobile UI -> polish. Each phase depends on all prior phases having functioning deliverables. The suggested five-phase structure mirrors the ARCHITECTURE.md build order recommendation.

### Phase 1: Database Foundation

**Rationale:** Everything in the system depends on the schema. The `deck_index` table, its tsvector generated column, GIN index, RLS policies, study RPC modifications, and subscription RPCs must all exist and be correct before any application code is written. The two critical pitfalls (broken study pipeline, wrong RLS) are schema-level problems that cannot be patched later without a major migration.

**Delivers:** `deck_index` table, `search_decks` RPC, `subscribe_deck` RPC, `user_repositories.subfolder_path` column, updated study RPCs with subfolder-aware card filtering, seed migration for platform-level lumio-decks registration, all RLS policies.

**Addresses features:** Deck discovery data store, subscribe/unsubscribe persistence, subscribed deck cards in study sessions.

**Avoids:** Pitfalls 1 (study pipeline), 2 (RLS scope), 4 (tsvector config), 11 (GIN write cost), 12 (orphaned subscriptions).

**Research flag:** Standard patterns — Postgres FTS and Supabase migration patterns are well-documented. No additional research needed.

### Phase 2: Backend Edge Functions

**Rationale:** The webhook pipeline must populate `deck_index` before any metadata can be discovered. The deck-builder must be able to commit deck.yaml before any metadata can be authored. Both edge function changes are required before the UI phases can be tested end-to-end.

**Delivers:** docora-webhook deck.yaml handler (CREATE/UPDATE/DELETE), deck-commit `commit_yaml` action with `validateUserYamlPath()`, shared `parseDeckPath()` utility in `_shared/path-utils.ts`.

**Uses:** `npm:yaml@2` for YAML parsing in the webhook, existing GitHub API helpers in deck-commit, existing webhook special-file detection pattern.

**Avoids:** Pitfalls 3 (missing webhook handler), 5 (path inconsistency), 7 (YAML parser inconsistency).

**Research flag:** Standard patterns — follows existing README.md handler and action-router patterns exactly. No additional research needed.

### Phase 3: Deck Builder Metadata UI

**Rationale:** Deck authors must be able to publish deck.yaml metadata before any mobile discovery is possible. This phase is the content ingestion enabler — without published decks, the discovery screen has nothing to show. Comes before mobile because UI testing requires real data in the deck_index.

**Delivers:** `DeckMetadataForm` component with display name, description, category select (10 categories), and tags input; integration into DeckDetailPanel; `commitYaml()` API call; DeckContext loading existing deck.yaml on deck selection; `schema_version: 1` in serialized output.

**Implements:** deck-builder DeckMetadataForm, api.ts commitYaml(), DeckContext enhancement.

**Avoids:** Pitfalls 10 (schema versioning — include schema_version: 1 from day one), 18 (concurrent saves — disable button in-flight), 15 (author display name — auto-populated from users table in webhook, not from client).

**Research flag:** Standard patterns — reuses existing TagInput, card metadata form conventions, and yaml package. No additional research needed.

### Phase 4: Mobile Discovery

**Rationale:** Requires all prior phases to have real data flowing through the pipeline. This is the user-facing deliverable and the most complex application layer — new navigation, new screens, new state management, subscription flow, and i18n.

**Delivers:** DiscoveryScreen with search bar, category chip bar, and results FlatList; DeckPreviewScreen with deck details and subscribe button; 4th bottom tab (compass icon); subscription/unsubscription flow staying within Discovery tab stack; i18n keys for both EN and IT.

**Implements:** MainNavigator (4th tab), DiscoveryScreen, DeckPreviewScreen, DeckSearchItem component, `searchDecks()` and `subscribeDeck()` functions in `@lumio/core`.

**Avoids:** Pitfalls 8 (debounce with cleanup and stale-result cancellation), 9 (navigation confusion — success toast in-tab, no cross-tab navigation), 13 (tsquery syntax — handled server-side in RPC), 14 (empty state confusion — three distinct states), 16 (prefix matching — `:*` suffix in RPC), 17 (missing i18n — write both languages before screen implementation).

**Research flag:** Category chip bar and debounce patterns are well-documented in React Native. No additional research needed.

### Phase 5: Polish

**Rationale:** Non-blocking refinements that improve quality and user experience but are not required for the core discovery flow to function.

**Delivers:** Popular categories browse (empty state shows top categories from `SELECT DISTINCT category`), loading skeletons, error handling and offline state, "My Published Decks" section in deck-builder sidebar, visual polish on result cards.

**Research flag:** Standard React Native patterns. No additional research needed.

### Phase Ordering Rationale

- Schema must precede backend because edge functions write to schema-defined tables
- Backend must precede deck builder UI because the save path (commit deck.yaml -> webhook -> deck_index) must be functional before UI-level testing
- Deck builder UI must precede mobile because the discovery screen needs real published decks to show meaningful results and validate ranked search output
- Pitfall 1 (study pipeline) requires schema and all study RPCs to be correct before any subscription can be tested, which is why it is the primary deliverable of Phase 1
- The five-phase structure is mandatory and sequential — no phase can be parallelized with the phase it depends on

### Research Flags

Phases with standard patterns (no additional research needed):
- **All five phases:** The entire implementation uses established patterns from the existing Lumio codebase (SECURITY DEFINER RPCs, action-router edge functions, webhook special-file detection, React Native FlatList/TextInput screens, pnpm monorepo). All patterns are verified against actual codebase source files with specific line references in PITFALLS.md.

No phase requires a `/gsd:research-phase` call. Research confidence is HIGH across all areas.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all choices verified against Supabase and PostgreSQL official docs and existing codebase usage |
| Features | MEDIUM-HIGH | Core feature set verified against AnkiWeb, Brainscape, Quizlet competitor analysis; some differentiator features (subscriber counts, deck preview) deferred as complexity is confirmed high |
| Architecture | HIGH | All patterns directly verified by reading production codebase source files (docora-webhook, deck-commit, shared_repositories migration, study RPCs); component boundaries and data flow are concrete, not hypothetical |
| Pitfalls | HIGH | Primary source is codebase analysis with specific line references; pitfalls are derived from actual current code behavior, not hypothetical scenarios |

**Overall confidence:** HIGH

### Gaps to Address

- **deck.yaml field name alignment:** STACK.md uses `display_name` while FEATURES.md and ARCHITECTURE.md use `name`. Standardize on `display_name` (STACK.md recommendation) to distinguish from the filesystem directory name, consistent with the `display_name` column convention in deck_index. Resolve explicitly before writing the Phase 1 migration.

- **Card count implementation:** STACK.md recommends a denormalized `card_count` column updated by the webhook, while PITFALLS.md recommends computing at query time to avoid GIN write amplification. PITFALLS.md reasoning is stronger — avoid denormalized count, use a correlated subquery in `search_decks`. Resolve in Phase 1.

- **Subscription table approach:** FEATURES.md recommends a separate `user_deck_subscriptions` table while ARCHITECTURE.md and PITFALLS.md both recommend the `subfolder_path` column on `user_repositories`. ARCHITECTURE.md reasoning is compelling — a new table would require modifying every downstream consumer. Use the `subfolder_path` column approach. Resolve explicitly in Phase 1.

## Sources

### Primary — HIGH confidence (codebase analysis)

- `supabase/functions/docora-webhook/index.ts` — webhook handler routing, hand-rolled YAML parser, file type detection patterns
- `supabase/functions/deck-commit/index.ts` — path validation, action router, GitHub API helpers
- `supabase/functions/git-sync/index.ts` — user_repositories join patterns in all card-loading queries
- `supabase/migrations/20260115000001_shared_repositories.sql` — user_repositories schema, RLS patterns
- `supabase/migrations/20260226000001_card_review_schedule.sql` — study RPCs, SM-2 scheduling joins
- `apps/deck-builder/src/lib/frontmatter.ts` — yaml package usage for YAML serialization
- `apps/android/navigation/MainNavigator.tsx` — current 3-tab layout, navigation patterns

### Primary — HIGH confidence (official documentation)

- [Supabase Full Text Search Docs](https://supabase.com/docs/guides/database/full-text-search) — tsvector, GIN index, generated columns, websearch_to_tsquery, textSearch API
- [PostgreSQL 18: Text Search Controls](https://www.postgresql.org/docs/current/textsearch-controls.html) — setweight, ts_rank, tsquery prefix matching with `:*`
- [PostgreSQL 18: Text Search Indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) — GIN vs GiST, GIN preferred for text search

### Secondary — MEDIUM confidence (competitor analysis)

- [AnkiWeb Shared Decks](https://ankiweb.net/shared/decks) — category browse and search UX patterns
- [AnkiHub](https://www.ankihub.net/) — deck subscription and automatic update model
- [Brainscape](https://brainscape.zendesk.com/hc/en-us/articles/115002383732) — Knowledge Genome categories, popularity ranking
- [Quizlet](https://help.quizlet.com/hc/en-us/articles/360029772872) — search filters, result display patterns

### Secondary — MEDIUM confidence (community)

- [pganalyze: Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index) — GIN write vs read tradeoffs
- [Skip Elasticsearch: Full-Text Search in Supabase](https://dev.to/reclusivecoder/skip-elasticsearch-build-blazing-fast-full-text-search-right-in-supabase-58pf) — real-world FTS implementation patterns

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
