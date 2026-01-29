# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
lumio/
├── apps/                               # Client applications
│   ├── web/                           # Desktop/tablet web app (Vite + React)
│   │   ├── src/
│   │   │   ├── main.tsx               # Entry point
│   │   │   ├── App.tsx                # Root component
│   │   │   ├── router.tsx             # React Router configuration
│   │   │   ├── pages/                 # Route pages (DashboardPage, LoginPage, etc.)
│   │   │   ├── components/            # Reusable React components
│   │   │   │   ├── ui/               # Radix UI shadcn components (Button, Card, Dialog, etc.)
│   │   │   │   ├── markdown/         # Markdown rendering components (MarkdownRenderer, CodeBlock)
│   │   │   │   └── *.tsx             # Feature components (CardPreviewDialog, etc.)
│   │   │   ├── contexts/              # React Context providers (AuthContext)
│   │   │   ├── hooks/                 # Custom React hooks (useRealtimeStats, useRealtimeRepositories, use-toast)
│   │   │   ├── layouts/               # Layout components (RootLayout)
│   │   │   ├── lib/                   # Utilities (utils.ts for class merging)
│   │   │   ├── styles/                # Global CSS (globals.css with Tailwind)
│   │   │   ├── vite.config.ts         # Vite configuration with @ alias
│   │   │   └── tsconfig.json          # TypeScript config
│   │   ├── public/                    # Static assets (logo.svg, favicon)
│   │   ├── package.json               # Dependencies (react, react-router, radix-ui, tailwind, etc.)
│   │   └── dist/                      # Built artifacts (generated)
│   │
│   └── mobile/                         # Mobile PWA app (Vite + React + PWA)
│       ├── src/
│       │   ├── main.tsx               # Entry point
│       │   ├── pages/                 # Route pages (fewer than web, mobile-optimized)
│       │   ├── components/            # Reusable components
│       │   │   ├── ui/               # Radix UI shadcn components
│       │   │   └── markdown/         # Markdown rendering
│       │   ├── contexts/              # AuthContext (shared logic with web)
│       │   ├── lib/                   # Utilities
│       │   ├── styles/                # Global CSS
│       │   ├── vite.config.ts         # Vite config with PWA plugin
│       │   └── tsconfig.json          # TypeScript config
│       ├── public/                    # Static assets + manifest.json
│       ├── package.json               # Dependencies (includes vite-plugin-pwa)
│       └── dist/                      # Built artifacts
│
├── packages/                           # Shared libraries (published as npm packages)
│   ├── shared/                         # Type definitions and constants
│   │   ├── src/
│   │   │   ├── index.ts               # Main export barrel
│   │   │   ├── types/                 # TypeScript interfaces
│   │   │   │   └── index.ts           # User, Card, Repository, StudyCard, etc.
│   │   │   ├── constants/             # App constants
│   │   │   │   └── index.ts
│   │   │   └── version.ts             # Version and build info
│   │   ├── package.json               # Entry: ./dist/index.js|.mjs
│   │   └── tsup config (build only)
│   │
│   └── core/                           # Business logic and Supabase integration
│       ├── src/
│       │   ├── index.ts               # Main export barrel (re-exports shared + supabase modules)
│       │   ├── supabase/              # Database and API functions
│       │   │   ├── client.ts          # Supabase client singleton
│       │   │   ├── auth.ts            # signInWithGoogle, signOut, getCurrentUser, onAuthStateChange
│       │   │   ├── repositories.ts    # addRepository, deleteRepository, getUserRepositories, getRepositoryCards
│       │   │   ├── study.ts           # getPlatformConfig, generateQuiz, getStudyCards, validateAnswer, getPreGeneratedQuestion, voteQuestion
│       │   │   └── assets.ts          # getCardAssets, getAssetSignedUrl, transformCardContentImages
│       │   ├── deck/                  # Card filtering
│       │   │   ├── index.ts
│       │   │   └── Deck.ts            # Stateless filtering by .lumioignore patterns
│       │   ├── card/                  # Card presentation
│       │   │   ├── index.ts
│       │   │   └── CardView.ts        # Image URL transformation from relative to Supabase Storage
│       │   └── markdown/              # Content rendering
│       │       ├── index.ts
│       │       ├── config.ts          # remark and rehype plugin configuration
│       │       └── utils.ts           # URL parsing, image detection
│       ├── package.json               # Dependencies: @supabase/supabase-js, remark, rehype, etc.
│       └── dist/                      # Built artifacts
│
├── supabase/                           # Backend infrastructure
│   ├── functions/                      # Edge functions (Deno + TypeScript)
│   │   ├── llm-proxy/                 # OpenAI/Anthropic proxy for quiz generation and validation
│   │   │   ├── index.ts               # Main handler
│   │   │   └── config.toml
│   │   ├── question-generator/        # Batch pre-generation of questions (Milestone 12)
│   │   ├── study-planner/             # Study session recommendations
│   │   ├── git-sync/                  # Webhook receiver for repository sync from Docora
│   │   ├── docora-webhook/            # Docora integration webhook
│   │   └── version/                   # Version endpoint
│   │
│   ├── migrations/                     # SQL migrations for schema creation
│   │   ├── 20241230000001_initial_schema.sql          # Users, auth trigger
│   │   ├── 20251230000001_repositories_and_cards.sql
│   │   ├── 20260103000002_add_card_assets.sql         # Card asset storage mapping
│   │   ├── 20260112000001_docora_integration.sql      # Docora repository ID tracking
│   │   ├── 20260115000001_shared_repositories.sql     # User-repository many-to-many
│   │   ├── 20260123000001_card_questions.sql          # Pre-generated questions (Milestone 12)
│   │   └── .env.local                                  # Secrets (Google OAuth, Docora API key)
│   │
│   └── .branches/                      # Supabase branch schemas (local development)
│
├── .github/                            # CI/CD configuration
│   └── workflows/
│       └── ci-deploy.yml               # GitHub Actions for tests and edge function deployment
│
├── .husky/                             # Git hooks
│
├── docs/                               # Project documentation
│   ├── PRD.md                         # Product requirements and metrics
│   ├── CARD-FORMAT-SPEC.md            # Markdown card format specification
│   ├── TECHNICAL-ARCHITECTURE.md      # Deployment and infrastructure
│   ├── USER-FLOWS.md                  # Onboarding and usage flows
│   ├── DATA-MODEL.md                  # Database schema and RLS policies
│   ├── ROADMAP.md                     # Feature roadmap
│   └── VERSIONING.md                  # Version management strategy
│
├── conf/                               # Server configuration
│   └── nginx-lumio.conf               # Nginx virtual host config for production
│
├── .claude/                            # Claude workspace configuration
│   ├── agents/                         # Custom agents
│   └── commands/                       # Custom commands
│
├── .planning/                          # GSD phase planning output
│   └── codebase/                      # Codebase analysis documents (this directory)
│
├── package.json                        # Root workspace manifest
├── pnpm-workspace.yaml                # Monorepo definition
├── pnpm-lock.yaml                     # Lockfile
├── tsconfig.base.json                 # Base TypeScript configuration
├── CLAUDE.md                          # Developer instructions for Claude
├── README.md                          # Project overview
└── .env.example                       # Environment variable template
```

## Directory Purposes

**apps/web:**
- Purpose: Desktop/tablet progressive web application
- Contains: React pages, components, auth context, hooks for realtime subscriptions
- Key files: `main.tsx` (entry), `router.tsx` (routing), `contexts/AuthContext.tsx` (state management)

**apps/mobile:**
- Purpose: Mobile-optimized PWA with offline capability
- Contains: Same structure as web but mobile-specific optimizations
- Key files: Same as web, uses vite-plugin-pwa

**packages/shared:**
- Purpose: Shared type definitions and constants used across all packages
- Contains: TypeScript interfaces (User, Card, Repository, StudyCard, QuizQuestion, etc.)
- Zero external dependencies to avoid bloating edge functions

**packages/core:**
- Purpose: Business logic, Supabase integration, content transformations
- Contains: Supabase client, RPC wrappers, Deck/CardView classes, markdown config
- Exports: All study, repository, auth, and asset operations

**supabase/functions:**
- Purpose: Serverless backend logic (LLM operations, webhooks, data processing)
- Contains: Deno-based TypeScript functions served by Supabase Edge Functions
- Each function: Independent module with own config.toml

**supabase/migrations:**
- Purpose: Database schema definitions and RLS policies
- Contains: SQL migration files in chronological order (YYYYMMDD format)
- Pattern: Each migration is additive, never destructive

**docs:**
- Purpose: Project documentation, specs, and planning
- Contains: PRD, architecture docs, data model, user flows, roadmap

## Key File Locations

**Entry Points:**

- `apps/web/src/main.tsx` - Web app React root and provider setup
- `apps/mobile/src/main.tsx` - Mobile app React root and provider setup
- `packages/core/src/index.ts` - Core library exports (all public APIs)
- `packages/shared/src/index.ts` - Shared types and constants

**Configuration:**

- `apps/web/vite.config.ts` - Web app build configuration with @ alias
- `apps/web/tsconfig.json` - Web app TypeScript configuration
- `packages/core/package.json` - Core library dependencies and build
- `supabase/.env.local` - Environment secrets for edge functions (Google OAuth, Docora API key)

**Core Logic:**

- `packages/core/src/supabase/client.ts` - Singleton Supabase client factory
- `packages/core/src/supabase/auth.ts` - Authentication operations (signInWithGoogle, getCurrentUser, onAuthStateChange)
- `packages/core/src/supabase/repositories.ts` - Repository CRUD and sync operations
- `packages/core/src/supabase/study.ts` - Study session and question management
- `packages/core/src/supabase/assets.ts` - Card asset storage and URL transformation
- `packages/core/src/deck/Deck.ts` - Card filtering by .lumioignore patterns
- `packages/core/src/card/CardView.ts` - Image URL transformation for rendering
- `packages/core/src/markdown/config.ts` - remark/rehype plugin configuration

**Testing:**

- Test files colocated with source (not found yet, but expected pattern: `*.test.ts`, `*.spec.ts`)
- Jest/Vitest configuration expected in app-level tsconfig

**Type Definitions:**

- `packages/shared/src/types/index.ts` - All shared TypeScript interfaces
  - User, AuthUser, AuthState, Repository, Card, StudyCard, QuizQuestion, CardQuestion, etc.

## Naming Conventions

**Files:**

- Components: `PascalCase.tsx` (e.g., `DashboardPage.tsx`, `CardPreviewDialog.tsx`)
- Utilities: `camelCase.ts` (e.g., `useRealtimeStats.ts`, `client.ts`)
- Pages: `{Name}Page.tsx` (e.g., `LoginPage.tsx`, `StudyPage.tsx`)
- UI components: `lowercase.tsx` (e.g., `button.tsx`, `dialog.tsx` from shadcn)

**Directories:**

- Feature modules: `lowercase/` (e.g., `supabase/`, `components/`, `contexts/`)
- UI components: `ui/` (Radix UI shadcn components)
- Specialized renderers: `markdown/`, `pages/settings/` for sub-routing

**Functions:**

- React components: `PascalCase` (e.g., `DashboardPage`, `LoginPage`)
- Hooks: `useXxx` pattern (e.g., `useRealtimeStats`, `useAuth`)
- Utilities: `camelCase` (e.g., `getSupabaseClient`, `parseGitHubUrl`)
- Constants: `UPPER_CASE` (e.g., `MAX_IMAGE_SIZE`, `DEFAULT_SYSTEM_PROMPT`)

**Variables:**

- Component state: `camelCase` (e.g., `isLoading`, `userAnswer`, `currentCard`)
- Types: `PascalCase` (e.g., `StudyState`, `QuizComponentProps`)
- Interfaces: `PascalCase` (e.g., `AuthContextType`, `UserStats`)

**Types:**

- Interfaces: `PascalCase` (e.g., `User`, `Card`, `Repository`)
- Type aliases: `PascalCase` (e.g., `AuthState`, `SyncStatus`)
- Enums: `PascalCase` (e.g., `QualityRating`)

## Where to Add New Code

**New Feature:**
- Primary code: `packages/core/src/supabase/{feature}.ts` (operations) + `packages/shared/src/types/index.ts` (types)
- Frontend: `apps/web/src/pages/{FeatureName}Page.tsx` + `apps/web/src/components/{FeatureName}*.tsx`
- Mobile: Duplicate page/components in `apps/mobile/src/` if platform-specific UI needed

**New Component/Module:**
- Reusable component: `apps/web/src/components/{Name}.tsx` or `apps/web/src/components/{category}/{Name}.tsx`
- UI component from Radix: `apps/web/src/components/ui/{name}.tsx` (already generated via shadcn)
- Hook: `apps/web/src/hooks/use{Name}.ts`

**Utilities:**
- Shared helpers (cross-app): `packages/core/src/{module}/utils.ts`
- App-specific helpers: `apps/web/src/lib/utils.ts`
- Type utilities: `packages/shared/src/types/index.ts`

**Database/Backend:**
- New RPC function: `packages/core/src/supabase/{entity}.ts` + SQL in migrations
- New edge function: `supabase/functions/{name}/index.ts` + register in `.github/workflows/ci-deploy.yml`
- Database schema: New migration file in `supabase/migrations/YYYYMMDD000N_{description}.sql`

## Special Directories

**apps/web/public/ and apps/mobile/public/:**
- Purpose: Static assets served at root level
- Contents: logo.svg, favicon, manifest.json (mobile)
- Generated: No
- Committed: Yes

**apps/web/dist/ and apps/mobile/dist/:**
- Purpose: Build output from Vite
- Contents: Minified JavaScript, CSS, HTML
- Generated: Yes (via `vite build`)
- Committed: No (in .gitignore)

**packages/core/dist/ and packages/shared/dist/:**
- Purpose: Built library outputs (CJS + ESM)
- Contents: .js, .mjs, .d.ts files
- Generated: Yes (via `tsup`)
- Committed: No (in .gitignore)

**supabase/.temp/**
- Purpose: Temporary files for local Supabase instance
- Generated: Yes (by supabase start)
- Committed: No

**node_modules/ (all levels):**
- Purpose: Installed dependencies
- Generated: Yes (via `pnpm install`)
- Committed: No (via .gitignore)

---

*Structure analysis: 2026-01-29*
