---
status: complete
phase: 34-dashboard-stat-cards
source: [34-01-SUMMARY.md]
started: 2026-03-05T18:15:00Z
updated: 2026-03-05T18:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Two-column stat layout
expected: "Ultimo studio" and "Da ripassare oggi" cards sit side-by-side on the same row, each taking half the width, matching the Repository/Schede row above.
result: pass

### 2. Verbose relative time (IT)
expected: "Ultimo studio" card shows localized verbose relative time in Italian — e.g. "ieri", "2 giorni fa", "un'ora fa", "Adesso" — not an absolute date.
result: pass

### 3. Non-navigable last studied card
expected: Tapping the "Ultimo studio" card does nothing — no navigation, no screen change, no ripple effect leading anywhere.
result: pass

### 4. Caught-up text
expected: When no cards are due for review, "Da ripassare oggi" shows "In pari" (IT) or "All done" (EN) instead of a longer message.
result: pass

### 5. Light/dark mode rendering
expected: Both half-width stat cards render correctly in both light and dark mode — text readable, icons visible, no clipping or overflow.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
