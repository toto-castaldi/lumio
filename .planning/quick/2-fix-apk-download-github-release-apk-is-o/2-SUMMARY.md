---
phase: quick-2
plan: 01
subsystem: infra
tags: [github-actions, ci-cd, apk, github-release, softprops-action-gh-release]

# Dependency graph
requires:
  - phase: quick-1
    provides: "APK build and upload-artifact step in CI/CD"
provides:
  - "Automated GitHub Release creation with lumio.apk on every main push"
  - "Landing page download link now resolves to current APK"
affects: [ci-cd, landing-page]

# Tech tracking
tech-stack:
  added: [softprops/action-gh-release@v2]
  patterns: [job-output-passing-for-version, artifact-download-and-rename]

key-files:
  created: []
  modified: [".github/workflows/ci-deploy.yml"]

key-decisions:
  - "Use job outputs to pass version from build-apk to create-release instead of re-running extract-version.cjs"
  - "Rename versioned APK back to lumio.apk so /releases/latest/download/lumio.apk works"
  - "Created v1.7 release manually from latest CI artifact to fix download link immediately"

patterns-established:
  - "GitHub Release job: download artifact, rename to stable name, create/update release with make_latest"

requirements-completed: [FIX-APK-DOWNLOAD]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Quick Task 2: Fix APK Download via GitHub Release Summary

**Added create-release CI job using softprops/action-gh-release@v2 and manually created v1.7 release with lumio.apk from latest build artifact**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T13:37:30Z
- **Completed:** 2026-02-23T13:41:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- CI/CD pipeline now automatically creates/updates a GitHub Release with `lumio.apk` on every push to main
- Landing page download link (`/releases/latest/download/lumio.apk`) now resolves to current v1.7 APK
- Existing build-apk job untouched except for adding `outputs.version` for cross-job sharing
- v1.7 release created immediately from latest CI artifact (build #104, sha 20d8fcb)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add GitHub Release job to CI/CD pipeline** - `d4036ea` (feat)
2. **Task 2: Manually create release for current version** - No local commit (GitHub Release created via `gh` CLI)

**Plan metadata:** `647ca7e` (docs: complete plan)

## Files Created/Modified
- `.github/workflows/ci-deploy.yml` - Added `outputs.version` to build-apk, added `create-release` job with download-artifact, rename, and softprops/action-gh-release@v2

## Decisions Made
- Used job outputs (`needs.build-apk.outputs.version`) to pass version between jobs instead of re-checking out and running extract-version.cjs -- avoids redundant checkout/node setup
- Computed short SHA in a dedicated step since `${GITHUB_SHA::7}` bash syntax doesn't work in GitHub Actions `with:` context
- Created release from latest available CI artifact (build #104) rather than waiting for next push

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed body field using bash syntax in GitHub Actions with: context**
- **Found during:** Task 1 (Create release job)
- **Issue:** The plan suggested `body: "... (${GITHUB_SHA::7})"` but `${GITHUB_SHA::7}` is bash substring syntax that doesn't work in YAML `with:` fields
- **Fix:** Added a "Prepare short SHA" step that outputs `${GITHUB_SHA::7}` via `$GITHUB_OUTPUT`, then referenced it as `${{ steps.sha.outputs.short }}`
- **Files modified:** `.github/workflows/ci-deploy.yml`
- **Verification:** YAML parses correctly, all automated checks pass
- **Committed in:** d4036ea (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for correctness. Bash substring syntax would have caused a literal string in the release body instead of the short SHA.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The `contents: write` permission was already set at the workflow level.

## Next Phase Readiness
- CI/CD will automatically create releases on next push to main
- v1.7 release is live and serving lumio.apk via the landing page download link
- No blockers

## Self-Check: PASSED

- FOUND: `.github/workflows/ci-deploy.yml`
- FOUND: `2-SUMMARY.md`
- FOUND: commit `d4036ea`

---
*Phase: quick-2*
*Completed: 2026-02-23*
