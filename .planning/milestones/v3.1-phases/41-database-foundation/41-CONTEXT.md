# Phase 41: Database Foundation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Searchable deck index table with fulltext search, subfolder-aware subscription model on user_repositories, and study pipeline updates so subscribed users only see cards from their chosen deck subfolder. Platform-level lumio-decks repo registration included.

</domain>

<decisions>
## Implementation Decisions

### Tag-based discovery (no category field)
- No separate `category` column in deck_index — categories emerge from tags
- Tags stored as TEXT[] in deck_index, normalized to slug format (lowercase, spaces→dashes): "Machine Learning" → "machine-learning"
- Max 5 tags per deck (enforced at validation, not DB constraint)
- Mobile chip bar (Phase 44) will show top 10 most-used tags across all decks, dynamically computed
- Fulltext search weighted: display_name > tags > description (per DBSR-02)

### Subscription model
- `subfolder_path` TEXT column added to `user_repositories` (per prior decision — not a separate table)
- UNIQUE constraint on `(user_id, repository_id, subfolder_path)` prevents duplicate subscriptions
- SRS progress (card_review_schedule rows) preserved on unsubscribe — only the user_repositories row is deleted
- If user unsubscribes from last subfolder of a repo, the user_repositories row is auto-removed (no orphan rows)
- Study RPCs filter cards by subfolder_path: `WHERE c.file_path LIKE subfolder_path || '%'` when subfolder_path IS NOT NULL

### deck.yaml schema
- Fields: `display_name` (TEXT, required), `description` (TEXT, required), `tags` (TEXT[], max 5, slug-normalized), `author` (TEXT, pre-filled from Supabase profile display_name, editable by user), `language` (TEXT, ISO 639-1 code from dropdown)
- These fields map 1:1 to deck_index table columns
- deck.yaml is the source of truth; deck_index is populated by docora-webhook parsing (Phase 42)

### Platform repo seeding
- Seed migration inserts lumio-decks record in `repositories` table with URL `https://github.com/toto-castaldi/lumio-decks`
- `docora_repository_id` set to NULL initially (populated when Docora is configured for the repo)
- No user_id association — this is a platform-level repo, not owned by any user
- Repo is hidden from user's repository list (RLS policies exclude platform repos from user queries)
- Platform repo identified by a boolean `is_platform` column or NULL user association pattern

### deck_index table
- Columns: id (UUID PK), repository_id (FK), subfolder_path (TEXT), display_name (TEXT), description (TEXT), tags (TEXT[]), author (TEXT), language (TEXT), search_vector (tsvector), created_at, updated_at
- tsvector config: 'simple' everywhere (no stemming — multilingual deck names)
- GIN index on search_vector for fast fulltext queries
- Card count computed at query time via correlated subquery (not stored)
- search_vector generated column: weighted combination of display_name (A), tags (B), description (C)

### Claude's Discretion
- Unsubscribe UX pattern (single tap + undo toast vs dialog)
- Exact search_decks RPC signature and pagination approach
- Whether platform repo uses `is_platform` boolean or relies on no user_repositories rows
- Migration ordering and naming conventions
- Index strategy beyond the GIN index on search_vector

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `user_repositories` table: Already has `(user_id, repository_id)` UNIQUE constraint — extending with `subfolder_path` requires dropping and recreating the constraint
- Study RPCs (`get_study_cards_for_session`, `get_due_count_for_session`): All JOIN through `user_repositories ur ON ur.repository_id = c.repository_id AND ur.user_id = p_user_id` — subfolder filter adds `AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')`
- `docora-webhook` edge function: Already parses file-level create/update/delete with HMAC verification — deck.yaml detection extends handleCreate/handleUpdate in Phase 42
- `deck-commit` edge function: Already has action routing pattern — commit_yaml action adds to the switch in Phase 42
- SECURITY DEFINER RPC pattern: Established in card_review_schedule migrations, reuse for search_decks

### Established Patterns
- Migrations: Sequential `YYYYMMDD000001_descriptive_name.sql` files
- RPC design: `SECURITY DEFINER` with `(select auth.uid())` for performance
- Error clearing on sync: All webhook handlers clear error state on success
- Tag normalization: Card tags already lowercased in docora-webhook `extractCardMetadata()`

### Integration Points
- `get_study_cards_for_session` and `get_due_count_for_session`: Must be updated to filter by subfolder_path
- `upsert_card_review`: May need subfolder awareness for the write-back
- `repositories` table: Needs migration to support platform-level repos
- `user_repositories` table: Needs subfolder_path column and updated UNIQUE constraint

</code_context>

<specifics>
## Specific Ideas

- Tags normalized to slug format: lowercase + spaces→dashes (user's explicit preference for URL-friendly tags)
- Author field pre-compiled from Supabase profile but editable — user wants flexibility without manual burden
- Language selection via dropdown with common ISO 639-1 codes (it, en, es, fr, de, pt, ja, zh, ko, ru, ar + Other)
- lumio-decks repo URL: `https://github.com/toto-castaldi/lumio-decks` (already exists on GitHub)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 41-database-foundation*
*Context gathered: 2026-03-13*
