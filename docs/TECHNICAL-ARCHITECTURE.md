# Lumio — Technical Architecture

**Versione:** 1.0  
**Data:** 2025-12-28  
**Status:** Draft

---

## 1. Overview

Lumio è una piattaforma multi-client (web + mobile) con backend serverless su Supabase. L'architettura è progettata per semplicità, velocità di sviluppo e costi contenuti.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│                                                                  │
│   ┌─────────────────────┐       ┌─────────────────────┐         │
│   │      Web App        │       │    Mobile App (PWA) │         │
│   │  React 19 + Vite    │       │  React 19 + Vite    │         │
│   │  Tailwind + shadcn  │       │  Tailwind + shadcn  │         │
│   │                     │       │                     │         │
│   │  DigitalOcean       │       │  DigitalOcean       │         │
│   └──────────┬──────────┘       └──────────┬──────────┘         │
└──────────────┼──────────────────────────────┼───────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Environments                          │    │
│  │              DEV (dev.lumio)  │  PROD (lumio)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │PostgreSQL│ │   Auth   │ │ Storage  │ │ Realtime │          │
│   │  + RLS   │ │  Google  │ │  Images  │ │          │          │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Edge Functions                              │   │
│   │  • Git Sync         • LLM Proxy        • Study Planner  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              pg_cron (Scheduled Jobs)                    │   │
│   │  • Repository sync check    • Study plan recalculation  │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      Git Providers       │    │       LLM Providers      │
│  • GitHub                │    │  • OpenAI API            │
│  • GitLab                │    │  • Anthropic API         │
│  • Bitbucket             │    │                          │
└──────────────────────────┘    └──────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│    External Services     │
│  • Sentry (monitoring)   │
│  • Resend (email)        │
└──────────────────────────┘
```

---

## 2. Monorepo Structure

### 2.1 Layout

```
lumio/
├── apps/
│   ├── web/                    # React 19 + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # React hooks
│   │   │   ├── lib/            # Utilities
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                 # PWA - React 19 + Vite + TypeScript
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── pages/          # Route pages
│       │   ├── hooks/          # React hooks
│       │   ├── lib/            # Utilities
│       │   ├── styles/         # CSS styles
│       │   └── main.tsx
│       ├── public/
│       │   └── manifest.json   # PWA manifest
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                 # @lumio/shared
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types condivisi
│   │   │   ├── constants/      # Costanti condivise
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                   # @lumio/core
│   │   ├── src/
│   │   │   ├── supabase/       # Supabase client & queries
│   │   │   ├── study/          # Algoritmo SM-2, study logic
│   │   │   ├── git/            # Git sync logic
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ui/                     # @lumio/ui (opzionale)
│       ├── src/
│       │   └── ...             # Componenti UI cross-platform
│       └── package.json
│
├── supabase/
│   ├── functions/              # Edge Functions
│   │   ├── git-sync/
│   │   ├── llm-proxy/
│   │   └── study-planner/
│   ├── migrations/             # SQL migrations
│   └── config.toml
│
├── docs/                       # Documentazione
│   ├── PRD.md
│   ├── CARD-FORMAT-SPEC.md
│   └── TECHNICAL-ARCHITECTURE.md
│
├── .github/
│   └── workflows/
│       └── ci-deploy.yml       # CI/CD unificato (lint, typecheck, deploy)
│
├── conf/
│   └── nginx-lumio.conf        # Virtual host Nginx per produzione
│
├── pnpm-workspace.yaml
├── package.json                # Root package.json
├── tsconfig.base.json          # Base TypeScript config
└── README.md
```

### 2.2 pnpm Workspace Configuration

**pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json**
```json
{
  "name": "lumio",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter @lumio/web dev",
    "dev:mobile": "pnpm --filter @lumio/mobile start",
    "build:web": "pnpm --filter @lumio/web build",
    "build:mobile": "pnpm --filter @lumio/mobile build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### 2.3 Package Dependencies

```
@lumio/web
  └── depends on: @lumio/shared, @lumio/core

@lumio/mobile
  └── depends on: @lumio/shared, @lumio/core

@lumio/core
  └── depends on: @lumio/shared

@lumio/shared
  └── no internal dependencies
```

---

## 3. Technology Stack

### 3.1 Frontend — Web

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.x |
| Build | Vite | 5.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui | latest |
| State | React Query + Zustand | - |
| Routing | React Router | 6.x |
| Forms | React Hook Form + Zod | - |

### 3.2 Frontend — Mobile (PWA)

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.x |
| Build | Vite | 6.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui | latest |
| State | React Query + Zustand | - |
| Routing | React Router | 6.x |
| PWA | vite-plugin-pwa | latest |

> **Nota:** L'app mobile è una PWA (Progressive Web App) servita su `m.lumio.toto-castaldi.com`. Condivide lo stesso stack tecnologico della web app ma con UI ottimizzata per dispositivi mobili e flussi diversi (focus sullo studio).

### 3.3 Backend — Supabase

| Component | Usage |
|-----------|-------|
| PostgreSQL | Database principale + pg_cron |
| Auth | Google OAuth |
| Storage | Immagini card (sync da Git) |
| Edge Functions | Git sync, LLM proxy, study planner |
| Realtime | Future: sync progresso cross-device |
| Row Level Security | Isolamento dati utente |

### 3.4 External Services

| Service | Usage |
|---------|-------|
| OpenAI API | Generazione domande (user API key) |
| Anthropic API | Generazione domande (user API key) |
| Resend | Email transazionali |
| Sentry | Error tracking & monitoring |

---

## 4. Supabase Architecture

### 4.1 Environments

| Environment | Usage | Supabase Project |
|-------------|-------|------------------|
| **DEV** | Sviluppo e testing | `lumio-dev` |
| **PROD** | Produzione | `lumio-prod` |

Ogni environment ha:
- Database separato
- Auth configuration separata
- Edge Functions separate
- Storage buckets separati

### 4.2 Edge Functions

#### git-sync
Sincronizza i repository Git con il database locale.

```
Trigger: pg_cron (ogni 6 ore) + manuale da UI
Input: repository_id
Flow:
  1. Fetch repository metadata (ultimo commit)
  2. Se cambiato, clone/pull repository
  3. Parse tutti i file .md
  4. Validate contro Card Format Spec
  5. Upsert cards nel database
  6. Download immagini in Storage
  7. Update repository.last_synced_at
```

#### llm-proxy
Gestisce la crittografia e il proxy delle API keys verso OpenAI/Anthropic.

**Autenticazione:**
- JWT verification disabilitata a livello gateway (`verify_jwt = false`)
- Autenticazione gestita internamente dalla funzione per ogni azione
- `test_key`: non richiede autenticazione (solo validazione chiave esterna)
- Tutte le altre azioni: richiedono JWT valido via `getUserId()`

**Azioni disponibili:**

| Action | Descrizione |
|--------|-------------|
| `test_key` | Valida una API key con il provider (non salva) |
| `save_key` | Valida, cripta e salva la chiave nel database |
| `get_keys` | Ritorna metadata delle chiavi (senza valori) |
| `delete_key` | Elimina una chiave |
| `set_preferred` | Imposta il provider preferito |
| `has_valid_key` | Verifica se l'utente ha almeno una chiave valida |

**Flusso di salvataggio chiave:**
```
Client                    Edge Function                    Database
   │                            │                              │
   │  save_key(provider, key)   │                              │
   │ ─────────────────────────▶ │                              │
   │                            │  1. Test con provider        │
   │                            │ ─────────────────▶ OpenAI/   │
   │                            │ ◀───────────────── Anthropic │
   │                            │                              │
   │                            │  2. Encrypt(key)             │
   │                            │  AES-256-GCM +               │
   │                            │  ENCRYPTION_KEY              │
   │                            │                              │
   │                            │  3. Upsert encrypted_key     │
   │                            │ ─────────────────────────────▶│
   │                            │ ◀─────────────────────────────│
   │   { success, key metadata }│                              │
   │ ◀───────────────────────── │                              │
```

**Crittografia (AES-256-GCM):**
- La chiave `ENCRYPTION_KEY` (32 bytes base64) è un secret dell'Edge Function
- IV (12 bytes) generato casualmente per ogni crittografia
- Formato storage: `base64(IV + ciphertext)`
- Solo l'Edge Function può leggere/scrivere chiavi

> ⚠️ Le API key in chiaro transitano solo verso l'Edge Function (HTTPS). Non vengono mai persistite nei log o inviate ai client.

#### study-planner
Calcola il piano di studio per ogni utente.

```
Trigger: pg_cron (ogni notte) + on-demand
Input: user_id
Flow:
  1. Load obiettivo attivo
  2. Load tutte le card con tag matching
  3. Apply SM-2 per calcolare prossima review
  4. Calcola card/giorno necessarie per deadline
  5. Genera piano giornaliero
  6. Salva in user_study_plan
```

### 4.3 pg_cron Jobs

| Job | Schedule | Function |
|-----|----------|----------|
| `sync_repositories` | `0 */6 * * *` (ogni 6 ore) | Triggera git-sync per tutti i repo attivi |
| `recalculate_study_plans` | `0 3 * * *` (ogni notte alle 3) | Triggera study-planner per tutti gli utenti con obiettivo attivo |
| `cleanup_expired_sessions` | `0 4 * * 0` (domenica alle 4) | Pulizia sessioni scadute |

### 4.4 Row Level Security (RLS)

Ogni tabella utente ha RLS abilitato:

```sql
-- Esempio: users can only see their own data
CREATE POLICY "Users can view own data" ON user_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_cards
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 5. Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  User   │────▶│  Lumio App  │────▶│   Supabase   │────▶│  Google │
│         │     │             │     │     Auth     │     │  OAuth  │
└─────────┘     └─────────────┘     └──────────────┘     └─────────┘
                      │                    │
                      │◀───────────────────┘
                      │    JWT + Refresh Token
                      │
                      ▼
              ┌─────────────┐
              │   Supabase  │
              │   Client    │
              │  (queries)  │
              └─────────────┘
```

### 5.1 Auth Implementation

```typescript
// packages/core/src/supabase/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
};
```

### 5.2 Session Token Management

Per evitare rate limiting, il refresh del token viene eseguito solo quando necessario:

```typescript
// packages/core/src/supabase/auth.ts
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  // Refresh solo se il token scade entro 60 secondi
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = expiresAt && (expiresAt - now) < 60;

  if (needsRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Failed to refresh session:', error);
      return session.access_token; // Fallback al token corrente
    }
    return data.session?.access_token || null;
  }

  return session.access_token;
}
```

**Importante:** Non chiamare `refreshSession()` ad ogni richiesta per evitare `AuthApiError: Request rate limit reached`.

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

Il progetto usa un singolo workflow unificato (`ci-deploy.yml`) che gestisce sia CI che deploy.

#### ci-deploy.yml — CI/CD Pipeline

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # CI Jobs - sempre eseguiti
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - checkout, pnpm setup, install
      - pnpm build:packages
      - pnpm typecheck

  build-web:
    needs: lint-and-typecheck
    steps:
      - build web app
      - upload artifact

  # Deploy Jobs - solo su push a main
  deploy-web:
    needs: build-web
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - build web app con secrets produzione
      - deploy to DigitalOcean via SCP
      - reload Nginx

  deploy-functions:
    needs: lint-and-typecheck
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - deploy Edge Functions via Supabase CLI

  build-android:
    needs: lint-and-typecheck
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - setup EAS
      - eas build --platform android --profile preview
```

**Flusso:**
```
push/PR to main/develop
       │
       ▼
┌─────────────────┐
│lint-and-typecheck│ ◄── Sempre eseguito
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │build-web│ ◄── Sempre eseguito (validazione)
    └────┬────┘
         │
         │ (solo push a main)
         ▼
┌────────────────────────────────────────┐
│  deploy-web │ deploy-functions │ build-android │
└────────────────────────────────────────┘
```

### 6.2 Branching Strategy

```
main (production)
  │
  └── develop (staging/dev environment)
        │
        ├── feature/xxx
        ├── fix/xxx
        └── ...
```

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `main` | Production | ✅ Yes |
| `develop` | Dev | ✅ Yes |
| `feature/*` | - | ❌ No (solo CI) |

---

## 7. Web App Deployment

### 7.1 DigitalOcean Droplet Setup

La web app viene deployata su un droplet esistente con Nginx.

**Nginx Configuration**: vedere [`conf/nginx-lumio.conf`](../conf/nginx-lumio.conf)

Il file va copiato in `/etc/nginx/sites-available/lumio` e abilitato con:

```bash
sudo ln -s /etc/nginx/sites-available/lumio /etc/nginx/sites-enabled/
sudo certbot --nginx -d lumio.toto-castaldi.com
sudo systemctl reload nginx
```

### 7.2 Directory Structure on Server

```
/var/www/
└── lumio/
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   └── index-[hash].css
    └── ...
```

---

## 8. Mobile App Build & Distribution (PWA)

> **Nota**: L'app mobile è una **Progressive Web App (PWA)** dedicata **esclusivamente allo studio**. La configurazione delle API keys, la gestione dei deck e degli obiettivi avviene solo su web. Se l'utente non ha configurato le API keys, l'app mobile mostra un messaggio che invita a completare la configurazione su web.

### 8.1 PWA Configuration

**vite.config.ts** (con vite-plugin-pwa):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Lumio Mobile',
        short_name: 'Lumio',
        description: 'AI-Powered Flashcards - Study Mode',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
```

### 8.2 Build Commands

```bash
# Development
pnpm dev:mobile
# http://localhost:5174

# Production build
pnpm build:mobile
# Output: apps/mobile/dist/
```

### 8.3 Distribution

La PWA è deployata su DigitalOcean come sito statico:

| Ambiente | URL | Directory Server |
|----------|-----|------------------|
| **PROD** | `m.lumio.toto-castaldi.com` | `/var/www/lumio-mobile` |

**Vantaggi PWA vs App Nativa:**
- Nessun app store, installazione immediata
- Aggiornamenti automatici (no download)
- Stesso codebase web, manutenzione semplificata
- Funziona su qualsiasi dispositivo con browser moderno

---

## 9. Monitoring & Error Tracking

### 9.1 Sentry Configuration

**Web App** (`apps/web/src/lib/sentry.ts`):
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Mobile App (PWA)** (`apps/mobile/src/lib/sentry.ts`):
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

> **Nota:** La PWA mobile usa `@sentry/react` (come la web app) invece di `@sentry/react-native`.

**Edge Functions**:
```typescript
import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
});
```

### 9.2 What We Track

| Category | Tracked Items |
|----------|---------------|
| Errors | Unhandled exceptions, API failures, validation errors |
| Performance | Page load times, API response times, LLM latency |
| User Context | User ID (anonymized), active goal, repository count |

---

## 10. Security Considerations

### 10.1 API Keys Handling

Le API keys degli utenti (OpenAI/Anthropic) sono gestite con crittografia server-side:

**Algoritmo:** AES-256-GCM (Galois/Counter Mode)
- Chiave di crittografia: `ENCRYPTION_KEY` (256 bit, base64)
- IV: 96 bit, generato casualmente per ogni operazione
- Autenticazione: Tag GCM integrato

**Flusso sicuro:**
1. Client invia chiave in chiaro all'Edge Function (HTTPS)
2. Edge Function valida la chiave con il provider
3. Edge Function cripta la chiave con `ENCRYPTION_KEY`
4. Chiave criptata salvata in `user_api_keys.encrypted_key`
5. Quando serve, l'Edge Function decripta e usa la chiave

**Garanzie di sicurezza:**
- Le chiavi in chiaro non passano mai attraverso il client Supabase
- Solo l'Edge Function ha accesso a `ENCRYPTION_KEY`
- Anche con accesso al database, le chiavi sono illeggibili
- Keys mai loggate o incluse in error reports
- RLS impedisce accesso cross-user ai record criptati

**Generare ENCRYPTION_KEY:**
```bash
# Genera 32 bytes casuali in base64
openssl rand -base64 32
# Esempio output: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

### 10.2 Repository Access

- Public repos: no auth needed
- Private repos: PAT stored encrypted, scoped to read-only

### 10.3 Data Isolation

- RLS on all user tables
- Users can only access their own data
- Admin access via separate service role

### 10.4 HTTPS Everywhere

- Web app: SSL via Let's Encrypt
- Supabase: HTTPS by default
- Mobile: Certificate pinning (v2)

---

## 11. Environment Variables

### 11.1 Web App

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |

### 11.2 Mobile App (PWA)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |

> **Nota:** La PWA usa le stesse variabili della web app (prefisso `VITE_`).

### 11.3 Edge Functions

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) |
| `SENTRY_DSN` | Sentry DSN |
| `RESEND_API_KEY` | Resend API key for emails |
| `ENCRYPTION_KEY` | Key for encrypting user API keys |

### 11.4 GitHub Actions Secrets

| Secret | Usage |
|--------|-------|
| `SUPABASE_URL` | Build time env |
| `SUPABASE_ANON_KEY` | Build time env |
| `SUPABASE_ACCESS_TOKEN` | Deploy Edge Functions |
| `SUPABASE_PROJECT_REF` | Deploy Edge Functions |
| `SUPABASE_DB_PASSWORD` | Database backup before migrations (pg_dump) - requires `ENABLE_DB_BACKUP=true` variable |
| `ENCRYPTION_KEY` | API key encryption (32 bytes base64) |
| `DO_HOST` | DigitalOcean droplet IP |
| `DO_USERNAME` | SSH username |
| `DO_SSH_KEY` | SSH private key |
| `SENTRY_DSN` | Error tracking |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### 11.5 GitHub Actions Variables

Variables are set in Settings → Secrets and variables → Actions → Variables tab.

| Variable | Usage |
|----------|-------|
| `ENABLE_DB_BACKUP` | Set to `true` to enable database backup before migrations |

---

## 12. Development Setup

### 12.1 Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI

### 12.2 Getting Started

```bash
# Clone repository
git clone https://github.com/toto-castaldi/lumio.git
cd lumio

# Install dependencies
pnpm install

# Build shared packages (required before running apps)
pnpm build:packages

# Setup environment variables
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local

# Start Supabase local (optional)
supabase start
# Studio: http://127.0.0.1:54323
# API: http://127.0.0.1:54321

# Run web app
pnpm dev:web
# http://localhost:5173

# Run mobile PWA (in another terminal)
pnpm dev:mobile
# http://localhost:5174
```

### 12.3 Local Supabase

```bash
# Start local Supabase (con variabili Google OAuth)
GOOGLE_CLIENT_ID="your-client-id" GOOGLE_CLIENT_SECRET="your-secret" supabase start

# Apply migrations
supabase db push

# Deploy functions locally
supabase functions serve --env-file supabase/.env.local

# Stop
supabase stop
```

### 12.4 Dev Login (Local Development Only)

Per facilitare il testing locale senza configurare OAuth, è disponibile un **Dev Login** che appare solo in modalità development:

```
┌─────────────────────────────┐
│         Lumio               │
│                             │
│  [Accedi con Google]        │
│                             │
│  ─── Solo sviluppo ───      │
│                             │
│  [🛠️ Dev Login]             │
│                             │
└─────────────────────────────┘
```

**Come funziona:**
- Crea automaticamente un utente `dev@lumio.local` in Supabase Auth
- Password predefinita: `devpassword123`
- Bypass completo di Google OAuth
- Disponibile su Web (`import.meta.env.DEV`) e Mobile (`__DEV__`)

**Quando usarlo:**
- Testing locale senza configurare Google OAuth
- Testing su dispositivo fisico via Expo Go (evita problemi di rete con OAuth)
- CI/CD per test automatizzati

**Implementazione:**
```typescript
// packages/core/src/supabase/auth.ts
export async function signInWithDevUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'dev@lumio.local',
    password: 'devpassword123',
  });
  // Se l'utente non esiste, viene creato automaticamente
  if (error?.message.includes('Invalid login credentials')) {
    return supabase.auth.signUp({ email, password, ... });
  }
  return { data, error };
}
```

> ⚠️ **Sicurezza**: Il bottone Dev Login è visibile SOLO in development mode. In produzione non appare e la funzione `signInWithDevUser` non dovrebbe mai essere chiamata.

---

## 13. Future Considerations (v2+)

| Feature | Technical Implication |
|---------|----------------------|
| Offline mode | Service Worker caching + IndexedDB |
| Gamification | New tables, realtime leaderboard |
| Marketplace | Payment integration (Stripe) |
| Multi-language AI | Prompt engineering per lingua |
| Push notifications | Web Push API + service worker |

---

*Documento generato durante sessione di brainstorming. Da revisionare e approvare prima dello sviluppo.*
