---
phase: 49-deck-builder-navigation
verified: 2026-03-18T10:30:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Open apps/landing/index.html in browser. Toggle language with IT/EN button. Verify header shows 'Create Deck' in EN and 'Crea Mazzo' in IT."
    expected: "Both spans toggle correctly; only the active language label is visible"
    why_human: "CSS display:none toggling via html[lang] attribute cannot be confirmed by grep — only runtime DOM state shows which span is active"
  - test: "Click the header 'Create Deck' / 'Crea Mazzo' link. Verify it opens https://deck.lumio.toto-castaldi.com in a new browser tab."
    expected: "New tab opens at deck.lumio.toto-castaldi.com without navigating away from the landing page"
    why_human: "target=_blank behavior requires a browser to confirm; programmatic check only confirms attribute presence"
  - test: "Click the hero outline button 'Create Deck' / 'Crea Mazzo'. Verify it also opens https://deck.lumio.toto-castaldi.com in a new browser tab."
    expected: "New tab opens at deck.lumio.toto-castaldi.com"
    why_human: "Same reason as above"
  - test: "Resize browser to below 480px width. Verify both hero buttons (amber Download APK and purple Crea Mazzo) go full-width and remain vertically stacked."
    expected: "Both buttons span 100% of container width with column layout"
    why_human: "CSS @media query behavior requires a browser viewport to verify"
---

# Phase 49: Deck Builder Navigation Verification Report

**Phase Goal:** Visitors can discover and reach the deck builder directly from the landing page
**Verified:** 2026-03-18T10:30:00Z
**Status:** human_needed (all automated checks pass; visual/functional confirmation pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visitor sees a purple 'Create Deck' / 'Crea Mazzo' link in the header, left of the language toggle | VERIFIED | `index.html:28-34` — `.header-right` div contains `.header-link` anchor before `#lang-toggle` button |
| 2 | Visitor sees an outline purple 'Create Deck' / 'Crea Mazzo' button in the hero section below the Download APK button | VERIFIED | `index.html:47-56` — `.hero-buttons` div has `.btn-download` first, `.btn-deck-builder` second; CSS sets `flex-direction: column` |
| 3 | Both navigation elements open deck.lumio.toto-castaldi.com in a new tab | VERIFIED | Both anchors have `href="https://deck.lumio.toto-castaldi.com" target="_blank" rel="noopener"` (lines 29, 52) |
| 4 | Both elements switch label between IT and EN when the language toggle is clicked | VERIFIED (automation only) | Both anchors contain `<span lang="en">Create Deck</span>` and `<span lang="it">Crea Mazzo</span>`; CSS `html[lang="en"] [lang="it"] { display: none !important }` pattern is present; runtime toggle requires human confirmation |

**Score:** 4/4 truths verified (automated); 4 items flagged for human visual/functional confirmation

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/landing/index.html` | Header link and hero button HTML elements with bilingual span tags and deck builder URL | VERIFIED | File exists, substantive (163 lines), contains all required elements: `.header-right`, `.header-link`, `.hero-buttons`, `.btn-deck-builder`, 2x `deck.lumio.toto-castaldi.com`, 2x `Create Deck`, 2x `Crea Mazzo` |
| `apps/landing/styles.css` | Outline button styles (.btn-deck-builder) and header link styles (.header-link) | VERIFIED | File exists, substantive (367 lines), contains `.header-right` (line 91), `.header-link` (line 97), `.hero-buttons` (line 153), `.btn-deck-builder` (line 160) with `background-color: transparent` and `border: 2px solid var(--purple-primary)`, plus responsive rules at 480px |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/landing/index.html` | `https://deck.lumio.toto-castaldi.com` | `href` with `target="_blank"` | WIRED | Exactly 2 occurrences — line 29 (header) and line 52 (hero) — both with `target="_blank" rel="noopener"` |
| `apps/landing/index.html` | `apps/landing/styles.css` | CSS classes `.btn-deck-builder` and `.header-link` | WIRED | HTML references `class="header-link"` (line 29), `class="btn-deck-builder"` (line 52), `class="hero-buttons"` (line 47), `class="header-right"` (line 28); all four classes are defined in styles.css |
| `apps/landing/index.html` | `apps/landing/script.js` | `<span lang>` pattern — no JS changes needed | WIRED | `<span lang="en">` and `<span lang="it">` elements present in both new anchors; script.js was not modified (last commit to it is `748ddbe`, predating phase 49) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NAV-01 | 49-01-PLAN.md | Link al deck builder visibile nell'header della landing page | SATISFIED | `.header-link` anchor at `index.html:29` inside `.header-right` wrapper; `href="https://deck.lumio.toto-castaldi.com"` confirmed |
| NAV-02 | 49-01-PLAN.md | Bottone secondario "Crea Deck" nell'hero accanto a "Download APK" | SATISFIED | `.btn-deck-builder` anchor at `index.html:52` inside `.hero-buttons`; stacked below `.btn-download` via `flex-direction: column` |

No orphaned requirements: REQUIREMENTS.md maps only NAV-01 and NAV-02 to Phase 49. Both are claimed in the plan and verified in the codebase.

**Note on label deviation:** The plan specified Italian label "Crea Deck". The implementation uses "Crea Mazzo" following user feedback during the visual review checkpoint. This is a documented, user-approved deviation (commit `c493ce4`). The requirement text ("Crea Deck" as a generic label concept) is satisfied by the more correct Italian translation "Crea Mazzo".

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No anti-patterns found | — | — | — | — |

Scanned `apps/landing/index.html` and `apps/landing/styles.css` for TODO/FIXME/placeholder comments, empty implementations, and stub patterns. None found. The screenshot section contains a `::after { content: "Screenshot coming soon" }` pseudo-element, but this is pre-existing and unrelated to phase 49.

---

## Human Verification Required

### 1. Language toggle switches new elements

**Test:** Open `apps/landing/index.html` in a browser. Click the IT/EN toggle button. Observe both the header link and the hero button.
**Expected:** Labels switch between "Create Deck" (EN) and "Crea Mazzo" (IT) for both elements simultaneously.
**Why human:** The bilingual mechanism relies on CSS `display: none` applied to `[lang]` spans based on `html[lang]` attribute set by JavaScript at runtime. Grep confirms the spans and CSS rules exist but cannot verify the DOM toggle executes correctly.

### 2. Header link opens deck builder in new tab

**Test:** Click the "Create Deck" / "Crea Mazzo" link in the header.
**Expected:** `https://deck.lumio.toto-castaldi.com` opens in a new browser tab; the landing page remains open.
**Why human:** `target="_blank"` attribute presence confirmed by grep, but actual new-tab behavior requires a browser.

### 3. Hero button opens deck builder in new tab

**Test:** Click the purple outline "Create Deck" / "Crea Mazzo" button in the hero section.
**Expected:** `https://deck.lumio.toto-castaldi.com` opens in a new browser tab.
**Why human:** Same as above.

### 4. Responsive layout on mobile (480px)

**Test:** Open the landing page and resize the browser below 480px width (or use DevTools device emulation).
**Expected:** Both hero buttons (amber "Download APK" / "Scarica APK" and purple outline "Create Deck" / "Crea Mazzo") expand to 100% container width and remain stacked vertically.
**Why human:** `@media (max-width: 480px)` CSS rules with `width: 100%` confirmed in stylesheet, but rendering requires a browser viewport.

---

## Gaps Summary

No gaps. All automated checks pass:

- Both new HTML elements exist with correct structure, classes, bilingual spans, and href/target attributes
- Both CSS classes are defined with correct property values (transparent background, 2px purple border, hover fill, flex column layout)
- Both anchors link to the correct URL with `target="_blank" rel="noopener"`
- No modifications to `script.js`
- Both requirements (NAV-01, NAV-02) are satisfied
- No anti-patterns detected

The four human verification items are standard visual/behavioral checks that cannot be confirmed by static analysis. The automated evidence strongly supports that all four will pass.

---

_Verified: 2026-03-18T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
