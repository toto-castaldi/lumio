# Phase 42: Backend Pipeline - Research

**Researched:** 2026-03-13
**Domain:** Supabase Edge Functions (Deno), YAML parsing, GitHub Contents API, deck_index upsert/delete
**Confidence:** HIGH

## Summary

Phase 42 adds deck.yaml detection and processing to two existing edge functions: `docora-webhook` (ingestion) and `deck-commit` (authoring). The docora-webhook already routes by filename for README.md, .lumioignore, and .md files -- adding deck.yaml follows the exact same pattern with a new conditional branch in `handleCreate`, `handleUpdate`, and `handleDelete`. The deck-commit already has 8 actions in a switch statement -- `commit_yaml` adds a 9th case that validates metadata, queries the user's display_name for server-enforced author, serializes YAML, and commits via the existing `commitFile` helper.

All target tables and indexes already exist (`deck_index` from Phase 41 migration `20260313000001`). No new database migrations are needed. The `parseFrontmatter()` function in docora-webhook can parse pure YAML (not just frontmatter blocks) since deck.yaml uses the same key-value and array syntax. The only structural difference is that deck.yaml has no `---` delimiters and no body, so the function needs minor adaptation (or a dedicated `parseYaml()` wrapper).

**Primary recommendation:** Two plans -- (1) docora-webhook deck.yaml handling (PIPE-01 + PIPE-02), (2) deck-commit commit_yaml action (PIPE-03). Both are pure edge function code changes with no migrations needed.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Validation behavior:** Missing required fields (display_name, description) cause silent skip -- no upsert into deck_index. Tags exceeding max 5 are truncated to first 5. commit_yaml validates BEFORE writing to Git (returns 400 on invalid). Language field enforces ISO 639-1 whitelist: it, en, es, fr, de, pt, ja, zh, ko, ru, ar.
- **deck.yaml location and detection:** File at `{userId}/{deckName}/deck.yaml`. Pure YAML format with keys: display_name, description, tags, author, language. Detection via exact filename match -- `file.path` ends with `/deck.yaml`. subfolder_path derivation: parent directory of deck.yaml path + trailing `/`.
- **Author field (OVERRIDES Phase 41):** Server-enforced, not client-editable. commit_yaml always sets author from authenticated user's `public.users.display_name`. Client-sent author values ignored. Fallback: if display_name is NULL or empty, use email prefix (part before @).
- **Cleanup and lifecycle:** deck_index row removed ONLY when deck.yaml is deleted via Docora DELETE webhook. If cards deleted but deck.yaml remains, deck stays in index with 0 card count. delete_deck and rename_deck handle deck.yaml naturally (existing file iteration loops). All deck_index mutations flow through docora-webhook, not direct DB writes from deck-commit.

### Claude's Discretion
- YAML parsing approach (reuse existing simple parser or import a library)
- Exact error messages for commit_yaml validation failures
- Whether to add a commit_yaml specific path validator or extend existing validateUserPath() for .yaml extension
- Logging verbosity in webhook deck.yaml handlers

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | docora-webhook detects and parses deck.yaml files, upserting metadata into deck_index | Existing handleCreate/handleUpdate pattern with filename routing; parseFrontmatter() reusable for YAML; deck_index UPSERT via ON CONFLICT (repository_id, subfolder_path) |
| PIPE-02 | docora-webhook deletes deck_index row when deck.yaml is removed | Existing handleDelete pattern; DELETE FROM deck_index WHERE repository_id = X AND subfolder_path = Y |
| PIPE-03 | deck-commit edge function has a commit_yaml action for writing deck.yaml with path validation | Existing action routing switch; validateUserDirectoryPath() for .yaml paths; getUserId + users table query for author; commitFile() for GitHub write |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deno std | 0.177.0 | HTTP server, encoding | Already imported in both edge functions |
| @supabase/supabase-js | 2 | DB client (service_role in webhook, user-scoped in deck-commit) | Already imported in both edge functions |

### Supporting
No new libraries needed. All functionality is achievable with existing code.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reuse parseFrontmatter() for YAML | Import `npm:yaml` or `npm:js-yaml` | The existing simple parser handles key-value pairs and arrays, which is exactly what deck.yaml needs. No new dependency warranted for 5 flat fields. |
| validateUserDirectoryPath() for .yaml | New validateYamlPath() | validateUserDirectoryPath() already exists and validates user prefix + no traversal. Just need to enforce the path ends with `/deck.yaml` in the action handler itself. |

## Architecture Patterns

### docora-webhook deck.yaml Handling

The existing file routing pattern in handleCreate/handleUpdate/handleDelete uses cascading if-else:

```
1. isImageFile(filePath)       -> image handling
2. fileName === "readme.md"    -> repository metadata
3. fileName === ".lumioignore"  -> ignore filter
4. filePath.endsWith(".md")    -> card handling
5. else                        -> ignored
```

deck.yaml detection should be inserted as a new branch **after** .lumioignore and **before** generic `.md` handling:

```
3. fileName === ".lumioignore"  -> ignore filter
4. fileName === "deck.yaml"    -> deck_index upsert (NEW)
5. filePath.endsWith(".md")    -> card handling
```

**Rationale:** deck.yaml is a specific filename match (like README.md and .lumioignore), not an extension match. Placing it before the `.md` catch-all ensures it's never accidentally processed as a card.

### YAML Parsing Strategy

**Recommendation: Reuse `parseFrontmatter()` with a thin wrapper.**

The existing `parseFrontmatter()` splits on `---` delimiters and parses YAML key-value pairs and arrays. For pure YAML files (no frontmatter delimiters), create a `parseYaml()` that wraps the content in `---\n${content}\n---\n` and delegates to `parseFrontmatter()`:

```typescript
function parseYaml(content: string): Record<string, unknown> {
  const wrapped = `---\n${content}\n---\n`;
  const { frontmatter } = parseFrontmatter(wrapped);
  return frontmatter;
}
```

This avoids duplicating parsing logic and handles all deck.yaml field types:
- `display_name: Italian Vocabulary` (string)
- `description: A collection of...` (string)
- `author: John Doe` (string)
- `language: it` (string)
- `tags:` followed by `- vocabulary` lines (array)

### deck_index Upsert Pattern

The deck_index table has `UNIQUE(repository_id, subfolder_path)`. Use Supabase's upsert with `onConflict`:

```typescript
await serviceClient
  .from("deck_index")
  .upsert(
    {
      repository_id: repo.id,
      subfolder_path: subfolderPath,
      display_name: metadata.display_name,
      description: metadata.description,
      tags: metadata.tags,
      author: metadata.author,
      language: metadata.language,
    },
    { onConflict: "repository_id,subfolder_path" }
  );
```

### subfolder_path Derivation

From the file path `abc-123/Italian Vocab/deck.yaml`, derive the subfolder_path as the parent directory with trailing `/`:

```typescript
// filePath = "abc-123/Italian Vocab/deck.yaml"
// Remove the filename, keep the directory path with trailing /
const subfolderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);
// Result: "abc-123/Italian Vocab/"
```

### deck-commit commit_yaml Action

The action receives `deck_name` and metadata fields from the client, then:

1. Validate deck_name with existing `validateDeckName()`
2. Validate metadata fields (display_name required, description required, language whitelist, tags max 5)
3. Query `public.users` for authenticated user's `display_name` (with email prefix fallback)
4. Construct the file path: `{userId}/{deckName}/deck.yaml`
5. Serialize metadata to YAML string
6. Check if deck.yaml already exists via `getFile()` to get SHA for updates
7. Commit via `commitFile()` with appropriate message

**YAML Serialization** (simple -- only flat keys and one array):

```typescript
function serializeYaml(metadata: DeckYamlMetadata): string {
  let yaml = '';
  yaml += `display_name: ${metadata.display_name}\n`;
  yaml += `description: ${metadata.description}\n`;
  yaml += `author: ${metadata.author}\n`;
  yaml += `language: ${metadata.language}\n`;
  if (metadata.tags.length > 0) {
    yaml += 'tags:\n';
    for (const tag of metadata.tags) {
      yaml += `  - ${tag}\n`;
    }
  } else {
    yaml += 'tags:\n';
  }
  return yaml;
}
```

### Author Resolution in commit_yaml

The deck-commit function uses `createUserSupabaseClient()` which has the user's JWT. The `public.users` table has RLS with `auth.uid() = id` for SELECT, so querying the current user's profile works:

```typescript
const { data: profile } = await supabase
  .from("users")
  .select("display_name, email")
  .eq("id", userId)
  .single();

let author = profile?.display_name;
if (!author) {
  // Fallback: email prefix
  author = (profile?.email || "").split("@")[0];
}
```

### Anti-Patterns to Avoid
- **Direct deck_index writes from deck-commit:** All deck_index mutations must flow through docora-webhook. The commit_yaml action only writes to Git; the webhook handles DB updates.
- **Parsing deck.yaml as frontmatter:** deck.yaml has no `---` delimiters. Don't pass it directly to `parseFrontmatter()` without wrapping.
- **Trusting client-provided author:** The client may send an author field, but it must be ignored. Author is always resolved server-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Full YAML spec parser | Wrap existing `parseFrontmatter()` | deck.yaml is simple flat key-value + one array; the existing parser handles this exactly |
| YAML serialization | Template literals with escaping | Simple string concatenation | All values are pre-validated strings and arrays of strings; no special characters need escaping |
| Path validation | New validation function | Existing `validateUserDirectoryPath()` + filename check | The directory validation already handles traversal protection and user scoping |
| GitHub file operations | Raw fetch calls | Existing `getFile()` / `commitFile()` | Already handles SHA management, base64 encoding, error handling |

## Common Pitfalls

### Pitfall 1: deck.yaml Without Required Fields
**What goes wrong:** A deck.yaml with only `tags:` but no `display_name` or `description` gets upserted into deck_index, creating a broken entry.
**Why it happens:** Forgetting to validate before upserting.
**How to avoid:** Check `display_name` and `description` existence and non-emptiness BEFORE the upsert call. If missing, log and skip silently (per locked decision).
**Warning signs:** deck_index rows with empty display_name or description.

### Pitfall 2: subfolder_path Mismatch Between Webhook and Search
**What goes wrong:** The subfolder_path stored in deck_index doesn't match the pattern used by `search_decks` RPC or study RPCs, causing cards not to appear.
**Why it happens:** Inconsistent trailing slash handling.
**How to avoid:** Always store with trailing `/`. The search_decks RPC and study RPCs use `LIKE subfolder_path || '%'` which expects the trailing slash.
**Warning signs:** search_decks returns decks with 0 card_count even when cards exist.

### Pitfall 3: handleUpdate Without Existing deck_index Row
**What goes wrong:** An UPDATE webhook for deck.yaml arrives before a CREATE was processed (e.g., chunks delayed), and the code assumes the row exists.
**Why it happens:** Webhook ordering is not guaranteed.
**How to avoid:** Use UPSERT (not UPDATE) for both handleCreate and handleUpdate. This is idempotent and handles out-of-order delivery.
**Warning signs:** Errors in handleUpdate for deck.yaml processing.

### Pitfall 4: Tags Not Normalized to Slug Format
**What goes wrong:** Tags stored as "Machine Learning" instead of "machine-learning", causing tag filter mismatch in search_decks.
**Why it happens:** Forgetting to normalize tags on ingestion.
**How to avoid:** Normalize tags to lowercase, spaces-to-dashes format in both webhook parsing AND commit_yaml serialization. The Phase 41 CONTEXT specifies slug format.
**Warning signs:** Tag-based search returns no results for tags that visually match.

### Pitfall 5: Language Validation Bypass in Webhook
**What goes wrong:** Invalid language codes get into deck_index from deck.yaml files committed directly to Git (bypassing deck-commit validation).
**Why it happens:** Only validating language in commit_yaml but not in webhook.
**How to avoid:** In the webhook, if language is not in the whitelist, default to `'en'` (don't reject -- the file is already in Git).
**Warning signs:** deck_index rows with invalid language codes.

### Pitfall 6: Error State Clearing Missed for deck.yaml
**What goes wrong:** Repository stays in `sync_status: 'failed'` after a successful deck.yaml processing.
**Why it happens:** Existing README.md and .md handlers clear error state, but new deck.yaml handler omits this step.
**How to avoid:** Follow the established pattern: after successful deck.yaml processing, update repositories with `sync_status: 'synced'` and clear error fields.
**Warning signs:** Repository shows failed status despite successful syncs.

## Code Examples

### deck.yaml Detection in handleCreate (docora-webhook)
```typescript
// After .lumioignore handling, before .md handling:
if (fileName === "deck.yaml") {
  const yamlData = parseYaml(content);
  const displayName = typeof yamlData.display_name === "string" ? yamlData.display_name.trim() : "";
  const description = typeof yamlData.description === "string" ? yamlData.description.trim() : "";

  // Skip silently if required fields missing (per locked decision)
  if (!displayName || !description) {
    console.log(`[handleCreate] deck.yaml missing required fields, skipping: ${filePath}`);
    return { success: true, message: `deck.yaml skipped (missing required fields): ${filePath}` };
  }

  // Derive subfolder_path from file path
  const subfolderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);

  // Normalize tags: lowercase, spaces to dashes, max 5
  const rawTags = Array.isArray(yamlData.tags) ? yamlData.tags.map(String) : [];
  const tags = rawTags
    .map(t => t.toLowerCase().replace(/\s+/g, "-"))
    .slice(0, 5);

  // Language: whitelist with 'en' default
  const LANGUAGE_WHITELIST = ["it", "en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ru", "ar"];
  const language = typeof yamlData.language === "string" && LANGUAGE_WHITELIST.includes(yamlData.language)
    ? yamlData.language
    : "en";

  // Author: use as-is from YAML (webhook doesn't enforce -- that's commit_yaml's job)
  const author = typeof yamlData.author === "string" ? yamlData.author.trim() : "";

  // Upsert into deck_index
  const { error: upsertError } = await serviceClient
    .from("deck_index")
    .upsert(
      {
        repository_id: repo.id,
        subfolder_path: subfolderPath,
        display_name: displayName,
        description,
        tags,
        author,
        language,
      },
      { onConflict: "repository_id,subfolder_path" }
    );

  if (upsertError) {
    console.error(`[handleCreate] deck_index upsert error:`, upsertError.message);
    return { success: false, message: `Failed to index deck: ${upsertError.message}` };
  }

  // Clear error state (follows established pattern)
  await serviceClient
    .from("repositories")
    .update({
      sync_status: "synced",
      sync_error_message: null,
      sync_error_type: null,
      is_auth_error: false,
      sync_failed_at: null,
    })
    .eq("id", repo.id);

  return { success: true, message: `deck.yaml indexed: ${filePath}` };
}
```

### deck.yaml Deletion in handleDelete (docora-webhook)
```typescript
if (fileName === "deck.yaml") {
  const subfolderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);

  const { error: deleteError } = await serviceClient
    .from("deck_index")
    .delete()
    .eq("repository_id", repo.id)
    .eq("subfolder_path", subfolderPath);

  if (deleteError) {
    console.error(`[handleDelete] deck_index delete error:`, deleteError.message);
    return { success: false, message: `Failed to remove deck index: ${deleteError.message}` };
  }

  return { success: true, message: `deck.yaml removed from index: ${filePath}` };
}
```

### commit_yaml Action in deck-commit
```typescript
case "commit_yaml": {
  const { deck_name, display_name, description, tags, language } = body;

  // Required fields
  if (!deck_name || typeof deck_name !== "string") {
    return errorResponse(400, "Missing required field: deck_name");
  }
  if (!display_name || typeof display_name !== "string" || !display_name.trim()) {
    return errorResponse(400, "Missing required field: display_name");
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return errorResponse(400, "Missing required field: description");
  }

  // Validate deck name
  const nameError = validateDeckName(deck_name.trim());
  if (nameError) {
    return errorResponse(400, nameError);
  }

  // Validate language
  const LANGUAGE_WHITELIST = ["it", "en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ru", "ar"];
  const lang = typeof language === "string" ? language : "en";
  if (!LANGUAGE_WHITELIST.includes(lang)) {
    return errorResponse(400, `Invalid language: ${lang}. Must be one of: ${LANGUAGE_WHITELIST.join(", ")}`);
  }

  // Validate and truncate tags
  const rawTags = Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string") : [];
  const normalizedTags = rawTags
    .map((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
    .slice(0, 5);

  // Resolve author from user profile (server-enforced)
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  let author = profile?.display_name?.trim() || "";
  if (!author) {
    author = (profile?.email || "").split("@")[0];
  }

  // Serialize YAML
  const yamlContent = serializeYaml({
    display_name: display_name.trim(),
    description: description.trim(),
    author,
    language: lang,
    tags: normalizedTags,
  });

  // Build path and commit
  const yamlPath = `${userId}/${deck_name.trim()}/deck.yaml`;
  const existing = await getFile(yamlPath);
  const commitMessage = existing
    ? `[deck-builder] Update deck.yaml for ${deck_name.trim()}`
    : `[deck-builder] Create deck.yaml for ${deck_name.trim()}`;

  const result = await commitFile(yamlPath, yamlContent, commitMessage, existing?.sha);

  return new Response(
    JSON.stringify({ success: true, sha: result.sha, commit_sha: result.commit_sha }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Author editable by user (Phase 41 decision) | Author server-enforced from profile (Phase 42 override) | Phase 42 context | Prevents impersonation; author field in deck.yaml always set server-side by commit_yaml |
| Categories as separate field | Categories from tags (Phase 41 decision) | Phase 41 context | No category column in deck_index; DISC-04 chip bar will use most-used tags |

## Open Questions

1. **YAML values with colons or special characters**
   - What we know: The simple parser splits on first `:`, so `description: Learn: Italian vocab` would parse correctly (value = `Learn: Italian vocab`)
   - What's unclear: Edge cases with multi-line values, values starting with special YAML characters (`[`, `{`, `#`)
   - Recommendation: For this phase, the simple parser is sufficient. deck.yaml fields are short strings. If edge cases arise, address in a follow-up.

2. **Chunked deck.yaml files**
   - What we know: The webhook supports chunked delivery for large files
   - What's unclear: Whether deck.yaml files could ever be large enough to be chunked
   - Recommendation: deck.yaml is ~10-20 lines max. Chunking is extremely unlikely, but the existing chunk handling in handleCreate already processes content before routing, so no special handling needed.

3. **Race condition: commit_yaml then immediate search**
   - What we know: deck-commit writes to Git, Docora sends webhook, webhook upserts deck_index. This is not instant.
   - What's unclear: How long the pipeline delay is
   - Recommendation: This is by design (all deck_index mutations via webhook). The deck builder can show a "publishing..." state. Not a Phase 42 concern.

## Sources

### Primary (HIGH confidence)
- docora-webhook/index.ts -- full source read, all patterns verified
- deck-commit/index.ts -- full source read, all action patterns and helpers verified
- supabase/migrations/20260313000001_deck_index_table.sql -- table schema verified
- supabase/migrations/20241230000002_rls_policies.sql -- users RLS policies verified
- supabase/migrations/20260227000001_email_auth_trigger.sql -- handle_new_user fallback logic verified
- supabase/migrations/20260313000004_search_decks_rpc.sql -- search_decks RPC verified

### Secondary (MEDIUM confidence)
- Phase 41 CONTEXT.md -- tag normalization to slug format, no category field decision
- Phase 42 CONTEXT.md -- all locked decisions and discretion areas

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all existing code patterns verified from source
- Architecture: HIGH - file routing pattern, upsert pattern, action routing pattern all verified from existing code
- Pitfalls: HIGH - derived from verified code patterns and locked decisions

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- all patterns are from existing project code)
