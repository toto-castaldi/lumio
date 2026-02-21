# Phase 18: Sync Error Display - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Show sync failure indicators and error messages in the repository list so users can see which repos have sync problems. All data fields (syncStatus, syncErrorMessage, isAuthError) already flow to the frontend from Phase 17. This phase adds the visual layer only. Token update action is Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Error indicator style
- Badge overlay approach — small red dot/badge on the right side of each failed repo row
- Badge icon/shape: Claude's discretion (plain dot vs warning icon — pick what fits the theme)
- Repo name text turns a warning/red color when sync has failed
- No background color change on the row — badge + text tint are the signals

### Error message display
- Error message shown inline as a third line below the repo URL, always visible when there's an error
- User-friendly translated messages — map Docora error types to readable text (e.g., "Authentication failed" not raw API strings)
- Message text in warning/red color matching the name tint
- Up to 2 lines of text, then truncate with ellipsis

### Auth vs other errors
- Auth errors get a visually distinct style from other sync errors (since they're user-fixable in Phase 19)
- Specific distinction approach: Claude's discretion (icon difference, color difference, or both)
- Whether to include an actionable hint like "tap to update token": Claude's discretion (consider that Phase 19 isn't built yet — avoid promising UI that doesn't exist)
- Non-auth error message tone and suggested actions: Claude's discretion

### Sync status states
- Show syncing state — subtle indicator when a repo is actively syncing (approach: Claude's discretion — spinner vs text)
- Show pending state — indicator for repos that haven't been synced yet (e.g., "Waiting for sync...")
- Error recovery transition on pull-to-refresh: Claude's discretion (instant clear vs success flash)

### Claude's Discretion
- Badge icon choice (plain dot, warning triangle, or exclamation)
- Auth error visual distinction approach (icon, color, or both)
- Whether auth error message hints at fixability before Phase 19 exists
- Non-auth error message wording and action suggestions
- Syncing indicator style (spinner icon vs text label)
- Error recovery animation/transition

</decisions>

<specifics>
## Specific Ideas

- Badge positioned on the right side of the row (trailing edge), same zone where a chevron would go
- Error message goes below the existing URL line — making failed repos taller than healthy ones
- All status indicators (syncing, pending, error) use the right-side position for consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-sync-error-display*
*Context gathered: 2026-02-17*
