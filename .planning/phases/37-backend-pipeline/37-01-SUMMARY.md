---
phase: 37-backend-pipeline
plan: 01
subsystem: api
tags: [supabase, edge-function, github-api, deno, path-isolation, base64]

# Dependency graph
requires:
  - phase: 36-scaffold-auth
    provides: Deck builder app shell with Supabase auth
provides:
  - deck-commit edge function with 5 actions (commit_file, delete_file, get_file, list_files, list_decks)
  - User path isolation (UUID prefix enforcement)
  - UTF-8 safe base64 encoding for GitHub Contents API
  - CI/CD deployment for deck-commit function
affects: [38-deck-management, 39-card-authoring]

# Tech tracking
tech-stack:
  added: [GitHub Contents API via fetch()]
  patterns: [path-isolation via UUID prefix, action-based edge function routing, directory vs file path validation]

key-files:
  created:
    - supabase/functions/deck-commit/index.ts
    - apps/deck-builder/src/lib/__tests__/deck-commit-path.test.ts
  modified:
    - .github/workflows/ci-deploy.yml

key-decisions:
  - "Path traversal check runs BEFORE user prefix check to prevent bypass via ../other-user"
  - "Separate validateUserDirectoryPath for list_files (no .md requirement) vs validateUserPath for file ops"
  - "list_decks always scoped to userId -- no path parameter needed, no path validation needed"
  - "GitHub API env vars accessed via lazy getters (functions not constants) for Deno cold start compatibility"
  - "deck-commit deployed with --no-verify-jwt (auth handled internally via supabase.auth.getUser)"

patterns-established:
  - "Path isolation pattern: validateUserPath(userId, filePath) enforces UUID prefix, blocks traversal, requires .md"
  - "GitHub Contents API proxy: githubFetch() wraps fetch with auth headers and repo coordinates"
  - "Error status mapping: Unauthorized->401, Access denied->403, GitHub errors->proxied status"

requirements-completed: [PIPE-01, PIPE-02]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 37 Plan 01: Deck Commit Edge Function Summary

**GitHub commit proxy edge function with 5 actions, UUID-based path isolation, and UTF-8 safe base64 encoding for the deck builder pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T11:37:40Z
- **Completed:** 2026-03-12T11:40:34Z
- **Tasks:** 1 (TDD: test + feat)
- **Files modified:** 3

## Accomplishments
- Created deck-commit edge function with all 5 actions: commit_file, delete_file, get_file, list_files, list_decks
- Path isolation enforced on every action: file paths must start with authenticated user's UUID
- Path traversal blocked (.. rejection), only .md files allowed for file operations
- UTF-8 safe base64 encoding handles Italian accented text and multibyte characters
- 9 unit tests covering path validation and content encoding
- Added deck-commit to CI/CD deploy pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Path validation and encoding tests** - `511e103` (test)
2. **Task 1 (GREEN): Edge function implementation + CI/CD** - `4924ffd` (feat)

_TDD task: test commit followed by implementation commit._

## Files Created/Modified
- `supabase/functions/deck-commit/index.ts` - GitHub commit proxy edge function (303 lines) with 5 actions, path isolation, CORS, auth
- `apps/deck-builder/src/lib/__tests__/deck-commit-path.test.ts` - Unit tests for validateUserPath and encodeContent pure functions (82 lines)
- `.github/workflows/ci-deploy.yml` - Added deck-commit to deploy-functions step

## Decisions Made
- Path traversal check (`..` detection) runs BEFORE user prefix check to prevent bypass via `../other-user` paths
- Created separate `validateUserDirectoryPath` for list_files action (does not require .md extension) vs `validateUserPath` for file operations
- `list_decks` action always scopes to the authenticated user's directory automatically -- no path parameter needed from client
- GitHub API environment variables accessed via lazy getter functions (not top-level constants) for Deno cold start compatibility
- Edge function deployed with `--no-verify-jwt` matching existing functions (auth handled internally via `supabase.auth.getUser()`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added deck-commit to CI/CD deploy workflow**
- **Found during:** Task 1 (implementation)
- **Issue:** GENERIC_AGENT.md rule requires new edge functions to be added to `.github/workflows/ci-deploy.yml`
- **Fix:** Added `supabase functions deploy deck-commit --no-verify-jwt` line to Deploy Edge Functions step
- **Files modified:** `.github/workflows/ci-deploy.yml`
- **Verification:** Grep confirms the line is present
- **Committed in:** `4924ffd` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical -- CI/CD rule compliance)
**Impact on plan:** Essential for deployment. No scope creep.

## Issues Encountered
None

## User Setup Required

The plan's `user_setup` section documents GitHub PAT configuration needed before the edge function can call the GitHub API:
- Create shared GitHub repository (e.g., `lumio-decks`)
- Generate GitHub PAT with Contents read/write scope
- Add `GITHUB_PAT`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` to `supabase/.env.local`
- Add the same secrets to the Supabase Dashboard for production

## Next Phase Readiness
- Edge function ready for deck management UI (Phase 38) to call via Supabase client
- All 5 actions follow consistent JSON request/response patterns
- Blocker: Shared repo must be registered with Docora before the downstream pipeline (question generation) works -- this is covered by PIPE-03 in plan 37-02

## Self-Check: PASSED

- FOUND: supabase/functions/deck-commit/index.ts
- FOUND: apps/deck-builder/src/lib/__tests__/deck-commit-path.test.ts
- FOUND: .github/workflows/ci-deploy.yml
- FOUND: commit 511e103
- FOUND: commit 4924ffd

---
*Phase: 37-backend-pipeline*
*Completed: 2026-03-12*
