---
status: resolved
trigger: "SRS write-back only fires when the user presses next card, NOT when they answer. Last answered card lost on session close."
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T12:00:00Z
---

## Current Focus

hypothesis: SRS write-back is exclusively inside handleNext's setSession updater; there is no write-back in handleAnswer, and no flush-on-unmount logic. Closing the session (X button / navigation.goBack) after answering but before pressing "Next" silently drops the last card's review.
test: Trace all call sites of recordCardReviewWithRetry and all navigation-exit paths
expecting: Only one call site (handleNext), zero cleanup/unmount hooks
next_action: confirm by reading code + trace X-button handler

## Symptoms

expected: Every answered card's SRS review is recorded to the database
actual: The last card answered before closing (X button) is never written back
errors: none (silent data loss)
reproduction: Answer a card, then press X (close) instead of "Next" — that card's review is lost
started: Since SRS write-back was introduced (phase 24-01)

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-26T00:01
  checked: useStudySession.ts — handleAnswer (line 266-271)
  found: handleAnswer ONLY sets userAnswer in state. No SRS write-back call.
  implication: Answering a card does not persist the review.

- timestamp: 2026-02-26T00:02
  checked: useStudySession.ts — handleNext (lines 207-261)
  found: SRS write-back (recordCardReviewWithRetry) is called ONLY inside handleNext's setSession updater at lines 227-229. It checks prev.currentCard && prev.currentQuestion && prev.userAnswer !== null, then fires the write-back before loading the next card.
  implication: This is the ONLY place recordCardReviewWithRetry is called. Confirmed single call site.

- timestamp: 2026-02-26T00:03
  checked: useStudySession.ts — entire file for cleanup/unmount
  found: No useEffect cleanup, no beforeunload handler, no flush-on-unmount logic. The hook returns no "flush" or "cleanup" function.
  implication: When the component unmounts (user presses X), pending state is simply discarded.

- timestamp: 2026-02-26T00:04
  checked: StudyScreen.tsx — X button handler (line 118)
  found: The X button (close icon) calls navigation.goBack() directly with zero pre-processing. No flush, no save, no check for pending answers.
  implication: Pressing X unmounts StudyScreen, which unmounts useStudySession, which discards the pending last-card answer without write-back.

- timestamp: 2026-02-26T00:05
  checked: StudyScreen.tsx — session completion flow (lines 54-84)
  found: The useEffect watching session.state === 'completed' saves the session summary (saveStudySession) and navigates to StudySummary. But session.state only becomes 'completed' when handleNext runs and loadNextQuestion returns null (no more cards). If the user closes before pressing Next on the last card, state never transitions to 'completed'.
  implication: Even the "natural" completion path depends on handleNext being called. Early exit bypasses everything.

## Resolution

root_cause: recordCardReviewWithRetry is called exclusively inside handleNext (the "Next card" button handler). handleAnswer only updates local state. There is no flush-on-unmount, no cleanup hook, and no interception of the X-button navigation. When a user answers the last card and closes the session without pressing "Next", the SRS review for that card is silently lost.
fix:
verification:
files_changed: []
