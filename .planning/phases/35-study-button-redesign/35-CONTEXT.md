# Phase 35: Study Button Redesign - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the wide rectangular study CTA button with a centered circular icon-only play button. Same navigation behavior (tap → Study screen), new visual design. No text label.

</domain>

<decisions>
## Implementation Decisions

### Button size & shape
- Circular button, medium size (56-64px diameter)
- Play icon proportionally large (~28-30px) — fills the circle well
- Elevated with shadow (keep existing elevation: 4, shadow pattern)
- White play icon on colored background

### Disabled state
- Gray out in place — circle stays visible but uses border/gray color + reduced opacity (0.5)
- While loading: show ActivityIndicator spinner inside the grayed circle (replacing play icon)
- When no cards: gray background with play icon visible but dimmed

### Position & spacing
- Inside ScrollView (scrolls with content, not fixed overlay)
- Vertically centered in remaining space between stat cards and bottom of visible screen
- Button is a hero element — generous breathing room above and below

### Claude's Discretion
- Exact button diameter within 56-64px range
- Exact icon size within 28-30px range
- Button color (choose best fit from existing theme colors — primary, or another)
- Shadow values (can adjust from current elevation: 4 if needed for circle)
- Centering implementation approach (flex, absolute positioning, etc.)

</decisions>

<specifics>
## Specific Ideas

- Requirement STUD-01: "Pulsante studio circolare centrato con sola icona play (nessun testo)"
- Remove the text label entirely — both `startStudySession` and `studyNDueCards` i18n strings no longer used in button
- "Centered in remaining space" means it should feel balanced on screen, not just marginTop below cards

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardScreen.tsx` lines 228-251: Current study button — replace TouchableOpacity content and styles
- `handleStudyPress()` and `isStudyDisabled` logic: Keep as-is, only visual changes needed
- Ionicons `play` icon already imported and used — keep same icon library
- ActivityIndicator already used for loading state — adapt to circular shape

### Established Patterns
- Theme colors via `useTheme()` → `colors.primary`, `colors.border` for disabled
- Shadow pattern: `elevation: 4, shadowColor: '#000', shadowOffset: {0,2}, shadowOpacity: 0.15, shadowRadius: 4`
- White (#ffffff) on primary for button content

### Integration Points
- `DashboardScreen.tsx` lines 278-297: `studyButton` and `studyButtonText` styles — replace with circular styles, remove text style
- `studyButtonText` style can be deleted entirely
- i18n keys `dashboard.startStudySession` and `dashboard.studyNDueCards` — no longer rendered in button (may still be used elsewhere, check before removing)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-study-button-redesign*
*Context gathered: 2026-03-05*
