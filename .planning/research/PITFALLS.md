# Pitfalls Research

**Domain:** Adding a React SPA deck builder web app with GitHub API commits, shared repo with Docora integration, cross-origin auth, and per-user data isolation to existing Lumio flashcard platform
**Researched:** 2026-03-11
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: GitHub Contents API 409 Conflict When Two Users Edit Simultaneously

**What goes wrong:**
The GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`) requires providing the current file's SHA blob hash when updating an existing file. If User A and User B both read a file at SHA `abc123`, then User A commits and the file SHA changes to `def456`, User B's commit fails with a `409 Conflict` because their SHA is stale. In a shared repo architecture where all users write to `/{user_id}/{deck_name}/`, this does not directly cause cross-user conflicts (different file paths). HOWEVER, the `409` still occurs when:

1. The same user makes two rapid saves (e.g., double-click "Save" or auto-save + manual save) -- the second request has a stale SHA from before the first commit completed.
2. The edge function creates multiple files in a single deck operation (README.md + card1.md + card2.md) using sequential commits -- each commit changes the tree SHA, and if any parallel request reads the old SHA, it fails.
3. Docora processes the webhook for commit N and triggers question generation while commit N+1 is being created by the edge function -- not a direct API conflict, but can cause Docora to process partially-committed deck state.

Real-world evidence: [GitHub Community Discussion #62198](https://github.com/orgs/community/discussions/62198) documents `409 Conflict` errors appearing after 5-10 sequential commits via the Contents API, caused by GitHub's eventual consistency in SHA propagation.

**Why it happens:**
The Contents API uses optimistic concurrency control. Each file has a SHA that must match the server state. Unlike the lower-level Git Database API (which allows creating blobs, trees, and commits atomically), the Contents API performs one file per commit. Developers assume sequential API calls are safe, but GitHub's backend has propagation delays where the new SHA is not immediately visible after a successful PUT response.

**How to avoid:**
- Use the Git Database API (blobs + trees + commits) instead of the Contents API for multi-file operations. This creates a single atomic commit for all files in a deck, avoiding the sequential-SHA problem entirely.
- For single-file updates (editing one card), always fetch the current SHA immediately before the PUT, never cache it.
- Add retry logic with exponential backoff specifically for `409` responses: re-fetch SHA, then retry the commit.
- Implement client-side debouncing on the "Save" button (disable for 2 seconds after click) to prevent double-submit.
- In the edge function, use a mutex pattern (database advisory lock keyed on user_id) to serialize commits per user.

**Warning signs:**
- Intermittent save failures that succeed on retry
- Users reporting "save failed" after rapid edits
- Console logs showing `409 Conflict` responses from GitHub API

**Phase to address:**
Edge function implementation phase (GitHub API commit logic). The choice between Contents API and Git Database API is an architectural decision that must be made before any commit code is written.

---

### Pitfall 2: GitHub API Rate Limits Silently Block Commits Under Load

**What goes wrong:**
GitHub enforces two types of rate limits that affect the deck builder:

1. **Primary rate limit:** 5,000 requests/hour for authenticated requests (PAT or GitHub App). Each file commit via Contents API costs at minimum 2 requests (GET current SHA + PUT new content). A user creating a 20-card deck burns 40+ requests. With 10 active users creating decks simultaneously, the shared PAT hits the limit in under 2 hours.

2. **Secondary rate limit:** No more than 80 content-creating requests per minute and 500 per hour. Content-creating means POST/PUT/PATCH. Creating a 20-card deck means 20+ content-creating requests in quick succession, which can trigger the per-minute secondary limit even when the primary limit is fine.

3. **Concurrent request limit:** No more than 100 concurrent requests. If the edge function uses `Promise.all()` to create multiple files in parallel, this is easily hit.

The failure mode is silent: GitHub returns `403 Forbidden` with a `Retry-After` header, but if the edge function does not handle this specific response, it surfaces as a generic "save failed" error to the user. The `X-RateLimit-Remaining` header drops to 0 but the edge function never checks it.

Source: [GitHub Rate Limits Documentation](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) -- 80 content-generating requests/minute confirmed.

**Why it happens:**
Developers build and test with a single user making occasional commits. Rate limits are invisible at low volume. The shared PAT token means ALL users share the same rate limit budget. A burst of activity from one user can lock out everyone.

**How to avoid:**
- Use a GitHub App instead of a PAT. GitHub Apps get rate limits per installation (5,000-15,000/hour depending on plan), and each installation token is scoped to the specific repo. This also avoids the PAT expiration problem.
- Use the Git Database API to batch all files in a deck into a single commit (1 create-tree + 1 create-commit + 1 update-ref = 3-5 API calls instead of 2N for N files).
- Implement rate limit tracking in the edge function: read `X-RateLimit-Remaining` from every response, and if below a threshold (e.g., 100), queue the operation instead of executing immediately.
- Add a `Retry-After` handler: when GitHub returns 403 with `Retry-After`, delay and retry automatically.
- Never use `Promise.all()` for GitHub API calls. Process files sequentially with at least 100ms delay between requests.
- Log rate limit headers in the edge function for monitoring.

**Warning signs:**
- Edge function logs showing `403` responses from GitHub
- Users reporting intermittent "save failed" errors during peak usage
- `X-RateLimit-Remaining` header dropping rapidly in logs

**Phase to address:**
Edge function implementation phase. Rate limit handling must be built into the GitHub API client from the start, not retrofitted.

---

### Pitfall 3: Docora Webhook Storm When Edge Function Creates Multi-File Commits

**What goes wrong:**
When the edge function commits a deck with 20 cards (20 .md files + 1 README.md), Docora detects 21 file changes and fires 21 webhook calls to the `docora-webhook` edge function. Each webhook call processes one file: parses frontmatter, inserts into `cards` table, triggers question generation. This creates:

1. **Burst load:** 21 near-simultaneous webhook invocations on the Supabase edge function infrastructure. Supabase edge functions have concurrency limits (varies by plan, typically 25-100 concurrent invocations).
2. **Race condition with .lumioignore:** If the commit includes a `.lumioignore` file, it might be processed AFTER some cards are already inserted. The existing `cleanupIgnoredCardQuestions` logic handles this, but the window between card insertion and .lumioignore processing means temporary inconsistency.
3. **Duplicate question generation:** If Docora retries (network timeout, slow response from edge function), the same card may be processed twice, creating duplicate questions in `card_questions`.
4. **Wasted AI generation:** All 20 cards trigger AI question generation. But if the user immediately edits and recommits, Docora fires 20 more webhooks and generates 20 more question sets. The first set was wasted.

The existing docora-webhook handler (reviewed in `supabase/functions/docora-webhook/index.ts`) handles idempotency for card inserts via the `UNIQUE(repository_id, file_path)` constraint and `23505` duplicate-key detection. But question generation is NOT idempotent -- duplicate webhook calls create duplicate questions.

**Why it happens:**
Docora is designed for per-file webhook delivery from existing Git repositories where commits happen occasionally (manual pushes). The deck builder creates programmatic commits with many files at once, which is a usage pattern Docora was not designed to optimize for.

**How to avoid:**
- Commit all files atomically in a single Git commit (the Git Database API enables this). Docora will still fire per-file webhooks, but the commit_sha will be the same for all files, enabling server-side deduplication.
- Add a processing delay/debounce in the docora-webhook handler: when receiving a file from a commit_sha, store it in a queue table and process the batch after a 5-second window of no new files from the same commit.
- Alternatively, accept the webhook storm but make question generation idempotent: check if questions already exist for a card before generating new ones.
- Consider whether Docora should even process the shared repo at all, or whether the edge function should directly insert cards into the database (bypassing the webhook round-trip).

**Warning signs:**
- Edge function timeout errors during multi-file commits
- Duplicate entries in `card_questions` table
- Supabase edge function concurrency limit warnings in logs
- AI API costs higher than expected (duplicate generation)

**Phase to address:**
Architecture/design phase. The Docora integration strategy must be decided before implementing the commit edge function. The key decision is: should the edge function commit to GitHub and let Docora sync back, or should it write to both GitHub AND the database directly?

---

### Pitfall 4: Cross-Origin Auth Between deck.lumio Subdomain and Supabase Fails

**What goes wrong:**
The deck builder SPA at `deck.lumio.toto-castaldi.com` uses the same Supabase project as the Android app. The Supabase JS client (`@supabase/supabase-js`) stores auth tokens in `localStorage` by default in browser SPAs. This creates several problems:

1. **Session not shared with mobile app:** The Android app uses SecureStore, the web app uses localStorage. These are completely separate storage mechanisms on separate domains. A user logged in on mobile must log in again on the web app. This is expected but must be communicated clearly in the UX.

2. **OAuth redirect URL mismatch:** The Supabase project's `site_url` is currently `http://localhost:5173` (local dev) and presumably the landing page URL in production. Google OAuth redirects go to the configured redirect URLs. If `deck.lumio.toto-castaldi.com/auth/callback` is not in the allowed redirect URLs list (both in Supabase Dashboard AND in Google Cloud Console's OAuth 2.0 Client), the OAuth flow fails silently or redirects to the wrong domain.

3. **PKCE code verifier lost on redirect:** The current Supabase client uses `flowType: 'pkce'`. PKCE stores a code verifier in the browser's sessionStorage during the OAuth redirect. If the user starts OAuth on `deck.lumio.toto-castaldi.com` but the callback redirects to a different origin (e.g., `lumio.toto-castaldi.com`), the code verifier is not present, and the session exchange fails with "both auth code and code verifier should be non-empty." This is documented in [supabase/auth-js#1026](https://github.com/supabase/auth-js/issues/1026).

4. **CORS on Supabase edge functions:** The existing edge functions set `Access-Control-Allow-Origin: *` (wildcard CORS). This works but is overly permissive. For a production web app, this should be restricted to the specific origins. More critically: if the CORS header is changed to specific origins but `deck.lumio.toto-castaldi.com` is forgotten, the web app cannot call any edge functions.

**Why it happens:**
The Supabase project was configured for a mobile app. Web-specific auth concerns (cookie domain, redirect URLs, PKCE in browser, CORS) were not relevant until now. Adding a web client to an existing mobile-only project requires auth configuration changes that are easy to overlook.

**How to avoid:**
- Add `https://deck.lumio.toto-castaldi.com/auth/callback` to Supabase's `additional_redirect_urls` in both config.toml (local) and Supabase Dashboard (production).
- Add `https://deck.lumio.toto-castaldi.com` as an authorized redirect URI in Google Cloud Console's OAuth 2.0 Client configuration.
- For the web app's Supabase client, use `flowType: 'pkce'` and ensure `detectSessionInUrl: true` (the opposite of the mobile config where it is `false`). The web app needs a separate client initialization from the mobile app.
- Do NOT reuse the `@lumio/core` `createSupabaseClient()` singleton directly -- the web app needs different `auth` options (e.g., `detectSessionInUrl: true`, no custom storage adapter, potentially `localStorage` or `cookieStorage`).
- Test the full OAuth flow on the deployed subdomain, not just localhost.

**Warning signs:**
- "Redirect URI mismatch" error during Google OAuth on the web app
- "both auth code and code verifier should be non-empty" error in console
- Users can log in on localhost but not on the deployed subdomain
- Edge function calls fail with CORS errors from the web app

**Phase to address:**
Foundation phase. Auth configuration must be the first thing set up and tested for the web app. Building any UI before auth works is wasted effort.

---

### Pitfall 5: RLS Policies Do Not Cover Web App Deck Builder Write Operations

**What goes wrong:**
The current RLS policies are designed for a read-only client (the Android app reads cards from shared repositories). The deck builder introduces write operations from the browser client:

1. **Cards table has no INSERT/UPDATE RLS for regular users:** Current policies allow INSERT/UPDATE only for `service_role` or via the old repository-owner check (which was dropped in the shared repo migration). The web app's authenticated user cannot directly insert cards via the Supabase JS client.

2. **Repository ownership model changes:** The deck builder creates a "Lumio shared repo" where all users store their decks. The repo is registered in Docora once, and all users commit to `/{user_id}/{deck_name}/` paths. But the `repositories` table currently has a single row per repo URL. All users' cards are in the same repository. The `user_repositories` join table links users to the repo, but there is no column indicating which user "owns" which cards within the repo. The `cards.file_path` encodes the user_id (e.g., `{user_id}/my-deck/card1.md`), but there is NO RLS policy that enforces "user can only modify cards where file_path starts with their user_id."

3. **Service role bypass:** The existing docora-webhook uses service role to insert cards (bypasses RLS). If the web app also bypasses RLS by routing writes through an edge function with service role, the data isolation depends entirely on application logic in the edge function, not on database-level enforcement. This is a security design choice with different tradeoff profiles.

**Why it happens:**
The current system was designed for content flowing one way: GitHub repo -> Docora webhook -> database. Users never write to the database directly. The deck builder reverses this flow: user writes content -> edge function commits to GitHub -> Docora syncs back to database. The RLS policies were never designed for user-initiated writes to the cards table.

**How to avoid:**
- **Option A (Recommended): Edge function mediates all writes.** The web app never writes directly to `cards` or `repositories`. All mutations go through edge functions that validate user ownership before committing to GitHub. The edge function uses service role for DB writes. This keeps the existing RLS model intact.
- **Option B: Add write RLS policies.** Create policies like `CREATE POLICY "Users can manage own deck cards" ON cards FOR ALL USING (file_path LIKE auth.uid()::text || '/%')`. This is elegant but couples the RLS policy to the file path naming convention, which is fragile.
- Regardless of choice: add a `deck_owner_id` column to a new `decks` table (separate from `repositories`) that explicitly tracks deck ownership. Do not rely on parsing user_id from file paths.
- Create a new `decks` table: `id, repository_id, owner_id, name, description, created_at` with RLS policies: `USING (owner_id = auth.uid())`. Cards in decks link via repository_id + file_path prefix.

**Warning signs:**
- Users able to see or modify other users' deck cards
- RLS violation errors when the web app tries to write data
- Edge function service role bypassing all isolation checks

**Phase to address:**
Database schema and architecture phase. Must be designed before any CRUD operations are implemented. This affects the entire data model.

---

### Pitfall 6: Shared GitHub Repo Single Point of Failure -- PAT Expiration Locks Out All Users

**What goes wrong:**
The deck builder architecture uses a single shared GitHub repository for all user decks. This repo is accessed via a GitHub Personal Access Token (PAT) or GitHub App installation token stored as an environment variable in the edge function. If this token:

1. **Expires:** GitHub fine-grained PATs have mandatory expiration (max 1 year for organization repos, customizable for personal repos). Classic PATs can be set to never expire but are being deprecated. When the token expires, ALL users lose the ability to save decks.

2. **Gets revoked:** If the token owner's GitHub account is compromised and they rotate credentials, or if GitHub detects abuse (rate limit violations), the token is revoked.

3. **Lacks permissions:** The token needs `contents: write` scope on the specific repo. If the repo is transferred to a different owner or the token's fine-grained permissions are modified, writes fail.

4. **Docora also needs the token:** Docora monitors the shared repo using its own access (registered via the `docoraAddRepository` call with `github_token`). If the edge function's token and Docora's token are different, they can become out of sync.

**Why it happens:**
Per-user repos have per-user tokens (the existing model). A shared repo concentrates all access through a single credential, creating a single point of failure that did not exist before.

**How to avoid:**
- Use a GitHub App instead of a PAT. GitHub Apps have installation tokens that are auto-renewed (valid for 1 hour, refreshed via API). They do not expire or require manual rotation.
- If using a PAT: set a calendar reminder for rotation, implement a health check that validates the token weekly (call `GET /user` and check the response).
- Store the token in Supabase secrets (edge function env vars) and build a rotation procedure: update the secret, re-deploy edge functions.
- Implement a "canary" check: before committing, verify the token works by calling `GET /repos/{owner}/{repo}` and checking the response. If it fails, surface a "maintenance" message to users instead of a cryptic error.
- Monitor Docora sync_failed webhooks -- auth failures from Docora indicate the shared token may be compromised.

**Warning signs:**
- All users simultaneously unable to save decks
- `401 Unauthorized` responses from GitHub API in edge function logs
- Docora sending `sync_failed` webhooks with auth error type for the shared repo

**Phase to address:**
Infrastructure/foundation phase. Token management strategy must be decided before the edge function is built.

---

## Moderate Pitfalls

### Pitfall 7: Edge Function Timeout on Large Deck Commits

**What goes wrong:**
Supabase edge functions have a default timeout of 150 seconds (2.5 minutes). Creating a deck with 20+ cards via the GitHub API requires:
- 1 GET for current tree SHA
- 20+ blob creation requests (sequential, ~200ms each = 4 seconds)
- 1 tree creation request
- 1 commit creation request
- 1 ref update request

Total: ~25+ API calls taking 5-10 seconds optimistically. But if GitHub's API is slow (500ms per request) or if the edge function needs to generate README.md content and frontmatter for each card, the total can exceed 30 seconds. Add network latency between Supabase's edge function infrastructure and GitHub's API, and timeouts become realistic for large decks.

**How to avoid:**
- Limit deck size at the UI level (max 50 cards per deck).
- Use the Git Database API for atomic multi-file commits (fewer total requests).
- If the operation may be slow, use an async pattern: edge function starts the commit, returns a "processing" status immediately, and the client polls for completion.
- Consider batching: save individual card edits to a staging table, then commit the entire deck on explicit "Publish" action.

**Warning signs:**
- Edge function timeout errors for large decks
- Users reporting "save failed" only for decks with many cards
- Edge function logs showing long execution times

**Phase to address:**
Edge function implementation phase.

---

### Pitfall 8: Card Content Hash Changes Break SRS Schedule on Docora Re-sync

**What goes wrong:**
The existing SM-2 spaced repetition system resets a card's review schedule when `content_hash` changes (migration `20260226000001_card_review_schedule.sql`). When the deck builder commits a card edit, Docora detects the file change and fires an UPDATE webhook. The docora-webhook handler computes a new `content_hash` and updates the card. This triggers the SRS reset logic: the card's ease factor, interval, and next review date are all wiped.

The problem: even trivial edits (fixing a typo, adding a tag) reset the SRS schedule. A user who has studied a card 50 times and has a 30-day interval loses all progress because they fixed a comma.

**How to avoid:**
- Separate content hash from SRS-relevant content hash. Compute a "study content hash" that only includes the card body (not frontmatter metadata like tags, title). SRS reset triggers only on study content changes.
- Alternatively: make SRS reset opt-in. When content_hash changes, set a `content_changed` flag but do not reset the schedule. Let the user decide to reset via a UI action.
- At minimum: document this behavior prominently in the deck builder UI ("Editing card content will reset study progress for this card").

**Warning signs:**
- Users complaining that study progress is lost after minor edits
- SRS schedule table showing mass resets after a deck update

**Phase to address:**
Architecture phase (SRS interaction design). Must be decided before the deck builder writes to GitHub.

---

### Pitfall 9: Web App Supabase Client Initialization Differs From Mobile

**What goes wrong:**
The existing `@lumio/core` package creates the Supabase client with mobile-specific options:
- `detectSessionInUrl: false` -- mobile app handles URL manually
- `flowType: 'pkce'` -- required for mobile
- Custom `StorageAdapter` for SecureStore

The web app needs different options:
- `detectSessionInUrl: true` -- browser must detect OAuth callback tokens in the URL
- `flowType: 'pkce'` -- also correct for web (Supabase recommends PKCE for SPAs)
- Default `localStorage` storage (no custom adapter)

If the web app naively imports `createSupabaseClient` from `@lumio/core` and passes different options, the singleton pattern rejects them (first caller wins). If the web app is the first caller in a shared module context, it could set options that break the mobile app.

**How to avoid:**
- The web app should NOT import from `@lumio/core` for client initialization. Create a separate `createWebSupabaseClient()` function in the `apps/deck-builder` app that configures the Supabase client with web-specific options.
- The web app CAN import from `@lumio/shared` for types and constants (it has zero dependencies).
- If shared business logic is needed (e.g., frontmatter parsing, markdown processing), extract it into `@lumio/shared` or create a new `@lumio/common` package that does not depend on the Supabase client.

**Warning signs:**
- Auth flow not working on web despite same credentials working on mobile
- OAuth callback URL not being detected after redirect
- Session not persisting between page refreshes on web

**Phase to address:**
Foundation/scaffold phase. The web app's Supabase client setup must be independent of the mobile app's from the start.

---

### Pitfall 10: Markdown Editor Loses Unsaved Content on Navigation or Session Expiry

**What goes wrong:**
The user is editing a card's markdown content in the browser. They:
1. Accidentally navigate away (click browser back, close tab, click a link)
2. Their Supabase session expires (JWT has 1-hour expiry per config.toml `jwt_expiry = 3600`)
3. Their browser tab is killed by the OS (mobile browser background tab cleanup)

In all cases, unsaved content is lost. There is no auto-save, no "unsaved changes" warning, and no local persistence.

**How to avoid:**
- Implement `beforeunload` event handler to warn users about unsaved changes.
- Auto-save drafts to `localStorage` every 10-30 seconds. On page load, check for a draft and offer to restore it.
- For session expiry: intercept the 401 error from the edge function, show a re-login modal (not a full redirect), and retry the save after re-authentication.
- Consider a "save" vs "publish" model: edits are auto-saved locally, commits to GitHub happen only on explicit "Publish".

**Warning signs:**
- Users reporting lost work
- No `beforeunload` handler in the codebase
- No localStorage draft persistence

**Phase to address:**
Editor implementation phase. Auto-save should be built alongside the editor, not added later.

---

### Pitfall 11: Deck Builder Web App CORS Issues With Existing Edge Functions

**What goes wrong:**
The existing edge functions (`git-sync`, `docora-webhook`, etc.) set `Access-Control-Allow-Origin: *`. The new deck builder web app at `deck.lumio.toto-castaldi.com` needs to call new edge functions (e.g., `deck-commit`). If the new edge functions copy the wildcard CORS pattern, it works but is insecure. If they are configured with specific origins but miss the deck builder's domain, the browser blocks the requests.

More subtly: the web app sends `Authorization: Bearer <token>` headers, which makes the request "non-simple" and triggers a CORS preflight (`OPTIONS` request). The existing edge functions handle `OPTIONS` with `corsHeaders`, but if a new edge function forgets the `OPTIONS` handler, the browser blocks the actual request without any API call being made, and the error message is a confusing CORS error, not a meaningful API error.

**How to avoid:**
- Create a shared CORS helper module (`supabase/functions/_shared/cors.ts`) that all edge functions import. Do not copy-paste CORS headers into each function.
- Include `deck.lumio.toto-castaldi.com` in the allowed origins list.
- Always handle `OPTIONS` preflight in every edge function.
- Test from the actual deployed domain, not just `localhost`.

**Warning signs:**
- "Access to fetch at ... has been blocked by CORS policy" errors in browser console
- Edge function works from Postman/curl but not from the browser
- `OPTIONS` requests returning 4xx status codes

**Phase to address:**
Edge function implementation phase. CORS handling should be standardized before creating new functions.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using Contents API instead of Git Database API | Simpler code, fewer API calls for single files | Cannot do atomic multi-file commits, 409 conflicts on rapid saves | Never for multi-file deck operations; acceptable for single card edits |
| Wildcard CORS `*` on edge functions | Works immediately, no origin management | Security risk, no credential-bearing request support with `credentials: include` | MVP only; must be restricted before production |
| Storing deck metadata in file path convention (`/{user_id}/...`) | No DB schema changes needed | Fragile; renaming user_id format breaks everything; no index support | Never -- use a proper `decks` table |
| Bypassing Docora for deck builder (write directly to DB) | Eliminates webhook storm, faster saves, simpler architecture | Two code paths for card ingestion (Docora for external repos, direct for deck builder); divergence risk | Acceptable if the two paths are explicitly maintained and tested |
| Single shared PAT for GitHub API | Simple credential management | Single point of failure, manual rotation, shared rate limits | MVP only; switch to GitHub App before scaling |
| localStorage for web app auth tokens | Zero setup, default Supabase behavior | XSS vulnerable, not shared with mobile, lost on clear browser data | Acceptable for SPA -- this is Supabase's recommended approach for browser clients |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Contents API | Using stale SHA for file updates, causing 409 Conflict | Always fetch current SHA immediately before PUT; or use Git Database API for multi-file |
| GitHub Contents API | Using `Promise.all()` for parallel file creation | Sequential requests with 100ms delay; or single atomic commit via Git Database API |
| GitHub Rate Limits | Not reading `X-RateLimit-Remaining` header | Check remaining budget before operations; implement `Retry-After` handler for 403 responses |
| Docora webhook | Assuming webhooks arrive in commit order | Webhooks fire per-file in arbitrary order; .lumioignore may arrive after cards |
| Docora webhook | Not handling duplicate webhook deliveries | Idempotent handlers; `UNIQUE` constraints on card inserts; dedup on question generation |
| Supabase OAuth (web) | Forgetting to add subdomain redirect URL to Dashboard AND Google Console | Must be in BOTH Supabase `additional_redirect_urls` AND Google OAuth authorized redirect URIs |
| Supabase PKCE (web) | Setting `detectSessionInUrl: false` (copied from mobile config) | Web SPA must use `detectSessionInUrl: true` to capture OAuth callback tokens |
| Supabase edge functions | Forgetting `OPTIONS` preflight handler in new edge functions | Always include `OPTIONS` handler; extract into shared module |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| One commit per card save | Slow deck creation; 20-card deck takes 40+ API calls | Batch saves into single Git commit; "Save Draft" + "Publish" pattern | More than 10 cards per save operation |
| Loading all cards for markdown preview | Slow editor; large decks stall the browser | Lazy-load card list; only fetch full content for the card being edited | Decks with 50+ cards |
| Re-generating AI questions on every content_hash change | Wasted AI API calls; slow Docora processing | Content-significant hash (body only, not metadata); debounce question generation | Any deck with frequent edits |
| Wildcard Supabase realtime subscriptions | Excessive bandwidth; all card changes for all users broadcast | Filter subscriptions by repository_id or user_id | More than 10 concurrent users editing decks |
| Single shared GitHub repo grows very large | Git clone/tree operations slow down; GitHub API pagination kicks in for directories with 1000+ files | Per-user directory structure is fine initially; monitor repo size; consider sharding at extreme scale | Thousands of users (unlikely for MVP) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing GitHub PAT in client-side code or localStorage | Token exposed to XSS; anyone can commit to the shared repo | PAT lives only in edge function env vars; client never sees it |
| Not validating user_id in file path before committing | User A could commit to User B's directory by crafting a malicious deck name | Edge function extracts user_id from auth token and constructs file path server-side; never trust client-provided paths |
| Not filtering cards by ownership in deck list queries | User sees all cards in the shared repo, including other users' decks | RLS policy or edge function filters by `file_path LIKE user_id || '/%'`; or dedicated `decks` table with `owner_id` |
| Using Supabase anon key as GitHub API credential | Confusion between Supabase auth and GitHub auth; anon key has no GitHub access | Keep GitHub credentials strictly in edge function env; Supabase anon key is only for Supabase client |
| Allowing arbitrary markdown that enables XSS in preview | Script injection via markdown preview (e.g., `<script>` tags, `javascript:` URLs) | Sanitize HTML output from markdown renderer; use a library that strips dangerous elements by default (react-markdown does this) |
| Not validating deck/card names for path traversal | User creates deck named `../../other-user/` to write outside their directory | Sanitize deck names: allow only alphanumeric, hyphens, underscores; reject paths containing `..`, `/`, or special characters |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Side-by-side editor on mobile screens | Editor and preview squished to half-width; unusable on phones | Tab-based toggle (Edit/Preview) on small screens; side-by-side only on desktop |
| No confirmation before publishing deck | User accidentally publishes incomplete deck; cards appear in study immediately | Explicit "Publish" step separate from "Save Draft"; confirmation dialog |
| No progress indicator during GitHub commit | User clicks save, nothing happens for 3-5 seconds, clicks again (double commit) | Show loading spinner immediately; disable save button during commit; toast on success/failure |
| Requiring login before showing any content | User bounces before seeing what the deck builder does | Show landing/demo page for unauthenticated users; require login only for create/edit |
| No way to delete a deck once published | User stuck with unwanted decks in their study rotation | Implement deck deletion: edge function removes files from GitHub; Docora processes deletions via webhook |
| Markdown frontmatter exposed to non-technical users | Confusion about YAML syntax; broken cards from invalid frontmatter | Hide frontmatter behind a form UI (title input, tags selector, difficulty slider); generate frontmatter in the edge function |

## "Looks Done But Isn't" Checklist

- [ ] **OAuth login on deployed subdomain:** Test Google OAuth on `deck.lumio.toto-castaldi.com`, not just localhost -- redirect URL must be configured in both Supabase Dashboard and Google Console
- [ ] **Multi-file commit atomicity:** Verify that creating a 10-card deck results in ONE Git commit, not 10 separate commits
- [ ] **GitHub API rate limit handling:** Simulate hitting rate limit (or check `X-RateLimit-Remaining` after a burst) -- edge function should retry gracefully
- [ ] **User data isolation:** Log in as User A, create a deck; log in as User B -- User B should NOT see User A's decks
- [ ] **Concurrent save safety:** Open two browser tabs, edit the same card, save both -- second save should not corrupt data
- [ ] **SRS impact of card edits:** Edit a card that has study history -- verify SRS schedule is not silently reset (or is intentionally reset with user notification)
- [ ] **Docora processes deck builder commits:** After the edge function commits, verify Docora fires webhooks and cards appear in the mobile app's study rotation
- [ ] **Session expiry during editing:** Wait 1 hour while editing, then save -- should re-authenticate and save, not lose content
- [ ] **Path traversal blocked:** Try creating a deck with name `../other-user-id/stolen-deck` -- edge function should reject it
- [ ] **Edge function timeout on large decks:** Create a deck with 30 cards -- should not timeout

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| GitHub API 409 Conflict on save | LOW | Re-fetch current SHA, retry commit; user sees "save failed, retrying" |
| Rate limit exceeded | LOW | Wait for `Retry-After` period; queue pending operations; user sees temporary "service busy" |
| Docora webhook storm causes duplicate questions | MEDIUM | Deduplicate `card_questions` by card_id; add unique constraint on (card_id, question_hash) |
| PAT expired, all saves blocked | HIGH | Generate new PAT; update edge function env var; redeploy; 10-30 minute outage for all users |
| RLS allows cross-user data access | HIGH | Emergency migration to add ownership column/policy; audit all affected data; notify users |
| SRS progress lost from content hash change | MEDIUM | Restore from `card_review_schedule` backup; change hash to body-only hash; re-run affected schedules |
| CORS blocks web app from edge functions | LOW | Update CORS headers; redeploy edge functions; immediate fix, no data loss |
| User content lost due to missing auto-save | HIGH | Content is permanently lost; implement auto-save; apologize to affected users |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| GitHub API 409 Conflict (P1) | Edge function implementation | Test: rapid double-save returns success for both |
| Rate limit handling (P2) | Edge function implementation | Test: create 50-card deck; check X-RateLimit-Remaining in logs |
| Docora webhook storm (P3) | Architecture/design | Verify: multi-file commit results in correct card count in DB |
| Cross-origin auth (P4) | Foundation/scaffold | Test: full OAuth flow on deployed subdomain |
| RLS for write operations (P5) | Database schema | Test: User B cannot see/modify User A's decks via Supabase client |
| Shared PAT management (P6) | Infrastructure/foundation | Verify: canary health check endpoint exists; rotation procedure documented |
| Edge function timeout (P7) | Edge function implementation | Test: 30-card deck commits within 30 seconds |
| SRS hash reset (P8) | Architecture/design | Test: typo fix in card does not reset SRS schedule |
| Web Supabase client config (P9) | Foundation/scaffold | Test: OAuth + session persistence work on web without affecting mobile |
| Unsaved content loss (P10) | Editor implementation | Test: close tab during editing; reopen; draft is restored |
| CORS issues (P11) | Edge function implementation | Test: web app can call all edge functions from deployed domain |

## Sources

- Direct inspection: `supabase/functions/docora-webhook/index.ts` -- webhook handler, CORS headers, chunk handling, card insert with duplicate detection (PRIMARY)
- Direct inspection: `supabase/functions/git-sync/index.ts` -- Docora API client, repository CRUD, PAT handling (PRIMARY)
- Direct inspection: `supabase/migrations/20260115000001_shared_repositories.sql` -- RLS policies for shared repos, SECURITY DEFINER functions (PRIMARY)
- Direct inspection: `packages/core/src/supabase/client.ts` -- singleton pattern, mobile-specific auth options (PRIMARY)
- Direct inspection: `supabase/config.toml` -- site_url, redirect URLs, JWT expiry, auth configuration (PRIMARY)
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) -- 5,000/hour primary, 80/minute content-generating secondary -- HIGH confidence
- [GitHub REST API Best Practices](https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api) -- sequential requests, Retry-After, conditional requests -- HIGH confidence
- [Retool: Gotchas with Git and the GitHub API](https://retool.com/blog/gotchas-git-github-api) -- tree size limits, base_tree pattern, sequential vs parallel API calls -- HIGH confidence
- [GitHub Community Discussion #62198](https://github.com/orgs/community/discussions/62198) -- 409 Conflict after sequential commits via Contents API -- MEDIUM confidence
- [Supabase Discussion #5742](https://github.com/orgs/supabase/discussions/5742) -- cross-subdomain session sharing, cookie domain configuration -- HIGH confidence
- [Share Sessions Across Subdomains with Supabase](https://micheleong.com/blog/share-sessions-subdomains-supabase) -- cookieOptions domain configuration -- MEDIUM confidence
- [Supabase auth-js Issue #1026](https://github.com/supabase/auth-js/issues/1026) -- PKCE code verifier lost on cross-origin redirect -- HIGH confidence
- [Supabase PKCE Flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- PKCE recommended for SPAs -- HIGH confidence
- [Webhook Chaos: Delays, Duplicates, and How to Tame Them](https://medium.com/@techo.square.in/webhook-chaos-delays-duplicates-and-how-to-tame-them-a359d285cc89) -- deduplication, idempotency, rate limiting -- MEDIUM confidence
- [Hookdeck Deduplication Guide](https://hookdeck.com/docs/guides/deduplication-guide) -- event ID based deduplication, time windows -- MEDIUM confidence
- [GitHub API Contents API docs](https://docs.github.com/en/rest/repos/contents) -- SHA requirement for updates, 100MB file limit, 1000 file directory limit -- HIGH confidence
- [Markdown editor UX considerations](https://adamlynch.com/markdown/) -- dual mode complexity, preview UX patterns -- MEDIUM confidence

---
*Pitfalls research for: Lumio v3.0 -- Deck Builder Web App with GitHub API Commits*
*Researched: 2026-03-11*
