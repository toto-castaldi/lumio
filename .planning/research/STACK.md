# Technology Stack

**Project:** Lumio Deck Builder Web App (v3.0)
**Researched:** 2026-03-11

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | ^7.3.1 | Build tool & dev server | Industry standard for React SPAs in 2026. Instant HMR, native ESM, zero-config TypeScript. CRA is dead, Webpack is legacy -- no alternative worth considering for a new project. |
| React | 19.1.0 | UI framework | Must match existing monorepo `pnpm.overrides.react` pin. Shared with `@lumio/core` and `@lumio/shared`. |
| React DOM | 19.1.0 | Browser rendering | Matches React version. Required for web (Android app uses react-native instead). |
| @vitejs/plugin-react | ^4.5.0 | React fast-refresh for Vite | Standard Vite plugin for React. Handles JSX transform and HMR. |
| react-router | ^7.13.1 | Client-side routing | v7 unifies react-router and react-router-dom into single `react-router` import. Use Library Mode with `createBrowserRouter` -- no need for Framework Mode since this is a simple SPA with no SSR. |
| TypeScript | ~5.9.2 | Type safety | Match version from `apps/android` for monorepo consistency. |

### Supabase (Web Client)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.45.0 | Auth + DB client for browser | Already a dependency in `@lumio/core`. Web app creates its own Supabase client instance -- not through `@lumio/core`'s singleton. Same Supabase project = shared auth, shared tables, shared RLS policies. |

**Why a separate Supabase client (not via @lumio/core):**
The `createSupabaseClient()` in `@lumio/core` is configured for mobile: `detectSessionInUrl: false`, `flowType: 'pkce'`. The web app needs `detectSessionInUrl: true` to handle OAuth redirects in the browser. Creating the client directly with `@supabase/supabase-js` is 6 lines of code and avoids coupling to mobile-specific configuration. The web client uses browser `localStorage` by default -- no custom `StorageAdapter` needed.

```typescript
// apps/deck-builder/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,  // Required for OAuth redirect handling
      flowType: 'pkce',
    },
  }
);
```

### Markdown Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @uiw/react-md-editor | ^4.0.11 | Markdown editing with live preview | ~4.6 kB gzipped -- smallest full-featured option. Split-pane edit/preview mode. GitHub Flavored Markdown built-in. TypeScript definitions. Active maintenance (last release Dec 2025). Uses native textarea, no CodeMirror/Monaco dependency. Perfect for flashcard content where users need to see and control the raw markdown. |

**Alternatives considered:**

| Option | Bundle Size | Why Not |
|--------|-------------|---------|
| MDXEditor | ~851 kB gzip | 185x larger for WYSIWYG features not needed. Flashcard content is raw markdown. |
| Monaco Editor | ~2 MB | Overkill code editor. Wrong tool for content authoring. |
| CodeMirror (@uiw/react-codemirror) | ~150 kB | Good but heavier for the same task. Only choose if custom language modes are needed. |
| Plain textarea + react-markdown | ~5 kB | Too bare. No toolbar, no split preview. Would need to build editor UI from scratch. |

### GitHub API (Edge Function)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GitHub REST API (direct fetch) | v2022-11-28 | Commit files to shared repo | Use `PUT /repos/{owner}/{repo}/contents/{path}` directly via `fetch()` in the Deno edge function. One endpoint takes path + base64 content + commit message and creates/updates a file in one call. Avoids the multi-step git tree/blob/commit dance. Existing edge functions (git-sync, docora-webhook) already use raw `fetch()` for external APIs -- this is a consistent pattern. |

**Why NOT Octokit:**
- The edge function needs one endpoint: create/update file contents
- Octokit adds ~200KB+ dependency surface for a single `fetch()` call
- Existing edge functions already use raw `fetch()` for Docora API calls
- `npm:octokit` in Deno edge functions adds cold start latency
- A wrapper function around `fetch()` with proper headers is ~20 lines

**API endpoint:**
```
PUT /repos/{owner}/{repo}/contents/{path}
Headers: Authorization: Bearer {GITHUB_PAT}, Accept: application/vnd.github+json
Body: { message, content (base64), sha (for updates -- omit for create) }
```

The edge function stores a GitHub PAT (fine-grained, scoped to the shared Lumio deck repo only) as a Supabase secret. Users never see or handle the token.

**For deleting files (deck/card deletion):**
```
DELETE /repos/{owner}/{repo}/contents/{path}
Headers: Authorization: Bearer {GITHUB_PAT}, Accept: application/vnd.github+json
Body: { message, sha (required -- get from GET endpoint first) }
```

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | ^4.2.1 | Utility-first CSS | v4 eliminates `tailwind.config.js` -- works with just `@import "tailwindcss"` in CSS. Automatic content detection + tree-shaking = tiny production CSS. Fast solo-developer velocity: compose directly in JSX instead of naming CSS classes. |
| @tailwindcss/vite | ^4.2.1 | Vite integration plugin | Required for Tailwind v4 + Vite. Replaces the old PostCSS approach. Zero config. |

**Monorepo note:** Tailwind v4's automatic content detection scans the app directory tree. Since the deck builder only imports types/constants from `@lumio/shared` (no UI components), all Tailwind classes are in `apps/deck-builder/src/` -- no `@source` directive needed. If shared UI components are ever introduced, add `@source "../../packages/ui/src";` to the CSS file.

**Why not CSS Modules:** Tailwind is faster for solo development. CSS Modules require naming every class. The deck builder is a small focused SPA, not a shared design system.

### Deploy

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite build (static) | -- | Production build | `vite build` outputs `dist/` with static HTML/JS/CSS. SPA with client-side routing. |
| DigitalOcean + nginx | existing | Hosting | Same VPS already hosts `lumio.toto-castaldi.com` (landing page). Add nginx server block for `deck.lumio.toto-castaldi.com`. Same infra = no new vendor, no new DNS provider. |
| SCP + SSH (GitHub Actions) | existing | CI/CD deployment | Same `appleboy/scp-action` + `appleboy/ssh-action` pattern from landing page deploy. Copy `dist/` to `/var/www/deck-builder`, reload nginx. |

**SPA routing on nginx:** Add `try_files $uri $uri/ /index.html;` to the server block. This serves `index.html` for all paths, letting react-router handle routing client-side.

**Why not Vercel/Netlify/GitHub Pages:** The project already has a DigitalOcean VPS with nginx. Adding another hosting provider increases complexity (DNS split, different deploy processes, another vendor). A static SPA deploy via SCP is 5 lines of CI config -- consistent with the existing landing page deploy pattern.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @lumio/shared | workspace:* | Types, constants, version | Always -- shared between all apps. Already exports VERSION, types, constants. |
| react-hot-toast | ^2.5.2 | Toast notifications | Success/error feedback on save/delete operations. Lightweight (~5kB), Tailwind-friendly. Analogous to `react-native-toast-message` in the Android app. |
| i18n-js | ^4.5.2 | Internationalization | Same library as Android app. Share translation keys for consistent IT/EN support. |

## What NOT to Add (Already Available via Workspace)

| Package | Available Via | Notes |
|---------|--------------|-------|
| @supabase/supabase-js | Directly (already in dependency tree via @lumio/core) | Web app installs its own copy but shares the same semver range |
| Types (Repository, Card, etc.) | @lumio/shared | Reuse all shared TypeScript types |
| VERSION, BUILD_INFO | @lumio/shared | Same version system |
| Constants | @lumio/shared | All shared constants |

**Do NOT import from `@lumio/core` in the web app.** The core package has React Native-specific transitive dependencies (rehype-highlight, rehype-katex, remark-gfm, remark-math, supermemo, `ignore`). These are unnecessary for the deck builder and may cause bundler issues. Import only from `@lumio/shared` for types/constants. Use `@supabase/supabase-js` directly for the web Supabase client.

## Monorepo Integration

### New Package Structure

```
apps/deck-builder/
  package.json        # @lumio/deck-builder
  vite.config.ts
  tsconfig.json
  index.html          # SPA entry point
  public/
  src/
    main.tsx           # React root
    App.tsx            # Router setup with createBrowserRouter
    index.css          # @import "tailwindcss"
    lib/
      supabase.ts      # Web-specific Supabase client
    pages/             # Route components (Login, DeckList, DeckEdit, CardEdit)
    components/        # Reusable UI components
    hooks/             # Custom React hooks
```

### package.json

```json
{
  "name": "@lumio/deck-builder",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@lumio/shared": "workspace:*",
    "@supabase/supabase-js": "^2.45.0",
    "@uiw/react-md-editor": "^4.0.11",
    "i18n-js": "^4.5.2",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-router": "^7.13.1",
    "react-hot-toast": "^2.5.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.1",
    "@types/react": "~19.1.0",
    "@types/react-dom": "~19.1.0",
    "tailwindcss": "^4.2.1",
    "typescript": "~5.9.2",
    "vite": "^7.3.1",
    "@vitejs/plugin-react": "^4.5.0"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
```

## Installation

```bash
# From monorepo root -- create the app directory and initialize
mkdir -p apps/deck-builder

# From apps/deck-builder
cd apps/deck-builder

# Core dependencies
pnpm add react@19.1.0 react-dom@19.1.0 react-router@^7.13.1 \
  @supabase/supabase-js@^2.45.0 @uiw/react-md-editor@^4.0.11 \
  react-hot-toast@^2.5.2 i18n-js@^4.5.2

# Workspace dependency
pnpm add @lumio/shared@workspace:*

# Dev dependencies
pnpm add -D vite@^7.3.1 @vitejs/plugin-react@^4.5.0 \
  tailwindcss@^4.2.1 @tailwindcss/vite@^4.2.1 \
  typescript@~5.9.2 @types/react@~19.1.0 @types/react-dom@~19.1.0
```

## Edge Function Dependencies (Deno)

The new `deck-commit` edge function needs no npm dependencies beyond the Supabase client:

```typescript
// supabase/functions/deck-commit/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// GitHub API calls use native Deno fetch() -- no Octokit needed
```

No additional packages. Follows the `npm:` specifier pattern recommended by Supabase docs (not the old `esm.sh` CDN imports used in existing functions like git-sync).

## CI/CD Changes

Add to the existing `ci-deploy.yml` workflow:

1. **Build step:** `pnpm --filter @lumio/deck-builder build` after `build:packages`
2. **Deploy step:** SCP `apps/deck-builder/dist/` to `/var/www/deck-builder` on the DO server
3. **Nginx config:** New server block for `deck.lumio.toto-castaldi.com` with SSL (Let's Encrypt)
4. **Environment:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub secrets (same values as existing `SUPABASE_URL` and `SUPABASE_ANON_KEY`)

The typecheck job already runs `pnpm typecheck` which will pick up the new `@lumio/deck-builder` package via pnpm workspace.

## Supabase Configuration Changes

### config.toml (Local Development)

Add the deck builder URL to allowed redirects:

```toml
[auth]
additional_redirect_urls = [
  "http://localhost:5173/auth/callback",    # deck-builder local dev
  "http://localhost:5174/auth/callback",
  "https://m-lumio.toto-castaldi.com/auth/callback",
  "https://deck.lumio.toto-castaldi.com/auth/callback",  # NEW: production
  "lumio://auth/callback"
]
```

### Production Supabase Dashboard

- Add `https://deck.lumio.toto-castaldi.com` to Site URL or Additional Redirect URLs
- Add `https://deck.lumio.toto-castaldi.com/auth/callback` to Redirect URL allow list
- Google OAuth: Add `deck.lumio.toto-castaldi.com` to authorized JavaScript origins in Google Cloud Console

## Confidence Assessment

| Technology | Confidence | Reason |
|------------|------------|--------|
| Vite 7 | HIGH | npm verified v7.3.1, industry standard, production proven |
| React 19.1.0 | HIGH | Already pinned in monorepo, no change needed |
| react-router 7 | HIGH | npm verified v7.13.1, Library Mode well documented |
| @uiw/react-md-editor 4 | MEDIUM | npm verified v4.0.11, active maintenance, less widely adopted than CodeMirror. Fallback: swap to @uiw/react-codemirror if editor limitations surface |
| GitHub REST API (direct fetch) | HIGH | Official GitHub docs, stable endpoint, well-documented PUT contents API |
| Tailwind CSS 4 | HIGH | npm verified v4.2.1, Vite plugin documented, v4 widely adopted |
| @supabase/supabase-js 2 | HIGH | Already in project, web browser support confirmed, v2.99.0 latest |
| DigitalOcean + nginx deploy | HIGH | Existing infrastructure, proven pattern with landing page |
| react-hot-toast | HIGH | Widely used, small footprint, straightforward API |
| i18n-js | HIGH | Already used in Android app, same library for consistency |

## Sources

- [Vite npm](https://www.npmjs.com/package/vite) - v7.3.1 verified
- [React Router docs - Picking a Mode](https://reactrouter.com/start/modes) - Library Mode vs Framework Mode
- [React Router docs - SPA](https://reactrouter.com/how-to/spa) - SPA configuration
- [react-router npm](https://www.npmjs.com/package/react-router) - v7.13.1 verified
- [@uiw/react-md-editor npm](https://www.npmjs.com/package/@uiw/react-md-editor) - v4.0.11 verified
- [@uiw/react-md-editor GitHub](https://github.com/uiwjs/react-md-editor) - features and API docs
- [GitHub REST API - Repository Contents](https://docs.github.com/en/rest/repos/contents) - PUT endpoint for file create/update
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) - v2.99.0 latest
- [Supabase Auth Architecture](https://supabase.com/docs/guides/auth/architecture) - shared auth across apps
- [Supabase Sessions - Subdomain Discussion](https://github.com/orgs/supabase/discussions/5742) - cross-domain auth considerations
- [Tailwind CSS npm](https://www.npmjs.com/package/tailwindcss) - v4.2.1 verified
- [Tailwind CSS v4 + Vite setup](https://tailwindcss.com/docs) - Official installation guide
- [Tailwind v4 monorepo issue #13136](https://github.com/tailwindlabs/tailwindcss/issues/13136) - @source directive for workspace content detection
- [Nx blog - Tailwind 4 npm workspace](https://nx.dev/blog/setup-tailwind-4-npm-workspace) - Monorepo configuration guide
- [Supabase Edge Functions - Dependencies](https://supabase.com/docs/guides/functions/dependencies) - npm: specifier preferred over esm.sh
- [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy) - Deployment options
- [Octokit GitHub](https://github.com/octokit/octokit.js/) - Evaluated and rejected for simplicity
