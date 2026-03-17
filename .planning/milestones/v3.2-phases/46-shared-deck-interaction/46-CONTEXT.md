# Phase 46: Shared Deck Interaction - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manage and browse shared decks with the same interactions available for personal repositories: swipe to unsubscribe, tap to browse cards, tap to see card detail. Shared decks become first-class items in the Repos screen alongside personal repos.

</domain>

<decisions>
## Implementation Decisions

### Shared deck list layout
- Unified single list: shared decks and personal repos mixed in one FlatList (no separate section or footer)
- Sort order: shared decks first (alphabetical), then personal repos (alphabetical)
- Shared deck rows use compass icon (compass-outline) — consistent with Discovery tab
- Subtitle: localized "Shared deck" / "Mazzo condiviso" label (same as current footer)
- Remove the current ListFooterComponent approach — shared decks become proper list items

### Swipe unsubscribe UX
- Swipe left reveals unsubscribe action — same pattern as RepoListItem delete
- Red/danger background color (colors.danger) — consistent with existing delete swipe
- Trash icon (trash-outline) + localized "Unsubscribe" label — same visual as repo delete ("la stessa")
- Confirmation dialog via Alert.alert before unsubscribing, warning about study data loss
- Dialog text: title mentions deck name, body warns study progress will be deleted
- Cancel + Unsubscribe (destructive style) buttons

### Card browsing for shared decks
- Claude's discretion: reuse CardListScreen with subfolder filter param or create dedicated screen (minimize code duplication)
- Screen title: deck display_name (e.g., "Algebra Basics") — same pattern as repoName for personal repos
- Cards filtered by subfolder_path prefix within the shared repository
- Claude's discretion: reuse CardDetailScreen for card detail (markdown, code, LaTeX, images)

### Study data cleanup on unsubscribe
- Delete card_review_schedule entries along with the subscription — clean slate
- Server-side RPC (e.g., unsubscribe_deck) that atomically deletes user_repositories + card_review_schedule in a transaction
- Single call, no partial failures — replaces current client-side unsubscribeFromDeck()

### Claude's Discretion
- Whether to reuse CardListScreen (with optional subfolder_path param) or create a new screen
- Whether CardDetailScreen needs any adaptation for shared deck cards
- Exact dialog message wording (both IT and EN i18n keys)
- Implementation of the unified list data merging (repos + shared decks → single array)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in REQUIREMENTS.md.

### Requirements
- `.planning/REQUIREMENTS.md` — DECK-01 (swipe unsubscribe), DECK-02 (tap → card list), DECK-03 (card detail)

### Existing implementation
- `apps/android/components/RepoListItem.tsx` — Swipeable pattern to replicate for shared decks
- `apps/android/screens/ReposScreen.tsx` — Current shared deck footer to replace with unified list
- `apps/android/screens/CardListScreen.tsx` — Card list screen to potentially reuse with subfolder filter
- `apps/android/screens/CardDetailScreen.tsx` — Card detail screen to potentially reuse
- `packages/core/src/supabase/discovery.ts` — unsubscribeFromDeck(), getUserDeckSubscriptions(), DeckSubscription type
- `apps/android/navigation/AppNavigator.tsx` — RootStackParamList type definition for route params

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RepoListItem`: Swipeable row component with delete action — pattern to replicate for shared deck unsubscribe
- `CardListScreen`: FlatList of cards with .lumioignore filtering, pull-to-refresh, empty state — can be extended with subfolder filter
- `CardDetailScreen`: Full card detail with markdown, code, LaTeX, images — reusable for shared deck cards
- `CardListItem`: Card row component — already used in CardListScreen
- `unsubscribeFromDeck()` in discovery.ts: REST DELETE on user_repositories — to be replaced by atomic RPC
- `getUserDeckSubscriptions()` in discovery.ts: Fetches subscriptions enriched with display_name from deck_index
- `Deck` class: .lumioignore filtering — used in CardListScreen
- `EmptyState` component: Reusable empty state with icon + title + subtitle

### Established Patterns
- `Swipeable` from react-native-gesture-handler for swipe actions (rightThreshold: 40, overshootRight: false)
- `Alert.alert` for destructive action confirmation (repo delete pattern)
- `Toast.show` for success/error feedback after actions
- PostgREST REST API calls with fetch() in discovery.ts
- Route params via react-navigation `RootStackParamList`
- `useCallback` for memoized handlers, `useFocusEffect` for screen focus refresh

### Integration Points
- `ReposScreen.tsx` — needs unified list merging repos + shared decks, shared deck item component with swipe
- `AppNavigator.tsx` — RootStackParamList may need new params for subfolder-aware CardList navigation
- `packages/core/src/supabase/discovery.ts` — new unsubscribe_deck RPC function
- `supabase/migrations/` — new migration for unsubscribe_deck RPC
- `apps/android/i18n/` — new keys for unsubscribe dialog, confirmation, success/error messages

</code_context>

<specifics>
## Specific Ideas

- User explicitly said swipe action should be "la stessa" (the same) as repo delete — identical visual treatment
- Confirmation dialog pattern matches existing `handleDeleteRepo` in ReposScreen

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 46-shared-deck-interaction*
*Context gathered: 2026-03-17*
