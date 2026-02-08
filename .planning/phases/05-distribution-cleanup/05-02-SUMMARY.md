---
phase: 05-distribution-cleanup
plan: 02
subsystem: ui
tags: [html, css, javascript, landing-page, nginx, bilingual, static-site]

# Dependency graph
requires:
  - phase: 04-study-cards
    provides: Complete Android app ready for distribution
provides:
  - Bilingual (EN/IT) static landing page at apps/landing/
  - Nginx config for static file serving (no SPA fallback)
  - APK download link to GitHub Releases
  - Screenshot placeholder system for future screenshots
affects: [05-03, 05-04, deployment]

# Tech tracking
tech-stack:
  added: [vanilla-html, vanilla-css, vanilla-js]
  patterns: [bilingual-lang-spans, css-only-language-toggle, localStorage-persistence]

key-files:
  created:
    - apps/landing/index.html
    - apps/landing/styles.css
    - apps/landing/script.js
    - apps/landing/package.json
    - apps/landing/screenshots/.gitkeep
  modified:
    - conf/nginx-lumio.conf

key-decisions:
  - "LANDING-01: Pure CSS language toggle using html[lang] attribute selectors instead of JS DOM manipulation"
  - "LANDING-02: Screenshot placeholders use CSS ::after pseudo-element with onerror/onload for graceful degradation"

patterns-established:
  - "Bilingual content: dual <span lang='en/it'> elements, CSS hides inactive language based on html[lang]"
  - "Landing page is zero-dependency static site (no build step, no framework)"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 5 Plan 02: Landing Page Summary

**Bilingual static landing page with purple/amber branding, APK download CTA, and nginx static-file config replacing SPA fallback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T10:17:00Z
- **Completed:** 2026-02-08T10:18:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete bilingual (EN/IT) landing page with language toggle persisted to localStorage
- Purple (#7C3AED) / amber (#F59E0B) branded design with responsive mobile-first layout
- APK download buttons linking to GitHub Releases latest
- Three feature cards explaining Git-powered content, AI quizzes, and spaced repetition
- Screenshot placeholder system with graceful CSS fallback
- Nginx config updated from SPA to static file serving with asset caching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create landing page files (HTML, CSS, JS) and package.json** - `748ddbe` (feat)
2. **Task 2: Update nginx config for static file serving** - `b2ca900` (chore)

## Files Created/Modified
- `apps/landing/index.html` - Bilingual landing page with hero, features, screenshots, download CTA, footer
- `apps/landing/styles.css` - Purple/amber palette, responsive grid, dark theme, screenshot placeholders
- `apps/landing/script.js` - Language toggle with localStorage persistence and browser language detection
- `apps/landing/package.json` - @lumio/landing workspace package definition
- `apps/landing/screenshots/.gitkeep` - Placeholder directory for future screenshots
- `conf/nginx-lumio.conf` - Static file serving with =404, regex-based asset caching

## Decisions Made
- **LANDING-01:** Used pure CSS `html[lang]` attribute selectors for language visibility toggle instead of JS `style.display` manipulation. Both language spans are always in the DOM; CSS hides the inactive language. Simpler, no FOUC, works without JS for the default language.
- **LANDING-02:** Screenshot images use `onerror` to self-hide and CSS `::after` pseudo-element for "Screenshot coming soon" placeholder text. When real screenshots are added, `onload` adds a class that hides the placeholder text.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landing page ready for deployment to /var/www/lumio
- Screenshots directory ready for real app screenshots
- APK download link will work once first GitHub Release is published
- Nginx config ready to be deployed to production server

---
*Phase: 05-distribution-cleanup*
*Completed: 2026-02-08*
