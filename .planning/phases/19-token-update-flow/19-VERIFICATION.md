---
phase: 19-token-update-flow
verified: 2026-02-21T10:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
gaps: []
human_verification:
  - test: "Tap a repo with syncStatus 'failed' and isAuthError true"
    expected: "Bottom-sheet opens showing auth error title, description, and PAT text input"
    why_human: "UI layout, animation, and visual appearance cannot be verified programmatically"
  - test: "Enter a PAT in the input and tap 'Update Token'"
    expected: "Spinner shows, success toast appears, modal closes, repo list refreshes with error cleared"
    why_human: "Requires real Docora API interaction and runtime network calls"
  - test: "Tap a repo with syncStatus 'failed' and isAuthError false"
    expected: "Bottom-sheet opens showing sync error title and description but NO PAT input field"
    why_human: "Conditional rendering logic correctness requires visual inspection at runtime"
---

# Phase 19: Token Update Flow Verification Report

**Phase Goal:** Users can fix auth-related sync failures by updating their PAT token from within the app
**Verified:** 2026-02-21T10:00:00Z
**Status:** passed
**Re-verification:** Yes -- regression check after previous passed verification (2026-02-18)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can tap a failed repository to see error details in a bottom-sheet modal | VERIFIED | `ReposScreen.tsx` line 181: `if (item.syncStatus === 'failed') { setErrorRepo(item); }` drives `RepoErrorModal visible={!!errorRepo}` at lines 203-211 |
| 2 | For auth-related errors, the modal shows a PAT text input and submit button | VERIFIED | `RepoErrorModal.tsx` line 132: `isAuthError = repo?.isAuthError ?? false`; line 223: conditional renders `TextInput` (line 228) and `TouchableOpacity` submit button (line 246) only when `isAuthError` is true |
| 3 | For non-auth errors, the modal shows error details but no PAT input | VERIFIED | Same conditional at line 223 -- non-auth path skips the entire token section; still renders icon, title, description, and syncErrorMessage |
| 4 | Submitting a new PAT calls the backend which proxies the update to Docora | VERIFIED | `handleSubmit` (line 106) -> `updateRepositoryToken(repo.id, token.trim())` -> `callGitSync('update_token', {...})` (repositories.ts line 140) -> `case "update_token"` (git-sync line 708) -> `docoraUpdateToken(repo.docora_repository_id, accessToken)` (line 765) which performs PATCH to `${DOCORA_API_URL}/api/repositories/${id}/token` (line 187) |
| 5 | After successful token update, the repository error state clears immediately in the UI | VERIFIED | On success: `onTokenUpdated()` called (RepoErrorModal line 118) -> ReposScreen lines 207-209: `setErrorRepo(null); fetchRepos()`. Backend clears 5 fields: sync_status="synced", sync_error_message=null, sync_error_type=null, is_auth_error=false, sync_failed_at=null (git-sync lines 768-777) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/git-sync/index.ts` | update_token action handler with Docora PATCH proxy and DB error clearing | VERIFIED | Lines 708-788: validates repositoryId+accessToken, verifies ownership via user_repositories, fetches docora_repository_id, calls docoraUpdateToken, clears 5 DB fields, returns 200. `docoraUpdateToken` at lines 182-200 performs the PATCH call. |
| `packages/core/src/supabase/repositories.ts` | updateRepositoryToken function calling git-sync update_token action | VERIFIED | Lines 139-141: `export async function updateRepositoryToken(repositoryId: string, accessToken: string): Promise<void> { await callGitSync('update_token', { repositoryId, accessToken }); }` |
| `packages/core/src/index.ts` | updateRepositoryToken exported from @lumio/core | VERIFIED | Line 32: `updateRepositoryToken` included in repository exports block |
| `apps/android/components/RepoErrorModal.tsx` | Bottom-sheet modal with error details and conditional PAT input | VERIFIED | 375 lines -- Modal + Animated bottom-sheet + PanResponder drag handle + conditional auth/non-auth content + TextInput + submit button + Toast feedback + ActivityIndicator loading state |
| `apps/android/screens/ReposScreen.tsx` | Integration: tap failed repo opens modal, successful update refreshes list | VERIFIED | Line 42: `errorRepo` state; lines 180-186: conditional onPress routing; lines 203-211: `RepoErrorModal` mounted with `onTokenUpdated` callback that clears state and calls `fetchRepos()` |
| `apps/android/i18n/en.ts` | tokenUpdate i18n section | VERIFIED | Lines 138-155: 13 keys covering error titles, descriptions, input labels, button text, toast messages |
| `apps/android/i18n/it.ts` | tokenUpdate i18n section (matching keys) | VERIFIED | Lines 141-158: 13 matching keys with Italian translations |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RepoErrorModal.tsx` | `repositories.ts` | `updateRepositoryToken` import and call | VERIFIED | Line 31: `import { updateRepositoryToken } from '@lumio/core'`; line 111: `await updateRepositoryToken(repo.id, token.trim())` |
| `repositories.ts` | `git-sync/index.ts` | `callGitSync('update_token')` | VERIFIED | Line 140: `await callGitSync('update_token', { repositoryId, accessToken })`; git-sync handles `case "update_token":` at line 708 |
| `git-sync/index.ts` | Docora API | `docoraUpdateToken` PATCH call | VERIFIED | Lines 182-200: PATCH to `/api/repositories/${docoraRepositoryId}/token` with `{ github_token: githubToken }` body; invoked at line 765 after ownership verification |
| `ReposScreen.tsx` | `RepoErrorModal.tsx` | `errorRepo` state and modal props | VERIFIED | Line 24: import; line 42: `errorRepo` state; lines 203-211: `<RepoErrorModal visible={!!errorRepo} onClose={() => setErrorRepo(null)} repo={errorRepo} onTokenUpdated={() => { setErrorRepo(null); fetchRepos(); }} />` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TOKEN-01 | 19-01-PLAN.md | New edge function proxies PAT update to Docora PATCH /api/repositories/{repository_id}/token | SATISFIED | `docoraUpdateToken` in git-sync/index.ts lines 182-200 performs the PATCH; invoked from `update_token` case at line 765 |
| TOKEN-02 | 19-01-PLAN.md | After successful token update, backend optimistically clears repo sync error status | SATISFIED | git-sync/index.ts lines 768-777: updates sync_status="synced", sync_error_message=null, sync_error_type=null, is_auth_error=false, sync_failed_at=null |
| TOKUI-01 | 19-01-PLAN.md | User can tap a failed repo to open a bottom-sheet modal with error details | SATISFIED | ReposScreen.tsx conditional onPress (line 181) + RepoErrorModal component (375 lines) |
| TOKUI-02 | 19-01-PLAN.md | For auth-related errors, user can enter a new PAT in the modal and submit | SATISFIED | RepoErrorModal.tsx lines 223-269: TextInput and submit button rendered only when isAuthError is true |
| TOKUI-03 | 19-01-PLAN.md | After successful token update, the repo error state clears immediately in the UI | SATISFIED | `onTokenUpdated` callback: setErrorRepo(null) + fetchRepos() immediately after backend returns success |

All 5 requirement IDs from REQUIREMENTS.md mapped to Phase 19 are accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `RepoErrorModal.tsx` | 239-240 | `placeholder` / `placeholderTextColor` | INFO | Legitimate React Native TextInput props, not stub patterns |
| `en.ts` / `it.ts` | 146/149 | `errorMessage` key defined but unused in component | INFO | Component renders `repo.syncErrorMessage` directly. Unused key is harmless but could be cleaned up |

No blockers or stub patterns found. No TODO/FIXME/HACK comments. No empty implementations.

### Human Verification Required

#### 1. Auth Error Modal UI

**Test:** Simulate a sync failure with `is_auth_error = true` in the DB for a repository, then tap it in the Repos screen.
**Expected:** Bottom-sheet slides up at 50% screen height showing: drag handle, "Error Details" header with repo name, warning icon (amber), "Authentication Failed" title, description about expired/invalid token, syncErrorMessage if present, "New Personal Access Token" label, ghp_... placeholder input field, and "Update Token" button.
**Why human:** Visual layout, color theming, icon rendering, sheet animation, and overall UX quality cannot be verified by code inspection.

#### 2. End-to-End Token Update

**Test:** Enter a valid new PAT in the modal and tap "Update Token".
**Expected:** Button text changes to "Updating..." with spinner; success toast "Token updated" appears; modal closes; repo list refreshes with the repo no longer showing error indicators (sync status should show as "synced").
**Why human:** Requires live Docora API connectivity, real network calls, and runtime state transitions.

#### 3. Non-Auth Error Modal (Info-Only)

**Test:** Simulate a sync failure with `is_auth_error = false`, tap the failed repo.
**Expected:** Bottom-sheet shows danger icon (red), "Sync Failed" title, description about automatic retry, and syncErrorMessage if present -- but absolutely no PAT text input or submit button.
**Why human:** Conditional rendering correctness must be confirmed visually at runtime.

### Gaps Summary

No gaps found. All 5 observable truths are verified. The end-to-end chain is fully wired:

- **Backend:** `docoraUpdateToken` (Docora PATCH) -> `update_token` case -> validates ownership -> proxies token -> clears 5 DB error fields
- **Core package:** `updateRepositoryToken` exported and callable via `callGitSync('update_token', ...)`
- **UI:** `RepoErrorModal` bottom-sheet with conditional auth/non-auth content, TextInput, submit button, loading state, toast feedback
- **Screen:** `ReposScreen` routes failed-repo taps to error modal; success callback clears modal state and refreshes repo list
- **i18n:** 13 keys in both EN and IT with matching key sets (1 key `errorMessage` defined but unused -- harmless)

Both commits verified in git log:
- `6dc81c5` feat(19-01): add update_token action and updateRepositoryToken export
- `26b9742` feat(19-01): add RepoErrorModal and integrate with ReposScreen

No regressions detected from previous verification.

---

_Verified: 2026-02-21T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
