---
phase: 22-version-display-docs
plan: 01
subsystem: infra
tags: [landing-page, versioning, ci-cd, deploy-pipeline]

# Dependency graph
requires:
  - phase: 21-gsd-version-pipeline/01
    provides: scripts/extract-version.cjs that reads STATE.md and generates version string
provides:
  - Landing page footer with __LUMIO_VERSION__ placeholder for CI injection
  - CI deploy-landing job that extracts version from STATE.md and injects it into HTML before SCP deploy
affects: [22-version-display-docs]

# Tech tracking
tech-stack:
  added: []
  patterns: [ci-time-version-injection-via-sed]

key-files:
  created: []
  modified:
    - apps/landing/index.html
    - apps/landing/styles.css
    - .github/workflows/ci-deploy.yml

key-decisions:
  - "Version injected at deploy time by CI sed replacement, not fetched at runtime -- zero JS overhead"
  - "deploy-landing uses default ubuntu-latest Node.js (no setup-node) since extract-version.cjs has zero npm deps"

patterns-established:
  - "Landing page version injection: __LUMIO_VERSION__ placeholder replaced by sed in CI before SCP deploy"

requirements-completed: [VER-03, VER-04]

# Metrics
duration: 1min
completed: 2026-02-21
---

# Phase 22 Plan 01: Version Display on Landing Page Summary

**Landing page version badge with CI-time injection via sed replacing __LUMIO_VERSION__ placeholder from STATE.md**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-21T22:41:23Z
- **Completed:** 2026-02-21T22:42:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added version badge placeholder (`v__LUMIO_VERSION__`) in landing page footer with subtle styling
- Wired CI deploy-landing job to extract version from STATE.md and inject into HTML before SCP deploy
- Version is baked into static HTML at deploy time -- no runtime API calls needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add version display to landing page with CI injection placeholder** - `e2836cc` (feat)
2. **Task 2: Wire CI deploy-landing to inject version from STATE.md** - `69aa2d2` (feat)

## Files Created/Modified
- `apps/landing/index.html` - Added `<p class="version-badge">v__LUMIO_VERSION__</p>` before footer credits
- `apps/landing/styles.css` - Added `.version-badge` styling (0.75rem, opacity 0.7, secondary color)
- `.github/workflows/ci-deploy.yml` - Added extract-version and sed injection steps to deploy-landing job

## Decisions Made
- Version injected at deploy time by CI sed replacement, not fetched at runtime -- zero JavaScript overhead
- deploy-landing uses default ubuntu-latest Node.js (no setup-node step) since extract-version.cjs has zero npm dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- On next push to main, landing page will show actual version (e.g., "v1.7") instead of placeholder
- Version edge function (wired in Phase 21) continues to work independently
- All public version surfaces are now covered

## Self-Check: PASSED

All 3 modified files verified present (apps/landing/index.html, apps/landing/styles.css, .github/workflows/ci-deploy.yml). Both task commits (e2836cc, 69aa2d2) verified in git log. YAML syntax validated. __LUMIO_VERSION__ placeholder confirmed in HTML. .version-badge CSS confirmed. CI injection steps confirmed in deploy-landing job.

---
*Phase: 22-version-display-docs*
*Completed: 2026-02-21*
