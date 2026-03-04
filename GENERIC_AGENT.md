# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Production**: https://lumio.toto-castaldi.com/

## Documentation

- [Vision, problema, utenti, funzionalità v1, metriche di successo](./docs/PRD.md)
- [Formato Markdown delle card, struttura repository, validazione](./docs/CARD-FORMAT-SPEC.md)
- [Monorepo, stack, Supabase, CI/CD, deploy, monitoring](./docs/TECHNICAL-ARCHITECTURE.md)
- [Onboarding, studio, obiettivi, repository, notifiche](./docs/USER-FLOWS.md)
- [Schema PostgreSQL, entità, relazioni, RLS policies](./docs/DATA-MODEL.md)
- [Versioning](./docs/VERSIONING.md)

## Configuration Files

- [Nginx virtual host](./conf/nginx-lumio.conf) - Configurazione Nginx per `lumio.toto-castaldi.com`


## Local Development Setup

Sequenza per avviare l'ambiente di sviluppo locale:

### 0. Prerequisiti (solo la prima volta o dopo modifiche ai packages)

```bash
pnpm install
pnpm build:packages
```

### 1. Supabase Start

```bash
# Avvia Supabase locale (richiede variabili Google OAuth)
# Le credenziali Google OAuth sono in supabase/.env.local
source supabase/.env.local && supabase start
```

Oppure manualmente:
```bash
GOOGLE_CLIENT_ID="<your-google-client-id>" \
GOOGLE_CLIENT_SECRET="<your-google-client-secret>" \
supabase start
```

Output atteso:
- API URL: http://127.0.0.1:54321
- Studio URL: http://127.0.0.1:54323
- anon key e service_role key

### 2. Database Reset

```bash
# Reset completo del database (applica tutte le migrazioni da zero)
supabase db reset
```

### 3. Edge Functions

```bash
# Avvia le Edge Functions in modalità serve
supabase functions serve --env-file supabase/.env.local --no-verify-jwt
```

Oppure usando lo script npm:
```bash
pnpm supabase:functions
```

### 4. Web App

```bash
# In un nuovo terminale
pnpm dev:web
# http://localhost:5173
```

### 5. Mobile PWA

```bash
# In un nuovo terminale
pnpm dev:mobile
# http://localhost:5174
```

### File di Configurazione Locali

| File | Descrizione |
|------|-------------|
| `supabase/.env.local` | Secrets per Edge Functions (API keys, Docora) |
| `apps/web/.env.local` | Env vars per web app (VITE_SUPABASE_*) |
| `apps/mobile/.env.local` | Env vars per mobile PWA (VITE_SUPABASE_*) |

### Anon Key Locale

La anon key per Supabase locale è sempre la stessa (demo key):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### URLs Locali

| Servizio | URL |
|----------|-----|
| Web App | http://localhost:5173 |
| Mobile PWA | http://localhost:5174 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Inbucket (email) | http://127.0.0.1:54324 |

## Rules

- **SQL migrations must never cause data loss.** Never use DROP COLUMN, DROP TABLE, or destructive operations without migrating data first. Always preserve existing data with ALTER TABLE ADD COLUMN, data migration scripts, and only then remove old columns if needed.
- **SQL migrations must fail loudly.** Never use `RAISE NOTICE` for critical failures in migrations. If something doesn't work (missing extensions, missing settings, etc.), use `RAISE EXCEPTION` to fail the pipeline. Silent failures are unacceptable - the CI/CD must be notified of any problem.
- **Add new Edge Functions to GitHub Action.** When creating a new Edge Function, always add it to `.github/workflows/ci-deploy.yml` in the "Deploy Edge Functions" step.
- **Use frontend-design plugin** When you do a UX/UI task, use the installed Frontend-design plugin.