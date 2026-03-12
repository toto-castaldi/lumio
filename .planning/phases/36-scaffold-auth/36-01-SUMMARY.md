---
phase: 36-scaffold-auth
plan: 01
subsystem: ui
tags: [vite, react, tailwind, supabase, i18n, dark-mode, vitest, react-router]

# Dependency graph
requires: []
provides:
  - Vite 7 + React 19 + Tailwind 4 project scaffold at apps/deck-builder
  - Web-specific Supabase client with PKCE flow and detectSessionInUrl
  - Auth helper functions (Google OAuth, email/password, OTP, password reset)
  - Theme management with system/light/dark cycling and anti-FOUC
  - i18n-js setup with EN/IT translations
  - AuthContext, ThemeContext, I18nContext React contexts
  - Router with all auth routes and protected dashboard
  - 38 unit tests covering auth, theme, and i18n lib functions
affects: [36-02, 36-03, 37, 38, 39, 40]

# Tech tracking
tech-stack:
  added: [vite@7, react@19, react-dom@19, react-router@7, tailwindcss@4, "@tailwindcss/vite@4", "@vitejs/plugin-react@4", vitest@4, jsdom@26, i18n-js@4, react-hot-toast@2]
  patterns: [web-supabase-client, pkce-oauth-flow, tailwind-v4-dark-mode, anti-fouc-script, context-wraps-router]

key-files:
  created:
    - apps/deck-builder/package.json
    - apps/deck-builder/vite.config.ts
    - apps/deck-builder/tsconfig.json
    - apps/deck-builder/index.html
    - apps/deck-builder/src/lib/supabase.ts
    - apps/deck-builder/src/lib/auth.ts
    - apps/deck-builder/src/lib/theme.ts
    - apps/deck-builder/src/lib/i18n.ts
    - apps/deck-builder/src/i18n/en.ts
    - apps/deck-builder/src/i18n/it.ts
    - apps/deck-builder/src/contexts/AuthContext.tsx
    - apps/deck-builder/src/contexts/ThemeContext.tsx
    - apps/deck-builder/src/contexts/I18nContext.tsx
    - apps/deck-builder/src/main.tsx
    - apps/deck-builder/vitest.config.ts
    - apps/deck-builder/src/lib/__tests__/auth.test.ts
    - apps/deck-builder/src/lib/__tests__/theme.test.ts
    - apps/deck-builder/src/lib/__tests__/i18n.test.ts
  modified:
    - supabase/config.toml
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used vi.hoisted() for test mock functions to handle Vitest module hoisting correctly"
  - "Added vite-env.d.ts for import.meta.env type support"
  - "Default matchMedia mock in theme tests since jsdom does not implement matchMedia"

patterns-established:
  - "Pattern: Web Supabase client at apps/deck-builder/src/lib/supabase.ts with detectSessionInUrl: true (unlike mobile which uses false)"
  - "Pattern: Anti-FOUC script in index.html reads localStorage before React renders"
  - "Pattern: ThemeProvider > I18nProvider > AuthProvider > RouterProvider at app root (prevents Pitfall 6)"
  - "Pattern: Auth helpers as pure functions in lib/auth.ts, wrapped by AuthContext for React state"
  - "Pattern: vi.hoisted() for creating mock functions used in vi.mock() factory"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 36 Plan 01: Scaffold & Lib Layer Summary

**Vite 7 / React 19 / Tailwind 4 deck-builder app with Supabase PKCE auth, i18n-js EN/IT, dark mode cycling, and 38 passing unit tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T07:48:40Z
- **Completed:** 2026-03-12T07:54:09Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Scaffolded complete Vite/React/Tailwind project as pnpm workspace member with all dependencies
- Created web-specific Supabase client, 8 auth helper functions, theme management, and i18n setup
- Built 3 React contexts (Auth, Theme, I18n) with router skeleton and placeholder pages
- All 38 unit tests pass (16 auth, 13 theme, 9 i18n), TypeScript compiles clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite project with lib layer** - `83d8289` (feat)
2. **Task 2: React contexts, router, and Wave 0 unit tests** - `eed708f` (feat)

## Files Created/Modified
- `apps/deck-builder/package.json` - @lumio/deck-builder workspace package with all deps
- `apps/deck-builder/vite.config.ts` - Vite 7 + React + Tailwind plugins
- `apps/deck-builder/tsconfig.json` - TypeScript config extending monorepo base
- `apps/deck-builder/tsconfig.app.json` - App-specific TS config for Vite build
- `apps/deck-builder/index.html` - SPA entry with anti-FOUC dark mode script
- `apps/deck-builder/src/index.css` - Tailwind v4 with @custom-variant dark and lumio color tokens
- `apps/deck-builder/src/vite-env.d.ts` - Vite client type declarations
- `apps/deck-builder/src/lib/supabase.ts` - Web Supabase client (detectSessionInUrl: true, PKCE)
- `apps/deck-builder/src/lib/auth.ts` - Auth helpers (Google OAuth, email, OTP, password reset)
- `apps/deck-builder/src/lib/theme.ts` - Theme preference management with DOM class toggling
- `apps/deck-builder/src/lib/i18n.ts` - i18n-js setup with EN/IT locale management
- `apps/deck-builder/src/i18n/en.ts` - English translations for all auth and UI strings
- `apps/deck-builder/src/i18n/it.ts` - Italian translations matching all EN keys
- `apps/deck-builder/src/contexts/AuthContext.tsx` - Auth state with session tracking and auth methods
- `apps/deck-builder/src/contexts/ThemeContext.tsx` - Theme state with system detection and cycling
- `apps/deck-builder/src/contexts/I18nContext.tsx` - Locale state with t() function and switching
- `apps/deck-builder/src/main.tsx` - App root with providers, router, placeholder pages
- `apps/deck-builder/vitest.config.ts` - Vitest config with jsdom environment
- `apps/deck-builder/src/lib/__tests__/auth.test.ts` - 16 auth helper tests
- `apps/deck-builder/src/lib/__tests__/theme.test.ts` - 13 theme management tests
- `apps/deck-builder/src/lib/__tests__/i18n.test.ts` - 9 i18n locale tests
- `supabase/config.toml` - Added deck builder production redirect URL
- `package.json` - Added dev:deck-builder script
- `pnpm-lock.yaml` - Updated with new dependencies

## Decisions Made
- Used `vi.hoisted()` for test mock functions to handle Vitest's module hoisting correctly (mock factory runs before const declarations otherwise)
- Added `vite-env.d.ts` for `import.meta.env` type support (TypeScript does not know about Vite's env types without it)
- Provided default `matchMedia` mock in theme test `beforeEach` since jsdom does not implement `window.matchMedia`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vite-env.d.ts for import.meta.env types**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** TypeScript could not resolve `import.meta.env.VITE_SUPABASE_URL` -- `Property 'env' does not exist on type 'ImportMeta'`
- **Fix:** Created `src/vite-env.d.ts` with `/// <reference types="vite/client" />`
- **Files modified:** apps/deck-builder/src/vite-env.d.ts
- **Verification:** `pnpm --filter @lumio/deck-builder typecheck` passes
- **Committed in:** 83d8289 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed vi.mock hoisting issue in auth tests**
- **Found during:** Task 2 (test verification)
- **Issue:** `ReferenceError: Cannot access 'mockSignInWithOAuth' before initialization` -- vi.mock factory is hoisted above const declarations
- **Fix:** Used `vi.hoisted()` to declare mock functions so they are available when the hoisted vi.mock factory executes
- **Files modified:** apps/deck-builder/src/lib/__tests__/auth.test.ts
- **Verification:** All 16 auth tests pass
- **Committed in:** eed708f (Task 2 commit)

**3. [Rule 1 - Bug] Fixed matchMedia not available in jsdom for theme tests**
- **Found during:** Task 2 (test verification)
- **Issue:** `TypeError: window.matchMedia is not a function` -- jsdom does not implement matchMedia
- **Fix:** Added default matchMedia mock in beforeEach returning `matches: false`
- **Files modified:** apps/deck-builder/src/lib/__tests__/theme.test.ts
- **Verification:** All 13 theme tests pass
- **Committed in:** eed708f (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bug fixes, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Local `.env.local` was created with standard Supabase demo credentials.

## Next Phase Readiness
- All lib modules, contexts, and router ready for Plan 02 (auth page implementations)
- Placeholder page components are in main.tsx, ready to be replaced with real implementations
- All exported APIs match the plan's artifact specifications exactly
- Supabase config.toml has production redirect URL for future deployment

## Self-Check: PASSED

- All 22 key files verified present on disk
- Both task commits (83d8289, eed708f) verified in git log

---
*Phase: 36-scaffold-auth*
*Completed: 2026-03-12*
