---
phase: 21-gsd-version-pipeline
plan: 01
subsystem: infra
tags: [ci-cd, versioning, github-actions, state-md, build-pipeline]

# Dependency graph
requires:
  - phase: 20-cleanup-legacy-versioning/02
    provides: Clean CI without auto-release, hardcoded 0.0.0 placeholder, version.ts comment for Phase 21 handoff
provides:
  - scripts/extract-version.cjs that reads STATE.md and generates version.ts
  - CI pipeline extracting version from STATE.md in all build jobs
  - APK versionName derived from STATE.md milestone
  - Edge Functions version derived from STATE.md milestone
affects: [22-update-public-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns: [state-md-single-source-of-truth, ci-driven-version-generation]

key-files:
  created:
    - scripts/extract-version.cjs
  modified:
    - packages/shared/src/version.ts
    - .github/workflows/ci-deploy.yml
    - package.json

key-decisions:
  - "Used CommonJS (.cjs) for extraction script -- no build step needed, maximum Node.js compatibility"
  - "Script generates entire version.ts file rather than patching -- ensures consistent output"
  - "deploy-functions job uses default ubuntu-latest node (no setup-node) since script has zero npm deps"

patterns-established:
  - "Version pipeline: STATE.md Milestone field -> extract-version.cjs -> version.ts -> all consumers"
  - "CI extract-version step runs before build:packages in every job that needs the version"

requirements-completed: [VER-01, VER-02]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 21 Plan 01: Wire STATE.md Version Pipeline Summary

**CI-driven version pipeline extracting STATE.md Milestone into version.ts, APK versionName, and Edge Functions env vars via scripts/extract-version.cjs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T21:58:02Z
- **Completed:** 2026-02-21T22:01:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created scripts/extract-version.cjs that parses STATE.md Milestone field and generates version.ts
- Wired CI workflow to run extract-version before build:packages in lint-and-typecheck, build-apk, and deploy-functions jobs
- Replaced hardcoded 0.0.0 APK versionName with STATE.md-derived version
- Replaced grep-based version.ts parsing in deploy-functions with the extraction script

## Task Commits

Each task was committed atomically:

1. **Task 1: Create version extraction script and update version.ts** - `7bf18b1` (feat)
2. **Task 2: Wire CI workflow to extract version from STATE.md** - `5321eba` (feat)

## Files Created/Modified
- `scripts/extract-version.cjs` - CommonJS script that reads STATE.md Milestone field and writes version.ts
- `packages/shared/src/version.ts` - Updated with auto-generated header comment; value overwritten by CI at build time
- `.github/workflows/ci-deploy.yml` - Added extract-version steps in 3 jobs; removed hardcoded 0.0.0 and grep-based extraction
- `package.json` - Added `extract-version` convenience script

## Decisions Made
- Used CommonJS (.cjs) for the extraction script -- no build step needed, works with any Node.js version
- Script generates the entire version.ts file content rather than patching a single line -- ensures consistent output format
- deploy-functions job relies on ubuntu-latest default Node.js (no setup-node step) since the script has zero npm dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- STATE.md is now the single source of truth for version across all build targets
- Changing `Milestone: v1.8` in STATE.md will propagate to version.ts, APK, and Edge Functions on next CI run
- Phase 22 can update public surfaces (landing page, etc.) knowing the version pipeline is operational
- Local development still works without running the script (version.ts committed with dev fallback value)

## Self-Check: PASSED

All 4 files verified present (scripts/extract-version.cjs, packages/shared/src/version.ts, .github/workflows/ci-deploy.yml, 21-01-SUMMARY.md). Both task commits (7bf18b1, 5321eba) verified in git log. YAML syntax validated. No hardcoded 0.0.0 or grep-based extraction remains.

---
*Phase: 21-gsd-version-pipeline*
*Completed: 2026-02-21*
