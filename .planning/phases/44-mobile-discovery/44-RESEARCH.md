# Phase 44: Mobile Discovery - Research

**Researched:** 2026-03-15
**Domain:** React Native (Expo) mobile UI, Supabase RPC integration, subscription management
**Confidence:** HIGH

## Summary

Phase 44 implements the mobile Discovery tab -- the final piece of the v3.1 Deck Discovery milestone. The database layer (deck_index, search_decks RPC, subfolder_path on user_repositories, subfolder-filtered study RPCs) was completed in Phases 41-42. This phase is purely mobile client-side: a new bottom tab with search, tag browsing, deck cards, and subscribe/unsubscribe flows.

The implementation involves four key areas: (1) Adding a 4th bottom tab to MainNavigator with a DiscoveryScreen, (2) Creating `@lumio/core` functions to call the existing `search_decks` RPC and manage user_repositories subscriptions, (3) Building UI components (DeckCard, TagChipBar) following existing patterns (StatCard, RepoListItem), and (4) Adding i18n strings for IT/EN. No new database migrations are needed -- all backend infrastructure exists.

**Primary recommendation:** Build the Discovery tab as a self-contained screen calling search_decks RPC directly via Supabase REST API (same pattern as getDueCardCount/getStudyCardsForSession), with subscribe/unsubscribe operating directly on user_repositories table. Use FlatList for results, horizontal ScrollView for tag chips.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card-based result layout: each deck displayed as a card with flag emoji (language), display_name, description (2 lines truncated), tag mini-chips, card count badge, author, and subscribe button
- Search bar sticky at top of screen, always visible when scrolling results
- 300ms debounce on search input (per DISC-02)
- Already-subscribed decks show green checkmark instead of [+] button
- Language shown as country flag emoji mapped from ISO 639-1 code (e.g., "it" -> flag_it, "en" -> flag_gb)
- Horizontal scrollable chip bar below search bar, both sticky at top
- Single tag selection with "All" chip at the start to clear filter
- Tag + search text combine with AND logic (both filters active simultaneously)
- Selected chip: primary color background with white text (filled)
- Unselected chips: border-only (outlined) with secondary text color
- Top 10 most-used tags dynamically computed (carried from Phase 41 decision)
- Subscribe: single tap on [+] button, optimistic icon swap to green checkmark + success toast "Subscribed to [Deck Name]"
- Unsubscribe: tap green checkmark -> confirmation dialog "Unsubscribe from [Deck]? Your study progress will be preserved." (matches delete-repo confirm pattern)
- Subscribed decks appear in Repos screen as distinct entries: deck display_name (not repo URL), compass/book icon, "Shared deck" badge
- SRS progress preserved on unsubscribe (carried from Phase 41 decision)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | User can access a Discovery tab (4th bottom tab with compass icon) | Add to MainNavigator.tsx, MainTabParamList, TabIconName union |
| DISC-02 | User can search shared decks via fulltext search bar with 300ms debounce | search_decks RPC exists with fulltext support; use setTimeout debounce pattern |
| DISC-03 | User sees search results with deck name, description, card count, and author | search_decks returns display_name, description, card_count, author columns |
| DISC-04 | User can browse decks by category via horizontal scrollable chip bar | search_decks supports p_tag parameter; need getPopularTags function |
| DISC-05 | User can subscribe to a shared deck with single tap | INSERT into user_repositories with subfolder_path via Supabase REST API |
| DISC-06 | User can unsubscribe from a shared deck | DELETE from user_repositories via Supabase REST API |
| DISC-07 | User sees appropriate empty states (no decks, no results, all subscribed) | Reuse EmptyState component with different icon/title/subtitle configs |
| DISC-08 | Discovery UI is fully localized in IT and EN | Add discovery section to en.ts and it.ts i18n files |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | (existing) | UI framework | Project standard |
| @react-navigation/bottom-tabs | (existing) | Tab navigation | Already used for 3 tabs |
| @expo/vector-icons (Ionicons) | (existing) | Icons (compass, search, checkmark) | Project-wide icon library |
| @supabase/supabase-js | (existing) | Supabase RPC and REST calls | Project data layer |
| react-native-toast-message | (existing) | Subscribe/unsubscribe feedback | Already mounted at App root |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-gesture-handler | (existing) | ScrollView for chip bar | Already installed for Swipeable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom debounce | lodash.debounce | Not needed -- setTimeout/clearTimeout is trivial and avoids new dep |
| React Query | Direct fetch | Project pattern is direct Supabase calls, no data fetching library |
| FlatList stickyHeaders | Separate header + FlatList | stickyHeaderIndices is fragile; use a fixed header above FlatList |

**Installation:**
No new dependencies needed. All libraries are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
  screens/
    DiscoveryScreen.tsx         # Main discovery tab screen
  components/
    DeckCard.tsx                # Individual deck result card
    TagChipBar.tsx              # Horizontal scrollable tag chip bar
    SearchBar.tsx               # Sticky search input (or inline in screen)
  i18n/
    en.ts                       # + discovery section
    it.ts                       # + discovery section
  navigation/
    MainNavigator.tsx           # + Discovery tab (4th)

packages/core/src/
  supabase/
    discovery.ts                # searchDecks, getPopularTags, subscribeToDeck, unsubscribeFromDeck, getUserSubscriptions
  index.ts                      # + discovery exports
```

### Pattern 1: Data Fetching via Supabase REST API (Direct)
**What:** Call Supabase RPCs and tables directly using fetch with auth headers
**When to use:** All data operations in this phase
**Example:**
```typescript
// Source: packages/core/src/supabase/study.ts (existing pattern)
export async function searchDecks(
  query?: string,
  tag?: string,
  limit: number = 20,
  offset: number = 0
): Promise<DeckSearchResult[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/search_decks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
      body: JSON.stringify({
        p_query: query || null,
        p_tag: tag || null,
        p_limit: limit,
        p_offset: offset,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search decks');
  }

  return response.json();
}
```

### Pattern 2: Subscribe via Direct Table Operations
**What:** INSERT/DELETE on user_repositories table via Supabase REST API
**When to use:** Subscribe and unsubscribe operations
**Example:**
```typescript
// Subscribe: INSERT into user_repositories
export async function subscribeToDeck(
  repositoryId: string,
  subfolderPath: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const userId = await getUserId();
  if (!userId) throw new Error('User ID not found');

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_repositories`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        repository_id: repositoryId,
        subfolder_path: subfolderPath,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to subscribe');
  }
}

// Unsubscribe: DELETE from user_repositories
export async function unsubscribeFromDeck(
  repositoryId: string,
  subfolderPath: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const userId = await getUserId();
  if (!userId) throw new Error('User ID not found');

  const supabaseUrl = getSupabaseUrl();
  const encodedFilter = encodeURIComponent(subfolderPath);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_repositories?user_id=eq.${userId}&repository_id=eq.${repositoryId}&subfolder_path=eq.${encodedFilter}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unsubscribe');
  }
}
```

### Pattern 3: Debounced Search with useCallback + useRef
**What:** 300ms debounce on text input using setTimeout stored in a ref
**When to use:** Search bar text changes
**Example:**
```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleSearchChange = useCallback((text: string) => {
  setSearchText(text);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    // Trigger actual search
    fetchDecks(text, selectedTag);
  }, 300);
}, [selectedTag]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, []);
```

### Pattern 4: Optimistic UI for Subscribe/Unsubscribe
**What:** Immediately update UI state, revert on error
**When to use:** Subscribe button tap (instant visual feedback)
**Example:**
```typescript
const handleSubscribe = async (deck: DeckSearchResult) => {
  // Optimistic: immediately add to subscribed set
  setSubscribedIds(prev => new Set([...prev, deckKey(deck)]));
  Toast.show({ type: 'success', text1: t('discovery.subscribed', { name: deck.display_name }) });

  try {
    await subscribeToDeck(deck.repository_id, deck.subfolder_path);
  } catch (error) {
    // Revert on failure
    setSubscribedIds(prev => {
      const next = new Set(prev);
      next.delete(deckKey(deck));
      return next;
    });
    Toast.show({ type: 'error', text1: t('discovery.subscribeFailed') });
  }
};
```

### Pattern 5: Sticky Header with FlatList
**What:** Fixed search bar + chip bar above scrollable FlatList
**When to use:** Discovery screen layout
**Example:**
```typescript
// Use a View wrapper: fixed header on top, FlatList below
<View style={{ flex: 1 }}>
  {/* Sticky header */}
  <View>
    <SearchBar ... />
    <TagChipBar ... />
  </View>
  {/* Scrollable results */}
  <FlatList
    data={decks}
    renderItem={({ item }) => <DeckCard deck={item} ... />}
    ListEmptyComponent={...}
    ...
  />
</View>
```

### Pattern 6: Getting User Subscriptions for "Already Subscribed" State
**What:** Fetch user's current subscriptions to show checkmarks on subscribed decks
**When to use:** On screen mount / focus
**Example:**
```typescript
// Query user_repositories where subfolder_path IS NOT NULL
export async function getUserDeckSubscriptions(): Promise<DeckSubscription[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_repositories?subfolder_path=not.is.null&select=repository_id,subfolder_path`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get subscriptions');
  }

  return response.json();
}
```

### Pattern 7: Popular Tags Query
**What:** Get top 10 most-used tags from deck_index using SQL aggregation
**When to use:** On Discovery screen mount to populate tag chip bar
**Recommendation (Claude's discretion):** Use a simple SQL query via Supabase REST or a lightweight RPC. Since deck_index is small (tens-to-hundreds of rows), a client-side approach using the existing search_decks results is also viable. The cleanest approach is a dedicated RPC that unnests tags and counts occurrences.
**Example RPC approach:**
```sql
-- Could be added as an RPC, or done inline in the client
-- by fetching all decks once and computing tag frequency
SELECT tag, COUNT(*) as usage_count
FROM deck_index, UNNEST(tags) AS tag
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 10;
```
**However, since no new migrations are needed and deck count is small:** fetch all decks on initial load (search_decks with no query/tag), extract tags client-side, compute frequency, and take top 10. This avoids a new RPC for now. If the deck catalog grows large, a dedicated RPC can be added later (deferred to DISC-F05).

### Anti-Patterns to Avoid
- **Do NOT use stickyHeaderIndices on FlatList:** Unreliable with complex headers. Use a fixed View wrapper above FlatList instead.
- **Do NOT use React Query or SWR:** Project pattern is direct Supabase calls. Adding a data fetching library for one screen would be inconsistent.
- **Do NOT create a new migration for tags query:** The deck catalog is small. Client-side tag aggregation is sufficient.
- **Do NOT navigate to a detail screen on deck tap:** The subscribe button is the primary action. Tapping the card itself has no defined navigation target (deck preview is deferred to DISC-F02).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce | Custom debounce hook with complex logic | Simple setTimeout/clearTimeout in useRef | Pattern is trivial, no library needed |
| Toast notifications | Custom toast system | react-native-toast-message (existing) | Already mounted at App root |
| Confirmation dialogs | Custom modal for unsubscribe confirm | React Native Alert.alert | Used throughout project (e.g., deleteRepo confirm) |
| Empty states | Custom empty state component | EmptyState component (existing) | Exact same pattern as Dashboard/Repos |
| Flag emoji rendering | Complex flag emoji library | Simple string mapping function | Only need ~10 ISO 639-1 codes, simple lookup |

**Key insight:** This phase has high reuse potential -- nearly every UI pattern (cards, lists, empty states, toasts, alerts, icons) has a precedent in the existing codebase. Follow existing patterns exactly.

## Common Pitfalls

### Pitfall 1: Subscription State Out of Sync
**What goes wrong:** User subscribes on Discovery tab, navigates to Repos screen, subscribed deck doesn't appear (or vice versa).
**Why it happens:** Discovery screen maintains local state of subscriptions; Repos screen fetches from getUserRepositories which goes through git-sync edge function.
**How to avoid:** After subscribe/unsubscribe, the subscription state should be re-fetched on screen focus using useFocusEffect (same pattern as DashboardScreen). The Repos screen will naturally pick up new subscriptions on its next fetch.
**Warning signs:** Stale data after tab switching.

### Pitfall 2: Duplicate Subscription INSERT Fails
**What goes wrong:** User taps subscribe twice quickly (before first request completes), causing a unique constraint violation.
**Why it happens:** The UNIQUE index `idx_user_repos_unique` on (user_id, repository_id, COALESCE(subfolder_path, '')) rejects duplicates.
**How to avoid:** Disable the subscribe button immediately on first tap (optimistic UI swap to checkmark). Wrap the INSERT in error handling that treats conflict errors as success (the subscription exists).
**Warning signs:** Error toast appearing after apparently successful subscription.

### Pitfall 3: MainTabParamList TypeScript Union Not Updated
**What goes wrong:** TypeScript errors when adding the Discovery tab.
**Why it happens:** `MainTabParamList` type needs the new `Discovery: undefined` entry, and the `TabIconName` type union needs `compass` and `compass-outline`.
**How to avoid:** Update both types in MainNavigator.tsx before adding the tab screen.
**Warning signs:** TypeScript compile errors in navigation types.

### Pitfall 4: Repos Screen Not Distinguishing Shared Decks
**What goes wrong:** Shared deck subscriptions appear in Repos screen with raw repo URL and folder icon, looking identical to personal repos.
**Why it happens:** The current `getUserRepositories()` function goes through git-sync edge function which maps to the Repository type. Shared deck subscriptions (subfolder_path not null) need different display.
**How to avoid:** The ReposScreen fetch needs to include subfolder_path-based entries with different rendering. This may require modifying the git-sync `get_repositories` action OR adding a separate fetch for deck subscriptions.
**Warning signs:** Shared decks invisible in Repos screen, or appearing with confusing URL display.

### Pitfall 5: Flag Emoji Not Rendering on All Android Versions
**What goes wrong:** Flag emoji (e.g., flag emoji for IT, GB) may not render on older Android versions or may look different across manufacturers.
**Why it happens:** Android's emoji support varies by version and manufacturer.
**How to avoid:** Use regional indicator symbols (e.g., `\u{1F1EE}\u{1F1F9}` for IT flag). These work on Android 5+ (API 21+) which is well below Expo's minimum. Test on physical device.
**Warning signs:** Tofu squares or missing flags on device testing.

### Pitfall 6: Search with Empty Query Returns All Decks (Intended but Beware)
**What goes wrong:** Not a bug per se, but if the deck catalog grows, loading ALL decks on initial mount could be slow.
**Why it happens:** search_decks with p_query=NULL returns all decks. Currently the catalog is small.
**How to avoid:** Use p_limit=20 on initial load. For now this is fine. Pagination (DISC-F05) is deferred.
**Warning signs:** Slow initial load if deck catalog grows to hundreds of entries.

## Code Examples

### 1. MainNavigator Tab Addition
```typescript
// Source: apps/android/navigation/MainNavigator.tsx (to be modified)
// Add to MainTabParamList:
export type MainTabParamList = {
  Dashboard: undefined;
  Repos: undefined;
  Discovery: undefined;   // NEW
  Settings: undefined;
};

// Add to TabIconName:
type TabIconName = 'home' | 'home-outline' | 'folder' | 'folder-outline'
  | 'compass' | 'compass-outline' | 'settings' | 'settings-outline';

// Add tab screen (between Repos and Settings):
<Tab.Screen
  name="Discovery"
  component={DiscoveryScreen}
  options={{
    title: t('navigation.discovery'),
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons
        name={(focused ? 'compass' : 'compass-outline') as TabIconName}
        size={size}
        color={color}
      />
    ),
  }}
/>
```

### 2. Flag Emoji Mapping
```typescript
// Simple ISO 639-1 to flag emoji mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  it: '\u{1F1EE}\u{1F1F9}',  // Italy
  en: '\u{1F1EC}\u{1F1E7}',  // UK
  es: '\u{1F1EA}\u{1F1F8}',  // Spain
  fr: '\u{1F1EB}\u{1F1F7}',  // France
  de: '\u{1F1E9}\u{1F1EA}',  // Germany
  pt: '\u{1F1E7}\u{1F1F7}',  // Brazil (Portuguese)
  ja: '\u{1F1EF}\u{1F1F5}',  // Japan
  zh: '\u{1F1E8}\u{1F1F3}',  // China
  ko: '\u{1F1F0}\u{1F1F7}',  // Korea
  ru: '\u{1F1F7}\u{1F1FA}',  // Russia
};

export function getLanguageFlag(languageCode: string): string {
  return LANGUAGE_FLAGS[languageCode.toLowerCase()] || '\u{1F30D}';  // Globe fallback
}
```

### 3. DeckSearchResult Type
```typescript
// Type matching search_decks RPC return shape
export interface DeckSearchResult {
  id: string;
  repository_id: string;
  subfolder_path: string;
  display_name: string;
  description: string;
  tags: string[];
  author: string;
  language: string;
  card_count: number;
  rank: number;
}
```

### 4. I18n Keys Structure
```typescript
// New section to add to en.ts and it.ts
discovery: {
  title: 'Discover',                    // 'Scopri'
  searchPlaceholder: 'Search decks...', // 'Cerca mazzi...'
  allTags: 'All',                       // 'Tutti'
  noDecksTitle: 'No decks available yet',       // 'Nessun mazzo disponibile'
  noDecksSubtitle: 'Deck authors are preparing content. Check back soon!',
  noResultsTitle: 'No decks found',             // 'Nessun mazzo trovato'
  noResultsSubtitle: 'Try a different search or clear your filters',
  clearFilters: 'Clear filters',                // 'Cancella filtri'
  subscribed: 'Subscribed to %{name}',          // 'Iscritto a %{name}'
  unsubscribed: 'Unsubscribed from %{name}',    // 'Disiscritto da %{name}'
  subscribeFailed: 'Failed to subscribe',       // 'Iscrizione fallita'
  unsubscribeFailed: 'Failed to unsubscribe',   // 'Disiscrizione fallita'
  unsubscribeTitle: 'Unsubscribe from %{name}?',
  unsubscribeBody: 'Your study progress will be preserved.',
  unsubscribe: 'Unsubscribe',                   // 'Disiscriviti'
  cardCount: '%{count} cards',                   // '%{count} schede'
  sharedDeck: 'Shared deck',                     // 'Mazzo condiviso'
},
navigation: {
  // existing keys +
  discovery: 'Discover',                         // 'Scopri'
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom fulltext search | PostgreSQL tsvector/GIN with websearch_to_tsquery | Phase 41 | search_decks RPC handles all search complexity server-side |
| Separate subscription table | subfolder_path column on user_repositories | Phase 41 | Single table for all user-repo relationships |
| N/A | COALESCE-based UNIQUE index for NULL subfolder_path | Phase 41 | Prevents duplicate subscriptions |

**Deprecated/outdated:**
- None relevant to this phase. All backend infrastructure is current (created in Phases 41-42, March 2026).

## Open Questions

1. **Repos Screen: How to show shared deck entries**
   - What we know: git-sync `get_repositories` action returns repositories the user is subscribed to. Shared deck subscriptions have subfolder_path set on user_repositories.
   - What's unclear: Does `get_repositories` return the subfolder_path? Does it return the platform repo entry?
   - Recommendation: Query user_repositories with subfolder_path not null separately and render those as "Shared deck" entries in ReposScreen. This avoids modifying the git-sync edge function. Alternatively, the ReposScreen could simply not show shared decks at all (they appear only in Discovery with checkmarks), but the CONTEXT.md explicitly says "Subscribed decks appear in Repos screen."

2. **Tag computation approach: Client-side vs RPC**
   - What we know: deck_index is small (tens of rows). search_decks returns all decks when called with no filters.
   - What's unclear: Whether to compute popular tags client-side from search results or create a dedicated query.
   - Recommendation: Compute client-side from the initial full deck load. Extract all tags, count occurrences, sort, take top 10. This is simple, avoids a new RPC, and works for the current scale. If needed, a dedicated RPC can be added later.

3. **Subscribe/unsubscribe: RLS compatibility**
   - What we know: user_repositories has RLS policies allowing INSERT (user_id = auth.uid()) and DELETE (user_id = auth.uid()). The Supabase JS client via REST should work with these policies.
   - What's unclear: Whether the existing `getAccessToken()` + apikey pattern works with PostgREST for direct table operations (all existing code goes through edge functions or RPCs).
   - Recommendation: Test this early. If RLS doesn't cooperate with the client token for direct REST calls, use a SECURITY DEFINER RPC wrapper (like insert_user_repository which already exists but doesn't support subfolder_path). Fallback: modify insert_user_repository to accept p_subfolder_path parameter.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test infrastructure in apps/android) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | 4th bottom tab with compass icon | manual-only | Visual inspection on device | N/A |
| DISC-02 | Fulltext search with 300ms debounce | manual-only | Type in search bar, observe debounce | N/A |
| DISC-03 | Results show name, description, count, author | manual-only | Visual inspection of DeckCard | N/A |
| DISC-04 | Category chip bar filters results | manual-only | Tap chips, observe filtered results | N/A |
| DISC-05 | Subscribe with single tap | manual-only | Tap [+], observe checkmark + toast | N/A |
| DISC-06 | Unsubscribe from deck | manual-only | Tap checkmark, confirm dialog, observe | N/A |
| DISC-07 | Empty states display correctly | manual-only | Test with empty deck_index, no results | N/A |
| DISC-08 | UI localized in IT and EN | manual-only | Switch language in settings, verify | N/A |

### Sampling Rate
- **Per task commit:** TypeScript check: `pnpm --filter @lumio/android exec -- npx tsc --noEmit`
- **Per wave merge:** TypeScript check + manual device test
- **Phase gate:** Full manual walkthrough on physical Android device

### Wave 0 Gaps
None -- this phase is pure UI with no existing test infrastructure in the Android app. All validation is manual and TypeScript compilation checks. The project has no automated UI test setup, and adding one would be out of scope for this phase.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** (direct file reads):
  - `supabase/migrations/20260313000004_search_decks_rpc.sql` -- search_decks RPC signature and behavior
  - `supabase/migrations/20260313000001_deck_index_table.sql` -- deck_index table schema
  - `supabase/migrations/20260313000002_user_repositories_subfolder.sql` -- subfolder_path column and UNIQUE constraint
  - `supabase/migrations/20260313000005_study_rpcs_subfolder_filter.sql` -- subfolder filter pattern in JOINs
  - `supabase/migrations/20260115000001_shared_repositories.sql` -- user_repositories RLS policies
  - `apps/android/navigation/MainNavigator.tsx` -- current 3-tab structure
  - `apps/android/screens/ReposScreen.tsx` -- list screen pattern with FlatList, empty state, toast
  - `apps/android/screens/DashboardScreen.tsx` -- data fetching with useFocusEffect, cancelled flag
  - `apps/android/components/EmptyState.tsx` -- reusable empty state component API
  - `apps/android/components/StatCard.tsx` -- card styling pattern (elevation, shadows, borderRadius)
  - `apps/android/components/RepoListItem.tsx` -- list item with Swipeable, icons, status
  - `packages/core/src/supabase/study.ts` -- RPC call pattern via fetch
  - `packages/core/src/supabase/repositories.ts` -- edge function call pattern
  - `apps/android/i18n/en.ts`, `apps/android/i18n/it.ts` -- i18n key structure
  - `apps/android/lib/theme.ts` -- light/dark color palettes

### Secondary (MEDIUM confidence)
- **React Native documentation** -- FlatList, ScrollView, TextInput, Alert.alert APIs (stable, well-known)
- **Supabase PostgREST documentation** -- REST API for table operations with RLS

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in the project, no new dependencies
- Architecture: HIGH -- all patterns replicate existing codebase patterns exactly
- Pitfalls: HIGH -- identified from direct analysis of database constraints, existing code patterns, and integration points

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- all infrastructure is project-internal, not dependent on external library changes)
