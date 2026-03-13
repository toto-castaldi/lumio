---
phase: 40-deploy-ci-cd
verified: 2026-03-13T08:15:00Z
status: human_needed
score: 3/4 must-haves verified (4th requires live server)
re_verification: false
human_verification:
  - test: "Open https://deck.lumio.toto-castaldi.com in browser"
    expected: "Deck builder app loads with SSL (padlock visible), Google OAuth login works, and /login route returns app (not 404)"
    why_human: "Live server state cannot be verified programmatically from this machine"
  - test: "View page source at https://deck.lumio.toto-castaldi.com"
    expected: "meta name=\"version\" content contains a version string like \"3.0+NNN.XXXXXXX\" (not the literal __LUMIO_VERSION__ placeholder)"
    why_human: "Version injection happens in CI on the live server — source file still contains the placeholder"
  - test: "Push a trivial change to main and observe GitHub Actions"
    expected: "deploy-deck-builder job appears in the Actions run, completes with green checkmark"
    why_human: "CI pipeline execution requires an actual push event"
---

# Phase 40: Deploy & CI/CD Verification Report

**Phase Goal:** Deploy the deck builder web app to production at deck.lumio.toto-castaldi.com with automated CI/CD pipeline
**Verified:** 2026-03-13T08:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                      | Status      | Evidence                                                                                   |
|----|----------------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------|
| 1  | Nginx config serves deck builder SPA at deck.lumio.toto-castaldi.com      | VERIFIED    | `conf/deck-lumio.nginx.conf` exists with correct `server_name`, SPA `try_files` fallback  |
| 2  | Pushing to main triggers automated build and deploy of the web app         | VERIFIED    | `deploy-deck-builder` job in `ci-deploy.yml` with correct `needs`/`if` wiring             |
| 3  | Version stamp is injected into the deployed HTML meta tag                  | VERIFIED    | `__LUMIO_VERSION__` in `apps/deck-builder/index.html`; `sed` targets `dist/index.html`    |
| 4  | deck.lumio.toto-castaldi.com serves app with SSL (live server state)       | HUMAN NEEDED | Cannot verify live server from codebase; infrastructure setup was manual                  |

**Score:** 3/4 truths verified programmatically — 4th requires live server check

### Required Artifacts

| Artifact                              | Expected                                      | Status   | Details                                                              |
|---------------------------------------|-----------------------------------------------|----------|----------------------------------------------------------------------|
| `conf/deck-lumio.nginx.conf`          | Nginx virtual host for deck builder SPA       | VERIFIED | Exists, 42 lines, substantive: `server_name`, gzip, caching, security headers, `try_files` |
| `apps/deck-builder/index.html`        | Version stamp placeholder in `<head>`         | VERIFIED | `<meta name="version" content="__LUMIO_VERSION__" />` on line 6     |
| `.github/workflows/ci-deploy.yml`     | `deploy-deck-builder` CI job                  | VERIFIED | Job at line 205, full pipeline: pnpm install, build:packages, tests, build, sed, SCP, nginx reload |

### Key Link Verification

| From                             | To                         | Via                                          | Status   | Details                                                                     |
|----------------------------------|----------------------------|----------------------------------------------|----------|-----------------------------------------------------------------------------|
| `ci-deploy.yml`                  | `apps/deck-builder/dist/index.html` | `sed -i "s/__LUMIO_VERSION__/..."` | WIRED    | Line 248: targets `dist/index.html` (built output), not source — correct   |
| `ci-deploy.yml`                  | `/var/www/deck-lumio`      | `appleboy/scp-action` with `strip_components: 3` | WIRED | Line 256-258: source `apps/deck-builder/dist/*`, strip_components 3, target `/var/www/deck-lumio` |
| `ci-deploy.yml`                  | Nginx                      | `appleboy/ssh-action` reload                 | WIRED    | Line 266: `script: sudo systemctl reload nginx`                             |

### Requirements Coverage

| Requirement | Source Plan | Description                                     | Status    | Evidence                                                         |
|-------------|-------------|-------------------------------------------------|-----------|------------------------------------------------------------------|
| DEPL-01     | 40-01-PLAN  | Web app deployed at deck.lumio.toto-castaldi.com | HUMAN NEEDED | Nginx config, CI pipeline, and commit `085f2b6` all exist; live server state is manual |
| DEPL-02     | 40-01-PLAN  | CI/CD pipeline builds and deploys web app automatically | VERIFIED | `deploy-deck-builder` job fully wired in `ci-deploy.yml`        |

No orphaned requirements: REQUIREMENTS.md maps exactly DEPL-01 and DEPL-02 to Phase 40. Both are accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No anti-patterns found | — | — |

Scanned `conf/deck-lumio.nginx.conf`, `apps/deck-builder/index.html`, and the `deploy-deck-builder` job block in `ci-deploy.yml`. No TODOs, placeholders, empty implementations, or console-log stubs found.

### Commit Verification

Commit `085f2b6` referenced in SUMMARY.md exists in git log and contains exactly the three files claimed:
- `.github/workflows/ci-deploy.yml` (+63 lines)
- `apps/deck-builder/index.html` (+1 line)
- `conf/deck-lumio.nginx.conf` (+42 lines)

The SUMMARY claim "plan executed exactly as written" is confirmed by diff — no deviations from the plan's task spec.

### Human Verification Required

#### 1. Live site serves app with SSL

**Test:** Navigate to https://deck.lumio.toto-castaldi.com in a browser.
**Expected:** App loads (React SPA renders), HTTPS padlock is shown, no certificate errors.
**Why human:** SSL certificate was issued by Certbot on the production server — cannot verify from the local codebase.

#### 2. Version stamp injected in deployed HTML

**Test:** View page source at https://deck.lumio.toto-castaldi.com, search for `<meta name="version"`.
**Expected:** Content attribute contains a real version string (e.g., `3.0+121.085f2b6`), not the literal `__LUMIO_VERSION__` placeholder.
**Why human:** The `sed` injection occurs in CI on the built artifact; the source file intentionally retains the placeholder.

#### 3. CI pipeline runs end-to-end on push

**Test:** Push any commit to `main` and observe the GitHub Actions run.
**Expected:** `deploy-deck-builder` job appears in the run, executes all steps (install, build:packages, test, build, inject version, SCP, nginx reload), and completes with a green checkmark.
**Why human:** Requires a live push event and valid GitHub Actions secrets (`DO_HOST`, `DO_USERNAME`, `DO_SSH_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`).

#### 4. SPA route fallback works

**Test:** Navigate directly to https://deck.lumio.toto-castaldi.com/login (a deep path).
**Expected:** App loads normally (React router handles the route client-side), not a 404 from Nginx.
**Why human:** `try_files` behavior requires the live Nginx server.

#### 5. Google OAuth on production domain

**Test:** Click "Sign in with Google" on https://deck.lumio.toto-castaldi.com.
**Expected:** Google OAuth popup/redirect completes successfully and user is logged in.
**Why human:** Requires Google Cloud Console and Supabase redirect URL configuration, verified only by live flow.

### Gaps Summary

No code gaps. All three artifacts are present, substantive, and wired correctly. Both requirement IDs are accounted for. The only outstanding items are live-server verifications that are inherently manual: SSL, live deployment state, and CI pipeline execution with production secrets. These were noted in the PLAN as Task 2 (human-verify checkpoint) and are confirmed as complete per the SUMMARY, but cannot be re-verified from the codebase alone.

---

_Verified: 2026-03-13T08:15:00Z_
_Verifier: Claude (gsd-verifier)_
