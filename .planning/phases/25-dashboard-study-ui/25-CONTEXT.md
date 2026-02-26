# Phase 25: Dashboard & Study UI - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface SRS scheduling data in the app UI. The dashboard shows a "cards due today" counter so users know what needs review. During study sessions, each card displays a Review/New badge so users know the card type. No new study logic — this is purely UI surfacing of data from Phase 23-24's SRS infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Due counter on dashboard
- New full-width StatCard placed between existing stats row and the Study CTA button (same slot pattern as Last Studied card)
- When due count > 0: show the number prominently
- When due count = 0: show "All caught up!" message with checkmark icon instead of the number 0
- Not tappable — purely informational display. The Study button below handles navigation
- Uses `get_due_card_count` RPC (already exists from Phase 23)

### Review/New badge in study
- Color-coded pill badge inside the ProgressBar component area, next to the card counter (e.g., "3/10")
- Review cards: blue/teal pill with text "Review"
- New cards: green pill with text "New"
- Text is i18n-localized (en: Review/New, it: Ripasso/Nuova)
- Instant swap when moving to next card — no animation

### Study CTA button text
- Dynamic text based on due count:
  - Due > 0: "Study N due cards" (localized)
  - Due = 0: "Start Study Session" (generic, same as current)
- This means the button text depends on the same `get_due_card_count` RPC data

### Claude's Discretion
- Icon and color scheme for the due counter card (should fit with existing: blue/folder, purple/documents, amber/time)
- Refresh strategy for due count (focus listener vs pull-to-refresh — success criteria requires update on return to dashboard)
- Study button disabled logic (currently disabled when cardCount === 0)

</decisions>

<specifics>
## Specific Ideas

- "All caught up!" with checkmark when 0 due cards — celebratory feel, not just a dead "0"
- Due counter card should feel prominent since it's the key SRS feedback element
- Badge pills should be compact enough to fit inside ProgressBar without crowding

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-dashboard-study-ui*
*Context gathered: 2026-02-26*
