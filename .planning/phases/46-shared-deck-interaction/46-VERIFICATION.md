---
phase: 46-shared-deck-interaction
verified: 2026-03-17T10:15:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 46: Shared Deck Interaction Verification Report

**Phase Goal:** Users can manage and browse shared decks with the same interactions available for personal repositories
**Verified:** 2026-03-17T10:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unsubscribing from a deck atomically deletes both user_repositories row and all card_review_schedule entries | VERIFIED | Migration SQL uses single plpgsql transaction with DELETE FROM card_review_schedule (USING cards join) + DELETE FROM user_repositories |
| 2 | The client can call unsubscribeDeckRpc to trigger server-side atomic deletion | VERIFIED | discovery.ts exports `unsubscribeDeckRpc` calling `rpc/unsubscribe_deck` via POST; re-exported from index.ts |
| 3 | CardList route accepts optional subfolderPath parameter for shared deck navigation | VERIFIED | AppNavigator.tsx line 32: `CardList: { repoId: string; repoName: string; subfolderPath?: string }` |
| 4 | All unsubscribe-related i18n keys exist in both EN and IT | VERIFIED | All 6 keys present in both en.ts (repos section, lines 64-69) and it.ts (repos section, lines 67-72) |
| 5 | User sees shared decks and personal repos in a single unified list (shared decks first alphabetical, then repos alphabetical) | VERIFIED | ReposScreen.tsx useMemo creates `unifiedList` with deckItems (sorted) then repoItems (sorted); FlatList uses `data={unifiedList}`; no ListFooterComponent present |
| 6 | User can swipe left on a shared deck to reveal an unsubscribe action identical to the repo delete pattern | VERIFIED | SharedDeckListItem.tsx: Swipeable with rightThreshold=40, overshootRight=false, renderRightActions with colors.danger background, trash-outline icon, swipeableRef.current?.close() before callback |
| 7 | Tapping unsubscribe shows a confirmation dialog warning about study data loss, then calls the atomic RPC | VERIFIED | ReposScreen.tsx handleUnsubscribeDeck: Alert.alert with unsubscribeTitle/unsubscribeBody, destructive button calls `unsubscribeDeckRpc(repositoryId, subfolderPath)` |
| 8 | User can tap a shared deck to navigate to CardList filtered by subfolder path | VERIFIED | ReposScreen.tsx navigate call passes `subfolderPath: item.deck.subfolder_path`; CardListScreen.tsx filters by `card.filePath.startsWith(subfolderPath)` |
| 9 | User can tap a card in a shared deck's card list to view full card detail with markdown, code, LaTeX, and images | VERIFIED | CardListScreen.tsx handleCardPress calls `navigation.navigate('CardDetail', { card, repository })` with fallback Repository object construction for shared decks |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260317000001_unsubscribe_deck_rpc.sql` | Atomic unsubscribe_deck RPC function | VERIFIED | Contains CREATE OR REPLACE FUNCTION unsubscribe_deck, SECURITY DEFINER, auth.uid(), DELETE FROM card_review_schedule, DELETE FROM user_repositories. 37 lines. |
| `packages/core/src/supabase/discovery.ts` | Client-side unsubscribeDeckRpc function calling the RPC | VERIFIED | Exports `unsubscribeDeckRpc` at line 209. Calls `${supabaseUrl}/rest/v1/rpc/unsubscribe_deck`. Existing `unsubscribeFromDeck` preserved. 331 lines. |
| `packages/core/src/index.ts` | Re-export of unsubscribeDeckRpc | VERIFIED | Line 87: `unsubscribeDeckRpc` in the discovery export block. |
| `apps/android/navigation/AppNavigator.tsx` | Extended CardList route params with subfolderPath | VERIFIED | Line 32: `CardList: { repoId: string; repoName: string; subfolderPath?: string }` |
| `apps/android/i18n/en.ts` | English unsubscribe strings | VERIFIED | 6 keys in repos section: unsubscribeTitle, unsubscribeBody, unsubscribe, unsubscribed, unsubscribedBody, unsubscribeFailed |
| `apps/android/i18n/it.ts` | Italian unsubscribe strings | VERIFIED | 6 keys in repos section matching EN structure, correct Italian translations |
| `apps/android/components/SharedDeckListItem.tsx` | Swipeable shared deck list row with compass icon and unsubscribe action | VERIFIED | 131 lines (exceeds min 60). compass-outline, chevron-forward, trash-outline, Swipeable, colors.danger, colors.primary, rightThreshold=40, overshootRight=false, accessibilityRole="button" |
| `apps/android/screens/ReposScreen.tsx` | Unified list merging repos + shared decks, unsubscribe handler, shared deck tap navigation | VERIFIED | Contains ListItem discriminated union, unifiedList useMemo, handleUnsubscribeDeck, FlatList data={unifiedList}, SharedDeckListItem import, unsubscribeDeckRpc import. No ListFooterComponent. |
| `apps/android/screens/CardListScreen.tsx` | Subfolder-aware card filtering for shared decks | VERIFIED | Destructures subfolderPath from route.params; `card.filePath.startsWith(subfolderPath)` filter; fallback Repository object with updatedAt field; lumioignore skipped when subfolderPath is set |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/src/supabase/discovery.ts` | `supabase/migrations/20260317000001_unsubscribe_deck_rpc.sql` | RPC call to unsubscribe_deck | WIRED | discovery.ts line 217: `fetch(\`${supabaseUrl}/rest/v1/rpc/unsubscribe_deck\`, ...)` |
| `packages/core/src/index.ts` | `packages/core/src/supabase/discovery.ts` | re-export of unsubscribeDeckRpc | WIRED | index.ts line 87: `unsubscribeDeckRpc` in discovery export block |
| `apps/android/components/SharedDeckListItem.tsx` | `apps/android/screens/ReposScreen.tsx` | onPress and onUnsubscribe callbacks | WIRED | ReposScreen imports SharedDeckListItem (line 25), uses it in renderItem with onPress and onUnsubscribe={handleUnsubscribeDeck} props |
| `apps/android/screens/ReposScreen.tsx` | `packages/core/src/supabase/discovery.ts` | unsubscribeDeckRpc import | WIRED | ReposScreen line 17: `unsubscribeDeckRpc` in @lumio/core import; called at line 210 |
| `apps/android/screens/ReposScreen.tsx` | `apps/android/screens/CardListScreen.tsx` | navigation.navigate('CardList', { repoId, repoName, subfolderPath }) | WIRED | ReposScreen lines 265-269: navigate with repoId, repoName, subfolderPath: item.deck.subfolder_path |
| `apps/android/screens/CardListScreen.tsx` | `apps/android/screens/CardDetailScreen.tsx` | navigation.navigate('CardDetail', { card, repository }) | WIRED | CardListScreen line 105: `navigation.navigate('CardDetail', { card, repository })` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DECK-01 | 46-01, 46-02 | L'utente può disiscriversi da un mazzo condiviso tramite swipe a sinistra nella pagina Repository (con cancellazione dati studio) | SATISFIED | atomic SQL RPC deletes card_review_schedule + user_repositories; SharedDeckListItem swipe-to-unsubscribe; handleUnsubscribeDeck with Alert confirmation |
| DECK-02 | 46-01, 46-02 | L'utente può fare tap su un mazzo condiviso per vedere la lista carte filtrate per subfolder | SATISFIED | subfolderPath route param added; CardListScreen filters by card.filePath.startsWith(subfolderPath) |
| DECK-03 | 46-02 | L'utente può navigare dal mazzo condiviso al dettaglio singola carta (markdown preview, code, LaTeX, immagini) | SATISFIED | CardListScreen navigates to CardDetail with card + fallback Repository; CardDetailScreen pre-existing handles markdown/code/LaTeX/images |

All three requirements from REQUIREMENTS.md phase mapping are SATISFIED. No orphaned requirements.

### Anti-Patterns Found

No anti-patterns found across all six phase files. No TODO/FIXME/HACK/PLACEHOLDER comments, no empty return implementations, no stub handlers.

### Human Verification Required

#### 1. Swipe Gesture — Unsubscribe Action Renders Correctly

**Test:** Open the Repositories screen on a device that has at least one shared deck subscription. Swipe left on a shared deck row.
**Expected:** A red (danger color) action button appears with a trash icon and "Unsubscribe" label. The row snaps at 80px width.
**Why human:** Gesture rendering and visual layout on device cannot be verified programmatically.

#### 2. Confirmation Dialog Content

**Test:** After swiping and tapping the unsubscribe action, observe the Alert.
**Expected:** Dialog title reads 'Unsubscribe from "DeckName"?', body warns about permanent deletion of study progress, Cancel and Unsubscribe (destructive) buttons are present.
**Why human:** Alert.alert rendering and string interpolation requires runtime verification.

#### 3. Shared Deck Card List Subfolder Filtering

**Test:** Tap a shared deck in the Repositories screen. Observe the card list that appears.
**Expected:** Only cards whose filePath starts with the deck's subfolder_path are shown. Cards from other subfolders of the same repository are absent.
**Why human:** Requires a repository with multiple subfolders and an active subscription to verify filtering in practice.

#### 4. CardDetail Navigation for Shared Deck

**Test:** From a shared deck card list, tap any card.
**Expected:** CardDetail screen opens and renders the full card with markdown, code blocks, LaTeX (if present), and images.
**Why human:** Visual rendering of markdown/LaTeX/images requires device and content that exercises those paths.

### Gaps Summary

No gaps. All automated checks pass. All must-haves from both plans verified against actual codebase.

The one deviation from plan (card.file_path vs card.filePath) was caught and auto-fixed by the executor and committed in 24b5982. The fix is correct: CardListScreen uses `card.filePath.startsWith(subfolderPath)` matching the Card type's camelCase property.

---

_Verified: 2026-03-17T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
