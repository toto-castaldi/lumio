# Phase 4: Study & Cards - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can study pre-generated quiz questions and view card content with markdown/LaTeX rendering. This is the core learning experience: start a session, answer quiz questions with 4 options, get immediate feedback, see explanations, vote on quality, navigate between cards with swipe gestures. Card content renders markdown, code with syntax highlighting, LaTeX formulas, and images. Backend quiz generation and spaced repetition algorithms are NOT in scope (backend unchanged).

</domain>

<decisions>
## Implementation Decisions

### Quiz interaction
- Answer feedback style: Claude's Discretion (inline highlight vs overlay)
- Advance to next card: Claude's Discretion (manual tap vs auto-advance)
- Like/dislike vote appears inline after answering, alongside the explanation (not a separate step)
- Skipped cards are gone for the session (not re-queued)

### Card navigation
- Swipe direction for next/previous: Claude's Discretion
- User can freely go back to previous answered cards to review
- Haptic feedback differentiates correct vs incorrect (light tap for correct, heavier buzz for incorrect)
- Progress bar style: Claude's Discretion

### Content rendering
- Code block syntax highlighting theme: Claude's Discretion
- Long content scroll behavior: Claude's Discretion (scrollable card vs full scroll)
- Images are zoomable (pinch-to-zoom) — useful for diagrams and code screenshots
- LaTeX rendering style: Claude's Discretion

### Study session structure
- Number of cards per session: Claude's Discretion
- End of session: summary screen showing score, correct/incorrect count, time spent, then return to dashboard
- User can quit mid-session: back/X button shows "End session?" confirmation, progress is saved
- Empty state: Study button on dashboard is disabled/grayed when no cards exist

### Claude's Discretion
- Answer feedback presentation (inline vs overlay)
- Card advance mechanism (manual vs auto)
- Swipe direction convention
- Progress bar style (continuous bar, dots, or fraction)
- Code highlighting theme (adaptive vs always dark)
- Long content scroll strategy
- LaTeX rendering approach
- Session card count
- Loading states and transitions
- Error handling during study

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude's judgment on most interaction details, with these firm decisions:
- Haptic feedback MUST differentiate correct/incorrect
- Images MUST be zoomable
- Vote appears alongside explanation (not separate screen)
- Skipped cards don't return in session
- Session ends with summary screen (not silent return)
- Quit confirmation required mid-session
- Study button disabled when no cards available

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-study-cards*
*Context gathered: 2026-02-08*
