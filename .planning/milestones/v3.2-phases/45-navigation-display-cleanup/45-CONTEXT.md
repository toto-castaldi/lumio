# Phase 45: Navigation & Display Cleanup - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Reorder bottom navigation tabs (Discovery promoted to 2nd position) and hide the lumio-decks platform repository from the Repository list. Shared deck display changes and interactions (swipe unsubscribe, tap for cards) are Phase 46.

</domain>

<decisions>
## Implementation Decisions

### Tab ordering
- New order: Dashboard → Discovery → Repos → Settings
- Dashboard remains the default/initial tab on app open
- Settings stays as the last (4th) tab — standard Android pattern
- Discovery keeps the compass icon (compass/compass-outline) — no icon change

### Repo filtering
- Server-side filter: `getUserRepositories()` query excludes `is_platform=true` repos — platform repos never reach the client
- Add-repo guard: Server-side check in edge function/backend when adding a repo — if URL matches an existing `is_platform` repo, reject the addition
- Rejection UX: Info toast message like "This deck is available in Discovery" guiding users to the right place
- The `is_platform` column already exists on the `repositories` table (added in Phase 41)

### Shared decks display
- Leave current footer display as-is — Phase 46 will redesign it together with swipe/tap interactions
- No Discovery CTA or hint needed — Discovery tab at 2nd position is prominent enough

### Claude's Discretion
- Exact toast message wording (both IT and EN)
- Server-side guard implementation approach (RPC check, edge function check, or DB constraint)
- Any minor cleanup needed in MainNavigator.tsx after reordering

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants: "un utente NON può aggiungere a mano un repository di tipo is_platform. Se lo fa, l'azione viene ignorata. Per fare questo check, al momento dell'aggiunta, Lumio controlla se è un repo già censito di tipo is_platform"
- The platform-repo guard is a security/integrity measure, not just UX polish

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MainNavigator.tsx`: Bottom tab navigator with `createBottomTabNavigator` — tab order is just the declaration order of `<Tab.Screen>` elements
- `is_platform` column on `repositories` table — already exists, just needs to be used in queries
- `getUserRepositories()` in `packages/core/src/supabase/repositories.ts` — PostgREST query, easy to add `.eq('is_platform', false)` filter
- `addRepository()` in `packages/core/src/supabase/repositories.ts` — existing add flow, guard check can be added before insert
- Toast system (`react-native-toast-message`) — already used throughout the app for feedback

### Established Patterns
- Tab.Screen declaration order controls bottom tab order — no index or priority system
- PostgREST query chaining for server-side filters (`.eq()`, `.neq()`, `.is()`)
- i18n keys for all user-facing strings (IT/EN)
- Edge function action routing pattern in `deck-commit` — model for server-side guards

### Integration Points
- `MainNavigator.tsx` — sole location for tab order definition
- `getUserRepositories()` — sole data source for repo list
- `addRepository()` — sole path for adding repos (calls Supabase + Docora webhook)
- `MainTabParamList` type — may need reordering for consistency (optional)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 45-navigation-display-cleanup*
*Context gathered: 2026-03-17*
