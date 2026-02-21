---
phase: 20-cleanup-legacy-versioning
plan: 02
subsystem: infra
tags: [ci-cd, github-actions, git-tags, versioning, documentation]

# Dependency graph
requires:
  - phase: 20-cleanup-legacy-versioning/01
    provides: husky/commitlint/commitizen removal and config cleanup
provides:
  - CI/CD workflow without auto-release job or tag creation
  - Zero git tags in local and remote
  - Documentation updated to remove legacy versioning references
  - version.ts comment updated for Phase 21 handoff
affects: [21-wire-state-version, 22-update-public-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns: [hardcoded-version-placeholder, ci-without-auto-release]

key-files:
  created: []
  modified:
    - .github/workflows/ci-deploy.yml
    - packages/shared/src/version.ts
    - docs/VERSIONING.md
    - README.md

key-decisions:
  - "Kept contents: write permission in CI (may be needed by future actions)"
  - "Used hardcoded 0.0.0 as APK versionName placeholder (Phase 21 wires STATE.md)"
  - "Removed GitHub Release upload step entirely (no tags means no releases to upload to)"
  - "Kept historical removal note in VERSIONING.md mentioning old tooling names"

patterns-established:
  - "CI jobs depend on lint-and-typecheck or deploy-migrations only (no auto-release)"
  - "Version placeholder pattern: hardcoded value until Phase 21 wires STATE.md"

requirements-completed: [CLEAN-05]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 20 Plan 02: Remove Auto-Release CI and Delete Git Tags Summary

**Removed auto-release CI job (80 lines), deleted all 53 git tags from local/remote, and updated docs to remove legacy versioning references**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T21:08:26Z
- **Completed:** 2026-02-21T21:12:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Removed entire auto-release job from CI workflow (version bump, tag creation, push)
- Fixed all 5 downstream job dependencies to no longer reference auto-release
- Deleted all 53 version git tags (v0.1.0 through v1.6) from both local and remote
- Updated version.ts, VERSIONING.md, and README.md to remove legacy references

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove auto-release job from CI and fix job dependencies** - `d595ef4` (chore)
2. **Task 2: Delete git tags and update docs** - `f85b8f3` (chore)

## Files Created/Modified
- `.github/workflows/ci-deploy.yml` - Removed auto-release job, fixed all job dependencies and conditions
- `packages/shared/src/version.ts` - Updated comment to reference Phase 21 instead of release-please
- `docs/VERSIONING.md` - Replaced with placeholder noting Phase 20 removal and Phase 21/22 plan
- `README.md` - Removed CHANGELOG.md reference and updated versioning doc link text

## Decisions Made
- Kept `contents: write` permission in CI workflow since it may be needed by future actions
- Used hardcoded `0.0.0` as APK versionName placeholder; Phase 21 will wire STATE.md
- Removed GitHub Release upload step entirely since there are no tags to create releases against
- Kept the historical removal note in VERSIONING.md that mentions old tooling names for context
- Removed `fetch-depth: 0` and `git pull` steps from deploy-functions since auto-release no longer pushes commits

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CI pipeline is clean: no auto-release, no tag creation, no release commits
- version.ts still has static value "1.6.1" -- Phase 21 will wire this to STATE.md
- APK build uses placeholder versionName "0.0.0" -- Phase 21 will wire this to STATE.md
- All documentation prepared for Phase 22 to update public surfaces

## Self-Check: PASSED

All 4 modified files verified present. Both task commits (d595ef4, f85b8f3) verified in git log. 0 git tags confirmed. YAML syntax validated.

---
*Phase: 20-cleanup-legacy-versioning*
*Completed: 2026-02-21*
