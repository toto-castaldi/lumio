# Phase 37: Backend Pipeline - Research

**Researched:** 2026-03-12
**Domain:** Supabase Edge Functions + GitHub REST API + Docora integration
**Confidence:** HIGH

## Summary

Phase 37 requires building a new Supabase edge function that commits markdown card files to a shared Lumio GitHub repository via the GitHub REST API, with strict user-path isolation (`/{user_id}/`). The function acts as a proxy: the deck-builder web app sends card content to the edge function, which authenticates the user, validates the path, and commits to GitHub. Docora (the existing sync service) then picks up changes and triggers the existing `docora-webhook` edge function, which processes cards and queues AI question generation via `question-generator`.

The project already has a mature edge function pattern (6 existing functions: `git-sync`, `docora-webhook`, `llm-proxy`, `question-generator`, `study-planner`, `version`). The new function follows established patterns: Deno runtime, `serve()` from `deno.land/std@0.177.0`, CORS headers, action-based routing, Supabase client with user auth context, and JSON request/response. The GitHub API integration is the only genuinely new element.

**Primary recommendation:** Create a single new edge function `deck-commit` that handles create, update, and delete operations against the GitHub Contents API, enforcing `/{user_id}/` path prefix on every request. Register the shared Lumio repo with Docora using the existing `git-sync` `add_repository` action pattern. The card frontmatter format MUST match what `docora-webhook` `parseFrontmatter()` expects (verified in this research).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Edge function commits card files to shared Lumio Git repo via GitHub API | GitHub Contents API (PUT for create/update, DELETE for delete), new `deck-commit` edge function following existing patterns |
| PIPE-02 | Edge function enforces user path isolation (user can only write to `/{user_id}/`) | Path prefix validation in edge function, reject any path not starting with authenticated user's UUID |
| PIPE-03 | Docora syncs shared repo and generates AI questions (existing pipeline) | Register shared repo with Docora via existing `git-sync` `add_repository` action; existing `docora-webhook` + `question-generator` handle the rest |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `deno.land/std@0.177.0/http/server.ts` | 0.177.0 | Edge function HTTP server | Established Lumio pattern across all 6 existing edge functions |
| `esm.sh/@supabase/supabase-js@2` | 2.x | Supabase client (user auth + service role) | Established Lumio pattern for both user context and service role clients |
| GitHub REST API (Contents) | 2022-11-28 | Create/update/delete files in shared repo | Official, well-documented, no SDK needed -- raw `fetch()` is sufficient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Deno `btoa()` | built-in | Base64-encode file content for GitHub API | Every commit operation (GitHub requires base64-encoded content) |
| Deno `crypto.subtle` | built-in | SHA-256 hashing for content dedup | Optional: detect unchanged content before committing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch()` to GitHub | `octokit` npm package | Adds dependency for simple PUT/DELETE calls; raw fetch is simpler and matches existing patterns |
| Contents API (single-file) | Git Trees API (multi-file) | Trees API allows atomic multi-file commits but is more complex; single-file is sufficient for card operations |

**Installation:** No new npm/pnpm packages needed. Edge functions use URL imports.

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
├── deck-commit/
│   └── index.ts           # New: GitHub commit proxy with path isolation
├── git-sync/
│   └── index.ts           # Existing: repository management + Docora registration
├── docora-webhook/
│   └── index.ts           # Existing: processes file changes from Docora
├── question-generator/
│   └── index.ts           # Existing: AI question generation
├── llm-proxy/
│   └── index.ts           # Existing: LLM API proxy
├── study-planner/
│   └── index.ts           # Existing: placeholder
└── version/
    └── index.ts           # Existing: version endpoint
```

### Pattern 1: Edge Function with User Auth Context
**What:** Create Supabase client using the user's JWT from the Authorization header to identify the caller.
**When to use:** Every `deck-commit` request -- we need the user_id for path isolation.
**Example:**
```typescript
// Source: Existing git-sync/index.ts pattern
function createUserSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}
```

### Pattern 2: GitHub Contents API -- Create or Update File
**What:** PUT request to GitHub REST API to create/update a file in the shared repo.
**When to use:** When saving a new or modified card from the deck builder.
**Example:**
```typescript
// Source: GitHub REST API docs (https://docs.github.com/en/rest/repos/contents)
async function commitFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string  // Required for updates, omit for creates
): Promise<{ sha: string; commit_sha: string }> {
  const token = Deno.env.get("GITHUB_PAT")!;
  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
  };
  if (sha) body.sha = sha;  // Include SHA for updates

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error (${response.status}): ${error.message}`);
  }

  const data = await response.json();
  return {
    sha: data.content.sha,       // New blob SHA (for subsequent updates)
    commit_sha: data.commit.sha,  // Commit SHA
  };
}
```

### Pattern 3: Path Isolation Enforcement (PIPE-02)
**What:** Validate that every file path starts with the authenticated user's UUID.
**When to use:** Before every GitHub API call -- this is the security boundary.
**Example:**
```typescript
// Path format: {user_id}/{deck_name}/{card_file}.md
function validateUserPath(userId: string, filePath: string): void {
  // Normalize: strip leading slash
  const normalized = filePath.startsWith("/") ? filePath.slice(1) : filePath;

  // MUST start with user's UUID directory
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error("Access denied: cannot write outside your directory");
  }

  // Prevent path traversal
  if (normalized.includes("..")) {
    throw new Error("Access denied: path traversal not allowed");
  }

  // Must be a .md file or README.md
  if (!normalized.endsWith(".md")) {
    throw new Error("Only .md files are supported");
  }
}
```

### Pattern 4: Action-Based Routing
**What:** Single edge function endpoint with `action` field in JSON body.
**When to use:** Standard Lumio pattern for multi-operation edge functions.
**Example:**
```typescript
// Source: Existing git-sync/index.ts pattern
const body = await req.json();
const { action } = body;

switch (action) {
  case "commit_file":   // Create or update a card file
  case "delete_file":   // Delete a card file
  case "get_file":      // Get file content + SHA (for updates)
  case "list_files":    // List files in user's directory
}
```

### Pattern 5: Get File SHA Before Update
**What:** GET request to GitHub Contents API to retrieve the current SHA of a file (required for updates).
**When to use:** Before every update operation -- GitHub requires the current blob SHA to prevent conflicts.
**Example:**
```typescript
async function getFileSha(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const token = Deno.env.get("GITHUB_PAT")!;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (response.status === 404) return null;  // File doesn't exist yet
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

  const data = await response.json();
  return data.sha;
}
```

### Anti-Patterns to Avoid
- **Client-side GitHub calls:** NEVER expose the GitHub PAT to the browser. All GitHub API calls MUST go through the edge function.
- **Trusting client-supplied paths without validation:** Always validate against `auth.uid()`, never trust the path from the request body alone.
- **Parallel GitHub API calls to the same repo:** GitHub Contents API explicitly warns that parallel PUT and DELETE on the same repo will conflict. Use serial operations only.
- **Storing GitHub PAT in the database:** Keep it as a Supabase Edge Function secret (`GITHUB_PAT`), accessible via `Deno.env.get()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File commit to GitHub | Custom Git client or git CLI | GitHub REST API Contents endpoint | REST API is purpose-built for single-file operations, no binary dependencies |
| Base64 encoding | Custom encoder | `btoa()` with UTF-8 handling | Built-in, but MUST handle UTF-8 characters properly (see Pitfalls) |
| Docora sync/registration | Custom webhook sender | Existing `git-sync` `add_repository` action | Docora registration is already implemented and battle-tested |
| Card frontmatter parsing | New parser | Reuse `parseFrontmatter()` pattern from `docora-webhook` | Must match exactly what the webhook expects for consistency |
| User authentication | Custom JWT verification | `supabase.auth.getUser()` via user-context client | Standard Supabase pattern, already used in `git-sync` |

**Key insight:** The entire downstream pipeline (Docora sync -> webhook -> card parsing -> question generation) already works. Phase 37 only needs to get files INTO the GitHub repo correctly. Don't reinvent any downstream logic.

## Common Pitfalls

### Pitfall 1: UTF-8 Content in Base64 Encoding
**What goes wrong:** `btoa()` in Deno/JS only handles Latin-1 characters. Italian text with accents or special characters will throw errors.
**Why it happens:** `btoa()` operates on binary strings (Latin-1), not UTF-8.
**How to avoid:** Use the two-step encoding pattern: `btoa(unescape(encodeURIComponent(content)))` or the TextEncoder approach: `btoa(String.fromCharCode(...new TextEncoder().encode(content)))`.
**Warning signs:** `InvalidCharacterError` when committing cards with non-ASCII characters.

### Pitfall 2: Missing SHA on File Update
**What goes wrong:** GitHub API returns 409 Conflict when updating a file without providing the current blob SHA, or 422 when providing a stale SHA.
**Why it happens:** GitHub requires the SHA to ensure you're updating the latest version of a file (optimistic concurrency).
**How to avoid:** Always GET the file first to retrieve its current SHA before making an update PUT request. For new files, omit the SHA parameter entirely.
**Warning signs:** HTTP 409 or 422 responses from GitHub API.

### Pitfall 3: Card Frontmatter Must Match docora-webhook Parser
**What goes wrong:** Docora syncs the file and sends it to `docora-webhook`, but the frontmatter isn't parsed correctly, resulting in missing titles, empty tags, or default difficulty.
**Why it happens:** The `parseFrontmatter()` in `docora-webhook` uses a simple YAML parser (not a full YAML library). It expects specific formatting.
**How to avoid:** Generate frontmatter that matches the exact format in CARD-FORMAT-SPEC.md:
```yaml
---
title: "Card Title"
tags:
  - tag1
  - tag2
difficulty: 2
language: it
---
```
Key rules: (1) Tags MUST be YAML array format (one per line with `- ` prefix), not inline `[tag1, tag2]`. (2) Difficulty is an integer 1-5. (3) Quoted string values are stripped of quotes by the parser.
**Warning signs:** Cards appearing in the mobile app with filename as title or empty tags.

### Pitfall 4: Shared Repo Structure `/{user_id}/` vs Docora Expectations
**What goes wrong:** Docora is registered to sync an entire repo. If the repo structure doesn't have a root `README.md` with valid deck frontmatter, Docora may fail or cards may not be processed correctly.
**Why it happens:** The CARD-FORMAT-SPEC requires a root `README.md` with `lumio_format_version` and `description`. In a shared repo with `/{user_id}/` directories, each user's subdirectory is effectively a "deck" but there's no root README requirement from Docora's perspective -- Docora sends ALL markdown files.
**How to avoid:** Each user's deck directory (`/{user_id}/{deck_name}/`) should contain a `README.md` with proper deck frontmatter. The root repo `README.md` can be a general description. Docora will process ALL .md files; the `docora-webhook` handles README.md files specially (updates repository description/format_version) regardless of path depth.
**Warning signs:** Repository stuck in "pending" sync status, or deck metadata not appearing.

### Pitfall 5: GitHub API Rate Limits
**What goes wrong:** Edge function gets 403 responses from GitHub API after many rapid commits.
**Why it happens:** GitHub REST API has rate limits: 5,000 requests/hour for authenticated requests. Each file operation (get SHA + PUT) counts as 2 requests.
**How to avoid:** This is unlikely to be hit for a personal use app, but: (1) batch deck creation into fewer commits if possible (future optimization), (2) include informative commit messages to aid debugging.
**Warning signs:** HTTP 403 with `X-RateLimit-Remaining: 0` header.

### Pitfall 6: Docora Registration for Shared Repo
**What goes wrong:** The shared repo is not registered with Docora, so commits are never synced and no questions are generated.
**Why it happens:** Unlike user-added repos (handled by `git-sync` `add_repository`), the shared deck-builder repo needs to be registered with Docora once, likely during initial setup or via a migration/seed step.
**How to avoid:** Register the shared repo with Docora using the existing `docoraAddRepository()` pattern from `git-sync`. This could be: (1) a manual one-time operation via the edge function, (2) a setup action in the edge function, or (3) documented as a manual step. The repo also needs an entry in the `repositories` table.
**Warning signs:** Cards committed to GitHub but never appearing in the mobile app.

## Code Examples

### Complete Edge Function Skeleton
```typescript
// Source: Derived from existing git-sync/index.ts and docora-webhook/index.ts patterns
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GitHub API configuration from env
const GITHUB_PAT = () => Deno.env.get("GITHUB_PAT")!;
const GITHUB_OWNER = () => Deno.env.get("GITHUB_REPO_OWNER")!;
const GITHUB_REPO = () => Deno.env.get("GITHUB_REPO_NAME")!;

function createUserSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function getUserId(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

function validateUserPath(userId: string, filePath: string): string {
  const normalized = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error("Access denied: cannot write outside your directory");
  }
  if (normalized.includes("..")) {
    throw new Error("Access denied: path traversal not allowed");
  }
  return normalized;
}

// UTF-8 safe base64 encoding
function encodeContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // ... action routing
});
```

### GitHub Contents API: Create File
```typescript
// Source: https://docs.github.com/en/rest/repos/contents
const response = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: `[deck-builder] Create ${path}`,
      content: encodeContent(markdownContent),
      // No SHA for new files
    }),
  }
);
```

### GitHub Contents API: Update File (requires SHA)
```typescript
// Source: https://docs.github.com/en/rest/repos/contents
// Step 1: Get current SHA
const getResp = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" } }
);
const { sha } = await getResp.json();

// Step 2: Update with SHA
const putResp = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    method: "PUT",
    headers: { /* same as above */ },
    body: JSON.stringify({
      message: `[deck-builder] Update ${path}`,
      content: encodeContent(updatedMarkdownContent),
      sha, // REQUIRED for updates
    }),
  }
);
```

### GitHub Contents API: Delete File (requires SHA)
```typescript
// Source: https://docs.github.com/en/rest/repos/contents
const response = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: `[deck-builder] Delete ${path}`,
      sha: currentSha, // REQUIRED
    }),
  }
);
```

### Listing User's Files (for deck/card browsing)
```typescript
// Source: https://docs.github.com/en/rest/repos/contents
// GET /repos/{owner}/{repo}/contents/{path} returns directory listing when path is a directory
const response = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${userId}`,
  {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
    },
  }
);
// Returns array of { name, path, sha, type: "file"|"dir", ... }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| User adds external repo URL | Deck builder commits directly to shared repo | v3.0 (Phase 37) | New workflow: user creates content via web, system commits to Git |
| One repo per user/source | Shared repo with `/{user_id}/` isolation | v3.0 architecture | Single Docora registration, path-based isolation |
| Docora monitors user's repos | Docora monitors ONE shared repo | v3.0 architecture | Simpler setup, same webhook pipeline |

**Key architecture insight:** The shared repo model means:
1. ONE GitHub repository registered with Docora (not one per user)
2. ONE entry in the `repositories` table (shared across users via `user_repositories` junction table)
3. Path-based isolation: `/{user_id}/{deck_name}/card.md`
4. The `docora-webhook` will process ALL files in the repo regardless of user directory
5. All users who subscribe to the shared repo see ALL cards (filtering by user_id directory happens in the web UI, not in the backend pipeline)

## Environment Configuration

### New Environment Variables Needed
| Variable | Scope | Purpose | Example |
|----------|-------|---------|---------|
| `GITHUB_PAT` | Edge Function secret | Personal Access Token with `repo` scope for the shared Lumio deck repo | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO_OWNER` | Edge Function secret | GitHub account/org owning the shared repo | `toto-castaldi` or org name |
| `GITHUB_REPO_NAME` | Edge Function secret | Name of the shared GitHub repository | `lumio-decks` or similar |

### Setup Steps
1. Create the shared GitHub repository (e.g., `lumio-decks`)
2. Generate a GitHub PAT with `repo` scope (or fine-grained token with Contents read/write)
3. Add `GITHUB_PAT`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` to `supabase/.env.local` and Supabase Dashboard secrets
4. Register the shared repo with Docora (via existing `git-sync` `add_repository`)
5. Create entry in `repositories` table and link all deck-builder users via `user_repositories`
6. Add `deck-commit` to CI/CD deploy-functions step in `.github/workflows/ci-deploy.yml`

## CI/CD Integration

The new edge function MUST be added to the deploy-functions job in `.github/workflows/ci-deploy.yml`:
```yaml
# Add this line alongside existing function deployments:
supabase functions deploy deck-commit --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

Note: `--no-verify-jwt` is used because the edge function handles auth verification internally via `supabase.auth.getUser()`, consistent with existing functions.

## Open Questions

1. **Shared repo name and location**
   - What we know: The architecture calls for a single shared GitHub repo at `/{user_id}/` structure
   - What's unclear: The exact repo name, whether it's under user `toto-castaldi` or a GitHub org, and whether it already exists
   - Recommendation: Create `lumio-decks` under the same GitHub account. Document as a setup prerequisite. Can be resolved at plan time.

2. **Deck builder users auto-subscription to shared repo**
   - What we know: Users need a `user_repositories` link to the shared repo to see their cards in the mobile app
   - What's unclear: Whether this link should be created at signup, at first deck creation, or manually
   - Recommendation: Auto-create the `user_repositories` link when a user makes their first commit via the deck builder. The edge function can check and create it.

3. **Root README.md for shared repo**
   - What we know: The repo needs a root `README.md` for Docora to recognize it as a valid Lumio deck repo
   - What's unclear: Whether to create it at repo setup or dynamically
   - Recommendation: Create it during initial repo setup (manual or migration). Content: basic `lumio_format_version: 1` frontmatter and description.

4. **User's deck README.md**
   - What we know: Each `/{user_id}/{deck_name}/` may or may not need its own README.md
   - What's unclear: Whether Docora treats subdirectory README.md files specially or only root
   - Recommendation: Based on `docora-webhook` code analysis, README.md at ANY path triggers `extractDeckMetadata()` and updates the repository record. Since there's only one shared repo, subdirectory READMEs would just overwrite the same repository description. Deck metadata should NOT rely on subdirectory READMEs. Instead, treat each deck as just a directory of card .md files.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (jsdom environment) |
| Config file | `apps/deck-builder/vitest.config.ts` |
| Quick run command | `cd apps/deck-builder && pnpm test` |
| Full suite command | `pnpm --filter @lumio/deck-builder test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Edge function commits files via GitHub API | integration (manual) | Manual: call edge function locally | -- Wave 0 |
| PIPE-02 | Path isolation rejects writes outside `/{user_id}/` | unit | `cd apps/deck-builder && pnpm test` | -- Wave 0 |
| PIPE-03 | Docora syncs and generates questions end-to-end | e2e (manual) | Manual: commit -> wait -> check mobile app | manual-only |

### Sampling Rate
- **Per task commit:** `cd apps/deck-builder && pnpm test`
- **Per wave merge:** `pnpm --filter @lumio/deck-builder test && pnpm typecheck`
- **Phase gate:** Full suite green + manual end-to-end verification

### Wave 0 Gaps
- [ ] `supabase/functions/deck-commit/index.ts` -- the new edge function (main deliverable)
- [ ] Path validation unit tests -- can be tested in deck-builder or as standalone Deno tests
- [ ] Environment variables documentation -- GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME

Note: The edge function itself runs in Deno, not in the Vitest/jsdom environment. Unit testing path validation logic can be extracted into a pure function and tested. The full edge function requires manual integration testing against a real GitHub repo or mock.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/functions/git-sync/index.ts` -- established edge function patterns, Docora API client, user auth
- Existing codebase: `supabase/functions/docora-webhook/index.ts` -- `parseFrontmatter()` implementation, card processing pipeline
- Existing codebase: `docs/CARD-FORMAT-SPEC.md` -- card frontmatter format specification
- Existing codebase: `supabase/migrations/20260115000001_shared_repositories.sql` -- shared repo architecture, user_repositories table
- Existing codebase: `packages/shared/src/types/index.ts` -- Repository, Card, CardFrontmatter types
- [GitHub REST API - Repository Contents](https://docs.github.com/en/rest/repos/contents) -- PUT/DELETE endpoints for file operations

### Secondary (MEDIUM confidence)
- [GitHub API file creation tutorial](https://www.zufallsheld.de/2023/12/11/til-how-to-create-github-files-via-api/) -- practical examples of PUT with SHA
- [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) -- Deno runtime constraints, env var access

### Tertiary (LOW confidence)
- None. All critical findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all patterns directly observed in 6 existing edge functions
- Architecture: HIGH - shared repo model documented in PROJECT.md, migration SQL analyzed
- GitHub API: HIGH - well-documented REST API with simple PUT/DELETE semantics
- Docora integration: MEDIUM - existing `add_repository` pattern is clear, but shared repo registration is a one-time setup step that hasn't been done before
- Pitfalls: HIGH - identified from code analysis (parseFrontmatter, base64 encoding, SHA requirements)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable -- GitHub API and Supabase patterns don't change frequently)
