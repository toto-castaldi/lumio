# Phase 40: Deploy & CI/CD - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Production deployment of the deck builder web app to deck.lumio.toto-castaldi.com with automated CI/CD pipeline. DNS, SSL, Nginx config, CI job, and environment variable injection. No application code changes — purely infrastructure and deployment.

</domain>

<decisions>
## Implementation Decisions

### Deploy strategy
- Same SCP-to-Nginx pattern as landing page — static files deployed to DigitalOcean server
- Deploy target directory: `/var/www/deck-lumio` (separate from landing page `/var/www/lumio`)
- Version stamp injected into HTML via sed (same pattern as landing page `__LUMIO_VERSION__`)
- Nginx config committed to repo as template file (e.g., `infra/deck-lumio.nginx.conf`) — version-controlled and reproducible

### Nginx & SSL setup
- SSL via Certbot/Let's Encrypt with auto-renewal
- One-time manual server setup: create Nginx site, run certbot, enable site. CI only deploys files and reloads Nginx after that
- SPA fallback with `try_files` directive (all paths → index.html for react-router)
- Cache-control headers for static assets (Vite content-hashed filenames → safe for aggressive caching)
- DNS A record for deck.lumio.toto-castaldi.com needs to be created (prerequisite before SSL)

### CI pipeline structure
- New `deploy-deck-builder` job in existing `.github/workflows/ci.yml` workflow
- Depends on `lint-and-typecheck` (parallel with `deploy-landing`, not sequential)
- Triggers on main branch push and v* tags (matches existing deploy jobs)
- Job runs deck-builder tests (`pnpm --filter @lumio/deck-builder test`) before building
- Build step: `pnpm --filter @lumio/deck-builder build`
- Deploy step: SCP dist/ to `/var/www/deck-lumio` + Nginx reload

### Env var injection
- Build-time env vars via Vite's `import.meta.env.VITE_*` mechanism
- Reuse existing GitHub secrets: SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID
- CI maps secrets to VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_WEB_CLIENT_ID env vars during build
- No new GitHub secrets needed — same Supabase project as mobile app
- Local dev already has working .env.local with VITE_* vars

### Claude's Discretion
- Exact Nginx config details (gzip, security headers, rate limiting)
- Certbot command specifics
- Whether to add a health check endpoint or deploy smoke test
- Version display location in the app (footer, about, or meta tag)

</decisions>

<specifics>
## Specific Ideas

- Pipeline order: lint-and-typecheck → deploy-deck-builder (parallel with deploy-landing, build-apk)
- DNS setup is a prerequisite — must be done before certbot can issue SSL cert
- Manual server setup documented as a runbook/checklist in the plan (not automated by CI)
- Nginx config template in repo tracks the production config in Git

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `appleboy/scp-action@v0.1.7`: Already used by deploy-landing for SCP file transfer
- `appleboy/ssh-action@v1.0.3`: Already used by deploy-landing for remote Nginx reload
- `scripts/extract-version.cjs`: Extracts version from STATE.md, reusable for version injection
- `apps/deck-builder/package.json`: Has `build` script (`tsc -b && vite build`) producing `dist/`

### Established Patterns
- Deploy jobs: `needs: [lint-and-typecheck]`, conditional on `github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')`
- SCP action: `source` → `target` with `strip_components`
- SSH action: `sudo systemctl reload nginx`
- Version injection: `sed -i "s/__LUMIO_VERSION__/${DISPLAY_VERSION}/g"` on HTML before deploy

### Integration Points
- GitHub secrets: DO_HOST, DO_USERNAME, DO_SSH_KEY (already configured for landing page)
- GitHub secrets: SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_WEB_CLIENT_ID (already configured for build-apk)
- Google Cloud Console: needs deck.lumio.toto-castaldi.com added as authorized JavaScript origin for OAuth
- DNS provider: A record for deck.lumio.toto-castaldi.com → DigitalOcean server IP

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-deploy-ci-cd*
*Context gathered: 2026-03-12*
