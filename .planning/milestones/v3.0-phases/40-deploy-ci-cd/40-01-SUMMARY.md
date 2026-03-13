---
phase: 40-deploy-ci-cd
plan: 01
subsystem: infra
tags: [nginx, ci-cd, github-actions, ssl, vite, scp, deploy]

# Dependency graph
requires:
  - phase: 39-card-authoring
    provides: "Complete deck builder app ready for production deploy"
provides:
  - "Production deployment at deck.lumio.toto-castaldi.com with SSL"
  - "Automated CI/CD pipeline (deploy-deck-builder job) triggered on push to main"
  - "Version stamp injection in deployed HTML via CI"
  - "Nginx SPA config with gzip, caching, and security headers"
affects: []

# Tech tracking
tech-stack:
  added: [appleboy/scp-action, appleboy/ssh-action, certbot]
  patterns: [ci-deploy-job-pattern, nginx-spa-fallback, version-stamp-injection]

key-files:
  created: [conf/deck-lumio.nginx.conf]
  modified: [apps/deck-builder/index.html, .github/workflows/ci-deploy.yml]

key-decisions:
  - "HTTP-only Nginx template checked into repo; Certbot adds SSL on server"
  - "deploy-deck-builder parallels deploy-landing (both need lint-and-typecheck, not each other)"
  - "No VITE_GOOGLE_WEB_CLIENT_ID env var needed -- Google OAuth uses Supabase server-side config"
  - "strip_components: 3 for SCP (apps/deck-builder/dist = 3 path segments)"

patterns-established:
  - "Deck builder deploy job: same pattern as deploy-landing but with pnpm build step"
  - "Version meta tag injection: sed replaces __LUMIO_VERSION__ in built dist/index.html"

requirements-completed: [DEPL-01, DEPL-02]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 40 Plan 01: Deploy & CI/CD Summary

**Nginx SPA config, CI deploy job with version injection, and production deployment at deck.lumio.toto-castaldi.com with SSL and automated pipeline**

## Performance

- **Duration:** 3 min (automation) + server setup time (manual)
- **Started:** 2026-03-13T07:42:10Z
- **Completed:** 2026-03-13T07:42:25Z
- **Tasks:** 2 (1 automated + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Nginx virtual host config for deck builder SPA with gzip, asset caching, security headers, and try_files fallback
- deploy-deck-builder CI job in GitHub Actions: builds, tests, injects version stamp, SCPs to server, reloads Nginx
- Production deployment live at https://deck.lumio.toto-castaldi.com with Let's Encrypt SSL
- Version meta tag (3.0+121.085f2b6) visible in deployed page source
- SPA fallback verified: /login returns 200 (not 404)
- Google OAuth and Supabase redirect URLs configured for production domain

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Nginx config, add version stamp, deploy CI job** - `085f2b6` (feat)
2. **Task 2: Verify production deployment** - checkpoint:human-verify (approved, no commit needed)

**Plan metadata:** (pending -- this commit)

## Files Created/Modified
- `conf/deck-lumio.nginx.conf` - Nginx virtual host for deck builder SPA (HTTP template, Certbot adds SSL)
- `apps/deck-builder/index.html` - Added version meta tag with __LUMIO_VERSION__ placeholder
- `.github/workflows/ci-deploy.yml` - Added deploy-deck-builder job (parallel with deploy-landing)

## Decisions Made
- HTTP-only Nginx template checked into repo; Certbot adds SSL on server (keeps config simple and portable)
- deploy-deck-builder runs in parallel with deploy-landing (both depend on lint-and-typecheck, not on each other)
- No VITE_GOOGLE_WEB_CLIENT_ID needed -- Google OAuth uses Supabase server-side config per research
- strip_components: 3 for SCP matches apps/deck-builder/dist path depth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

One-time server setup was completed during Task 2 checkpoint:
- DNS A record for deck.lumio.toto-castaldi.com
- Nginx config installed on DigitalOcean server, site enabled
- SSL certificate issued by Let's Encrypt via Certbot
- Google Cloud Console: authorized JS origin and redirect URI for production domain
- Supabase Dashboard: redirect URL added for production domain

All setup verified and working.

## Next Phase Readiness
- v3.0 Deck Builder Web milestone is COMPLETE
- All 5 phases (36-40) shipped
- Production app live at https://deck.lumio.toto-castaldi.com
- Automated CI/CD pipeline deploys on every push to main

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 40-deploy-ci-cd*
*Completed: 2026-03-13*
