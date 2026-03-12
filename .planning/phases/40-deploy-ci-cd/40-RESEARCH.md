# Phase 40: Deploy & CI/CD - Research

**Researched:** 2026-03-12
**Domain:** Static site deployment, Nginx, CI/CD (GitHub Actions), SSL/TLS
**Confidence:** HIGH

## Summary

Phase 40 is purely infrastructure -- deploying the already-built deck-builder SPA to `deck.lumio.toto-castaldi.com` and adding a CI/CD job to automate future deployments. The project already has a well-established deployment pattern: the landing page deploys via `appleboy/scp-action` + `appleboy/ssh-action` to a DigitalOcean server with Nginx, and the mobile PWA at `m-lumio.toto-castaldi.com` uses the same server with SPA fallback (`try_files`) and Certbot SSL. The deck-builder deployment will follow these exact patterns with minimal variation.

The Vite build produces content-hashed filenames in `dist/assets/` (confirmed: `index-2iZLf6Rb.js`, `index-Dkldkg8r.css`, plus KaTeX fonts), making aggressive caching safe. The app uses only two env vars at build time (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) -- Google OAuth does not use a `VITE_GOOGLE_WEB_CLIENT_ID` env var (confirmed: `signInWithOAuth` relies on server-side Supabase config, not a client-side key). A version stamp needs to be added to `index.html` via the existing `__LUMIO_VERSION__` sed pattern.

**Primary recommendation:** Clone the `deploy-landing` job pattern, add Vite build step with `pnpm --filter @lumio/deck-builder build`, create a new Nginx config template at `conf/deck-lumio.nginx.conf` modeled on `conf/nginx-lumio-mobile.conf` (SPA fallback), and document the one-time server setup as a runbook.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Same SCP-to-Nginx pattern as landing page -- static files deployed to DigitalOcean server
- Deploy target directory: `/var/www/deck-lumio` (separate from landing page `/var/www/lumio`)
- Version stamp injected into HTML via sed (same pattern as landing page `__LUMIO_VERSION__`)
- Nginx config committed to repo as template file (e.g., `infra/deck-lumio.nginx.conf`) -- version-controlled and reproducible
- SSL via Certbot/Let's Encrypt with auto-renewal
- One-time manual server setup: create Nginx site, run certbot, enable site. CI only deploys files and reloads Nginx after that
- SPA fallback with `try_files` directive (all paths -> index.html for react-router)
- Cache-control headers for static assets (Vite content-hashed filenames -> safe for aggressive caching)
- DNS A record for deck.lumio.toto-castaldi.com needs to be created (prerequisite before SSL)
- New `deploy-deck-builder` job in existing `.github/workflows/ci-deploy.yml` workflow
- Depends on `lint-and-typecheck` (parallel with `deploy-landing`, not sequential)
- Triggers on main branch push and v* tags (matches existing deploy jobs)
- Job runs deck-builder tests (`pnpm --filter @lumio/deck-builder test`) before building
- Build step: `pnpm --filter @lumio/deck-builder build`
- Deploy step: SCP dist/ to `/var/www/deck-lumio` + Nginx reload
- Build-time env vars via Vite's `import.meta.env.VITE_*` mechanism
- Reuse existing GitHub secrets: SUPABASE_URL, SUPABASE_ANON_KEY
- CI maps secrets to VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY env vars during build
- No new GitHub secrets needed -- same Supabase project as mobile app
- Local dev already has working .env.local with VITE_* vars

### Claude's Discretion
- Exact Nginx config details (gzip, security headers, rate limiting)
- Certbot command specifics
- Whether to add a health check endpoint or deploy smoke test
- Version display location in the app (footer, about, or meta tag)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | Web app deployed at deck.lumio.toto-castaldi.com | Nginx config template with SPA fallback, SSL via Certbot, DNS A record, `__LUMIO_VERSION__` placeholder in index.html, server deploy directory `/var/www/deck-lumio` |
| DEPL-02 | CI/CD pipeline builds and deploys web app automatically | New `deploy-deck-builder` job in `ci-deploy.yml`, depends on `lint-and-typecheck`, runs tests + build + SCP deploy + Nginx reload, env var injection for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY |

</phase_requirements>

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| appleboy/scp-action | v0.1.7 | SCP file transfer in CI | Already used by deploy-landing; proven pattern |
| appleboy/ssh-action | v1.0.3 | Remote SSH commands in CI | Already used by deploy-landing for Nginx reload |
| Nginx | (server version) | Reverse proxy / static file server | Already running on DO server for landing + mobile |
| Certbot (snap) | latest | SSL certificate via Let's Encrypt | Already used for lumio.toto-castaldi.com and m-lumio.toto-castaldi.com |
| Vite | 7.3.1 | Build tool (produces dist/) | Already configured in deck-builder |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `scripts/extract-version.cjs` | Extract version from STATE.md | During CI build to get DISPLAY_VERSION for sed injection |
| `pnpm/action-setup@v4` | Install pnpm in CI | Required for pnpm install + build steps |
| `actions/setup-node@v4` | Install Node 22 in CI | Required for build step |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SCP deploy | rsync --delete | rsync is faster for incremental but requires rsync on server; SCP is already proven in this project |
| Certbot nginx plugin | Certbot standalone | nginx plugin auto-configures SSL in Nginx config; standalone requires stopping Nginx |
| Separate workflow file | Job in existing ci-deploy.yml | Keeping it in one file maintains the single-pipeline pattern; all deploy jobs visible together |

**Installation:**
No new packages needed. All tools are already in use or available on the CI runner.

## Architecture Patterns

### Recommended Project Structure
```
conf/
  nginx-lumio.conf              # Landing page Nginx (existing)
  nginx-lumio-mobile.conf       # Mobile PWA Nginx (existing)
  deck-lumio.nginx.conf         # Deck builder Nginx (NEW)
apps/deck-builder/
  index.html                    # Add __LUMIO_VERSION__ meta tag
  dist/                         # Vite build output (gitignored)
.github/workflows/
  ci-deploy.yml                 # Add deploy-deck-builder job
```

### Pattern 1: SCP Deploy Job (Existing Pattern)
**What:** CI job that builds, injects version, SCPs files, and reloads Nginx
**When to use:** Every deploy of static content to the DO server
**Example (from deploy-landing, adapted for deck-builder):**
```yaml
deploy-deck-builder:
  runs-on: ubuntu-latest
  needs: [lint-and-typecheck]
  if: (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')) && github.event_name == 'push' && needs.lint-and-typecheck.result == 'success'
  steps:
    - uses: actions/checkout@v4
      with:
        ref: ${{ github.ref }}
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    - name: Extract version
      id: version
      run: |
        VERSION=$(node scripts/extract-version.cjs)
        echo "version=$VERSION" >> $GITHUB_OUTPUT
      env:
        GIT_TAG: ${{ github.ref_name }}
    - name: Build packages
      run: pnpm build:packages
    - name: Run tests
      run: pnpm --filter @lumio/deck-builder test
    - name: Build deck-builder
      run: pnpm --filter @lumio/deck-builder build
      env:
        VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    - name: Inject version
      run: |
        SHORT_SHA=${GITHUB_SHA::7}
        DISPLAY_VERSION="${{ steps.version.outputs.version }}+${{ github.run_number }}.${SHORT_SHA}"
        sed -i "s/__LUMIO_VERSION__/${DISPLAY_VERSION}/g" apps/deck-builder/dist/index.html
    - name: Deploy to DigitalOcean
      uses: appleboy/scp-action@v0.1.7
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        source: 'apps/deck-builder/dist/*'
        target: '/var/www/deck-lumio'
        strip_components: 3
    - name: Reload Nginx
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        script: sudo systemctl reload nginx
```

**Key detail: `strip_components: 3`** -- the source path is `apps/deck-builder/dist/*`, which has 3 directory segments to strip (apps, deck-builder, dist) so files land directly in `/var/www/deck-lumio/`.

### Pattern 2: Nginx SPA Config (Existing Pattern from Mobile PWA)
**What:** Nginx virtual host with SPA fallback, gzip, caching, and Certbot SSL
**When to use:** Any SPA deployment on the DO server
**Example (adapted from conf/nginx-lumio-mobile.conf):**
```nginx
server {
    listen 80;
    server_name deck.lumio.toto-castaldi.com;
    root /var/www/deck-lumio;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm font/woff2;

    # Vite content-hashed assets -- aggressive caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Static files (images, favicon)
    location ~* \.(ico|png|svg|jpg|jpeg|webp)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback -- all paths serve index.html for react-router
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# After deployment, run:
# sudo certbot --nginx -d deck.lumio.toto-castaldi.com
```

### Pattern 3: Version Stamp in index.html
**What:** Add `__LUMIO_VERSION__` placeholder to deck-builder's index.html, replaced by sed in CI
**When to use:** Every build, for version traceability
**Example:**
```html
<!-- In <head> of apps/deck-builder/index.html -->
<meta name="version" content="__LUMIO_VERSION__" />
```
The sed command in CI replaces this with the actual version string (e.g., `3.0+42.a3bc02d`).

### Anti-Patterns to Avoid
- **Building in the SCP step:** Build and SCP must be separate steps; build needs Node.js and env vars, SCP is file transfer only
- **Using `rm -rf /var/www/deck-lumio/*` before deploy:** SCP with `strip_components` overwrites files atomically; explicit deletion creates a window where the site is down
- **Putting env vars in Nginx:** Vite injects env vars at build time via `import.meta.env`, not at serve time; Nginx serves static files only

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificates | Manual cert management | Certbot with `--nginx` plugin | Auto-renewal, auto-configuration, zero maintenance |
| File transfer to server | Custom rsync/ssh scripts | `appleboy/scp-action@v0.1.7` | Already proven in project, handles SSH key auth |
| Remote commands | Multi-step SSH scripts | `appleboy/ssh-action@v1.0.3` | Clean single-command execution, same SSH config |
| Version extraction | Duplicate version logic | `scripts/extract-version.cjs` | Already handles STATE.md + git tag comparison |
| Nginx SSL config | Manual SSL directives | Certbot `--nginx` plugin | Certbot manages redirects, cipher suites, OCSP stapling |

**Key insight:** This entire phase is about connecting already-proven building blocks. Every tool (SCP action, SSH action, Nginx, Certbot, version script) is already in use in this project. The only new artifacts are the Nginx config file and the CI job definition.

## Common Pitfalls

### Pitfall 1: strip_components Miscalculation
**What goes wrong:** Files end up in nested subdirectories inside `/var/www/deck-lumio/` instead of at the root
**Why it happens:** `strip_components` value doesn't match the depth of the source path
**How to avoid:** Source is `apps/deck-builder/dist/*` = 3 segments (apps, deck-builder, dist), so `strip_components: 3`. Landing page uses `apps/landing/*` = 2 segments with `strip_components: 2`. Count carefully.
**Warning signs:** 404 errors after deploy; `ls /var/www/deck-lumio/` shows nested directories instead of `index.html`

### Pitfall 2: Vite Env Vars Not Available at Build Time
**What goes wrong:** `import.meta.env.VITE_SUPABASE_URL` is `undefined` in production
**Why it happens:** Vite env vars must be set as environment variables during the `vite build` step, not as runtime variables
**How to avoid:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as `env:` on the build step specifically
**Warning signs:** Network errors in browser console pointing to `undefined/auth/v1/...`

### Pitfall 3: Google OAuth Redirect Not Configured
**What goes wrong:** Google OAuth login fails with "redirect_uri_mismatch" error
**Why it happens:** `deck.lumio.toto-castaldi.com` is not added as an authorized JavaScript origin in Google Cloud Console
**How to avoid:** Before going live, add `https://deck.lumio.toto-castaldi.com` to Google Cloud Console > Credentials > OAuth 2.0 Client > Authorized JavaScript origins. Also add `https://deck.lumio.toto-castaldi.com/auth/callback` to Authorized redirect URIs. Also update the Supabase dashboard's Site URL or Additional Redirect URLs to include the new domain.
**Warning signs:** Google login redirects to an error page; Supabase auth logs show redirect mismatch

### Pitfall 4: DNS Propagation Delay Before Certbot
**What goes wrong:** Certbot fails with "Could not find domain" or ACME challenge fails
**Why it happens:** DNS A record hasn't propagated yet when certbot tries to validate the domain
**How to avoid:** Create DNS A record first, wait for propagation (check with `dig deck.lumio.toto-castaldi.com`), then run certbot. Propagation typically takes minutes to hours.
**Warning signs:** `dig` returns NXDOMAIN; certbot returns challenge validation error

### Pitfall 5: Nginx Config Conflict with Certbot
**What goes wrong:** Certbot's auto-generated SSL block conflicts with manually written SSL directives
**Why it happens:** Running `certbot --nginx` modifies the Nginx config in-place, adding its own SSL listen directives and redirect block
**How to avoid:** Commit only the HTTP (port 80) config template to the repo. Let certbot modify the live server config. The repo template serves as documentation of the base config, not a live-deployed file.
**Warning signs:** `nginx -t` fails after certbot run; duplicate listen 443 directives

### Pitfall 6: VITE_GOOGLE_WEB_CLIENT_ID Not Needed
**What goes wrong:** Wasted time configuring a secret that isn't used
**Why it happens:** The CONTEXT.md mentions `GOOGLE_WEB_CLIENT_ID` but the deck-builder code does NOT use `import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID`. Google OAuth in this app works via `supabase.auth.signInWithOAuth({ provider: 'google' })`, which uses the Google client ID configured in Supabase's server-side settings, not a client-side env var.
**How to avoid:** Only map `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time env vars. The Google OAuth flow is handled entirely by Supabase's server-side configuration.
**Warning signs:** None (it would just be unused)

## Code Examples

### CI Job: deploy-deck-builder (Full)
```yaml
# Source: Adapted from existing deploy-landing job in ci-deploy.yml
deploy-deck-builder:
  runs-on: ubuntu-latest
  needs: [lint-and-typecheck]
  if: (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')) && github.event_name == 'push' && needs.lint-and-typecheck.result == 'success'
  steps:
    - uses: actions/checkout@v4
      with:
        ref: ${{ github.ref }}

    - uses: pnpm/action-setup@v4

    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Extract version from STATE.md
      id: version
      run: |
        VERSION=$(node scripts/extract-version.cjs)
        echo "version=$VERSION" >> $GITHUB_OUTPUT
      env:
        GIT_TAG: ${{ github.ref_name }}

    - name: Build packages
      run: pnpm build:packages

    - name: Run deck-builder tests
      run: pnpm --filter @lumio/deck-builder test

    - name: Build deck-builder
      run: pnpm --filter @lumio/deck-builder build
      env:
        VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

    - name: Inject version into index.html
      run: |
        SHORT_SHA=${GITHUB_SHA::7}
        DISPLAY_VERSION="${{ steps.version.outputs.version }}+${{ github.run_number }}.${SHORT_SHA}"
        sed -i "s/__LUMIO_VERSION__/${DISPLAY_VERSION}/g" apps/deck-builder/dist/index.html

    - name: Deploy to DigitalOcean
      uses: appleboy/scp-action@v0.1.7
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        source: 'apps/deck-builder/dist/*'
        target: '/var/www/deck-lumio'
        strip_components: 3

    - name: Reload Nginx
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        script: sudo systemctl reload nginx
```

### Nginx Config Template (Full)
```nginx
# conf/deck-lumio.nginx.conf
# Nginx config for deck.lumio.toto-castaldi.com
# This is an HTTP-only template. Certbot adds SSL directives on the server.
server {
    listen 80;
    server_name deck.lumio.toto-castaldi.com;
    root /var/www/deck-lumio;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/wasm font/woff2;

    # Vite content-hashed assets -- aggressive 1-year cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Static images
    location ~* \.(ico|png|svg|jpg|jpeg|webp)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback -- all unknown paths serve index.html for react-router
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# One-time server setup (after DNS propagation):
# 1. sudo cp deck-lumio.nginx.conf /etc/nginx/sites-available/deck-lumio
# 2. sudo ln -s /etc/nginx/sites-available/deck-lumio /etc/nginx/sites-enabled/
# 3. sudo mkdir -p /var/www/deck-lumio
# 4. sudo nginx -t && sudo systemctl reload nginx
# 5. sudo certbot --nginx -d deck.lumio.toto-castaldi.com
```

### Version Stamp in index.html
```html
<!-- Add to <head> of apps/deck-builder/index.html -->
<meta name="version" content="__LUMIO_VERSION__" />
```

### Server Setup Runbook (One-Time Manual Steps)
```bash
# Prerequisites: DNS A record for deck.lumio.toto-castaldi.com -> server IP
# Verify: dig deck.lumio.toto-castaldi.com (should return server IP)

# 1. Create deploy directory
sudo mkdir -p /var/www/deck-lumio

# 2. Copy Nginx config (from repo or paste)
sudo cp deck-lumio.nginx.conf /etc/nginx/sites-available/deck-lumio

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/deck-lumio /etc/nginx/sites-enabled/

# 4. Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. Verify HTTP works (should return 404 or empty -- no files yet)
curl -I http://deck.lumio.toto-castaldi.com

# 6. Install SSL certificate
sudo certbot --nginx -d deck.lumio.toto-castaldi.com
# Certbot will modify the live config to add SSL directives and HTTPS redirect

# 7. Verify SSL
curl -I https://deck.lumio.toto-castaldi.com

# 8. Google Cloud Console: Add authorized JavaScript origin
# https://deck.lumio.toto-castaldi.com
# And authorized redirect URI:
# https://deck.lumio.toto-castaldi.com/auth/callback

# 9. Supabase Dashboard: Add redirect URL
# https://deck.lumio.toto-castaldi.com/auth/callback
# (in Authentication > URL Configuration > Redirect URLs)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SSL cert management | Certbot with auto-renewal | 2016+ (Let's Encrypt) | Zero-maintenance SSL |
| Runtime env var injection for SPAs | Vite build-time `import.meta.env` | Vite 2+ (2021) | No server-side processing needed |
| Custom deploy scripts | GitHub Actions with appleboy actions | 2020+ | Declarative, auditable pipeline |

**No deprecated patterns in this stack.** All tools and patterns are current and actively maintained.

## Open Questions

1. **Supabase Redirect URL for Production**
   - What we know: The auth callback path is `/auth/callback` (confirmed in `auth.ts` line 8: `redirectTo: window.location.origin + '/auth/callback'`). Supabase needs `https://deck.lumio.toto-castaldi.com/auth/callback` as an allowed redirect URL.
   - What's unclear: Whether this is configured in the Supabase dashboard already or needs to be added as part of this phase.
   - Recommendation: Include as a step in the server setup runbook. Check Supabase dashboard Authentication > URL Configuration.

2. **Old Stale Files on Deploy**
   - What we know: SCP copies files to the target but does NOT delete old files that are no longer in the build output. Content-hashed filenames mean old JS/CSS bundles will accumulate.
   - What's unclear: Whether disk space accumulation is a concern on this server.
   - Recommendation: Not a concern for initial deployment. Can add a cleanup SSH step later if needed (e.g., `find /var/www/deck-lumio/assets -mtime +30 -delete`). The landing page has the same characteristic and has been fine.

3. **Smoke Test After Deploy**
   - What we know: The CONTEXT.md marks this as Claude's discretion.
   - Recommendation: Add a simple curl check as a final CI step: `curl -f https://deck.lumio.toto-castaldi.com/ || echo "Deploy smoke test failed"`. Non-blocking (informational). Alternatively, skip for now -- the app is for personal use and manual verification is sufficient.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.0 |
| Config file | `apps/deck-builder/vitest.config.ts` |
| Quick run command | `pnpm --filter @lumio/deck-builder test` |
| Full suite command | `pnpm --filter @lumio/deck-builder test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPL-01 | Web app served at deck.lumio.toto-castaldi.com with SSL | manual-only | Manual: `curl -I https://deck.lumio.toto-castaldi.com` | N/A -- infrastructure verification |
| DEPL-02 | CI/CD pipeline builds and deploys automatically | manual-only | Manual: push to main, verify GitHub Actions run completes | N/A -- pipeline verification |

**Justification for manual-only:** Both requirements are infrastructure/deployment requirements, not application behavior. DEPL-01 requires a live server with DNS and SSL. DEPL-02 requires a GitHub Actions run triggered by a push. Neither can be meaningfully automated in unit tests. Verification is done by pushing code and checking the deployed site.

### Sampling Rate
- **Per task commit:** `pnpm --filter @lumio/deck-builder test` (ensures app tests still pass)
- **Per wave merge:** Push to main triggers CI pipeline; verify deploy job succeeds
- **Phase gate:** `curl -f https://deck.lumio.toto-castaldi.com/` returns 200 with SSL

### Wave 0 Gaps
None -- existing test infrastructure covers all testable behavior. DEPL-01 and DEPL-02 are infrastructure requirements verified manually.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** (`ci-deploy.yml`) -- deploy-landing job pattern, SCP/SSH action versions, GitHub secrets, conditional triggers
- **Existing codebase** (`conf/nginx-lumio-mobile.conf`) -- SPA Nginx config with try_files, gzip, caching, certbot
- **Existing codebase** (`conf/nginx-lumio.conf`) -- Landing page Nginx config (non-SPA)
- **Existing codebase** (`apps/deck-builder/src/lib/supabase.ts`) -- Confirmed only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY used
- **Existing codebase** (`apps/deck-builder/src/lib/auth.ts`) -- Confirmed Google OAuth uses Supabase server-side config, no client-side VITE_GOOGLE_WEB_CLIENT_ID
- **Existing codebase** (`scripts/extract-version.cjs`) -- Version extraction and display format
- **Existing codebase** (`docs/VERSIONING.md`) -- Full versioning pipeline documentation
- **Existing codebase** (`apps/deck-builder/dist/`) -- Confirmed Vite produces content-hashed filenames in `assets/`

### Secondary (MEDIUM confidence)
- [Nginx SPA React Router Configuration](https://oneuptime.com/blog/post/2025-12-16-nginx-react-router-configuration/view) -- try_files pattern for React Router
- [Certbot Instructions](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal) -- Certbot with nginx plugin
- [DigitalOcean Let's Encrypt Tutorial](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04) -- Certbot + Nginx on Ubuntu
- [Nginx Security Headers 2026](https://www.getpagespeed.com/server-setup/nginx-security-headers-the-right-way) -- X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [appleboy/scp-action](https://github.com/appleboy/scp-action) -- strip_components behavior

### Tertiary (LOW confidence)
None -- all findings verified against existing codebase or official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already in use in this project; zero new dependencies
- Architecture: HIGH -- exact patterns exist in the codebase (deploy-landing, nginx-lumio-mobile.conf)
- Pitfalls: HIGH -- pitfalls identified from real codebase analysis (strip_components counting, env var scoping, OAuth redirect)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable infrastructure; no fast-moving dependencies)
