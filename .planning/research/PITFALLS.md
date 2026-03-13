# Domain Pitfalls

**Domain:** Adding fulltext search, deck metadata, subfolder subscription, and discovery screen to existing Lumio flashcard platform (v3.1 Deck Discovery)
**Researched:** 2026-03-13

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Subfolder Subscription Breaks Existing Study Pipeline

**What goes wrong:** The existing system links users to whole repositories via `user_repositories`. ALL study RPCs (`get_study_cards_for_session`, `get_due_card_count`, `upsert_card_review`) join through `user_repositories` to filter cards. Introducing subfolder-level subscription (user subscribes to `/{author_id}/{deck_name}/` within the shared repo) without updating these RPCs means either: (a) subscribing gives access to ALL cards in the entire shared repo (every author's decks), or (b) subfolder subscriptions are invisible to the study pipeline and users can never study discovered decks.

**Why it happens:** `user_repositories` is a repo-level concept. The v3.0 architecture deliberately uses one shared repo (`lumio-decks`) for all user content. When a user "subscribes" to a specific deck, there is no table to represent "user subscribed to THIS subfolder within this repo." Adding a `user_repositories` row for the whole shared repo gives access to ALL decks from ALL authors, not just the selected one.

**Consequences:**
- Option (a): User subscribes to one deck but sees hundreds of cards from all authors in their study sessions. Study is completely polluted with irrelevant content.
- Option (b): User subscribes but cannot study. The feature appears broken.
- Changing the join structure of 4+ SECURITY DEFINER RPCs (`get_study_cards_for_session`, `get_due_card_count`, `upsert_card_review`, `get_study_cards_with_questions`) is a high-risk migration that can break SM-2 scheduling for existing users.

**Prevention:**
- Introduce a `user_deck_subscriptions` table with `(user_id, deck_id UUID REFERENCES decks(id) ON DELETE CASCADE)` and a `decks` table with `(id, repository_id, path_prefix TEXT, ...)`.
- Update ALL study RPCs to UNION cards from both `user_repositories` (existing personal repos) and `user_deck_subscriptions` (discovered decks). This maintains backward compatibility.
- The RPCs should filter cards from `user_deck_subscriptions` joins by `file_path LIKE decks.path_prefix || '/%'`.
- Test the study flow end-to-end after migration: subscribe to one deck, verify only that deck's cards appear in sessions.

**Detection:** After subscribing to one deck via discovery, check if `get_study_cards_for_session` returns ONLY cards from that deck, not all cards in the shared repo.

**Phase:** Must be designed in the database schema phase and propagated through every RPC. This is the single highest-risk architectural change in v3.1.

---

### Pitfall 2: Discovery Queries Return Zero Results Due to Wrong RLS Scope

**What goes wrong:** The discovery screen shows decks the user has NOT yet subscribed to. But the entire existing data access pattern uses `user_repositories` as the RLS gate -- every SELECT policy on `cards`, `repositories`, `card_assets`, and `webhook_chunks` checks that the user has a `user_repositories` row. If the new `decks` or deck index table copies this pattern, no user will see any discoverable decks until they subscribe -- a chicken-and-egg problem.

**Why it happens:** Muscle memory from 12 shipped milestones. Every table's RLS policy follows the same template: `USING (id IN (SELECT repository_id FROM user_repositories WHERE user_id = auth.uid()))`. Copying this pattern to the deck index table makes it invisible to non-subscribers.

**Consequences:** Discovery screen shows zero results for all users. The entire feature is broken at the data layer. Debugging is confusing because the query returns data when using service_role.

**Prevention:**
- The deck index / `decks` table must have a SELECT policy that allows ALL authenticated users to read: `USING (auth.uid() IS NOT NULL)`.
- Keep write policies restrictive (service_role only -- populated by Docora webhook).
- The "already subscribed" filtering happens in the application query (`LEFT JOIN user_deck_subscriptions ... WHERE subscription IS NULL`), NOT in the RLS policy.
- Test with a fresh user who has zero subscriptions. They should see all available decks.

**Detection:** Log in as a brand-new user with no repos and no subscriptions. Navigate to discovery. If zero results appear, RLS is wrong.

**Phase:** Must be addressed in the DB schema/migration phase. First migration to write and test.

---

### Pitfall 3: Docora Webhook Has No Handler for deck.yaml -- Metadata Never Reaches the Database

**What goes wrong:** The v3.1 plan introduces a `deck.yaml` metadata file per deck directory. When the deck builder user saves deck metadata, `deck.yaml` is committed to the shared repo. Docora detects the change and sends a webhook. But the existing `docora-webhook` handler (reviewed in `supabase/functions/docora-webhook/index.ts`, lines 707-797) only processes:
- `README.md` (deck metadata at repo root level)
- `.lumioignore` (card filtering rules)
- `.md` files (cards)
- Image files (`.png`, `.jpg`, etc.)

A `.yaml` file hits the catch-all "Other files - ignore" branch and is silently discarded. The deck index is never populated.

**Why it happens:** The webhook handler was designed for the original card format spec where deck metadata lived in the root `README.md`. YAML metadata files are a new file type that did not exist when the handler was written.

**Consequences:** Deck metadata (name, description, category, tags, author) committed to Git never reaches the database. The deck index table stays empty. Discovery search returns no results. The entire feature chain is broken.

**Prevention:**
- Add a `deck.yaml` handler in the `docora-webhook` that:
  1. Detects files named `deck.yaml` (case-insensitive check on filename)
  2. Parses the YAML content using `npm:yaml@2` (NOT the hand-rolled parser -- see Pitfall 7)
  3. Extracts the deck path from `file_path` (e.g., `{author_id}/{deck_name}/deck.yaml` -> `{author_id}/{deck_name}`)
  4. Upserts a row in the `decks` table with the extracted metadata
  5. Handles CREATE, UPDATE, and DELETE webhook actions

**Detection:** Commit a `deck.yaml` file via the deck builder, wait for Docora sync, then query the `decks` table. If no row exists, the handler is missing.

**Phase:** Backend implementation phase -- webhook handler enhancement alongside deck index table migration.

---

### Pitfall 4: Generated tsvector Column with Wrong Language Configuration

**What goes wrong:** You create a generated column like `fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED` and then query with `to_tsquery('simple', ...)` or `to_tsquery('italian', ...)`. Postgres will NOT use the GIN index because the text search configuration at query time does not match the one used to build the stored column. The query silently falls back to a sequential scan.

**Why it happens:** Lumio is bilingual (IT/EN). Deck names and descriptions can be in either language. Using `'english'` configuration will stem Italian words incorrectly (e.g., "programmazione" might not match "programma"). Using `'italian'` will break English stemming. The developer picks one and forgets the other.

**Consequences:** Either the GIN index is not used (performance regression) or search misses valid matches in one language (functional regression). Both are invisible without `EXPLAIN ANALYZE`.

**Prevention:**
- Use `'simple'` text search configuration for BOTH the generated column AND all queries. The `simple` configuration does no language-specific stemming -- it lowercases and tokenizes. This is correct for multilingual content.
- At Lumio's scale (hundreds to low thousands of decks), `simple` is more than adequate. Stemming provides marginal benefit that does not justify the bilingual complexity.
- Always verify with `EXPLAIN ANALYZE` that the GIN index is used.

**Detection:** Run `EXPLAIN ANALYZE SELECT * FROM decks WHERE fts @@ to_tsquery('simple', 'math')`. If you see `Seq Scan` instead of `Bitmap Index Scan`, the configurations are mismatched.

**Phase:** Must be correct at migration time. Changing a generated column requires `ALTER TABLE DROP COLUMN` then `ALTER TABLE ADD COLUMN` -- cannot be altered in place.

---

### Pitfall 5: File Path Inconsistency Between Deck Builder and Webhook Breaks Deck-to-Card Mapping

**What goes wrong:** The deck builder constructs paths as `{user_id}/{deck_name}/{card_slug}.md` via `validateUserPath()`. The `docora-webhook` receives `file_path` from Docora and must extract the deck identifier. If the deck index stores `path_prefix = '{user_id}/{deck_name}'` and the subscription uses `cards.file_path LIKE path_prefix || '/%'`, any inconsistency in path format (trailing slashes, URL encoding of spaces, case differences) breaks the LIKE match. The user subscribes to a deck but sees zero cards.

**Why it happens:** Two independent codepaths construct and parse the same path format. The deck builder constructs paths client-side (via `deck-commit` edge function), and the webhook parses them server-side. There is no shared path-parsing module. Spaces in deck names are particularly dangerous: the deck builder uses them as-is, but URL encoding might transform `My Deck` to `My%20Deck`.

**Consequences:** Deck subscriptions silently fail to match any cards. The user subscribes but sees an empty deck in their library. Study sessions for discovered decks are always empty.

**Prevention:**
- Define a canonical path format: `{uuid}/{deck_name}` (no trailing slash in DB, no leading slash)
- Create a shared utility function `parseDeckPath(filePath: string): { authorId: string, deckName: string } | null` that is used by BOTH:
  1. The `deck-commit` edge function (to verify path structure)
  2. The `docora-webhook` handler (to extract deck identity from file_path)
- Since edge functions share the `supabase/functions/` directory, create a `_shared/path-utils.ts` module
- Add explicit test cases: spaces in names, hyphens, single-card decks, nested subdirectories

**Detection:** Commit a card to a deck with spaces in the name (e.g., "My Math Deck"), let Docora sync, then verify `SELECT * FROM cards WHERE file_path LIKE '{user_id}/My Math Deck/%'` returns results.

**Phase:** Backend implementation phase -- shared utility before webhook handler or deck-commit changes.

## Moderate Pitfalls

### Pitfall 6: Search Index Staleness -- Card Counts Drift From Reality

**What goes wrong:** The deck index stores a `card_count` column that is set when `deck.yaml` is processed. But Docora processes files individually in arbitrary order. A user commits 10 cards and a `deck.yaml` simultaneously. The `deck.yaml` webhook might arrive before any cards, showing "0 cards" in discovery. Cards arrive later but the deck index is not updated because card webhooks do not touch the deck index.

**Why it happens:** Docora's file-by-file webhook model has no "batch complete" signal. Each file triggers an independent webhook. There is no mechanism to know when all files from a commit have been processed.

**Consequences:**
- Discovery screen shows "0 cards" for decks that actually have cards
- Card counts drift as cards are added/removed without deck.yaml changes
- Users see stale metadata that creates false impressions about deck quality

**Prevention:**
- Do NOT store `card_count` in the deck index table. Compute it at query time:
  ```sql
  SELECT d.*, (
    SELECT COUNT(*) FROM cards c
    WHERE c.repository_id = d.repository_id
      AND c.file_path LIKE d.path_prefix || '/%'
      AND c.is_active = TRUE
  ) as card_count
  FROM decks d
  ```
- This adds a correlated subquery cost per deck, but at Lumio's scale (hundreds of decks) it is negligible and always accurate.
- For deck metadata (name, description, tags, category), accept eventual consistency -- metadata will be correct after the `deck.yaml` webhook processes.

**Phase:** Query design phase. Avoid baking volatile counts into the deck index table.

---

### Pitfall 7: YAML Parsing Inconsistency Between Deck Builder and Webhook

**What goes wrong:** The deck builder uses the `yaml` npm package (full YAML 1.2 spec) to serialize metadata. The `docora-webhook` uses a hand-rolled `parseFrontmatter()` function (lines 228-297 in `docora-webhook/index.ts`) that only handles simple key-value pairs and YAML arrays in block style. This hand-rolled parser cannot handle:
- Multi-line strings (descriptions with newlines)
- Flow-style arrays: `tags: [math, science]`
- Quoted strings with special YAML characters (colons, brackets)
- Nested objects

If `deck.yaml` uses any of these features (and it will -- descriptions naturally contain colons and newlines), the hand-rolled parser silently produces wrong data.

**Why it happens:** The hand-rolled parser was sufficient for card frontmatter (simple title, tags list, difficulty number). Deck metadata is richer. The deck builder serializes using `yaml` package which can produce any valid YAML.

**Consequences:** Deck descriptions are truncated or missing. Tags are not parsed. Category field is dropped. Deck appears in discovery with incomplete metadata.

**Prevention:**
- Use `npm:yaml@2` in the `docora-webhook` for `deck.yaml` files. Deno supports npm packages via the `npm:` prefix (already used for `npm:ignore@5.3.1`).
- For `deck.yaml` files, parse the ENTIRE file as YAML (it is pure YAML, not markdown-with-frontmatter). Do NOT route through `parseFrontmatter()`.
- Keep the existing hand-rolled `parseFrontmatter()` for `.md` card files -- it works fine for the simple card frontmatter format.

**Phase:** Webhook handler implementation phase.

---

### Pitfall 8: Debounce Race Conditions on Mobile Search

**What goes wrong:** Implementing search-as-you-type on the discovery screen with a naive `setTimeout` in `useEffect` without cleanup. Each keystroke creates a new timeout, but old ones are not cancelled. The user types "math" and gets results for "m", "ma", "mat", and "math" flashing in sequence. Worse: on slow connections, the response for "m" (which returns many results) arrives AFTER the response for "math" (which returns few), so the UI shows results for "m" after the user typed "math."

**Why it happens:** Missing `clearTimeout` in the `useEffect` cleanup function. Not cancelling or ignoring stale in-flight requests. This is the most common React anti-pattern for search.

**Consequences:**
- UI flickers as results update rapidly
- Race condition shows stale results (results for an older query override results for the current query)
- Excessive Supabase queries (one per keystroke at ~300ms intervals)

**Prevention:**
```typescript
// Correct pattern:
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  if (query.length < 2) { setDebouncedQuery(''); return; }
  const timer = setTimeout(() => setDebouncedQuery(query), 300);
  return () => clearTimeout(timer); // CRITICAL: cleanup
}, [query]);

useEffect(() => {
  if (!debouncedQuery) return;
  let cancelled = false;
  searchDecks(debouncedQuery).then(results => {
    if (!cancelled) setResults(results); // Ignore stale results
  });
  return () => { cancelled = true; };
}, [debouncedQuery]);
```
- 300ms debounce window (responsive but prevents excessive queries)
- Minimum query length of 2 characters before triggering search
- Show a loading indicator during the debounce window

**Phase:** Mobile discovery screen implementation phase.

---

### Pitfall 9: Discovery Tab Navigation Confusion After Subscription

**What goes wrong:** Adding a "Discovery" tab alongside Dashboard, Repos, Settings. User finds a deck, subscribes, then wonders: "Where did it go? How do I study it?" The subscribed deck now lives in the Repos tab context, but the user is still in the Discovery tab. Cross-tab navigation (auto-switching to Repos after subscribe) creates disjointed UX and loses the discovery screen's scroll position and search state.

**Why it happens:** react-navigation's bottom tabs maintain independent stack navigators. Navigating from Discovery to a screen in the Repos tab stack requires explicit tab switching, which resets the Discovery tab's state.

**Consequences:**
- User subscribes and sees no immediate feedback about where the deck went
- Auto-navigating to Repos tab loses discovery search state
- Back button behavior becomes unpredictable after cross-tab navigation

**Prevention:**
- Add Discovery as a 4th tab (icon: `compass` / `compass-outline`)
- Keep the subscription flow ENTIRELY within the Discovery tab stack:
  - Discovery list -> Deck detail (shows card count, description, subscribe button) -> subscribe -> show success toast -> update the deck card in the list to show "Subscribed" badge
- Do NOT attempt to navigate to the Repos tab after subscribing
- The subscribed deck will appear in study sessions automatically (via the `user_deck_subscriptions` join) -- no navigation needed

**Phase:** Navigation design, early in the mobile implementation phase.

---

### Pitfall 10: deck.yaml Schema Without Versioning Blocks Future Evolution

**What goes wrong:** The initial `deck.yaml` format is defined without a `schema_version` field. Six months later, you need to add `license` or change `category` (string) to `categories` (array). Old `deck.yaml` files in Git persist indefinitely. The webhook parser either crashes on unknown structures, silently drops new fields, or cannot distinguish "field missing because old version" from "field missing because user chose not to fill it."

**Why it happens:** Schema versioning feels like over-engineering for v1. But Git content is immutable until explicitly updated.

**Consequences:** Adding required fields breaks parsing of all existing decks. Changing field types requires backfilling Git content across all users.

**Prevention:**
- Include `schema_version: 1` from day one
- Make ALL metadata fields optional in the parser (with sensible defaults)
- When `schema_version` is missing, treat as version 1
- Log warnings for unknown schema versions rather than crash

```yaml
# deck.yaml v1 schema
schema_version: 1
name: "My Math Deck"
description: "Fundamentals of calculus"
category: "mathematics"
tags:
  - calculus
  - derivatives
author_display_name: "Jane Doe"
```

**Phase:** Metadata format design -- very first thing to nail down.

---

### Pitfall 11: GIN Index Update Cost When Deck Index Updated on Every Card Change

**What goes wrong:** If the deck index table recalculates metadata (card count, last_updated) on every card webhook AND has a GIN index on the tsvector column, each card CREATE/UPDATE/DELETE triggers a deck index row update, which triggers a GIN index update. GIN indexes store inverted lexeme lists and are slower to update than B-tree indexes.

**Why it happens:** Premature denormalization. Storing card_count in the deck index feels efficient for reads but creates write amplification. Every card change requires: card INSERT/UPDATE + deck index UPDATE + GIN index rebuild.

**Consequences:** Webhook processing slows down. Card sync latency increases. Under heavy deck builder usage, webhooks queue up.

**Prevention:**
- Only update the deck index when `deck.yaml` changes, NOT on card changes
- Compute card counts at query time (see Pitfall 6)
- The tsvector column only changes when searchable metadata changes (name, description, tags) -- which is rare
- This keeps GIN index updates to a minimum

**Phase:** Database schema design phase.

---

### Pitfall 12: Orphaned Subscriptions When a Deck Is Deleted

**What goes wrong:** A deck author deletes their deck via the deck builder. Docora sends DELETE webhooks for each file. Cards are removed from the DB. But `user_deck_subscriptions` rows for that deck remain. Users now have subscriptions pointing to a ghost deck with zero cards.

**Why it happens:** If subscriptions reference a path prefix (TEXT) rather than a FK to a `decks` table, there is no CASCADE delete. The deck deletion is a series of file-level events, not a single "deck deleted" database event.

**Consequences:**
- Users see phantom decks in their library with zero cards
- Study RPCs waste time joining against non-existent card paths
- Manual cleanup is required

**Prevention:**
- Use a `decks` table with a UUID primary key. `user_deck_subscriptions.deck_id` is a FK with `ON DELETE CASCADE`.
- When the `deck.yaml` DELETE webhook fires, delete the `decks` row. CASCADE cleans up all subscriptions.
- This is strongly preferred over path-prefix-based subscriptions for data integrity.

**Phase:** Database schema phase.

---

### Pitfall 13: Supabase textSearch Client API Syntax Gotcha

**What goes wrong:** Supabase JS client's `.textSearch('fts', query)` expects `tsquery` format, not plain text. Passing `"math science"` directly does not search for both words -- the tokenizer treats it as a single lexeme `"math science"` which matches nothing in the tsvector index.

**Why it happens:** The API documentation shows raw tsquery strings in examples. Developers assume plain text works.

**Consequences:** Search returns zero results for multi-word queries. Users think the search is broken.

**Prevention:**
- Convert user input to proper tsquery format before passing to Supabase:
  - Split on whitespace
  - Append `:*` to each term for prefix matching (user types "mat", expects "mathematics")
  - Join with ` & ` for AND semantics
  - Example: `"math calc"` -> `"math:* & calc:*"`
- Better: create a server-side RPC that accepts plain text and handles conversion:
  ```sql
  CREATE FUNCTION search_decks(p_query TEXT)
  RETURNS SETOF decks AS $$
    SELECT * FROM decks
    WHERE fts @@ to_tsquery('simple',
      array_to_string(
        array(SELECT unnest(string_to_array(p_query, ' ')) || ':*'),
        ' & '
      )
    )
  $$ LANGUAGE sql STABLE;
  ```
- This keeps the tsquery construction on the server, away from client-side string manipulation.

**Phase:** Query implementation phase.

## Minor Pitfalls

### Pitfall 14: Empty State Confusion on Discovery Screen

**What goes wrong:** When discovery loads, zero results could mean: (a) no decks published yet, (b) user already subscribed to everything, or (c) search query matches nothing. The user cannot distinguish these.

**Prevention:**
- Three distinct empty states with different messages and icons:
  - No search, no decks: "No decks available yet. Create one in the Deck Builder!"
  - Search with no results: "No decks match '{query}'. Try different keywords."
  - All decks subscribed (no search): "You've subscribed to all available decks!"
- Show all unsubscribed decks on initial load (before typing in search bar)

**Phase:** Mobile UI implementation phase.

---

### Pitfall 15: Author Display Name Is a UUID

**What goes wrong:** The deck index needs to show who created a deck. But `author_id` is a UUID like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. Displaying this as the author name is unusable.

**Prevention:**
- Store `author_display_name` in `deck.yaml` and persist to the deck index at sync time
- Auto-populate from `users.display_name` if `deck.yaml` doesn't specify it (webhook handler can look up the user)
- Denormalize the author name into the deck index table to avoid joins at query time

**Phase:** Metadata format design and database schema phase.

---

### Pitfall 16: tsvector Does Not Support Prefix Matching by Default

**What goes wrong:** User types "calc" expecting to find "calculus." The tsquery `'calc'` does exact lexeme matching and will NOT match `'calculus'`. Search feels broken because partial words never match.

**Prevention:**
- Always append `:*` to each search term in the tsquery: `to_tsquery('simple', 'calc:*')` matches any lexeme starting with "calc"
- This is the standard Postgres prefix search pattern for tsvector

**Phase:** Query implementation phase.

---

### Pitfall 17: i18n Keys Missing for Discovery Screen

**What goes wrong:** ~20-40 new i18n keys needed (search placeholder, empty states, subscribe button, deck detail labels, error messages). Forgetting Italian translations causes English fallbacks or raw key names for Italian users.

**Prevention:**
- Follow existing pattern: add keys to both `apps/android/i18n/en.ts` and `apps/android/i18n/it.ts` simultaneously
- The existing `DeepStringify` compile-time validation will catch missing keys at build time
- Write both languages BEFORE implementing the screen

**Phase:** Throughout mobile implementation.

---

### Pitfall 18: Concurrent deck.yaml Saves in Deck Builder

**What goes wrong:** User clicks "Save metadata" rapidly. Multiple GitHub API commits fire for the same file. The second commit fails because the SHA changed after the first commit succeeded.

**Prevention:**
- Disable the save button while a save is in-flight (same pattern used for card saves)
- Track SHA from the last successful save, send it with the next save
- On SHA conflict (409), re-fetch current SHA and retry once

**Phase:** Deck builder UI implementation phase.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database schema / migrations | **Pitfall 1** (subfolder subscription breaks study RPCs) -- HIGHEST RISK | Design `decks` + `user_deck_subscriptions` tables. Update ALL study RPCs to UNION with new join. Test study flow end-to-end. |
| Database schema / migrations | **Pitfall 2** (wrong RLS on deck index) | Use `auth.uid() IS NOT NULL` for SELECT on `decks` table. Test with fresh unsubscribed user. |
| Database schema / migrations | **Pitfall 4** (tsvector config mismatch) | Use `'simple'` for both column and queries. Verify with `EXPLAIN ANALYZE`. |
| Database schema / migrations | **Pitfall 12** (orphaned subscriptions) | FK with CASCADE from `user_deck_subscriptions` to `decks`. |
| Database schema / migrations | **Pitfall 11** (GIN update cost) | No card_count in deck index. Compute at query time. |
| Metadata format design | **Pitfall 10** (no schema versioning) | Add `schema_version: 1` from day one. All fields optional. |
| Metadata format design | **Pitfall 15** (author UUID display) | Include `author_display_name` in deck.yaml. Denormalize to deck index. |
| Webhook handler (docora-webhook) | **Pitfall 3** (no handler for deck.yaml) -- CRITICAL | Add deck.yaml handler for CREATE/UPDATE/DELETE. Without this, nothing works. |
| Webhook handler (docora-webhook) | **Pitfall 7** (YAML parsing inconsistency) | Use `npm:yaml@2` for deck.yaml. Keep hand-rolled parser for .md frontmatter only. |
| Webhook handler (docora-webhook) | **Pitfall 5** (path mapping inconsistency) | Shared `parseDeckPath()` utility in `_shared/path-utils.ts`. |
| Deck builder UI | **Pitfall 18** (concurrent metadata saves) | Disable save button during in-flight. SHA tracking. |
| Mobile discovery screen | **Pitfall 8** (debounce race conditions) | Memoized debounce, cleanup in useEffect, cancel stale requests. |
| Mobile discovery screen | **Pitfall 9** (navigation confusion) | Discovery as 4th tab. Subscription stays within Discovery stack. Toast feedback. |
| Mobile discovery screen | **Pitfall 14** (empty state confusion) | Three distinct empty states for three scenarios. |
| Mobile discovery screen | **Pitfall 17** (missing Italian translations) | Write both en.ts and it.ts before screen implementation. |
| Query / search implementation | **Pitfall 13** (tsquery syntax) | Server-side RPC that converts plain text to tsquery with prefix matching. |
| Query / search implementation | **Pitfall 6** (stale card counts) | Compute card counts at query time, not stored in deck index. |
| Query / search implementation | **Pitfall 16** (no prefix matching) | Always use `:*` suffix on each search term. |

## Sources

### Official Documentation
- [PostgreSQL 18: Tables and Indexes for Text Search](https://www.postgresql.org/docs/current/textsearch-tables.html) -- tsvector generated columns, configuration matching requirement
- [PostgreSQL 18: Preferred Index Types for Text Search](https://www.postgresql.org/docs/current/textsearch-indexes.html) -- GIN write performance characteristics
- [PostgreSQL 18: Controlling Text Search](https://www.postgresql.org/docs/current/textsearch-controls.html) -- tsquery syntax, prefix matching with `:*`
- [Supabase: Full Text Search](https://supabase.com/docs/guides/database/full-text-search) -- generated columns with GIN index, textSearch client API
- [Supabase: RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- IN vs EXISTS, security definer functions

### Community / Analysis
- [pganalyze: Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index) -- GIN write vs read tradeoffs, update cost
- [Thoughtbot: Optimizing Full Text Search with Postgres tsvector](https://thoughtbot.com/blog/optimizing-full-text-search-with-postgres-tsvector-columns-and-triggers) -- stored tsvector vs functional index

### Codebase Analysis (PRIMARY -- HIGH confidence)
- `supabase/functions/docora-webhook/index.ts` -- file type routing (lines 707-797 show README/lumioignore/md/image handling, no YAML), hand-rolled YAML parser (lines 228-297), deck metadata extraction (lines 302-315)
- `supabase/functions/deck-commit/index.ts` -- path validation (`validateUserPath` lines 58-75, `validateUserDirectoryPath` lines 81-98), deck name validation (lines 104-125)
- `supabase/functions/git-sync/index.ts` -- `user_repositories` joins in all query functions (lines 434-571), shared repo architecture
- `supabase/migrations/20260115000001_shared_repositories.sql` -- `user_repositories` table, RLS policies using subscription-based access
- `supabase/migrations/20260226000001_card_review_schedule.sql` -- study RPCs joining through `user_repositories` (lines 88-89, 146-147, 175-176)
- `supabase/migrations/20260305000001_session_aware_due_count.sql` -- due count RPC
- `packages/shared/src/types/index.ts` -- current type definitions, no deck-level types exist yet
- `apps/android/navigation/MainNavigator.tsx` -- current 3-tab layout (Dashboard, Repos, Settings)
- `apps/deck-builder/src/lib/frontmatter.ts` -- uses `yaml` npm package for card frontmatter

---
*Pitfalls research for: Lumio v3.1 -- Deck Discovery (fulltext search, deck metadata, subfolder subscription)*
*Researched: 2026-03-13*
