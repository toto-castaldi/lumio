---
status: complete
phase: 24-study-session-integration
source: 24-01-SUMMARY.md, 24-02-SUMMARY.md
started: 2026-02-26T09:30:00Z
updated: 2026-02-26T10:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Session Composition on Ready Screen
expected: Start a study session for a deck with overdue + new cards. Ready screen shows breakdown "X cards to study (Y overdue + Z new)" instead of just a plain count.
result: pass

### 2. SRS Card Ordering
expected: During a study session, overdue (review) cards are presented first, followed by new cards. You should see cards you've studied before appearing at the start of the session.
result: pass

### 3. Sequential Card Iteration
expected: Cards are presented in a fixed order (not randomly shuffled). If you navigate back to a previous card and then forward again, you see the same card in the same position.
result: skipped
reason: No back-navigation UI exposed — handleGoToCard exists in code but not accessible to user

### 4. Progress Bar Accuracy
expected: The progress bar advances based on answered cards out of total cards. It should fill proportionally as you answer (not skip) cards through the session.
result: pass

### 5. SRS Write-Back on Answer
expected: After answering cards in a session, closing and starting a new session shows those cards are no longer present (scheduled for future date).
result: issue
reported: "Devo premere anche scheda successiva per non ritrovarmi la scheda nella sessione successiva"
severity: minor

## Summary

total: 5
passed: 3
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "SRS write-back fires immediately when user answers a card"
  status: failed
  reason: "User reported: Devo premere anche scheda successiva per non ritrovarmi la scheda nella sessione successiva"
  severity: minor
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
