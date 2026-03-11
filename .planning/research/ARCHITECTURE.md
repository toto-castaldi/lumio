# Architecture Patterns

**Domain:** Deck builder web app integrating with existing Lumio flashcard platform
**Researched:** 2026-03-11

## Recommended Architecture

### High-Level System Diagram

```
                         deck.lumio.toto-castaldi.com
                        +---------------------------+
                        |   React SPA (Vite)        |
                        |   apps/deck-builder       |
                        |                           |
                        |  Auth: Supabase JS Client |
                        |  (localStorage, PKCE)     |
                        +------+--------+-----------+
                               |        |
                    Supabase   |        | Edge Function
                    Auth/DB    |        | (deck-commit)
                               v        v
           +-----------+  +-----------+-----------+
           | Supabase  |  | Edge Functions        |
           | Auth      |  | - deck-commit (NEW)   |
           | (shared   |  | - git-sync (existing) |
           |  project) |  | - docora-webhook      |
           +-----------+  +------+----------------+
                                 |
                    GitHub API   | createCommitOnBranch
                    (GraphQL)    | mutation
                                 v
                          +-----------+
                          | Shared    |
                          | GitHub    |
                          | Repo      |
                          | lumio-    |
                          | decks     |
                          +-----------+
                                 |
                    Docora       | webhook
                    monitors     | (file changes)
                                 v
                          +-----------+
                          | Docora    |
                          +-----------+
                                 |
                    Webhook      | create/update/delete
                    back         |
                                 v
                          +-----------+
                          | docora-   |
                          | webhook   |
                          | (existing)|
                          +-----------+
                                 |
                                 v
                          +-----------+
                          | Supabase  |
                          | DB        |
                          | (cards,   |
                          |  repos)   |
                          +-----------+
                                 |
                    Study        |
                                 v
                          +-----------+
                          | Android   |
                          | App       |
                          +-----------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| `apps/deck-builder` | React SPA for deck/card CRUD, markdown editing | Supabase Auth, `deck-commit` edge function, Supabase DB (reads) | NEW |
| `deck-commit` edge function | Commits markdown files to shared GitHub repo via GitHub API | GitHub GraphQL API, Supabase DB (metadata tracking) | NEW |
| DB migration (`user_decks`) | Track user decks and their GitHub file state | Used by `deck-commit` and web app | NEW |
| Supabase Auth | Shared auth (Google OAuth + email/password) across mobile and web | Both apps, edge functions | EXISTING - needs redirect URL config |
| `git-sync` edge function | User-facing CRUD for repositories, Docora registration | Supabase DB, Docora API | EXISTING - unchanged |
| `docora-webhook` edge function | Receives file change webhooks from Docora, upserts cards | Supabase DB (cards, repositories) | EXISTING - needs path-based routing enhancement |
| Docora | Monitors GitHub repos, sends webhooks on file changes | GitHub, `docora-webhook` edge function | EXISTING - monitors shared repo |
| Shared GitHub repo (`lumio-decks`) | Single repo where all user-created decks live as markdown | GitHub API (writes from edge function), Docora (reads) | NEW - needs creation |
| Android app | Study interface, dashboard, card browsing | Supabase Auth/DB, `git-sync` edge function | EXISTING - sees deck-builder cards via existing flow |

### Data Flow: Create a Deck

**Confidence: HIGH** (based on existing codebase patterns)

```
1. User clicks "New Deck" in web app
2. Web app calls `deck-commit` edge function:
   POST /functions/v1/deck-commit
   { action: "create_deck", deckName: "javascript-basics", displayName: "JavaScript Basics" }

3. Edge function:
   a. Validates user auth (JWT -> user_id)
   b. Generates deck path: /{user_id}/javascript-basics/
   c. Creates README.md with Lumio frontmatter:
      ---
      lumio_format_version: 1
      description: "JavaScript Basics"
      ---
   d. Commits to shared repo via GitHub GraphQL API
      (createCommitOnBranch mutation)
   e. Creates/updates user_decks record in DB
   f. Auto-registers shared repo in Docora (if first deck ever)
   g. Creates Lumio repository record for this deck (if first time)
   h. Creates user_repositories link
   i. Returns deck info to web app

4. Docora detects commit -> sends webhook to docora-webhook
5. docora-webhook processes README.md -> updates repository record
6. Deck appears in user's mobile app library
```

### Data Flow: Create/Edit a Card

```
1. User writes card in markdown editor
2. User clicks "Save"
3. Web app calls `deck-commit` edge function:
   POST /functions/v1/deck-commit
   {
     action: "save_card",
     deckName: "javascript-basics",
     cardSlug: "closures",
     content: "---\ntitle: Closures\ntags:\n  - javascript\n..."
   }

4. Edge function:
   a. Validates user auth
   b. Resolves file path: /{user_id}/javascript-basics/closures.md
   c. Gets current branch HEAD OID from GitHub API
   d. Commits file via createCommitOnBranch mutation
   e. Returns success

5. Docora detects commit -> webhook -> card upserted in DB
6. Card is immediately available for study in mobile app
```

### Data Flow: Delete a Card

```
1. User deletes card in web app
2. Web app calls `deck-commit` edge function:
   POST /functions/v1/deck-commit
   { action: "delete_card", deckName: "javascript-basics", cardSlug: "closures" }

3. Edge function:
   a. Validates user auth and path ownership
   b. Commits file deletion via createCommitOnBranch (fileDeletions)

4. Docora detects deletion -> webhook -> card deleted from DB
```

## New Components Detail

### 1. `deck-commit` Edge Function (Supabase/Deno)

**Purpose:** Server-side proxy between the web app and GitHub API. The edge function holds the GitHub PAT (repo-scoped) as an environment variable. Users never see or need this token.

**Why an edge function instead of direct GitHub API calls from the browser:**
- GitHub PAT must stay server-side (security)
- Path validation and user isolation (prevents path traversal)
- Consistent commit author metadata
- Rate limit management (single token, controlled)

**Actions:**

| Action | Input | GitHub API Operation |
|--------|-------|---------------------|
| `create_deck` | deckName, displayName | Create `/{user_id}/{deck_name}/README.md` |
| `save_card` | deckName, cardSlug, content | Create/update `/{user_id}/{deck_name}/{slug}.md` |
| `delete_card` | deckName, cardSlug | Delete `/{user_id}/{deck_name}/{slug}.md` |
| `delete_deck` | deckName | Delete all files in `/{user_id}/{deck_name}/` |
| `list_deck_files` | deckName | List files in `/{user_id}/{deck_name}/` via GitHub Contents API |
| `get_file` | deckName, cardSlug | Get content of specific file via GitHub Contents API |

**GitHub API choice: GraphQL `createCommitOnBranch` mutation for writes, REST Contents API for reads**

Use the GraphQL mutation for writes because:
- Supports multiple file changes in a single atomic commit (deck deletion = multiple files)
- Supports file deletions alongside additions
- Single API call instead of the blob -> tree -> commit -> ref sequence
- Commits are automatically signed by GitHub

Use REST Contents API for reads because:
- Simpler for single file/directory listing
- `GET /repos/{owner}/{repo}/contents/{path}` returns file content or directory listing
- No need for GraphQL complexity for read operations

**Confidence: MEDIUM** for GraphQL mutation (documented since 2021, widely used, but exact Deno fetch ergonomics untested), **HIGH** for REST Contents API

**Key environment variables for `deck-commit`:**
- `LUMIO_GITHUB_PAT` - Personal Access Token with `repo` scope for the shared repo
- `LUMIO_GITHUB_REPO_OWNER` - Owner of the shared repo (e.g., `toto-castaldi`)
- `LUMIO_GITHUB_REPO_NAME` - Name of the shared repo (e.g., `lumio-decks`)

### 2. Shared GitHub Repository (`lumio-decks`)

**Structure:**
```
lumio-decks/
  README.md                           # Repo-level README (documentation)
  {user_id_1}/
    javascript-basics/
      README.md                       # Deck metadata (frontmatter)
      closures.md                     # Card
      promises.md                     # Card
      async-await.md                  # Card
    python-data-structures/
      README.md
      lists.md
      dictionaries.md
  {user_id_2}/
    ...
```

**Critical design decisions:**

1. **User ID (UUID) as top-level directory** -- not username, because user_id is immutable. Usernames could change and would break paths.

2. **One repository for all users** -- not per-user repos, because:
   - Simplifies Docora monitoring (one registration, one webhook endpoint).
   - Simplifies PAT management (one token, one repo).
   - The v3.1 "Deck Discovery" milestone needs all decks discoverable from one source.

3. **Each `{user_id}/{deck_name}/` directory = one Lumio "repository" record in the DB.** This is the key mapping: Docora sees the whole repo as one entity, but the `docora-webhook` uses the file path prefix to route cards to the correct Lumio repository record.

### 3. Solving the One-Repo-Many-Decks Problem

**The core tension:** Docora monitors one GitHub repo. Lumio needs many "repositories" (one per deck per user) so that each deck shows up separately in the mobile app with its own cards.

**Recommended approach: Path-based routing in `docora-webhook`**

When `docora-webhook` receives a file change from the shared deck repo, it:
1. Checks if this repository is the shared deck repo (via a flag on the repository record)
2. Parses the file path to extract `{user_id}` and `{deck_name}`
3. Finds or auto-creates the corresponding Lumio child repository record
4. Creates `user_repositories` link if not already present
5. Stores the card under the child repository (using relative path as `file_path`)

**Implementation sketch:**

```typescript
// In docora-webhook, after finding the repo by docora_repository_id:
if (repo.is_shared_deck_repo) {
  const pathParts = filePath.split('/');
  if (pathParts.length < 3) {
    // File at root or user-level, not inside a deck directory
    return { success: true, message: "Ignored: file not inside a deck directory" };
  }

  const [userId, deckName, ...rest] = pathParts;
  const relativeFilePath = rest.join('/'); // "closures.md" or "README.md"

  // Find or create the deck-specific child repository record
  let deckRepo = await findDeckRepository(serviceClient, userId, deckName);
  if (!deckRepo) {
    deckRepo = await createDeckRepository(
      serviceClient,
      userId,
      deckName,
      repo.id  // parent repo reference
    );
  }

  // Process file under deckRepo with relativeFilePath
  // This reuses all existing card processing logic
}
```

**New DB columns on `repositories` table:**
- `is_shared_deck_repo BOOLEAN DEFAULT FALSE` -- only the parent shared repo record has this flag
- `parent_repository_id UUID REFERENCES repositories(id)` -- child deck repos point to parent
- `deck_owner_id UUID REFERENCES auth.users(id)` -- which user owns this deck (extracted from path)
- `deck_name TEXT` -- the deck directory name

**These columns are nullable** because they only apply to the shared deck repo ecosystem. Normal user-added GitHub repos have all of these as NULL.

**Alternative considered and rejected: Multiple Docora registrations (one per deck)**
- Docora monitors entire repos, not subdirectories
- Would send duplicate webhooks for every file in the repo
- Would waste Docora API quota

**Alternative considered and rejected: Single "virtual" repository for all deck-builder content**
- Would put all users' cards into one repository record
- Cards from different decks would be mixed together
- Cannot show individual decks in the mobile app's repository list

### 4. `user_decks` Database Table

**Purpose:** Web app local state for listing decks and tracking creation metadata. The source of truth for card content is GitHub, but this table enables fast listing without hitting GitHub API.

```sql
CREATE TABLE public.user_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_name TEXT NOT NULL,              -- URL-safe slug (e.g., "javascript-basics")
    display_name TEXT NOT NULL,           -- Human-readable name
    description TEXT DEFAULT '',
    repository_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, deck_name)
);

ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decks"
    ON public.user_decks FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own decks"
    ON public.user_decks FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all decks"
    ON public.user_decks FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');
```

**Why `repository_id` is nullable:** The deck record is created when the user creates the deck in the web app (via `deck-commit`). The corresponding Lumio repository child record is created either by `deck-commit` itself (proactively) or when Docora delivers the first webhook (reactively). With the proactive approach, the `repository_id` is set immediately, but the nullable design is safer.

### 5. Auth Configuration for Web

**Confidence: HIGH** (existing `@lumio/core` client is well understood)

The `createSupabaseClient` in `@lumio/core` sets `detectSessionInUrl: false` -- correct for mobile but WRONG for web OAuth PKCE flow. The web app needs the Supabase client to automatically detect the auth code in the callback URL.

**Recommended: Web app creates its own Supabase client directly.**

The web app should import types from `@lumio/shared` but NOT use `@lumio/core`. Reasons:
- `@lumio/core`'s auth module has mobile-specific code paths (native Google Sign-In guard in signOut, etc.)
- `@lumio/core` has React Native dependencies (`supermemo`, mobile markdown plugins)
- The web Supabase client needs `detectSessionInUrl: true` and no custom storage adapter (browser localStorage is the default and correct choice)
- Simpler dependency tree for the web app

```typescript
// apps/deck-builder/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,  // Required for PKCE OAuth callback
      flowType: 'pkce',
    },
  }
);
```

**Supabase config changes needed:**
- Add `https://deck.lumio.toto-castaldi.com/auth/callback` to `additional_redirect_urls` in `config.toml`
- Add same URL to Supabase dashboard redirect allow list in production
- Add same URL to Google OAuth console authorized redirect URIs

**Auth callback handling in the web app:**

```typescript
// apps/deck-builder/src/pages/AuthCallback.tsx
// This page is at /auth/callback
// Supabase client with detectSessionInUrl:true auto-processes the code
// Just redirect to home after session is established
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/');
      }
    });
  }, [navigate]);

  return <div>Signing in...</div>;
}
```

## Patterns to Follow

### Pattern 1: Edge Function Action Router

**What:** Single edge function with `action` parameter routing to handler functions. Already used by `git-sync`.
**When:** All `deck-commit` operations.

```typescript
// deck-commit/index.ts (follows git-sync pattern exactly)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.json();
  const { action } = body;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Missing authorization header", 401);
  }

  const supabase = createUserSupabaseClient(authHeader);
  const userId = await getUserId(supabase);

  switch (action) {
    case "create_deck": return handleCreateDeck(supabase, userId, body);
    case "save_card":   return handleSaveCard(supabase, userId, body);
    case "delete_card": return handleDeleteCard(supabase, userId, body);
    case "delete_deck": return handleDeleteDeck(supabase, userId, body);
    case "list_deck_files": return handleListFiles(userId, body);
    case "get_file":    return handleGetFile(userId, body);
    default: return errorResponse(`Unknown action: ${action}`, 400);
  }
});
```

### Pattern 2: Optimistic UI with Eventual Consistency

**What:** The web app shows changes immediately after the edge function confirms the GitHub commit succeeded. The actual card record in the Supabase DB is created asynchronously when Docora delivers the webhook (typically seconds later).
**When:** After every save/delete operation.
**Why:** This mirrors the existing flow. When a user adds a GitHub repo in the mobile app, cards arrive via Docora webhook -- not instantly. The deck builder follows the same pipeline.

**Implication for the web app:** After saving a card, the web app should NOT query the `cards` table to verify it appeared. Instead, it should use local state (markdown content in memory, deck list from `user_decks` table) and trust that Docora will eventually deliver the card to the DB. For listing card files within a deck, the web app uses the `list_deck_files` action which reads directly from GitHub (source of truth for the editor).

### Pattern 3: Path Isolation for Security

**What:** The `deck-commit` edge function MUST validate that all file operations are scoped to `/{authenticated_user_id}/`. A user must never write to or delete files outside their own directory.
**When:** Every GitHub API call in `deck-commit`.

```typescript
function validateAndBuildPath(userId: string, deckName: string, cardSlug?: string): string {
  // Sanitize deck name: lowercase alphanumeric, hyphens, underscores only
  if (!/^[a-z0-9][a-z0-9_-]{0,50}$/.test(deckName)) {
    throw new Error("Invalid deck name: use lowercase letters, numbers, hyphens, underscores");
  }
  // Sanitize card slug
  if (cardSlug && !/^[a-z0-9][a-z0-9_-]{0,50}$/.test(cardSlug)) {
    throw new Error("Invalid card name: use lowercase letters, numbers, hyphens, underscores");
  }

  const path = cardSlug
    ? `${userId}/${deckName}/${cardSlug}.md`
    : `${userId}/${deckName}/README.md`;

  // Defense in depth: reject path traversal
  if (path.includes('..') || path.includes('//')) {
    throw new Error("Invalid path");
  }

  return path;
}
```

### Pattern 4: Reuse @lumio/shared for Types Only

**What:** The web app imports types from `@lumio/shared` for type safety on shared data structures (Repository, Card, UserStats, etc.).
**When:** All data structures shared between web and mobile.
**Why:** Maintains single source of truth for types. The web app does NOT use `@lumio/core` (which bundles React Native dependencies and mobile-specific auth/markdown code).

### Pattern 5: GitHub GraphQL for Atomic Multi-File Commits

**What:** Use the `createCommitOnBranch` GraphQL mutation for all write operations to the shared repo.
**When:** Creating decks (README.md), saving cards, deleting cards, deleting entire decks.

```typescript
// Simplified example of the GraphQL mutation
const COMMIT_MUTATION = `
  mutation CreateCommit($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit {
        oid
        url
      }
    }
  }
`;

async function commitFiles(
  additions: Array<{ path: string; contents: string }>,
  deletions: Array<{ path: string }>,
  message: string,
): Promise<string> {
  // 1. Get current HEAD OID
  const headOid = await getHeadOid();

  // 2. Base64 encode file contents (required by GitHub GraphQL)
  const encodedAdditions = additions.map(f => ({
    path: f.path,
    contents: btoa(unescape(encodeURIComponent(f.contents))),
  }));

  // 3. Execute mutation
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: COMMIT_MUTATION,
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${REPO_OWNER}/${REPO_NAME}`,
            branchName: 'main',
          },
          expectedHeadOid: headOid,
          message: { headline: message },
          fileChanges: {
            additions: encodedAdditions,
            deletions: deletions,
          },
        },
      },
    }),
  });

  const result = await response.json();

  // 4. Handle HEAD OID conflict (concurrent commits)
  if (result.errors?.some(e => e.message.includes('expected OID'))) {
    // Retry once with fresh HEAD
    return commitFiles(additions, deletions, message);
  }

  return result.data.createCommitOnBranch.commit.oid;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct GitHub API from Browser

**What:** Calling GitHub API directly from the React SPA.
**Why bad:** Exposes PAT in browser, no server-side path validation, CORS issues with GitHub API, no user isolation enforcement.
**Instead:** All GitHub operations go through the `deck-commit` edge function with a server-held PAT.

### Anti-Pattern 2: Polling for Card Creation After Save

**What:** After saving a card, polling Supabase DB until the card record appears.
**Why bad:** Adds latency, wastes API calls, creates complexity. Docora webhook delivery time is variable (seconds to minutes).
**Instead:** Optimistic UI -- show saved content immediately from local state. For listing files, read from GitHub (via edge function). The DB record appears when Docora delivers the webhook and is used for study/mobile app, not for editing state.

### Anti-Pattern 3: Importing @lumio/core in the Web App

**What:** Making `apps/deck-builder` depend on `@lumio/core`.
**Why bad:** `@lumio/core` bundles `supermemo`, `remark-*`, `rehype-*`, and mobile-specific Supabase client configuration (`detectSessionInUrl: false`, SecureStore storage adapter). The auth functions assume native Google Sign-In availability. None of this applies to the web app.
**Instead:** Import only `@lumio/shared` for types. Create a thin Supabase client in `apps/deck-builder/src/lib/supabase.ts` with web-appropriate settings.

### Anti-Pattern 4: Storing Card Content in Supabase as Source of Truth for the Editor

**What:** Writing markdown content to a Supabase table, then syncing to GitHub.
**Why bad:** Creates two sources of truth. The existing pipeline is unidirectional: GitHub -> Docora -> Supabase. Adding a reverse flow (Supabase -> GitHub) breaks this clean architecture and requires conflict resolution.
**Instead:** GitHub is the sole source of truth for content. Write to GitHub (via edge function), read from GitHub (for editing). Supabase DB only has cards because Docora puts them there.

### Anti-Pattern 5: Per-User GitHub Repos

**What:** Creating a separate GitHub repository for each user's decks.
**Why bad:** Explodes Docora registrations (each repo needs separate monitoring). Complicates PAT management. Makes deck discovery (v3.1) much harder.
**Instead:** Single shared repo with user_id subdirectories. One Docora registration. One PAT.

### Anti-Pattern 6: Reusing @lumio/core's signInWithGoogle for Web

**What:** Calling the existing `signInWithGoogle()` from `@lumio/core` in the web app.
**Why bad:** On mobile, this function uses the native Google Sign-In SDK to get an ID token. On web, it should use Supabase's `signInWithOAuth({ provider: 'google' })` which redirects to Google's consent screen and returns via PKCE callback. Completely different flow.
**Instead:** Implement web-specific auth functions in `apps/deck-builder/src/lib/auth.ts`.

## Modified Existing Components

### docora-webhook (Enhancement Required)

The existing `docora-webhook` needs path-based routing for the shared deck repo. The change is additive -- all existing behavior is preserved for normal repos.

**New logic (inserted after existing `findRepositoryByDocoraId`):**

```
1. Webhook arrives with repository.repository_id
2. Look up Lumio repository by docora_repository_id (existing code)
3. IF repo.is_shared_deck_repo:
   a. Parse file path to extract user_id and deck_name
   b. Validate user_id is a valid UUID
   c. Find or auto-create child repository record for this user+deck
   d. Create user_repositories link if not present
   e. Rewrite file_path to relative path (remove user_id/deck_name prefix)
   f. Process the file under the child repository (reuses all existing handlers)
4. ELSE: process normally (existing behavior, no changes)
```

**RPC function needed:**
```sql
CREATE OR REPLACE FUNCTION find_or_create_deck_repository(
    p_user_id UUID,
    p_deck_name TEXT,
    p_parent_repo_id UUID
) RETURNS UUID  -- returns repository_id
LANGUAGE plpgsql
SECURITY DEFINER
```

### Supabase Auth Config (config.toml)

Add web app redirect URLs:
```toml
additional_redirect_urls = [
  # ... existing entries ...
  "https://deck.lumio.toto-castaldi.com/auth/callback",
]
```

The `http://localhost:5173/auth/callback` entry already exists and covers local development.

### CI/CD Pipeline (ci-deploy.yml)

**Two additions:**

1. New job `deploy-deck-builder` (parallel with `deploy-landing`):
```yaml
deploy-deck-builder:
  runs-on: ubuntu-latest
  needs: [lint-and-typecheck]
  if: # same condition as deploy-landing
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
    - run: pnpm install --frozen-lockfile
    - run: pnpm build:packages
    - name: Build deck-builder
      working-directory: apps/deck-builder
      run: pnpm build
      env:
        VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    - name: Deploy to DigitalOcean
      uses: appleboy/scp-action@v0.1.7
      with:
        source: 'apps/deck-builder/dist/*'
        target: '/var/www/deck-lumio'
        strip_components: 3
    - name: Reload Nginx
      uses: appleboy/ssh-action@v1.0.3
      with:
        script: sudo systemctl reload nginx
```

2. Add `deck-commit` to the `deploy-functions` job:
```yaml
supabase functions deploy deck-commit --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

### Nginx Configuration (DigitalOcean server)

New server block for `deck.lumio.toto-castaldi.com`:
```nginx
server {
    listen 443 ssl;
    server_name deck.lumio.toto-castaldi.com;

    root /var/www/deck-lumio;
    index index.html;

    # SPA fallback: all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    ssl_certificate /etc/letsencrypt/live/deck.lumio.toto-castaldi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deck.lumio.toto-castaldi.com/privkey.pem;
}
```

## Build Order (Dependency-Driven)

The build order is dictated by component dependencies.

### Phase 1: Backend Foundation (no UI)

1. **Create shared GitHub repo** (`lumio-decks`) with initial README.md
2. **Register shared repo with Docora** for monitoring
3. **DB migration** -- `user_decks` table, repository columns (`is_shared_deck_repo`, `parent_repository_id`, `deck_owner_id`, `deck_name`)
4. **`deck-commit` edge function** -- core commit logic (create_deck, save_card, delete_card, list_deck_files, get_file)
5. **`docora-webhook` enhancement** -- path-based routing for shared repo, find_or_create_deck_repository RPC

**Rationale:** The complete backend pipeline (edge function commits -> Docora webhook -> card in DB -> visible in mobile app) must be validated end-to-end before building UI. Can test by calling the edge function directly via curl.

### Phase 2: Web App Shell + Auth

6. **Vite + React project scaffold** in `apps/deck-builder` with pnpm workspace integration
7. **Supabase auth** (Google OAuth + email/password with PKCE callback)
8. **Basic routing** (react-router-dom: login, auth callback, dashboard)
9. **Auth-protected layout** (redirect unauthenticated users to login)

**Rationale:** Auth must work before any authenticated features. The shell provides the frame for all subsequent UI work.

### Phase 3: Deck Management

10. **Deck list view** (fetch from `user_decks` table via Supabase client)
11. **Create deck flow** (name input -> slug generation -> edge function call)
12. **Delete deck flow** (confirmation -> edge function call)

**Rationale:** Deck CRUD is simpler than card CRUD and validates the edge function integration.

### Phase 4: Card Editor

13. **Card list within a deck** (fetch via `list_deck_files` edge function action or from Supabase `cards` table)
14. **Markdown editor** (create/edit card with live preview)
15. **Save card flow** (editor -> edge function -> GitHub commit)
16. **Delete card flow**

**Rationale:** This is the core feature. Depends on deck management (Phase 3) for navigation context.

### Phase 5: Deploy and Polish

17. **CI/CD pipeline** for deck-builder deploy
18. **Nginx configuration** for deck.lumio.toto-castaldi.com
19. **DNS record** for deck.lumio.toto-castaldi.com
20. **Production environment variables** (GitHub PAT as Supabase Edge Function secret, Supabase config)
21. **Error handling**, loading states, empty states, edge cases

## Scalability Considerations

| Concern | At 1 user (MVP) | At 100 users | At 10K users |
|---------|-----------------|--------------|-------------|
| GitHub API rate limit | 5,000 req/hr plenty | Comfortable | May need GitHub App token (15,000/hr) |
| Shared repo file count | Trivial | ~5K-10K files fine for Git | Consider repo sharding |
| Docora webhook volume | Low | Moderate (batched commits help) | May need Docora scaling |
| `deck-commit` concurrency | No issue | Rare HEAD OID conflicts | Need retry logic (one retry with fresh HEAD) |
| `user_decks` table size | Trivial | Trivial | Standard Postgres, indexed |
| Web app bundle size | ~200KB gzipped | Same (static assets) | Same |

**HEAD OID conflict handling:** When two users commit to the shared repo nearly simultaneously, the second commit will fail because `expectedHeadOid` no longer matches. The `deck-commit` edge function should retry once: re-fetch HEAD OID, re-attempt commit. This is the standard Git concurrent-write pattern. At MVP scale with a single developer, this is extremely unlikely but should be handled for correctness.

## Sources

- Existing codebase analysis: `supabase/functions/git-sync/index.ts`, `supabase/functions/docora-webhook/index.ts`, `packages/core/src/supabase/client.ts`, `packages/core/src/supabase/auth.ts`, `supabase/migrations/20260115000001_shared_repositories.sql` -- HIGH confidence
- [GitHub GraphQL createCommitOnBranch mutation announcement](https://github.blog/changelog/2021-09-13-a-simpler-api-for-authoring-commits/) -- MEDIUM confidence (stable since 2021, but exact Deno usage untested)
- [GitHub REST API Contents endpoint](https://developer.github.com/v3/repos/contents/) -- HIGH confidence (well-documented, stable)
- [GitHub GraphQL mutations reference](https://docs.github.com/en/graphql/reference/mutations) -- MEDIUM confidence (full input schema not extracted)
- [createCommitOnBranch community discussion](https://github.com/orgs/community/discussions/24599) -- MEDIUM confidence (community examples)
- [Multi-file commit via GitHub API](https://dev.to/bro3886/create-a-folder-and-push-multiple-files-under-a-single-commit-through-github-api-23kc) -- MEDIUM confidence
- [Supabase PKCE flow documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- HIGH confidence
- [Supabase React quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) -- HIGH confidence
- [Supabase Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google) -- HIGH confidence
- [Vite static deploy guide](https://vite.dev/guide/static-deploy) -- HIGH confidence
- Existing DB migration `20260115000001_shared_repositories.sql` -- pattern reference for shared repository architecture
- Existing `supabase/config.toml` -- redirect URLs, auth settings
