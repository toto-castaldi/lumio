# Phase 36: Scaffold & Auth - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Vite/React/Tailwind web app project scaffolded in `apps/deck-builder` within the monorepo. Users can log in with Google OAuth or email/password (same Supabase project). Responsive layout shell with collapsible sidebar, header bar with preferences, i18n (IT/EN), and dark mode (system/light/dark). No deck management or card editing — those are Phase 38 and 39.

</domain>

<decisions>
## Implementation Decisions

### Login page design
- Mirror mobile layout: Lumio logo + tagline on top, Google OAuth button prominent, "or" separator, email/password form below
- Both email and password fields visible at once (no progressive disclosure — simpler for web)
- Signup link and forgot password link below the form
- After signup: same OTP verification flow as mobile (6-digit code from email, same Supabase config)
- Password reset: same OTP-based flow as mobile

### App shell & sidebar
- Collapsible sidebar: always visible on desktop (>1024px), hamburger menu on tablet/mobile (<1024px)
- On mobile, sidebar slides in as overlay drawer
- Header bar shows: Lumio logo on left, language toggle + dark mode icon + user avatar on right
- Avatar click opens dropdown with: user email, sign out button
- No dedicated settings page — header controls are sufficient for Phase 36

### Theme & branding
- Same Lumio brand identity as mobile app (logo, tri-color pie mark)
- Default theme: follow system preference (prefers-color-scheme), user can override to light/dark
- Dark mode toggle cycles: system → light → dark (with tooltip showing current mode)
- Preferences (language, theme) persist in localStorage

### Language
- IT/EN segmented control toggle in header bar, always visible
- One-click language switch, no navigation needed
- Language preference persists in localStorage

### Claude's Discretion
- Login page tagline/subtitle (something fitting the deck builder context)
- Sidebar placeholder content before deck list arrives in Phase 38
- Main content area placeholder after login
- Primary accent color (should work with Lumio brand in both themes)
- Typography/font choice for web
- Loading states and error handling UX
- Exact sidebar width and breakpoint fine-tuning

</decisions>

<specifics>
## Specific Ideas

- Header bar layout: `[Lumio logo] ... [IT|EN] [🌙] [Avatar]` — compact preference controls always accessible
- Avatar dropdown is minimal: just email + sign out (no settings page)
- Login page should feel familiar to mobile app users — same auth flow, same branding

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@lumio/core`: Supabase client singleton with pluggable `StorageAdapter` — web can pass `localStorage` adapter
- `@lumio/core`: Auth functions (`signInWithGoogle`, `signOut`, `getSession`, `getCurrentUser`, `onAuthStateChange`) — platform-agnostic, reusable on web
- `@lumio/shared`: Version info, types, constants — reusable on web
- `pnpm-workspace.yaml`: Already configured for `apps/*` and `packages/*`

### Established Patterns
- Monorepo structure: `apps/` for apps, `packages/` for shared code
- Root `package.json` has React 19 override and build scripts
- `@lumio/core` creates Supabase client with `createSupabaseClient(url, anonKey, { storage })` — web needs to call this with a localStorage-based adapter
- i18n on mobile uses `i18n-js` — web will need its own i18n setup (can share translation keys/structure)

### Integration Points
- Same Supabase project: auth, DB, edge functions all shared between mobile and web
- Google Cloud Console: needs `deck.lumio.toto-castaldi.com` added as authorized JavaScript origin for OAuth
- `apps/deck-builder` will be a new workspace member (auto-detected by pnpm via `apps/*` glob)
- CI/CD pipeline will need a new build/deploy job for the web app (Phase 40)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-scaffold-auth*
*Context gathered: 2026-03-12*
