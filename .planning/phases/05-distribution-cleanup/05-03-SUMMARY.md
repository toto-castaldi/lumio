---
phase: 05-distribution-cleanup
plan: 03
subsystem: infra
tags: [github-actions, ci-cd, android, apk, gradle, landing-page, scp]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Expo config plugin for release signing (withReleaseSigning.js)"
  - phase: 05-02
    provides: "Static landing page at apps/landing/"
provides:
  - "build-apk CI job: Gradle release build + GitHub Release upload"
  - "deploy-landing CI job: SCP static files to /var/www/lumio"
  - "Clean CI pipeline without PWA build/deploy jobs"
affects: []

# Tech tracking
tech-stack:
  added: [softprops/action-gh-release@v2, actions/setup-java@v4, actions/cache@v4]
  patterns: [expo-prebuild-in-ci, keystore-from-base64-secret, apk-upload-to-github-release]

key-files:
  created: []
  modified:
    - ".github/workflows/ci-deploy.yml"

key-decisions:
  - "CI-01: build-apk gated on auto-release (only builds when new version is released)"
  - "CI-02: deploy-landing runs on every push to main (not gated on auto-release)"
  - "CI-03: strip_components: 2 for landing deploy (strips apps/landing/ prefix)"

patterns-established:
  - "APK build pipeline: pnpm install -> build:packages -> expo prebuild -> gradlew assembleRelease"
  - "Keystore management: base64-encoded secret decoded at build time"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 5 Plan 3: CI/CD Pipeline Migration Summary

**Replaced PWA build/deploy CI jobs with Android APK build pipeline and static landing page deployment via GitHub Actions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T10:32:00Z
- **Completed:** 2026-02-08T10:33:34Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed 4 obsolete CI jobs (build-web, build-mobile, deploy-web, deploy-mobile)
- Added build-apk job: full Android release pipeline with Gradle, keystore signing, and GitHub Release upload
- Added deploy-landing job: SCP static HTML/CSS to DigitalOcean server with Nginx reload
- Final CI pipeline has 6 clean jobs: auto-release, lint-and-typecheck, build-apk, deploy-landing, deploy-migrations, deploy-functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove web/mobile jobs and add build-apk job** - `654a444` (feat)
2. **Task 2: Add deploy-landing job replacing deploy-web** - `dc1be0a` (feat)

## Files Created/Modified
- `.github/workflows/ci-deploy.yml` - Complete CI/CD pipeline with APK build and landing deploy (removed 159 lines, added 68 lines)

## Decisions Made
- **CI-01:** build-apk gated on auto-release creating a new version -- no point building APK without a version bump
- **CI-02:** deploy-landing runs on every push to main regardless of auto-release -- landing page should always reflect latest content
- **CI-03:** strip_components: 2 for landing SCP deploy -- strips `apps/landing/` prefix so contents go directly to `/var/www/lumio/`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. GitHub Secrets for keystore were already configured in plan 05-01.

## Next Phase Readiness
- CI/CD pipeline fully migrated to native app architecture
- Ready for plan 05-04 (final cleanup tasks)
- All existing deploy-migrations and deploy-functions jobs unchanged and functional

## Self-Check: PASSED

- [x] `.github/workflows/ci-deploy.yml` exists
- [x] `05-03-SUMMARY.md` exists
- [x] Commit `654a444` found
- [x] Commit `dc1be0a` found

---
*Phase: 05-distribution-cleanup*
*Completed: 2026-02-08*
