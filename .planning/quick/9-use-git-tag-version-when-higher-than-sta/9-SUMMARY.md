---
phase: quick-9
plan: 01
subsystem: infra
tags: [versioning, ci-cd, github-actions, extract-version]

# Dependency graph
requires:
  - phase: quick-1
    provides: extract-version.cjs pipeline
  - phase: quick-4
    provides: version.ts with string literals
provides:
  - Git tag version override in extract-version.cjs
  - CI workflow tag push trigger
  - GIT_TAG env var in all version extraction steps
affects: [versioning, ci-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [git-tag-version-override, semantic-version-comparison]

key-files:
  created: []
  modified:
    - scripts/extract-version.cjs
    - .github/workflows/ci-deploy.yml
    - docs/VERSIONING.md

key-decisions:
  - "No external dependencies for version comparison -- simple compareVersions() helper"
  - "Updated CI job conditions to also run on tag refs (startsWith refs/tags/v)"
  - "Updated checkout refs from hardcoded 'main' to github.ref for tag compatibility"

patterns-established:
  - "GIT_TAG override: when tag version > STATE.md, tag wins"
  - "compareVersions() for semantic version comparison without semver package"

requirements-completed: [QUICK-9]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Quick Task 9: Git Tag Version Override Summary

**Semantic git tag override in extract-version.cjs with CI tag trigger and updated VERSIONING.md docs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T15:44:55Z
- **Completed:** 2026-03-04T15:48:13Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- extract-version.cjs now compares GIT_TAG with STATE.md version and uses whichever is higher
- CI workflow triggers on `v*` tag pushes with GIT_TAG env var in all 4 extract-version steps
- All CI job conditions updated to also run on tag refs, with dynamic checkout refs
- VERSIONING.md documents the override behavior with both version bump methods

## Task Commits

Each task was committed atomically:

1. **Task 1: Add git tag version override to extract-version.cjs** - `8945c8d` (feat)
2. **Task 2: Pass GIT_TAG env var in CI workflow and update docs** - `262e189` (feat)

## Files Created/Modified
- `scripts/extract-version.cjs` - Added compareVersions() and GIT_TAG override logic after STATE.md parsing
- `.github/workflows/ci-deploy.yml` - Added tags trigger, GIT_TAG env var in 4 steps, updated job conditions for tag refs
- `docs/VERSIONING.md` - Added Git Tag Override section, updated pipeline diagram, added tag method to version bump docs

## Decisions Made
- Used a simple compareVersions(a, b) helper that splits on `.`, pads shorter arrays with 0, and compares numerically -- no external semver dependency needed
- Updated all CI job conditions (`build-apk`, `create-release`, `deploy-landing`, `deploy-migrations`, `deploy-functions`) to also trigger on tag pushes, since without this the tag trigger would be useless
- Changed hardcoded `ref: main` to `ref: ${{ github.ref }}` in checkout steps for tag push compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated CI job conditions for tag push compatibility**
- **Found during:** Task 2 (CI workflow changes)
- **Issue:** Plan specified adding tag trigger but CI jobs had `github.ref == 'refs/heads/main'` conditions, meaning tag pushes would trigger the workflow but skip all deploy/build jobs
- **Fix:** Updated all 5 deploy/build job conditions to `(github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))` and changed checkout refs from hardcoded `main` to `${{ github.ref }}`
- **Files modified:** `.github/workflows/ci-deploy.yml`
- **Verification:** Grep confirms conditions include tag ref check
- **Committed in:** 262e189 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for tag trigger to actually work. Without this, the `tags: ['v*']` trigger would have no effect on build/deploy jobs.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Version pipeline now supports both STATE.md and git tag sources
- `git tag v2.2 && git push --tags` will trigger a full CI build with version 2.2

---
*Quick Task: 9-use-git-tag-version-when-higher-than-sta*
*Completed: 2026-03-04*
