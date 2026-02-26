# Phase 26: History Fix & Validation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix study history display to show accurate card counts per session, and verify all SRS correctness guarantees end-to-end: fresh user flow, timezone-aware due counter, and ease factor floor enforcement. No new features — purely fixes and validation of existing SRS logic.

</domain>

<decisions>
## Implementation Decisions

### History row format
- Replace "All repositories" / "Tutti i repository" with card count: "10 cards" / "10 carte"
- Card count must be localized (i18n) — Italian and English
- Date/time shown as relative ("2 hours ago", "Yesterday", "3 days ago")
- Flat chronological list, most recent first — no day grouping

### Fresh user experience
- New (never-reviewed) cards count as "due" in the dashboard counter — encourages first-time study
- When a fresh user taps Study with unreviewed cards, show them all as new cards immediately
- Empty state for study screen (no cards at all): friendly message + CTA to import a deck / go to repositories
- Empty state for study history screen (no sessions yet): friendly message + CTA to start first session

### Timezone behavior
- "Today" determined by device local midnight — due counter resets at 00:00 local time
- Calculation happens server-side: client sends timezone to server, server filters due cards accordingly
- Due counter updates live if device timezone changes (travel scenario)
- next_review_at stored as UTC timestamps in database, converted to local on client for comparison

### SRS floor enforcement
- No UI indication when ease factor hits the 1.3 floor — silent enforcement
- Ease factor floor (1.3) and minimum interval (1 day) are hardcoded — not configurable
- Wrong answer resets interval to 1 day (strict SM-2, no lapse multiplier)
- Defense in depth: CHECK constraints on DB (ease_factor >= 1.3, interval >= 1) AND app-level enforcement

### Claude's Discretion
- Exact i18n key naming and pluralization approach
- How to pass timezone from client to server (query param, header, or body field)
- Empty state illustration/icon choices
- Migration strategy for adding DB CHECK constraints

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-history-fix-validation*
*Context gathered: 2026-02-26*
