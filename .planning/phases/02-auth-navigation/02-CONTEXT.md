# Phase 2: Auth & Navigation - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log in with Google OAuth and navigate between app sections. Session persists across app restarts. Logout functionality available. This phase establishes the authenticated shell of the app — actual screen content (dashboard stats, repo list, etc.) belongs to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Login Screen Experience
- Minimal design: Lumio logo + tagline "Your flashcards, supercharged" + Google sign-in button
- Google is primary auth option, but layout should allow future auth methods
- No onboarding carousel or feature highlights — straight to login

### Tab Navigation Structure
- Bottom tabs: Dashboard, Repos, Settings (3 tabs)
- Study is NOT a tab — it's a Floating Action Button (FAB) above the tab bar
- Icons only (no text labels)
- Count badges on tabs when relevant (e.g., new cards available)

### Offline Behavior
- App shows offline indicator banner when no connection
- Allow browsing cached data while offline
- Auth operations require connection

### Session Management
- Silent token refresh in background (no user interruption)
- Logout button in Settings screen only
- No logout confirmation — immediate action

### Claude's Discretion
- Loading feedback during OAuth (spinner placement and style)
- OAuth failure error pattern (toast vs modal)
- Cancelled login behavior (silent vs brief feedback)
- Supabase unreachable degradation strategy
- Session refresh failure handling (redirect vs dialog)
- Exact icon choices for tabs and FAB
- FAB visual design (size, color, animation)

</decisions>

<specifics>
## Specific Ideas

- FAB for Study makes it the primary action — always accessible regardless of which tab user is on
- Tab icons without labels = cleaner, more modern look
- Immediate logout (no confirmation) reduces friction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-auth-navigation*
*Context gathered: 2026-02-04*
