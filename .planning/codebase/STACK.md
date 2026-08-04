# Technology Stack

**Analysis Date:** 2026-01-29

## Languages

**Primary:**
- TypeScript 5.7.0 - All source code, shared packages, Edge Functions

**Secondary:**
- SQL - PostgreSQL database schemas and migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js >= 22.0.0
- Deno - Edge Functions runtime (via Supabase)

**Package Manager:**
- pnpm 9.15.0
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core Frontend:**
- React 19.0.0 - Web and mobile UI framework
  - `apps/web` uses React 19.0.0
  - `apps/mobile` uses React 19.0.0
- Vite 6.0.0 - Web app build tool
- Vite 6.0.0 - Mobile PWA build tool

**UI & Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- shadcn/ui - Headless UI component library
- @radix-ui/* - Primitive components (dialogs, menus, avatars, scrolls, etc.)
- class-variance-authority 0.7.x - Composable component APIs
- clsx 2.1.x - Conditional CSS class names
- tailwind-merge 2.5.x - Merge Tailwind classes

**Routing:**
- React Router 6.28.0 - Web app routing
- React Router 7.1.0 - Mobile PWA routing

**Content Rendering:**
- react-markdown 10.1.0 - Markdown rendering engine
- remark-gfm 4.0.0 - GitHub Flavored Markdown support
- remark-math 6.0.0 - LaTeX math formula parsing
- rehype-katex 7.0.0 - KaTeX formula rendering
- rehype-highlight 7.0.0 - Syntax highlighting for code blocks
- highlight.js 11.9.0 - Code syntax highlighting library
- katex 0.16.0 - LaTeX math rendering

**Notifications & Alerts:**
- sonner 2.0.7 - Toast notifications
- @radix-ui/react-toast 1.2.15 - Toast UI primitives

**Icons:**
- lucide-react 0.400.0 - Web app icons
- lucide-react 0.468.0 - Mobile PWA icons

**Theme Management:**
- next-themes 0.4.6 - Dark/light mode theming

**Mobile PWA:**
- vite-plugin-pwa 0.21.0 - Progressive Web App configuration and manifest generation

**Backend/Data:**
- @supabase/supabase-js 2.45.0 - Supabase client for PostgreSQL, Auth, Storage
- ignore 5.3.0 - .gitignore pattern parsing

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.45.0 - Database queries, authentication, file storage, realtime
- TypeScript 5.7.0 - Type safety across all layers
- React 19.0.0 - UI framework for both web and mobile

**Build & Packaging:**
- tsup 8.0.0 - TypeScript bundler for packages/shared and packages/core
- vite 6.0.0 - Lightning-fast frontend build tool
- @vitejs/plugin-react 4.3.0 - React Fast Refresh plugin for Vite

**Development Tools:**
- @commitlint/cli 18.6.0 - Commit message linting
- @commitlint/config-conventional 18.6.0 - Conventional commit rules
- commitizen 4.3.0 - Interactive commit message generation
- cz-conventional-changelog 3.3.0 - Commitizen adapter
- husky 9.0.0 - Git hooks framework

**Styling Infrastructure:**
- autoprefixer 10.4.20 - PostCSS vendor prefixing
- postcss 8.4.49 - CSS processing framework
- @tailwindcss/typography 0.5.0 - Prose typography for rendered content

**Linting & Type Checking:**
- @eslint/js 9.15.0 - ESLint JavaScript config
- eslint 9.15.0 - JavaScript linting
- typescript-eslint 8.15.0 - TypeScript ESLint support
- eslint-plugin-react-hooks 5.0.0 - React Hooks ESLint rules
- eslint-plugin-react-refresh 0.4.14 - React Fast Refresh validation
- globals 15.12.0 - Global variable definitions

## Configuration

**Environment Variables (Frontend):**
- `VITE_SUPABASE_URL` - Supabase project API endpoint
- `VITE_SUPABASE_ANON_KEY` - Anonymous key for client-side API access
- `VITE_SENTRY_DSN` - Sentry error tracking DSN

**Environment Variables (Edge Functions):**
- `SUPABASE_URL` - Supabase API URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key with full database access
- `SENTRY_DSN` - Error tracking
- `RESEND_API_KEY` - Email delivery service
- `ENCRYPTION_KEY` - AES-256-GCM key for encrypting user API keys (32 bytes base64)
- `DOCORA_API_URL` - External Docora API endpoint (default: https://api-docora.toto-castaldi.com)
- `DOCORA_TOKEN_AUTHENTICATION` - JWT token for Docora API authentication
- `DOCORA_CLIENT_AUTH_KEY` - HMAC secret for validating webhook signatures from Docora

**Build Configuration:**
- `vite.config.ts` - Vite configuration in both `apps/web/` and `apps/mobile/`
- `tailwind.config.ts` - Tailwind CSS configuration in both apps
- `postcss.config.js` - PostCSS configuration for Tailwind
- `tsconfig.base.json` - Shared TypeScript compiler options

**Local Development:**
- `supabase/.env.local` - Local Supabase secrets (Google OAuth, API keys)
- `apps/web/.env.local` - Web app environment variables
- `apps/mobile/.env.local` - Mobile PWA environment variables

## Platform Requirements

**Development:**
- Node.js >= 22.0.0 (strict requirement per package.json engines)
- pnpm >= 9.0.0 (strict requirement per package.json engines)
- Supabase CLI for local development (optional but recommended)
- Modern browser with ES2022 support

**Production:**
- Deployment target: DigitalOcean droplet with Nginx
- Supabase Cloud (PostgreSQL 15+, Auth, Storage, Edge Functions via Deno)
- External services: OpenAI API, Anthropic API, Resend (email), Sentry (monitoring), Docora (Git monitoring)

**Database:**
- PostgreSQL 15+ (via Supabase Cloud)
- Row Level Security (RLS) for user data isolation
- UUID primary keys on all tables

**Edge Functions:**
- Deno 1.40+ runtime (managed by Supabase)
- HTTPS endpoint for webhook receivers
- Accessible at `/functions/v1/{function-name}`

---

*Stack analysis: 2026-01-29*
