---
status: complete
phase: 46-shared-deck-interaction
source: [46-01-SUMMARY.md, 46-02-SUMMARY.md]
started: 2026-03-17T10:00:00Z
updated: 2026-03-17T10:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Shared Decks Appear in Repos Screen
expected: Open the Repos tab. Shared decks (subscribed via discovery) appear at the top of the list before personal repositories. Each shared deck shows a compass icon, display name, subtitle with owner/path info, and a chevron arrow on the right.
result: pass

### 2. Swipe to Reveal Unsubscribe Action
expected: Swipe left on a shared deck item. A red trash/unsubscribe action is revealed behind the item.
result: pass

### 3. Unsubscribe Confirmation Dialog
expected: After swiping and tapping the unsubscribe action (or completing the swipe), an Alert dialog appears asking to confirm unsubscription with the deck name.
result: pass

### 4. Unsubscribe Removes Deck
expected: Confirm the unsubscribe dialog. The shared deck is removed from the list. A success toast notification appears.
result: pass

### 5. Tap Shared Deck to Browse Cards
expected: Tap a shared deck item. CardListScreen opens showing only the cards from that deck's subfolder (not all cards in the repository).
result: pass

### 6. Card Detail from Shared Deck
expected: From the shared deck card list, tap a card. CardDetail screen opens and renders the card's markdown content correctly.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
