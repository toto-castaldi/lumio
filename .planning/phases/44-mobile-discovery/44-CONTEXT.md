# Phase 44: Mobile Discovery - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Discovery tab (4th bottom tab) in the Android app with fulltext search, tag-based browsing, and deck subscription. Users can find shared decks, subscribe with a single tap, and unsubscribe with confirmation. Subscribed decks appear in the Repos screen and their cards flow into study sessions.

</domain>

<decisions>
## Implementation Decisions

### Search & results layout
- Card-based result layout: each deck displayed as a card with flag emoji (language), display_name, description (2 lines truncated), tag mini-chips, card count badge, author, and subscribe button
- Search bar sticky at top of screen, always visible when scrolling results
- 300ms debounce on search input (per DISC-02)
- Already-subscribed decks show green checkmark instead of [+] button
- Language shown as country flag emoji mapped from ISO 639-1 code (e.g., "it" -> flag_it, "en" -> flag_gb)

### Tag browsing UX
- Horizontal scrollable chip bar below search bar, both sticky at top
- Single tag selection with "All" chip at the start to clear filter
- Tag + search text combine with AND logic (both filters active simultaneously)
- Selected chip: primary color background with white text (filled)
- Unselected chips: border-only (outlined) with secondary text color
- Top 10 most-used tags dynamically computed (carried from Phase 41 decision)

### Subscribe/unsubscribe flow
- Subscribe: single tap on [+] button, optimistic icon swap to green checkmark + success toast "Subscribed to [Deck Name]"
- Unsubscribe: tap green checkmark -> confirmation dialog "Unsubscribe from [Deck]? Your study progress will be preserved." (matches delete-repo confirm pattern)
- Subscribed decks appear in Repos screen as distinct entries: deck display_name (not repo URL), compass/book icon, "Shared deck" badge
- SRS progress preserved on unsubscribe (carried from Phase 41 decision)

### Empty & edge states
- Initial view: all decks loaded (search_decks with no query/tag), browsable catalog with tag bar
- No search results: EmptyState with search-outline icon + "No decks found" + "Try a different search or clear your filters" + clear button
- No decks at all (deck_index empty): EmptyState with library-outline icon + "No decks available yet" + "Deck authors are preparing content. Check back soon!"
- All subscribed: normal list with all checkmarks, no special messaging

### Claude's Discretion
- Exact card component sizing, spacing, and shadow styling
- Loading state / skeleton while search results load
- Error handling for failed subscribe/unsubscribe operations
- How to fetch and cache the top 10 tags (separate RPC or inline query)
- Flag emoji mapping implementation details
- Shared deck entry component styling in Repos screen
- Pagination/infinite scroll for large result sets (if needed)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState` component (`apps/android/components/EmptyState.tsx`): icon + title + subtitle + optional CTA — direct reuse for all empty states
- `RepoListItem` component: pattern for list items with Ionicons, theming, swipeable actions — reference for DeckCard design
- `useTheme()` hook: colors.primary, colors.surface, colors.text, colors.textSecondary, colors.border — use for chip and card styling
- `useI18n()` hook with `t()` function — all UI text must be localized IT/EN
- `react-native-toast-message`: already mounted at App root — reuse for subscribe/unsubscribe toasts
- `StatCard` component: card-style UI element on Dashboard — reference for card border/shadow pattern

### Established Patterns
- Bottom tab navigator: `createBottomTabNavigator` in `MainNavigator.tsx` with Ionicons, no labels, themed colors
- Screen headers: `headerStyle: { backgroundColor: colors.primary }`, `headerTintColor: '#ffffff'`
- Data fetching: direct Supabase RPC calls via `getSupabaseClient()`, no React Query
- Optimistic UI: established in error clearing after token update (v1.6)
- Bottom-sheet modals: 50-80% height for contextual info (established in v1.6)

### Integration Points
- `MainNavigator.tsx`: Add 4th tab "Discovery" with compass icon (`compass` / `compass-outline`)
- `MainTabParamList`: Add `Discovery: undefined` type
- `@lumio/core`: Need new functions — `searchDecks()`, `subscribeToDeck()`, `unsubscribeFromDeck()`, `getPopularTags()`
- `search_decks` RPC: Already exists with fulltext + tag filter + pagination support
- `user_repositories` table: Subscribe = INSERT with subfolder_path, Unsubscribe = DELETE
- `ReposScreen`: Must distinguish shared deck entries (subfolder_path not null) from personal repos

</code_context>

<specifics>
## Specific Ideas

- Card mockup approved: flag emoji top-left, display_name + card count on first line, description (2 lines), tag chips row, author + subscribe button on bottom row
- Chip bar pattern similar to App Store / Google Play category browsing
- Unsubscribe confirmation dialog message explicitly mentions study progress preservation ("Your study progress will be preserved")
- Shared deck entries in Repos screen should feel clearly different from personal repos — compass/book icon + "Shared deck" label instead of URL + folder icon

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 44-mobile-discovery*
*Context gathered: 2026-03-15*
