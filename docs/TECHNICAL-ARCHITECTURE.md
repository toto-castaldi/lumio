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
│   │      Web App        │       │     Mobile App      │         │
│   │  React 19 + Vite    │       │       Expo          │         │
│   │  Tailwind + shadcn  │       │   React Native      │         │
│   │                     │       │                     │         │
│   │  DigitalOcean       │       │  Expo Build Cloud   │         │
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
│  • Expo Push Service     │
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
│   └── mobile/                 # Expo SDK 54 + React Native
│       ├── app/                # Expo Router (file-based routing)
│       │   ├── _layout.tsx     # Root layout
│       │   └── index.tsx       # Home screen
│       ├── components/         # UI components
│       ├── hooks/              # React hooks
│       ├── lib/                # Utilities
│       ├── app.json            # Expo config
│       ├── eas.json            # EAS Build config
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
│       ├── ci.yml              # Lint, typecheck su PR
│       └── deploy.yml          # Deploy web app + Edge Functions
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

### 3.2 Frontend — Mobile

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo | SDK 54 |
| React | React | 19.x |
| Language | TypeScript | 5.x |
| Navigation | Expo Router | 6.x |
| State | React Query + Zustand | - |
| Push Notifications | Expo Notifications | - |

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
| Expo Push Service | Push notifications |

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
Proxy verso OpenAI/Anthropic per generare domande.

```
Trigger: Chiamata da client durante studio
Input: card_content, user_api_key, provider
Flow:
  1. Validate API key format
  2. Build prompt con card content
  3. Call LLM API
  4. Parse response (domanda, opzioni, spiegazione)
  5. Return structured response
```

> ⚠️ Le API key utente transitano criptate e non vengono mai persistite nei log.

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

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflows

#### ci.yml — Continuous Integration

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

#### deploy-web.yml — Deploy Web App

```yaml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:web
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      
      - name: Deploy to DigitalOcean
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USERNAME }}
          key: ${{ secrets.DO_SSH_KEY }}
          source: "apps/web/dist/*"
          target: "/var/www/lumio"
          strip_components: 3
          
      - name: Reload Nginx
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USERNAME }}
          key: ${{ secrets.DO_SSH_KEY }}
          script: sudo systemctl reload nginx
```

#### deploy-functions.yml — Deploy Edge Functions

```yaml
name: Deploy Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
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

## 8. Mobile App Build & Distribution

### 8.1 Expo Configuration

**app.json**:
```json
{
  "expo": {
    "name": "Lumio",
    "slug": "lumio",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.lumio.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.lumio.app"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

**eas.json** (Expo Application Services):
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### 8.2 Build Commands

```bash
# Development build (internal testing)
eas build --profile development --platform all

# Preview build (internal distribution)
eas build --profile preview --platform all

# Production build (v2 - store submission)
eas build --profile production --platform all
```

### 8.3 Distribution (v1)

Per v1, build distribuite internamente via:
- **iOS**: TestFlight o link diretto EAS
- **Android**: APK/AAB via link EAS

---

## 9. Push Notifications

### 9.1 Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌────────────────┐
│   pg_cron   │────▶│  Edge Function  │────▶│  Expo Push     │
│  (trigger)  │     │  (send notif)   │     │  Service       │
└─────────────┘     └─────────────────┘     └────────────────┘
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           ▼                        ▼                        ▼
                    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                    │    APNs     │          │     FCM     │          │   Device    │
                    │   (iOS)     │          │  (Android)  │          │             │
                    └─────────────┘          └─────────────┘          └─────────────┘
```

### 9.2 Notification Types

| Type | Trigger | Content |
|------|---------|---------|
| Daily Study Reminder | pg_cron (configurable time) | "Hai 15 card da studiare oggi!" |
| Goal Progress | After study session | "Sei al 65% del tuo obiettivo!" |
| Goal Deadline Warning | 3 days before deadline | "Mancano 3 giorni alla deadline!" |
| Repository Updated | After git-sync | "Il deck X è stato aggiornato" |

---

## 10. Monitoring & Error Tracking

### 10.1 Sentry Configuration

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

**Mobile App** (`apps/mobile/src/lib/sentry.ts`):
```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0.1,
});
```

**Edge Functions**:
```typescript
import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
});
```

### 10.2 What We Track

| Category | Tracked Items |
|----------|---------------|
| Errors | Unhandled exceptions, API failures, validation errors |
| Performance | Page load times, API response times, LLM latency |
| User Context | User ID (anonymized), active goal, repository count |

---

## 11. Security Considerations

### 11.1 API Keys Handling

- User LLM API keys stored encrypted in database (AES-256)
- Keys decrypted only in Edge Functions, never sent to client
- Keys never logged or included in error reports

### 11.2 Repository Access

- Public repos: no auth needed
- Private repos: PAT stored encrypted, scoped to read-only

### 11.3 Data Isolation

- RLS on all user tables
- Users can only access their own data
- Admin access via separate service role

### 11.4 HTTPS Everywhere

- Web app: SSL via Let's Encrypt
- Supabase: HTTPS by default
- Mobile: Certificate pinning (v2)

---

## 12. Environment Variables

### 12.1 Web App

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |

### 12.2 Mobile App

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN |

### 12.3 Edge Functions

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) |
| `SENTRY_DSN` | Sentry DSN |
| `RESEND_API_KEY` | Resend API key for emails |
| `ENCRYPTION_KEY` | Key for encrypting user API keys |

### 12.4 GitHub Actions Secrets

| Secret | Usage |
|--------|-------|
| `SUPABASE_URL` | Build time env |
| `SUPABASE_ANON_KEY` | Build time env |
| `SUPABASE_ACCESS_TOKEN` | Deploy Edge Functions |
| `SUPABASE_PROJECT_REF` | Deploy Edge Functions |
| `DO_HOST` | DigitalOcean droplet IP |
| `DO_USERNAME` | SSH username |
| `DO_SSH_KEY` | SSH private key |
| `SENTRY_DSN` | Error tracking |

---

## 13. Development Setup

### 13.1 Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI
- Expo CLI

### 13.2 Getting Started

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

# Run mobile app (in another terminal)
pnpm dev:mobile
# http://localhost:8081

# Mobile with tunnel (for Expo Go on phone)
cd apps/mobile && npx expo start --tunnel
```

### 13.3 Local Supabase

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Deploy functions locally
supabase functions serve

# Stop
supabase stop
```

---

## 14. Future Considerations (v2+)

| Feature | Technical Implication |
|---------|----------------------|
| Offline mode | SQLite local + sync queue |
| Gamification | New tables, realtime leaderboard |
| Marketplace | Payment integration (Stripe) |
| Multi-language AI | Prompt engineering per lingua |
| Play Store release | EAS production build + review process |

---

*Documento generato durante sessione di brainstorming. Da revisionare e approvare prima dello sviluppo.*
