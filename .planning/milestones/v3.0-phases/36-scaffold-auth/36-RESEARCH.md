# Phase 36: Scaffold & Auth - Research

**Researched:** 2026-03-12
**Domain:** Vite/React SPA scaffolding, Supabase auth (Google OAuth + email/password), i18n, dark mode, responsive layout
**Confidence:** HIGH

## Summary

Phase 36 scaffolds a new `apps/deck-builder` Vite/React SPA within the existing pnpm monorepo, with Supabase authentication (Google OAuth and email/password), a responsive layout shell (collapsible sidebar + header), bilingual UI (IT/EN), and dark mode toggling (system/light/dark). This is a greenfield app that shares the same Supabase project as the mobile app but creates its own Supabase client with web-specific settings (`detectSessionInUrl: true`).

The stack is fully locked by prior research and user decisions: Vite 7, React 19, react-router 7 (Library Mode), Tailwind CSS 4, i18n-js 4, and `@supabase/supabase-js` 2 (direct, not via `@lumio/core`). The existing `@lumio/core` auth functions MUST NOT be reused because they are mobile-specific (native Google Sign-In, `detectSessionInUrl: false`, React Native storage adapter). The web app imports only `@lumio/shared` for types and constants.

**Primary recommendation:** Scaffold `apps/deck-builder` with the exact package.json from the STACK.md research, create a web-specific Supabase client with `detectSessionInUrl: true`, implement auth with `signInWithOAuth` for Google and `signInWithPassword`/`signUp` for email, use Tailwind v4 `@custom-variant dark` for class-based dark mode, and reuse i18n-js with translation objects structured like the mobile app.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Login page mirrors mobile layout: Lumio logo + tagline on top, Google OAuth button prominent, "or" separator, email/password form below
- Both email and password fields visible at once (no progressive disclosure -- simpler for web)
- Signup link and forgot password link below the form
- After signup: same OTP verification flow as mobile (6-digit code from email, same Supabase config)
- Password reset: same OTP-based flow as mobile
- Collapsible sidebar: always visible on desktop (>1024px), hamburger menu on tablet/mobile (<1024px)
- On mobile, sidebar slides in as overlay drawer
- Header bar shows: Lumio logo on left, language toggle + dark mode icon + user avatar on right
- Avatar click opens dropdown with: user email, sign out button
- No dedicated settings page -- header controls are sufficient for Phase 36
- Same Lumio brand identity as mobile app (logo, tri-color pie mark)
- Default theme: follow system preference (prefers-color-scheme), user can override to light/dark
- Dark mode toggle cycles: system -> light -> dark (with tooltip showing current mode)
- Preferences (language, theme) persist in localStorage
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can login with Google OAuth (same Supabase project) | Supabase `signInWithOAuth({ provider: 'google' })` with PKCE flow, web-specific client with `detectSessionInUrl: true`, auth callback route at `/auth/callback` |
| AUTH-02 | User can login with email/password (same Supabase project) | Supabase `signInWithPassword()` + `signUp()` + `verifyOtp()` for OTP verification, `resetPasswordForEmail()` for password reset -- all direct Supabase JS calls |
| AUTH-03 | Responsive layout with sidebar deck list and main editor area | Tailwind responsive utilities, sidebar always visible on desktop (>1024px via `lg:` breakpoint), hamburger overlay drawer on mobile, CSS Grid or Flexbox layout |
| AUTH-04 | IT/EN bilingual UI with language toggle | i18n-js library (same as mobile app), translation objects with same key structure, React context for locale state, localStorage persistence |
| AUTH-05 | Dark mode with system detection and manual toggle | Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` for class-based toggling, `prefers-color-scheme` media query for system detection, localStorage persistence, three-state cycle: system -> light -> dark |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | ^7.3.1 | Build tool & dev server | Industry standard for React SPAs. Instant HMR, native ESM. Locked in v3.0 research. |
| react | 19.1.0 | UI framework | Must match existing monorepo `pnpm.overrides.react` pin |
| react-dom | 19.1.0 | Browser rendering | Matches React version. Required for web. |
| @vitejs/plugin-react | ^4.5.0 | React fast-refresh for Vite | Standard Vite plugin for React. Handles JSX transform and HMR. |
| react-router | ^7.13.1 | Client-side routing | v7 Library Mode with `createBrowserRouter`. Single `react-router` package (no `react-router-dom`). |
| typescript | ~5.9.2 | Type safety | Match version across monorepo for consistency. |
| @supabase/supabase-js | ^2.45.0 | Auth + DB client | Direct dependency (NOT via @lumio/core). Web-specific client config. |
| tailwindcss | ^4.2.1 | Utility-first CSS | v4 with zero config. Dark mode via `@custom-variant`. |
| @tailwindcss/vite | ^4.2.1 | Vite integration plugin | Required for Tailwind v4 + Vite. |
| i18n-js | ^4.5.2 | Internationalization | Same library as mobile app for consistency. Lightweight, works in browser. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @lumio/shared | workspace:* | Types, constants, version | Always -- shared between all apps |
| react-hot-toast | ^2.5.2 | Toast notifications | Error feedback on auth failures, success on login |
| @types/react | ~19.1.0 | TypeScript React types | Dev dependency |
| @types/react-dom | ~19.1.0 | TypeScript React DOM types | Dev dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| i18n-js | react-i18next | More features (namespaces, suspense) but different library than mobile app; consistency wins for a small app |
| react-hot-toast | sonner | Sonner is newer and has nicer defaults, but react-hot-toast was locked in v3.0 research |
| @lumio/core auth functions | Custom web auth | MUST use custom web auth -- @lumio/core has mobile-specific code (native Google Sign-In, `detectSessionInUrl: false`) |

**Installation:**
```bash
cd apps/deck-builder

# Core dependencies
pnpm add react@19.1.0 react-dom@19.1.0 react-router@^7.13.1 \
  @supabase/supabase-js@^2.45.0 react-hot-toast@^2.5.2 i18n-js@^4.5.2

# Workspace dependency
pnpm add @lumio/shared@workspace:*

# Dev dependencies
pnpm add -D vite@^7.3.1 @vitejs/plugin-react@^4.5.0 \
  tailwindcss@^4.2.1 @tailwindcss/vite@^4.2.1 \
  typescript@~5.9.2 @types/react@~19.1.0 @types/react-dom@~19.1.0
```

## Architecture Patterns

### Recommended Project Structure
```
apps/deck-builder/
  package.json          # @lumio/deck-builder
  vite.config.ts        # Vite + React + Tailwind plugins
  tsconfig.json         # Extends ../../tsconfig.base.json
  tsconfig.app.json     # App-specific TS config
  index.html            # SPA entry point
  public/
    logo-login.png      # Lumio logo (copy from android assets)
    logo-header.png     # Lumio header logo
  src/
    main.tsx            # React root, createBrowserRouter, RouterProvider
    index.css           # @import "tailwindcss" + @custom-variant dark
    lib/
      supabase.ts       # Web-specific Supabase client (detectSessionInUrl: true)
      auth.ts           # Auth helper functions (signInWithOAuth, signInWithPassword, etc.)
      theme.ts          # Theme management (localStorage, system detection, class toggling)
      i18n.ts           # i18n-js setup with IT/EN translations
    i18n/
      en.ts             # English translations
      it.ts             # Italian translations
    contexts/
      AuthContext.tsx    # Auth state management (user, session, loading)
      ThemeContext.tsx   # Theme state (preference, isDark, toggle)
      I18nContext.tsx    # Locale state (locale, t function, setLocale)
    components/
      Layout.tsx        # App shell: sidebar + header + main content
      Sidebar.tsx       # Collapsible sidebar (placeholder content for Phase 36)
      Header.tsx        # Logo + language toggle + dark mode + avatar dropdown
      ProtectedRoute.tsx # Auth guard (redirect to login if not authenticated)
      AvatarDropdown.tsx # User email + sign out button
    pages/
      LoginPage.tsx     # Login form (mirrors mobile layout)
      SignUpPage.tsx     # Sign up form
      OtpVerification.tsx # 6-digit OTP verification
      ForgotPassword.tsx # Password reset request
      ResetPassword.tsx # New password form (after OTP verification)
      AuthCallback.tsx  # OAuth callback handler (/auth/callback)
      DashboardPage.tsx # Placeholder authenticated page
```

### Pattern 1: Web-Specific Supabase Client
**What:** Create a standalone Supabase client in `apps/deck-builder/src/lib/supabase.ts` with web-appropriate settings.
**When to use:** Always. NEVER import from `@lumio/core`.
**Example:**
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
      detectSessionInUrl: true,  // CRITICAL: Required for OAuth PKCE callback
      flowType: 'pkce',
    },
  }
);
```

### Pattern 2: OAuth Callback with detectSessionInUrl
**What:** With `detectSessionInUrl: true`, the Supabase JS client automatically detects the auth `code` parameter in the URL and exchanges it for a session. No manual `exchangeCodeForSession` call is needed.
**When to use:** Google OAuth login flow.
**Example:**
```typescript
// pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // detectSessionInUrl handles the code exchange automatically.
    // Listen for auth state change to know when session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return <div>Signing in...</div>;
}
```

### Pattern 3: Google OAuth on Web (signInWithOAuth)
**What:** Use `signInWithOAuth` which redirects the user to Google's consent screen and back via PKCE callback. This is DIFFERENT from mobile which uses native `GoogleSignIn.signIn()` + `signInWithIdToken()`.
**When to use:** Google login button on web.
**Example:**
```typescript
// lib/auth.ts
import { supabase } from './supabase';

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // When enable_confirmations=true: data.session is null, OTP email is sent
  // Detect fake success for existing emails (email enumeration protection)
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('email_exists');
  }
  return data;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
}

export async function verifyRecoveryOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

### Pattern 4: Tailwind v4 Dark Mode with Class Strategy
**What:** Use `@custom-variant` directive in CSS to enable class-based dark mode toggling. The `.dark` class on `<html>` activates all `dark:` utilities.
**When to use:** Dark mode toggle that supports system/light/dark.
**Example:**
```css
/* src/index.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

```typescript
// lib/theme.ts
export type ThemePreference = 'system' | 'light' | 'dark';
const THEME_KEY = 'lumio-theme';

export function loadThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function saveThemePreference(pref: ThemePreference): void {
  localStorage.setItem(THEME_KEY, pref);
}

export function applyThemeToDOM(pref: ThemePreference): void {
  const isDark = pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

/** Cycle: system -> light -> dark -> system */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const cycle: ThemePreference[] = ['system', 'light', 'dark'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}
```

### Pattern 5: i18n-js for Web (Same Library as Mobile)
**What:** Use i18n-js directly in the browser. It has no React Native dependencies -- the mobile app's usage of AsyncStorage for locale persistence is app-specific, not library-specific.
**When to use:** All user-facing text.
**Example:**
```typescript
// lib/i18n.ts
import { I18n } from 'i18n-js';
import en from '../i18n/en';
import it from '../i18n/it';

export type AppLocale = 'en' | 'it';
const LOCALE_KEY = 'lumio-locale';

export const i18n = new I18n({ en, it });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

export function loadLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'en' || stored === 'it') return stored;
  return 'en';
}

export function saveLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}
```

### Pattern 6: React Router 7 Library Mode with Auth Guards
**What:** Use `createBrowserRouter` with layout routes and route-level auth guards.
**When to use:** All routing in the SPA.
**Example:**
```typescript
// main.tsx
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { AuthCallback } from './pages/AuthCallback';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { Layout } from './components/Layout';

function ProtectedLayout() {
  // Use auth context to check if user is authenticated
  const { state } = useAuth();
  if (state === 'loading') return <LoadingSpinner />;
  if (state === 'logged_out') return <Navigate to="/login" replace />;
  return <Layout><Outlet /></Layout>;
}

function PublicLayout() {
  const { state } = useAuth();
  if (state === 'ready') return <Navigate to="/" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: '/auth/callback',
    Component: AuthCallback,
  },
  {
    Component: PublicLayout,
    children: [
      { path: '/login', Component: LoginPage },
      { path: '/signup', Component: SignUpPage },
      { path: '/verify-otp', Component: OtpVerification },
      { path: '/forgot-password', Component: ForgotPassword },
      { path: '/reset-password', Component: ResetPassword },
    ],
  },
  {
    Component: ProtectedLayout,
    children: [
      { path: '/', Component: DashboardPage },
      // Phase 38 adds deck routes here
    ],
  },
]);
```

### Pattern 7: Color Palette (Reuse Mobile Theme)
**What:** Use the same color tokens as the mobile app's theme for brand consistency, mapped to Tailwind CSS custom properties.
**When to use:** All themed elements.
**Example:**
```css
/* In index.css, after @import "tailwindcss" */
@theme {
  --color-lumio-bg: #f5f5f5;
  --color-lumio-surface: #ffffff;
  --color-lumio-text: #333333;
  --color-lumio-text-secondary: #6B7280;
  --color-lumio-primary: #3B82F6;
  --color-lumio-primary-light: #DBEAFE;
  --color-lumio-danger: #ef4444;
  --color-lumio-border: #e5e7eb;
}

/* Dark theme overrides via CSS custom properties scoped to .dark */
.dark {
  --color-lumio-bg: #111827;
  --color-lumio-surface: #1f2937;
  --color-lumio-text: #f9fafb;
  --color-lumio-text-secondary: #9ca3af;
  --color-lumio-primary: #60a5fa;
  --color-lumio-primary-light: #1e3a5f;
  --color-lumio-danger: #f87171;
  --color-lumio-border: #374151;
}
```

### Anti-Patterns to Avoid
- **Importing from `@lumio/core`:** Core has React Native transitive deps (`supermemo`, `remark-*`, `rehype-*`), mobile-specific auth (`detectSessionInUrl: false`, native Google Sign-In). Import ONLY from `@lumio/shared` for types.
- **Reusing mobile auth functions:** Web Google OAuth uses `signInWithOAuth` redirect flow. Mobile uses native `GoogleSignin.signIn()` + `signInWithIdToken()`. Completely different flows.
- **Using `detectSessionInUrl: false` on web:** This would prevent the Supabase client from detecting the OAuth callback code in the URL. The OAuth PKCE flow would silently fail.
- **Server-side `exchangeCodeForSession` in SPA:** With `detectSessionInUrl: true` on the client, the Supabase JS library handles code exchange automatically. No need for a server-side callback handler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state management | Custom auth state machine | Supabase `onAuthStateChange` + React context | Supabase handles token refresh, session persistence, auth events |
| Dark mode CSS | Manual CSS class toggling with media queries | Tailwind `dark:` variant with `@custom-variant` | Tailwind handles all dark: utility generation, just toggle the class |
| Internationalization | Custom key-value translation system | i18n-js with shared translation structure | Same library as mobile, proven, handles interpolation and fallback |
| OAuth redirect handling | Manual URL parsing for auth code | Supabase `detectSessionInUrl: true` | Supabase JS library parses URL, exchanges code, stores session automatically |
| Responsive sidebar | Custom window resize listeners | Tailwind responsive breakpoints (`lg:block`, `hidden`) + CSS transitions | Tailwind handles media queries; CSS transitions handle animation |
| Toast notifications | Custom notification component | react-hot-toast | Handles positioning, animation, auto-dismiss, Tailwind-compatible |

**Key insight:** The Supabase JS client does most of the heavy lifting for auth. The web app's auth code is primarily wiring up UI to Supabase SDK calls and managing React state. Do not reinvent session management, token refresh, or OAuth flow handling.

## Common Pitfalls

### Pitfall 1: OAuth Redirect URL Not Configured
**What goes wrong:** Google OAuth fails with "redirect_uri_mismatch" error because the deck builder URL is not registered.
**Why it happens:** Three separate places need the callback URL: Supabase config.toml (local), Supabase Dashboard (production), and Google Cloud Console OAuth client.
**How to avoid:** Before testing OAuth, add `http://localhost:5173/auth/callback` to all three locations. For production later (Phase 40), add `https://deck.lumio.toto-castaldi.com/auth/callback`.
**Warning signs:** OAuth works on mobile but fails on web; "redirect_uri_mismatch" in browser console.

### Pitfall 2: PKCE Code Verifier Lost on Redirect
**What goes wrong:** After Google consent screen, user returns to `/auth/callback` but session exchange fails with "both auth code and code verifier should be non-empty."
**Why it happens:** PKCE stores the code verifier in browser sessionStorage. If the callback redirects to a different origin than the one that initiated the flow, the verifier is missing.
**How to avoid:** Ensure `redirectTo` in `signInWithOAuth` points to the same origin (`window.location.origin + '/auth/callback'`). Never redirect cross-origin during the OAuth flow.
**Warning signs:** OAuth initiates fine but callback always fails; works in incognito but not after clearing storage.

### Pitfall 3: Dark Mode Flash of Unstyled Content (FOUC)
**What goes wrong:** Page loads with light theme, then flickers to dark theme after JS runs and reads localStorage.
**Why it happens:** React hydrates after HTML renders. By the time ThemeContext applies the `.dark` class, the user has already seen the light theme for a frame.
**How to avoid:** Add a synchronous `<script>` tag in `index.html` `<head>` that reads `localStorage.getItem('lumio-theme')` and applies `.dark` class to `<html>` BEFORE React renders.
**Warning signs:** Brief flash of white background when loading the app in dark mode.

### Pitfall 4: Email Signup OTP Flow Differences from Mobile
**What goes wrong:** Web signup flow fails because the OTP verification navigation is not implemented.
**Why it happens:** Mobile uses react-navigation to navigate to the OTP screen. Web uses react-router with URL-based navigation. The flow is: signup -> navigate to `/verify-otp?email=...` -> user enters 6-digit code -> `verifyOtp` call.
**How to avoid:** Implement the complete auth flow including OTP verification, not just login. Pass email as URL search param or React state.
**Warning signs:** User signs up but has no way to enter the verification code.

### Pitfall 5: Sidebar Overlay Not Closing on Navigation
**What goes wrong:** User opens sidebar drawer on mobile, taps a link, navigates to new page, but sidebar stays open.
**Why it happens:** Sidebar open state is managed independently from router navigation. Navigation does not trigger sidebar close.
**How to avoid:** Listen to location changes from react-router and close the sidebar drawer on navigation. Use `useLocation()` in a `useEffect`.
**Warning signs:** User must manually close sidebar after every navigation on mobile.

### Pitfall 6: Theme/Language Context Not Available During OAuth Callback
**What goes wrong:** AuthCallback page crashes because it renders outside the theme or i18n provider.
**Why it happens:** If providers wrap only the protected routes, the callback route has no context.
**How to avoid:** Place ThemeProvider, I18nProvider, and AuthProvider at the app root (wrapping `RouterProvider`), not inside route components.
**Warning signs:** White screen or error on `/auth/callback` route.

## Code Examples

### Vite Config (Verified Pattern)
```typescript
// apps/deck-builder/vite.config.ts
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
Source: v3.0 STACK.md research (verified against Vite 7 and Tailwind v4 docs)

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
  }
}
```
Source: v3.0 STACK.md research

### tsconfig.json (Extends Monorepo Base)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```
Source: Existing `packages/core/tsconfig.json` pattern adapted for browser

### index.html with Anti-FOUC Script
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lumio Deck Builder</title>
    <script>
      // Apply dark mode before React renders to prevent FOUC
      (function() {
        var theme = localStorage.getItem('lumio-theme');
        var isDark = theme === 'dark' ||
          (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) document.documentElement.classList.add('dark');
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### AuthContext for Web
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthState } from '@lumio/shared';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // ... additional methods as needed
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setState(existing ? 'ready' : 'logged_out');
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setState(newSession ? 'ready' : 'logged_out');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... implement methods using lib/auth.ts functions
}
```

### Responsive Sidebar with Tailwind
```typescript
// components/Layout.tsx - conceptual structure
export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-lumio-bg text-lumio-text">
      {/* Header - always visible */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {/* Desktop sidebar - always visible above lg breakpoint */}
        <aside className="hidden lg:block w-64 border-r border-lumio-border">
          <Sidebar />
        </aside>

        {/* Mobile sidebar - overlay drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                 onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-64 bg-lumio-surface z-50 lg:hidden">
              <Sidebar />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-router-dom separate package | Single `react-router` package for all modes | react-router v7 (2024) | Use `import { ... } from 'react-router'` not `react-router-dom` |
| tailwind.config.js `darkMode: 'class'` | `@custom-variant dark` in CSS | Tailwind v4 (2025) | No config file needed; dark mode defined in CSS |
| PostCSS for Tailwind | `@tailwindcss/vite` plugin | Tailwind v4 (2025) | Use Vite plugin instead of PostCSS config |
| `exchangeCodeForSession` manual call | `detectSessionInUrl: true` auto-exchange | Supabase JS v2 | Client automatically handles OAuth callback code exchange |

**Deprecated/outdated:**
- `react-router-dom`: Merged into `react-router` in v7. Import from `react-router` directly.
- `tailwind.config.js`: Eliminated in Tailwind v4. All config via CSS directives.
- `@supabase/ssr` for SPAs: Overkill for client-only SPAs. Direct `@supabase/supabase-js` with `detectSessionInUrl: true` is sufficient.

## Supabase Configuration Changes Required

### config.toml (Local Development)
The `http://localhost:5173/auth/callback` entry already exists in `additional_redirect_urls`. However, add the production URL:
```toml
additional_redirect_urls = [
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/auth/callback",
  "https://m-lumio.toto-castaldi.com/auth/callback",
  "https://deck.lumio.toto-castaldi.com/auth/callback",  # NEW
  "lumio://auth/callback"
]
```

### Google Cloud Console
Add `deck.lumio.toto-castaldi.com` to:
1. Authorized JavaScript origins
2. Authorized redirect URIs: `https://deck.lumio.toto-castaldi.com/auth/callback`

(Note: local dev uses Supabase's built-in auth redirect, so `localhost:5173` should already work)

### .env.local File
```bash
# apps/deck-builder/.env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Root package.json Updates

Add convenience scripts to root `package.json`:
```json
{
  "scripts": {
    "dev:deck-builder": "pnpm --filter @lumio/deck-builder dev"
  }
}
```

The existing `pnpm typecheck` and `pnpm lint` commands will automatically pick up the new workspace member.

## Open Questions

1. **Logo assets format for web**
   - What we know: Mobile uses PNG assets (`logo-login.png`, `logo-header.png`). SVG would be better for web (resolution-independent).
   - What's unclear: Whether SVG versions of the Lumio logo exist.
   - Recommendation: Copy PNG assets for now; optimize to SVG later if available.

2. **Translation key sharing with mobile**
   - What we know: Mobile app has `apps/android/i18n/en.ts` and `it.ts` with extensive translation objects.
   - What's unclear: How many keys overlap between mobile and web (login screen keys are similar, but mobile has many study/repo/dashboard keys irrelevant to web).
   - Recommendation: Create fresh translation files for the web app with a similar structure. Copy relevant login/auth keys, add web-specific keys. Do NOT import from `apps/android/i18n/` (would create cross-app dependency).

3. **Sidebar placeholder content**
   - What we know: CONTEXT.md puts this in Claude's Discretion.
   - Recommendation: Show a simple "Your decks will appear here" message with an icon. Phase 38 replaces this with the actual deck list.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0 (already in @lumio/core devDeps) |
| Config file | none -- see Wave 0 |
| Quick run command | `pnpm --filter @lumio/deck-builder test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Google OAuth signInWithOAuth call | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/auth.test.ts -t "google"` | -- Wave 0 |
| AUTH-02 | Email signInWithPassword + signUp | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/auth.test.ts -t "email"` | -- Wave 0 |
| AUTH-03 | Layout responsive breakpoint behavior | manual-only | Visual inspection at multiple breakpoints | N/A (CSS layout, no unit test) |
| AUTH-04 | i18n locale switching | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/i18n.test.ts` | -- Wave 0 |
| AUTH-05 | Theme toggle cycle + DOM class | unit | `pnpm --filter @lumio/deck-builder exec vitest run src/lib/__tests__/theme.test.ts` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @lumio/deck-builder typecheck`
- **Per wave merge:** `pnpm typecheck && pnpm --filter @lumio/deck-builder test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/deck-builder/vitest.config.ts` -- vitest config for deck-builder
- [ ] `apps/deck-builder/src/lib/__tests__/auth.test.ts` -- auth helper unit tests
- [ ] `apps/deck-builder/src/lib/__tests__/theme.test.ts` -- theme toggle unit tests
- [ ] `apps/deck-builder/src/lib/__tests__/i18n.test.ts` -- i18n locale switching tests

## Sources

### Primary (HIGH confidence)
- Existing codebase: `packages/core/src/supabase/client.ts` -- mobile Supabase client config (detectSessionInUrl: false)
- Existing codebase: `packages/core/src/supabase/auth.ts` -- auth function signatures and patterns
- Existing codebase: `apps/android/contexts/AuthContext.tsx` -- full auth state machine for mobile
- Existing codebase: `apps/android/contexts/ThemeContext.tsx` -- theme preference pattern
- Existing codebase: `apps/android/lib/theme.ts` -- color palette (light/dark colors to reuse)
- Existing codebase: `apps/android/lib/i18n.ts` -- i18n-js setup pattern
- Existing codebase: `supabase/config.toml` -- existing redirect URLs, auth config
- `.planning/research/STACK.md` -- v3.0 stack decisions (locked)
- `.planning/research/ARCHITECTURE.md` -- v3.0 architecture patterns
- `.planning/research/PITFALLS.md` -- v3.0 pitfall analysis
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) -- `@custom-variant dark` syntax verified
- [Supabase PKCE flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- detectSessionInUrl auto-exchange verified

### Secondary (MEDIUM confidence)
- [React Router v7 Modes](https://reactrouter.com/start/modes) -- Library/Data Mode setup with createBrowserRouter
- [Supabase signInWithOAuth docs](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) -- redirect behavior, PKCE support
- [Supabase Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google) -- redirect URL configuration requirements
- [i18n-js npm](https://www.npmjs.com/package/i18n-js) -- browser compatibility confirmed

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified, locked in v3.0 research, monorepo patterns well understood
- Architecture: HIGH - Patterns derived from existing mobile app + Supabase official docs + Tailwind v4 docs
- Auth flow: HIGH - Supabase PKCE flow well-documented; mobile auth code provides clear pattern to adapt
- Pitfalls: HIGH - Cross-referenced with v3.0 PITFALLS.md research and official Supabase/Tailwind docs

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days -- stable ecosystem, no fast-moving deps)
