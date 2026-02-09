# Phase 6: Bugfix & Version - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix card preview content cutoff in the bottom-sheet and display the actual installed app version in Settings. No new features — this phase fixes existing broken behavior and replaces a hardcoded placeholder.

</domain>

<decisions>
## Implementation Decisions

### Card preview behavior
- Dismiss by swiping down or tapping the overlay — no close button (X)
- Claude's discretion on scroll vs expand pattern for long content
- Claude's discretion on vertical alignment (top vs centered for short content)

### Version display
- Show version number only: "v1.2.0" format — no app name prefix, no build number
- Tappable: tap to copy version to clipboard, with toast confirmation
- Claude's discretion on placement within Settings (bottom of screen vs About section)

### Preview content rendering
- Switch from WebView to native rendering — but must keep LaTeX support
- Syntax highlighting for code blocks (color-coded with language detection)
- Images displayed at full width, maintaining aspect ratio
- Content must respect the app's dark/light theme (background, text colors, code blocks adapt)

### Claude's Discretion
- Bottom-sheet height and scroll behavior for card preview
- Vertical alignment of short content in preview
- Version placement within Settings screen
- Choice of native markdown/LaTeX rendering library
- Loading skeleton design if applicable
- Error state handling for failed renders

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants native rendering over WebView, but LaTeX support is non-negotiable
- Cards do NOT have a front/back concept — they are single-content items

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-bugfix-version*
*Context gathered: 2026-02-09*
