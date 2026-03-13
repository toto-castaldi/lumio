# Phase 42: Backend Pipeline - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Edge function enhancements: docora-webhook detects and parses `deck.yaml` files, upserting metadata into `deck_index`; docora-webhook removes `deck_index` rows when `deck.yaml` is deleted; deck-commit edge function gets a `commit_yaml` action for writing validated `deck.yaml` to the correct user path.

</domain>

<decisions>
## Implementation Decisions

### Validation behavior
- Missing required fields (`display_name`, `description`): skip silently — don't upsert into `deck_index`. Deck won't appear in search until author fixes YAML
- Tags exceeding max 5 limit: truncate to first 5, ingest normally
- `commit_yaml` action validates BEFORE writing to Git — returns 400 with error message on invalid data. Prevents bad YAML from reaching the repo
- Language field: enforce whitelist of ISO 639-1 codes (it, en, es, fr, de, pt, ja, zh, ko, ru, ar). Reject anything outside the list

### deck.yaml location and detection
- File location: `{userId}/{deckName}/deck.yaml` — one per deck folder, next to .md card files
- File format: pure YAML (not frontmatter-in-markdown). Standard YAML with keys: `display_name`, `description`, `tags`, `author`, `language`
- Detection: exact filename match — `file.path` ends with `/deck.yaml`
- subfolder_path derivation: parent directory of deck.yaml path + trailing `/` (e.g., `abc-123/Italian Vocab/deck.yaml` → `abc-123/Italian Vocab/`)

### Author field (OVERRIDES Phase 41)
- Author is **server-enforced**, not client-editable. `commit_yaml` always sets author from the authenticated user's `public.users.display_name`
- Client-sent author values are ignored — prevents impersonation in shared deck discovery
- Source: query `public.users` table where `id = auth.uid()`
- Fallback: if `display_name` is NULL or empty, use email prefix (part before `@`). Matches `handle_new_user` trigger behavior

### Cleanup and lifecycle
- `deck_index` row removed ONLY when `deck.yaml` is deleted via Docora DELETE webhook (matches PIPE-02)
- If cards are deleted but `deck.yaml` remains, deck stays in index with 0 card count — this is expected
- `delete_deck` action: deck.yaml is included in the existing file iteration loop — no special handling needed. Docora DELETE event cascades to deck_index removal
- `rename_deck` action: deck.yaml is moved with all other files (existing getFile + commitFile + deleteFile loop). Docora events handle old row deletion + new row creation automatically
- No direct DB manipulation from deck-commit — all deck_index mutations flow through docora-webhook

### Claude's Discretion
- YAML parsing approach (reuse existing simple parser or import a library)
- Exact error messages for commit_yaml validation failures
- Whether to add a `commit_yaml` specific path validator or extend existing `validateUserPath()` for `.yaml` extension
- Logging verbosity in webhook deck.yaml handlers

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docora-webhook/index.ts` handleCreate/handleUpdate: Already routes by filename (README.md, .lumioignore, .md). Adding deck.yaml detection follows the same pattern
- `docora-webhook/index.ts` parseFrontmatter(): Simple YAML parser that handles key-value pairs and arrays. Can parse pure YAML files (not just frontmatter) since deck.yaml has the same structure
- `deck-commit/index.ts` action routing: Switch statement with 8 actions. `commit_yaml` adds a new case
- `deck-commit/index.ts` validateUserPath(): Currently enforces `.md` extension. `commit_yaml` needs a relaxed version for `.yaml`
- `deck-commit/index.ts` validateDeckName(): Reusable for deck name validation in path construction
- `deck-commit/index.ts` commitFile/getFile/deleteFile: GitHub API helpers already handle create/update/delete with SHA management

### Established Patterns
- File type routing in webhook: `if (fileName === "readme.md") / if (fileName === ".lumioignore") / if (filePath.endsWith(".md"))` — deck.yaml adds to this chain
- Error state clearing on successful sync: All webhook handlers clear `sync_error_*` fields — deck.yaml handlers should follow
- UPSERT pattern: `deck_index` has UNIQUE(repository_id, subfolder_path) — webhook uses upsert on conflict
- Path validation: `validateUserPath()` normalizes and validates paths before GitHub API calls

### Integration Points
- `docora-webhook` handleCreate: Add deck.yaml branch before generic .md handling
- `docora-webhook` handleUpdate: Add deck.yaml branch for metadata updates
- `docora-webhook` handleDelete: Add deck.yaml branch to delete deck_index row
- `deck-commit` switch statement: Add `commit_yaml` case
- `deck_index` table: Target for webhook upsert/delete operations
- `public.users` table: Source for server-enforced author field in commit_yaml

</code_context>

<specifics>
## Specific Ideas

- Author field override: Phase 41 decided "editable by user" but this was revised to "server-enforced from profile" during Phase 42 discussion. Prevents impersonation in the shared deck discovery context.
- The existing `delete_deck` and `rename_deck` actions already iterate all files in a deck folder — deck.yaml is handled naturally without special code paths.
- All deck_index mutations flow through docora-webhook (not direct DB writes from deck-commit). This keeps a single source of truth for the ingestion pipeline.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 42-backend-pipeline*
*Context gathered: 2026-03-13*
