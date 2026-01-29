# External Integrations

**Analysis Date:** 2026-01-29

## APIs & External Services

**Authentication:**
- Google OAuth 2.0 - User sign-in via Supabase Auth
  - SDK: `@supabase/supabase-js`
  - Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Redirect URLs: `/auth/callback` on web and mobile apps

**LLM Providers:**
- OpenAI API - Question generation and answer validation
  - SDK: Native HTTP calls from Edge Function `supabase/functions/llm-proxy/`
  - Auth: User-provided API key, encrypted with AES-256-GCM
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Models: gpt-5.1, gpt-5.2 (newer versions)
  - Used in: `supabase/functions/llm-proxy/index.ts` (lines 1-540+)

- Anthropic API - Question generation and answer validation
  - SDK: Native HTTP calls from Edge Function `supabase/functions/llm-proxy/`
  - Auth: User-provided API key, encrypted with AES-256-GCM
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Models: claude-haiku-4-5, claude-sonnet-4-5, claude-opus-4-5
  - Used in: `supabase/functions/llm-proxy/index.ts`

**Repository Monitoring:**
- Docora API - Git repository monitoring and webhook delivery
  - API URL: Environment variable `DOCORA_API_URL` (default: https://api.docora.toto-castaldi.com)
  - Auth: `DOCORA_TOKEN_AUTHENTICATION` (JWT token)
  - Webhook Auth: HMAC-SHA256 with `DOCORA_CLIENT_AUTH_KEY`
  - Implementation: `supabase/functions/git-sync/index.ts` and `supabase/functions/docora-webhook/index.ts`
  - Webhook endpoints:
    - `POST /functions/v1/docora-webhook` - Receives file create/update/delete events
    - Headers validated: `X-Docora-App-Id`, `X-Docora-Signature`, `X-Docora-Timestamp`

**Email Delivery:**
- Resend - Transactional email sending
  - API Key: Environment variable `RESEND_API_KEY`
  - SDK: Native HTTP calls from Edge Functions
  - Endpoint: `https://api.resend.com/emails`
  - Use case: Transactional emails (password reset, study reminders, goal completions)

**Error Tracking & Monitoring:**
- Sentry - Error tracking and performance monitoring
  - DSN: Environment variable `VITE_SENTRY_DSN` (frontend), `SENTRY_DSN` (backend)
  - Web app: `@sentry/react` in `apps/web/src/lib/sentry.ts`
  - Mobile app: `@sentry/react` in `apps/mobile/src/lib/sentry.ts`
  - Edge Functions: `@sentry/deno` for serverless monitoring
  - Integrations:
    - Browser Tracing (Page load, transaction performance)
    - Replay Integration (Session replay on errors)
    - Error reporting

## Data Storage

**Databases:**
- PostgreSQL 15+ (Supabase Cloud)
  - Connection: via Supabase JS SDK
  - Client: `@supabase/supabase-js` SupabaseClient
  - URL: Environment variable `SUPABASE_URL`
  - Tables: users, repositories, cards, user_cards, user_card_responses, study_sessions, goals, etc.
  - Auth: Row Level Security (RLS) policies on all user-data tables

**File Storage:**
- Supabase Storage - Image and asset storage
  - Bucket: `card-assets` (for card images and attachments)
  - Access: Public or authenticated depending on card visibility
  - Objects stored as: `card-assets/{user_id}/{repository_id}/{content_hash}.{ext}`
  - Client: `@supabase/supabase-js` storage methods
  - Supported formats: JPEG, PNG, GIF, WebP
  - Max file size: 5MB per image

**Caching:**
- Not explicitly integrated - Supabase provides caching via CDN

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Primary authentication system
  - Implementation: `packages/core/src/supabase/auth.ts`
  - Provider: Google OAuth via Supabase
  - Session management: JWT with automatic refresh
  - Refresh strategy: Only refresh when token expires within 60 seconds (prevents rate limiting)
  - Client initialization: `packages/core/src/supabase/client.ts`
  - Client options:
    - `autoRefreshToken: true`
    - `persistSession: true`
    - `flowType: 'pkce'` (for mobile compatibility)
    - Custom storage adapter support for React Native

**User Metadata:**
- Stored in Supabase Auth user metadata:
  - `full_name` - User display name
  - `avatar_url` - Profile picture URL from Google
  - `email` - Email address

**API Key Management (User LLM Keys):**
- Storage: `user_api_keys` table in PostgreSQL
- Encryption: AES-256-GCM with `ENCRYPTION_KEY` (256 bits)
- Flow: User provides key → Edge Function validates → Encrypts with AES-256-GCM → Stores in DB
- Never persisted in plain text
- Accessed only by authenticated Edge Functions

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - Sample rate: 10% for general transactions (`tracesSampleRate: 0.1`)
  - Session replays: 10% normally, 100% on errors (`replaysOnErrorSampleRate: 1.0`)
  - Integrated into both frontend and Edge Functions

**Logs:**
- Console logging in Edge Functions (Deno runtime)
- Sentry for aggregation and alerting
- No dedicated log aggregation service configured

**Performance Monitoring:**
- Sentry browser tracing for frontend
- Sentry transaction tracking for Edge Functions
- Custom timing measurements in quiz generation and validation

## CI/CD & Deployment

**Hosting:**
- Web app: DigitalOcean droplet with Nginx
  - Directory: `/var/www/lumio/`
  - Config: `conf/nginx-lumio.conf`
  - Domain: `lumio.toto-castaldi.com` (HTTPS via Let's Encrypt)

- Mobile PWA: DigitalOcean droplet with Nginx
  - Directory: `/var/www/lumio-mobile/`
  - Domain: `m-lumio.toto-castaldi.com` (HTTPS via Let's Encrypt)

- Backend: Supabase Cloud
  - Edge Functions: Deployed to Supabase project via CLI
  - Database: Managed PostgreSQL

**CI Pipeline:**
- GitHub Actions
  - Workflow: `.github/workflows/ci-deploy.yml`
  - Triggers: Push to main/develop, Pull Requests
  - Steps:
    1. `lint-and-typecheck` - pnpm lint, pnpm typecheck
    2. `build-web` - Build web app artifact
    3. `deploy-web` - SCP to DigitalOcean (main only)
    4. `deploy-functions` - Supabase CLI deploy (main only)
    5. Auto-release - Version bump and git tag

**Version Control:**
- Git with GitHub
- Conventional Commits (feat:, fix:, chore:)
- Auto-release via custom job (no release-please)
- Semantic versioning (MAJOR.MINOR.PATCH)

## Environment Configuration

**Required env vars (Web/Mobile):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SENTRY_DSN
```

**Required env vars (Edge Functions):**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SENTRY_DSN
RESEND_API_KEY
ENCRYPTION_KEY
DOCORA_API_URL
DOCORA_TOKEN_AUTHENTICATION
DOCORA_CLIENT_AUTH_KEY
```

**GitHub Actions Secrets:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Build time
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` - Deploy functions
- `SUPABASE_DB_PASSWORD` - Database backup (optional)
- `ENCRYPTION_KEY` - API key encryption
- `DO_HOST`, `DO_USERNAME`, `DO_SSH_KEY` - DigitalOcean deployment
- `SENTRY_DSN` - Error tracking
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `DOCORA_API_URL`, `DOCORA_TOKEN_AUTHENTICATION`, `DOCORA_CLIENT_AUTH_KEY` - Docora integration

**Secrets location:**
- GitHub Settings → Secrets and variables → Actions → Secrets tab
- GitHub Settings → Secrets and variables → Actions → Variables tab (for ENABLE_DB_BACKUP)
- Local development: `.env.local` files (gitignored)
- Edge Functions local: `supabase/.env.local` (gitignored)

## Webhooks & Callbacks

**Incoming (Supabase):**
- `POST /functions/v1/docora-webhook` - File change notifications from Docora
  - Payload: Repository metadata + file content + chunk info (for large files)
  - Signature: HMAC-SHA256 in `X-Docora-Signature` header
  - Processing: Card parsing, image extraction, database updates
  - Chunks: Files >1MB split into 512KB chunks, reassembled by function

**Incoming (OAuth):**
- `{origin}/auth/callback` - Google OAuth redirect endpoint
  - Web: `https://lumio.toto-castaldi.com/auth/callback`
  - Mobile: `https://m-lumio.toto-castaldi.com/auth/callback`
  - Handled by: `apps/web/src/pages/AuthCallbackPage.tsx`, `apps/mobile/src/pages/AuthCallbackPage.tsx`

**Incoming (Scheduled):**
- `POST /functions/v1/study-planner` - Scheduled job from n8n
  - Trigger: Nightly recalculation (3 AM daily)
  - Auth: Service role key via Bearer token
  - Payload: `{"action": "recalculate_all"}`

**Outgoing:**
- LLM API calls - OpenAI/Anthropic for quiz generation
- Docora API calls - Register/deregister repositories
- Resend API calls - Send transactional emails
- Sentry API - Send error events and sessions

## Third-Party SDKs

**Frontend:**
- `@supabase/supabase-js@2.45.0` - Database, Auth, Storage client
  - Docs: https://supabase.com/docs/reference/javascript
  - Used in: `packages/core/src/supabase/*`

**Edge Functions:**
- `https://deno.land/std@0.177.0/http/server.ts` - Deno HTTP server
- `https://esm.sh/@supabase/supabase-js@2` - Supabase client in Deno
- `https://deno.land/x/imagescript@1.3.0/mod.ts` - Image processing
- `npm:ignore@5.3.1` - .gitignore parsing

---

*Integration audit: 2026-01-29*
