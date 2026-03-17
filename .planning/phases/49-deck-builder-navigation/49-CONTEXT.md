# Phase 49: Deck Builder Navigation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add navigation elements to the static landing page (apps/landing/) that link to the deck builder web app at deck.lumio.toto-castaldi.com. Two touchpoints: a header link and a hero CTA button. Pure HTML/CSS changes, no JavaScript beyond existing i18n toggle.

</domain>

<decisions>
## Implementation Decisions

### Hero button style
- Outline purple style: purple border + purple text, transparent background
- Visually secondary to the existing amber "Download APK" solid button
- Stacked layout: Download APK on top (primary), Crea Deck below (secondary)
- Both buttons open deck builder in a new tab (target="_blank" rel="noopener")

### Header link style
- Purple text link positioned left of the IT/EN language toggle
- Lightweight style matching footer links (purple color, no border, underline on hover)
- Opens deck builder in a new tab

### Bilingual labels
- Hero button: "Crea Deck" (IT) / "Create Deck" (EN)
- Header link: "Crea Deck" (IT) / "Create Deck" (EN)
- Same text for both touchpoints, translated per language using existing `<span lang>` pattern

### Claude's Discretion
- Exact spacing/padding between stacked buttons
- Hover state transition details for outline button
- Responsive behavior on mobile (buttons should remain stacked, full-width)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Landing page
- `apps/landing/index.html` — Current HTML structure, lang toggle pattern, hero section
- `apps/landing/styles.css` — Existing button styles (.btn-download), header layout, responsive breakpoints
- `apps/landing/script.js` — Language toggle logic (no changes needed, just awareness)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.btn-download` class: amber solid button with hover lift + shadow — new outline button should share sizing/border-radius
- `.lang-toggle` class: small outlined purple button — reference for header link proximity
- `<span lang="en/it">` pattern: bilingual text toggle used throughout

### Established Patterns
- CSS custom properties: `--purple-primary`, `--amber-primary`, `--text-light`, `--card-bg`
- Header flex layout: `justify-content: space-between` with logo left, toggle right
- Responsive: 768px breakpoint for desktop, 480px for small screens

### Integration Points
- Header: add link element between logo group and lang-toggle (need flex gap or wrapper for right-side items)
- Hero section: add second button below existing `.btn-download`
- No JS changes needed — lang toggle already handles all `<span lang>` elements

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard approach with the decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 49-deck-builder-navigation*
*Context gathered: 2026-03-17*
