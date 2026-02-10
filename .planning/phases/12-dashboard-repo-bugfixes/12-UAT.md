---
status: complete
phase: 12-dashboard-repo-bugfixes
source: [12-01-SUMMARY.md]
started: 2026-02-10T11:20:00Z
updated: 2026-02-10T11:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard shows "Last studied" timestamp after study session
expected: Complete a study session, return to dashboard. The "Last studied" stat card shows a relative timestamp (e.g., "Just now") instead of "Non ancora".
result: pass

### 2. Last studied timestamp persists after app restart
expected: After completing a study session and seeing the timestamp on the dashboard, close the app completely and reopen it. The dashboard should still show the "Last studied" timestamp (with an updated relative time like "2m ago"), not "Non ancora".
result: pass

### 3. Public repos show globe icon
expected: On the repository list, any public repository displays a small globe icon next to its name (globe-outline). The icon should be visible without tapping or expanding.
result: pass

### 4. Private repos show lock icon
expected: On the repository list, any private repository displays a small lock icon next to its name (lock-closed). This should be unchanged from before.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
