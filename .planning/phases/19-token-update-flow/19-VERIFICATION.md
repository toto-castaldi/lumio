---
phase: 19-token-update-flow
verified: 2026-02-18T17:35:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Tap a repo with syncStatus 'failed' and isAuthError true"
    expected: "Bottom-sheet opens showing auth error title, description, and PAT text input"
    why_human: "UI layout and visual appearance cannot be verified programmatically"
  - test: "Enter a PAT in the input and tap 'Update Token'"
    expected: "Spinner shows, success toast appears, modal closes, repo list refreshes with error cleared"
    why_human: "Requires real Docora API interaction and runtime network calls"
  - test: "Tap a repo with syncStatus 'failed' and isAuthError false"
    expected: "Bottom-sheet opens showing sync error title and description but NO PAT input field"
    why_human: "Conditional rendering logic correctness requires visual inspection at runtime"
---

# Phase 19: Token Update Flow Verification Report

**Phase Goal:** Users can fix auth-related sync failures by updating their PAT token from within the app
**Verified:** 2026-02-18T17:35:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can tap a failed repository to see error details in a bottom-sheet modal | VERIFIED | `ReposScreen.tsx` line 181: `if (item.syncStatus === 'failed') { setErrorRepo(item); }` — sets state that drives `RepoErrorModal visible={!!errorRepo}` |
| 2 | For auth-related errors, the modal shows a PAT text input and submit button | VERIFIED | `RepoErrorModal.tsx` lines 223-269: `{isAuthError ? (<View>...<TextInput>...<TouchableOpacity onPress={handleSubmit}>...</View>) : null}` |
| 3 | For non-auth errors, the modal shows error details but no PAT input | VERIFIED | Same conditional block — `isAuthError = repo?.isAuthError ?? false`; non-auth path renders icon + title + description without PAT section |
| 4 | Submitting a new PAT calls the backend which proxies the update to Docora | VERIFIED | `handleSubmit` (line 106) calls `updateRepositoryToken(repo.id, token.trim())` → `callGitSync('update_token', ...)` → `docoraUpdateToken(repo.docora_repository_id, accessToken)` with Docora PATCH |
| 5 | After successful token update, the repository error state clears immediately in the UI | VERIFIED | On success: `onTokenUpdated()` called → `setErrorRepo(null); fetchRepos()` in ReposScreen; backend clears `sync_status`, `sync_error_message`, `sync_error_type`, `is_auth_error`, `sync_failed_at` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/git-sync/index.ts` | update_token action handler with Docora PATCH proxy and DB error clearing | VERIFIED | Lines 708-788: full implementation — validates repositoryId+accessToken, verifies ownership via user_repositories, fetches docora_repository_id, calls docoraUpdateToken, updates 5 DB fields, returns 200 |
| `packages/core/src/supabase/repositories.ts` | updateRepositoryToken function calling git-sync update_token action | VERIFIED | Lines 139-141: `export async function updateRepositoryToken(repositoryId: string, accessToken: string): Promise<void> { await callGitSync('update_token', { repositoryId, accessToken }); }` |
| `packages/core/src/index.ts` | updateRepositoryToken exported from @lumio/core | VERIFIED | Line 32: `updateRepositoryToken` included in repository exports block |
| `apps/android/components/RepoErrorModal.tsx` | Bottom-sheet modal with error details and conditional PAT input | VERIFIED | 375 lines — full implementation with Modal, Animated bottom-sheet, PanResponder, drag handle, conditional auth/non-auth content, TextInput, submit button, Toast feedback |
| `apps/android/screens/ReposScreen.tsx` | Integration: tap failed repo opens modal, successful update refreshes list | VERIFIED | Lines 42, 181-185, 203-211: errorRepo state, conditional onPress routing, RepoErrorModal mounted with correct callbacks |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/android/components/RepoErrorModal.tsx` | `packages/core/src/supabase/repositories.ts` | `updateRepositoryToken` call on submit | VERIFIED | Line 31: `import { updateRepositoryToken } from '@lumio/core'`; line 111: `await updateRepositoryToken(repo.id, token.trim())` |
| `packages/core/src/supabase/repositories.ts` | `supabase/functions/git-sync/index.ts` | `callGitSync('update_token')` | VERIFIED | Line 140: `await callGitSync('update_token', { repositoryId, accessToken })`; git-sync handles `case "update_token":` at line 708 |
| `supabase/functions/git-sync/index.ts` | Docora API | `docoraUpdateToken` PATCH `/api/repositories/{id}/token` | VERIFIED | `docoraUpdateToken` (lines 182-200): PATCH call with `github_token` body; invoked at line 765 after ownership check |
| `apps/android/screens/ReposScreen.tsx` | `apps/android/components/RepoErrorModal.tsx` | `selectedRepo` state and modal `visible` prop | VERIFIED | Line 24: import; line 42: `errorRepo` state; lines 203-211: `<RepoErrorModal visible={!!errorRepo} onClose={...} repo={errorRepo} onTokenUpdated={...} />` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TOKEN-01 | 19-01-PLAN.md | New edge function proxies PAT update to Docora `PATCH /api/repositories/{repository_id}/token` | SATISFIED | `docoraUpdateToken` in git-sync/index.ts (lines 182-200) performs the PATCH; invoked from `update_token` case |
| TOKEN-02 | 19-01-PLAN.md | After successful token update, backend optimistically clears repo sync error status | SATISFIED | git-sync/index.ts lines 768-777: updates sync_status="synced", sync_error_message=null, sync_error_type=null, is_auth_error=false, sync_failed_at=null |
| TOKUI-01 | 19-01-PLAN.md | User can tap a failed repo to open a bottom-sheet modal with error details | SATISFIED | ReposScreen.tsx conditional onPress + RepoErrorModal component |
| TOKUI-02 | 19-01-PLAN.md | For auth-related errors, user can enter a new PAT in the modal and submit | SATISFIED | RepoErrorModal.tsx lines 223-269: TextInput and submit button rendered only when isAuthError is true |
| TOKUI-03 | 19-01-PLAN.md | After successful token update, the repo error state clears immediately in the UI | SATISFIED | `onTokenUpdated` callback: setErrorRepo(null) + fetchRepos() immediately after backend returns success |

All 5 requirement IDs from the plan frontmatter are accounted for. No orphaned requirements found in REQUIREMENTS.md for Phase 19.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `RepoErrorModal.tsx` | 239-240 | `placeholder` / `placeholderTextColor` | INFO | These are legitimate React Native TextInput props, not stub patterns |

No blockers or stub patterns found.

### Human Verification Required

#### 1. Auth Error Modal UI

**Test:** Add a repository, simulate a sync failure with `is_auth_error = true` in the DB, tap it in the Repos screen.
**Expected:** Bottom-sheet slides up showing warning icon (amber), "Authentication Failed" title, description text, "New Personal Access Token" label, `ghp_...` placeholder text input, and "Update Token" button.
**Why human:** Visual layout, color theming, icon rendering, and sheet animation cannot be verified by code inspection.

#### 2. End-to-End Token Update

**Test:** Enter a valid new PAT in the modal and tap "Update Token".
**Expected:** "Updating..." text with spinner shows while loading; success toast "Token updated" appears after completion; modal closes; repo list refreshes with the repo no longer showing error indicators.
**Why human:** Requires live Docora API connectivity and runtime state transitions.

#### 3. Non-Auth Error Modal (Info-Only)

**Test:** Simulate a sync failure with `is_auth_error = false`, tap the failed repo.
**Expected:** Bottom-sheet shows danger icon (red), "Sync Failed" title and description, but absolutely no PAT text input or submit button.
**Why human:** Conditional rendering correctness must be confirmed visually at runtime.

### Gaps Summary

No gaps. All 5 observable truths are verified. The end-to-end chain is fully wired:

- Backend: `docoraUpdateToken` (Docora PATCH) → `update_token` case → DB error clearing
- Core package: `updateRepositoryToken` exported and callable
- UI: `RepoErrorModal` bottom-sheet with conditional auth/non-auth content, wired to `@lumio/core`
- Screen: `ReposScreen` routes failed-repo taps to modal; success triggers immediate list refresh
- i18n: 13 keys in both EN and IT, matching key sets

Both commits (6dc81c5, 26b9742) are confirmed in git log with 116 and 429 lines added respectively.

---

_Verified: 2026-02-18T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
