# Phase 13: UX Fixes - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two UX issues: (1) Android system navigation bar overlapping card content during study sessions, and (2) settings section header styling inconsistency. No new features — pure visual/layout fixes.

</domain>

<decisions>
## Implementation Decisions

### Card preview navbar overlap
- The Android system navigation bar (3-button or gesture) covers the bottom of card content during study
- Fix strategy: card content area must avoid the system nav bar zone — content ends above the nav bar, no overlap
- Investigate whether the issue affects all card views (question + answer) or only certain views — Claude to determine scope during research
- Also investigate whether the study screen has an app bar at top — Claude to check current layout
- Do NOT make content scroll behind the nav bar — keep it fully visible at all times

### Settings header style
- Rename "Connesso come" section header to "ACCOUNT" with same uppercase style as "ASPETTO" and other section headers
- Add Google profile image: circular avatar displayed alongside user name/email in the ACCOUNT section
- Layout of avatar + name/email: Claude's discretion to design what fits best with existing settings style
- Audit all section headers in Settings — fix any other inconsistent ones found, not just "Connesso come"

### Claude's Discretion
- Card preview fix: exact safe area / padding implementation approach
- Settings: avatar + name/email layout design
- Settings: whether "ACCOUNT" needs i18n localization (likely universal, but check existing patterns)
- Settings: loading/fallback state for profile image if unavailable

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants Google profile image visible in settings account section
- Card fix should use safe area insets to avoid the system nav bar — not scroll-behind

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-ux-fixes*
*Context gathered: 2026-02-11*
