---
phase: quick-3
plan: 01
subsystem: infra
tags: [ci, github-actions, versioning, android, apk]

# Dependency graph
requires:
  - phase: quick-1
    provides: "getDisplayVersion() using BUILD_NUMBER and GIT_SHA env vars"
provides:
  - "BUILD_NUMBER and GIT_SHA env vars passed to build-apk CI job"
  - "APK builds display v1.7+{run_number}.{short_sha} instead of v1.7+dev"
affects: [build-apk, versioning]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CI env var propagation via step outputs for build metadata"]

key-files:
  created: []
  modified:
    - ".github/workflows/ci-deploy.yml"

key-decisions:
  - "Matched deploy-functions pattern: extract version step outputs build_number and git_sha, consumed via steps.version.outputs"
  - "Added env vars to Expo prebuild and Build release APK for completeness, in case Metro rebundling occurs"

patterns-established:
  - "build-apk version propagation: Extract version step -> outputs -> env vars on Build packages, Expo prebuild, Build release APK"

requirements-completed: [QUICK-3]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Quick Task 3: Fix APK Version Display Summary

**Pass BUILD_NUMBER and GIT_SHA env vars to build-apk CI job so APKs display v1.7+{run_number}.{short_sha} instead of v1.7+dev**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T14:02:41Z
- **Completed:** 2026-02-23T14:03:48Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- build-apk "Extract version" step now outputs build_number and git_sha (matching deploy-functions pattern)
- "Build packages" step receives BUILD_NUMBER and GIT_SHA env vars, enabling version.ts to bake in correct values at bundle time
- "Expo prebuild" and "Build release APK" steps also receive the env vars for completeness

## Task Commits

Each task was committed atomically:

1. **Task 1: Pass BUILD_NUMBER and GIT_SHA env vars to build-apk job steps** - `54b502f` (feat)

## Files Created/Modified
- `.github/workflows/ci-deploy.yml` - Added build_number/git_sha outputs to Extract version step; added BUILD_NUMBER/GIT_SHA env vars to Build packages, Expo prebuild, and Build release APK steps in build-apk job

## Decisions Made
- Followed deploy-functions pattern for version extraction (step outputs consumed by env vars)
- Added env vars to all three build steps (Build packages, Expo prebuild, Build release APK) for robustness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Steps
- Next CI run on main will produce an APK with correct version display (e.g., v1.7+42.abc1234)
- No further action required

---
*Quick Task: 3-fix-apk-version-display*
*Completed: 2026-02-23*
