---
status: complete
phase: 25-dashboard-study-ui
source: 25-01-SUMMARY.md
started: 2026-02-26T13:30:00Z
updated: 2026-02-26T13:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Due Today counter on Dashboard
expected: Dashboard shows a "Due Today" StatCard. If you have cards due, it shows the count with an amber alarm icon. If no cards are due, it shows 0 with an emerald checkmark icon and "All caught up!" text.
result: pass

### 2. Dynamic study button text
expected: When due cards > 0, the study button reads "Study N due cards" (with actual count). When due cards = 0, it reads "Start Study Session".
result: pass

### 3. Dashboard refreshes on return from study
expected: Complete a study session (answer at least one card), then go back to Dashboard. The due counter and stats should update automatically without needing to pull-to-refresh or restart the app.
result: pass

### 4. Review/New badge pill during study
expected: During a study session, the progress bar shows a colored badge pill: "Review" in teal when reviewing a previously seen card, or "New" in green when studying a new card. The badge changes as you move between cards.
result: pass

### 5. Italian localization of new elements
expected: Switch language to Italian. Dashboard due counter, study button text, and badge labels should all appear in Italian (e.g., "Da ripassare oggi", "Studia N carte in scadenza", "Ripasso", "Nuova").
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
