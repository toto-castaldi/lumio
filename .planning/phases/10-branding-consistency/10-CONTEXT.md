# Phase 10: Branding Consistency - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure the Lumio brand appears correctly at every touchpoint: Android launcher icon, Login screen, and Dashboard header. No new screens or capabilities — just correct branding across existing surfaces.

</domain>

<decisions>
## Implementation Decisions

### Launcher icon
- Logo mark only (no text) — standard for app icons
- Must work on both light and dark Android launchers
- Claude's discretion on adaptive icon background (solid color vs transparent) based on Android guidelines
- Claude picks which SVG source (logo.svg or logo-circle.svg) works best for adaptive icon format

### Logo presentation (Login screen)
- Logo image + separate "Lumio" text rendered by the app (not baked into the image)
- Large, centered — logo is the hero element above the sign-in button
- Adapts to dark/light theme (different logo variant or text color per theme)

### Logo presentation (Dashboard header)
- Logo image + separate "Lumio" text rendered by the app
- Adapts to dark/light theme
- Claude's discretion on exact placement — replace or integrate with current header layout

### Asset pipeline
- Source of truth: `logo.svg` and `logo-circle.svg` at repo root
- Claude generates all needed PNGs from SVGs during implementation (launcher icon, login logo, header logo at all density scales)
- Brand colors extracted from the SVG files

### Claude's Discretion
- Adaptive icon background approach (solid color or transparent)
- Which SVG variant for launcher icon
- Dashboard header logo placement/sizing
- PNG generation tooling and exact sizes
- Dark/light theme logo variants implementation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: the word "Lumio" must be visible text on both Login and Dashboard screens.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-branding-consistency*
*Context gathered: 2026-02-10*
