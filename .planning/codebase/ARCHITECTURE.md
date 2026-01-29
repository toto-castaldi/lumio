# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Monorepo with shared libraries and multiple client applications. This is a **layered architecture** with clear separation between:
- Presentation layer (React SPAs for web and mobile)
- Business logic layer (@lumio/core package)
- Shared types and utilities (@lumio/shared package)
- Backend services (Supabase Edge Functions)

**Key Characteristics:**
- Monorepo structure using pnpm workspaces for code sharing across apps
- TypeScript-first for type safety across all layers
- Supabase as backend-as-a-service (auth, database, storage, edge functions)
- React Router-based client-side routing with authentication guards
- Stateless business logic in @lumio/core (no client-specific concerns)

## Layers

**Presentation Layer (apps/web and apps/mobile):**
- Purpose: React-based user interfaces, page rendering, user interactions
- Location: `apps/web/src`, `apps/mobile/src`
- Contains: Pages, components, hooks, layouts, contexts
- Depends on: @lumio/core, @lumio/shared, React ecosystem, Radix UI
- Used by: Browser clients

**Business Logic Layer (@lumio/core):**
- Purpose: Application logic, Supabase client initialization, data operations, content transformations
- Location: `packages/core/src`
- Contains:
  - `supabase/` - Supabase client and RPC functions (auth, repositories, cards, study, assets)
  - `deck/` - Card filtering logic with .lumioignore support
  - `card/` - CardView class for image URL transformation
  - `markdown/` - Markdown parsing and rendering configuration
- Depends on: @lumio/shared, @supabase/supabase-js, remark/rehype plugins
- Used by: Web app, mobile app, edge functions

**Shared Types Layer (@lumio/shared):**
- Purpose: Type definitions, constants, version management shared across all packages
- Location: `packages/shared/src`
- Contains: TypeScript interfaces, enums, version information, constants
- Depends on: Nothing (zero external dependencies)
- Used by: @lumio/core, web app, mobile app, edge functions

**Backend Services (supabase/functions):**
- Purpose: Serverless edge functions for LLM operations, webhooks, data generation
- Location: `supabase/functions/`
- Contains:
  - `llm-proxy/` - AI quiz generation and validation (OpenAI/Anthropic)
  - `question-generator/` - Batch pre-generation of quiz questions
  - `study-planner/` - Study session planning
  - `git-sync/` - Repository synchronization webhook
  - `docora-webhook/` - Integration with Docora documentation service
  - `version/` - Version information endpoint
- Depends on: Deno runtime, @supabase SDK

**Database Layer (Supabase PostgreSQL):**
- Purpose: Persistent storage, RLS policies, real-time subscriptions
- Location: `supabase/migrations/`
- Contains: Schema definitions, tables, indexes, RLS policies
- Key tables: users, repositories, cards, card_assets, card_questions, platform_config

## Data Flow

**Authentication Flow:**

1. User navigates to `/login`
2. LoginPage renders Google OAuth button
3. `signInWithGoogle()` calls Supabase auth
4. Supabase redirects to `/auth/callback`
5. AuthCallbackPage captures session
6. AuthProvider (via `onAuthStateChange()`) updates app state
7. Router redirects to `/dashboard` on success

**Card Study Flow:**

1. User navigates to `/study`
2. StudyPage calls `getStudyCardsWithQuestions()` to load cards with pre-generated questions
3. For each card:
   - `getPreGeneratedQuestion()` fetches a shuffled question (Milestone 12 batch mode)
   - User answers and optionally votes on question quality
   - `voteQuestion()` updates vote score
   - If no pre-generated question available, `generateQuiz()` creates one via llm-proxy
4. CardView transforms image URLs during rendering

**Repository Synchronization:**

1. User adds repository via `/repositories`
2. `addRepository()` calls Docora API (via edge function)
3. Docora processes repo and calls git-sync webhook
4. git-sync edge function syncs cards to database
5. Supabase Realtime notifies dashboard of changes
6. useRealtimeRepositories hook refreshes UI

**State Management:**

- **Auth state:** Managed by AuthContext with Supabase session persistence
- **Page state:** Component-level React state (useState, useCallback)
- **Real-time updates:** Supabase Realtime subscriptions via custom hooks (useRealtimeStats, useRealtimeRepositories)
- **Data fetching:** Direct calls to @lumio/core functions (no React Query/SWR)

## Key Abstractions

**Deck:**
- Purpose: Filters cards based on .lumioignore patterns without storing state
- Location: `packages/core/src/deck/Deck.ts`
- Pattern: Stateless utility class
- Methods: `getActiveCards()`, `getIgnoredCards()`, `getActiveCardCount()`

**CardView:**
- Purpose: Transforms relative image paths to Supabase Storage URLs at render time
- Location: `packages/core/src/card/CardView.ts`
- Pattern: Stateless presentation class
- Transforms: Markdown image references `![alt](path)` → Supabase signed URLs

**Supabase Client:**
- Purpose: Singleton pattern for managing single Supabase client instance
- Location: `packages/core/src/supabase/client.ts`
- Methods: `createSupabaseClient()`, `getSupabaseClient()`, `getSupabaseUrl()`
- Pattern: Lazy singleton initialized at app startup

**RPC Functions (in @lumio/core):**
- `auth.ts` - Authentication helpers wrapping Supabase auth
- `repositories.ts` - Repository CRUD and sync operations
- `assets.ts` - Card asset storage and URL transformation
- `study.ts` - Study session and question management

## Entry Points

**Web App:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser navigation to http://localhost:5173
- Responsibilities:
  - Initialize React DOM root
  - Create AuthProvider and RouterProvider
  - Setup theme providers (via next-themes)
  - Render ToastProvider (sonner)

**Mobile PWA:**
- Location: `apps/mobile/src/main.tsx`
- Triggers: Browser navigation to http://localhost:5174
- Responsibilities: Same as web but with PWA manifest and service worker

**Router:**
- Location: `apps/web/src/router.tsx` and `apps/mobile/src/router.tsx`
- Routes Protected: `/dashboard`, `/repositories`, `/cards`, `/study`, `/settings` (all require `ProtectedRoute` guard)
- Routes Public: `/login`, `/auth/callback`
- Route Guards: `ProtectedRoute` and `GuestRoute` wrappers using `useAuth()` hook

**Edge Functions:**
- Triggered by: HTTP requests, webhooks, scheduled jobs
- Each function: `supabase/functions/{name}/index.ts`
- Serve over: Supabase Edge Functions platform

## Error Handling

**Strategy:** Explicit error states with user-facing fallbacks

**Patterns:**

- **API errors:** Try-catch with toast notifications (sonner)
  ```typescript
  try {
    const result = await someOperation();
  } catch (err) {
    toast.error('Operation failed: ' + err.message);
  }
  ```

- **Auth errors:** State machine via AuthProvider (loading → ready | logged_out)
  - Failed auth check → logged_out state
  - Session refresh failure → automatic re-authentication

- **Realtime errors:** Graceful fallback to manual refresh
  - Subscription fails → button for manual stats/repos refresh
  - Channel receives error → logging and recovery attempt

- **Edge function errors:** HTTP status codes with JSON error responses
  ```typescript
  if (error) {
    return Response.json({ success: false, error: 'message' }, { status: 400 })
  }
  ```

## Cross-Cutting Concerns

**Logging:**
- Uses `console.log()` with prefixes like `[Realtime]`, `[Deck]`
- Error logging via `console.error()`
- Edge functions use Deno logging

**Validation:**
- TypeScript strict mode for compile-time checks
- Types enforce nullable/required fields
- RLS policies in database enforce row-level authorization

**Authentication:**
- Supabase auth via `onAuthStateChange()` subscription
- JWT tokens managed by Supabase SDK
- PKCE flow for mobile compatibility
- API key authorization via `Authorization: Bearer {token}`

**Image URL Transformation:**
- CardView transforms relative paths at component render time
- Respects card file path for relative path resolution
- Skips external URLs (http/https)
- Creates URLs: `{supabaseUrl}/storage/v1/object/public/card-assets/{repoId}/{path}`

---

*Architecture analysis: 2026-01-29*
