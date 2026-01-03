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
│   │              External Scheduler (n8n)                    │   │
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
│   │   │   ├── favicon.svg     # Favicon browser
│   │   │   └── logo.svg        # Logo per UI
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
│       │   ├── favicon.svg     # Favicon browser
│       │   ├── logo.svg        # Logo per UI
│       │   ├── icon-192.png    # PWA icon 192x192
│       │   ├── icon-512.png    # PWA icon 512x512
│       │   └── manifest.json   # PWA manifest (generato da vite-plugin-pwa)
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
│       └── ci-deploy.yml       # CI/CD unificato (auto-release, lint, typecheck, deploy)
│
├── .release-please-manifest.json # Versione corrente (tracking)
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

> **Nota:** L'app mobile è una PWA (Progressive Web App) servita su `m-lumio.toto-castaldi.com`. Condivide lo stesso stack tecnologico della web app ma con UI ottimizzata per dispositivi mobili e flussi diversi (focus sullo studio).

### 3.3 Backend — Supabase

| Component | Usage |
|-----------|-------|
| PostgreSQL | Database principale |
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

### 3.5 Markdown Rendering (Fase 8)

Il sistema di rendering markdown è centralizzato in `@lumio/core` per garantire consistenza tra web e mobile.

**Architettura:**
```
packages/core/src/markdown/
├── index.ts           # Entry point, esporta configurazione
├── config.ts          # Plugin remark/rehype configurati
├── components.ts      # Custom renderers (CodeBlock, Table, Image)
└── styles.css         # Styling condiviso "Notion-like"

apps/web/src/components/
└── MarkdownRenderer.tsx    # Wrapper che importa config da @lumio/core

apps/mobile/src/components/
└── MarkdownRenderer.tsx    # Stesso wrapper per mobile
```

**Plugin Stack:**

| Plugin | Funzione | Note |
|--------|----------|------|
| `remark-gfm` | GitHub Flavored Markdown | Tabelle, task lists, strikethrough |
| `remark-math` | Parsing formule LaTeX | Supporto `$...$` e `$$...$$` |
| `rehype-katex` | Rendering formule | Richiede CSS KaTeX |
| `rehype-highlight` | Syntax highlighting | Tema configurabile (light/dark) |

**Custom Components:**

| Componente | Features |
|------------|----------|
| `CodeBlock` | Header linguaggio, bottone copia, line numbers, scroll orizzontale |
| `Table` | Bordi, header evidenziato, righe alternate, responsive |
| `Image` | Lazy loading, placeholder, fallback errori, GitHub raw URLs |

**Styling "Notion-like":**
- Typography pulita con font system
- Code blocks con sfondo scuro e bordi arrotondati
- Tabelle con bordi sottili e righe alternate
- Formule centrate con spacing appropriato
- Supporto dark mode completo

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
Trigger: n8n (ogni ora, configurabile) + manuale da UI
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
| `get_available_models` | Ritorna lista modelli disponibili per ogni provider |
| `generate_quiz` | Genera domanda a scelta multipla da contenuto carta (Step 1) |
| `validate_answer` | Valida risposta utente e fornisce spiegazione dettagliata (Step 2) |

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

**Generazione Quiz (action: `generate_quiz`):**

Genera una domanda a scelta multipla basata sul contenuto di una carta.

```
Input:
{
  "action": "generate_quiz",
  "cardContent": "# Titolo\n\nContenuto markdown della carta...",
  "provider": "openai" | "anthropic",
  "model": "gpt-4o-mini" | "gpt-4o" | "claude-3-5-haiku" | "claude-3-5-sonnet" | "claude-3-opus"
}

Output:
{
  "success": true,
  "quiz": {
    "question": "Qual e il principio fondamentale...",
    "options": [
      { "id": "A", "text": "Prima opzione" },
      { "id": "B", "text": "Seconda opzione" },
      { "id": "C", "text": "Terza opzione" },
      { "id": "D", "text": "Quarta opzione" }
    ],
    "correctAnswer": "B",
    "explanation": "Spiegazione dettagliata del concetto..."
  }
}
```

**Flusso generazione quiz:**
```
Client                    Edge Function                    LLM Provider
   │                            │                              │
   │  generate_quiz(...)        │                              │
   │ ─────────────────────────▶ │                              │
   │                            │  1. getUserId() (auth)       │
   │                            │  2. getDecryptedKey()        │
   │                            │  3. Build system prompt      │
   │                            │  4. Call LLM API             │
   │                            │ ─────────────────────────────▶│
   │                            │ ◀─────────────────────────────│
   │                            │  5. Parse JSON response      │
   │                            │  6. Validate structure       │
   │   { success, quiz }        │                              │
   │ ◀───────────────────────── │                              │
```

**Modelli supportati (Fase 5+):**

| Provider | Modello | Note |
|----------|---------|------|
| OpenAI | `gpt-5.1` | Modello base, buon rapporto qualita/costo |
| OpenAI | `gpt-5.2` | Migliore qualita, piu costoso |
| Anthropic | `claude-haiku-4-5` | Economico, veloce |
| Anthropic | `claude-sonnet-4-5` | Bilanciato qualita/costo |
| Anthropic | `claude-opus-4-5` | Massima qualita |

> **Nota Fase 5:** I modelli precedenti (`gpt-4o-mini`, `gpt-4o`, `claude-3-5-haiku`, `claude-3-5-sonnet`, `claude-3-opus`) sono stati rimossi e sostituiti con le versioni piu recenti.

**Prompt di sistema per quiz (Step 1 - generate_quiz):**

Il prompt istruisce l'AI a:
1. Leggere il contenuto della carta
2. Generare una domanda pertinente
3. Creare 4 opzioni di cui solo una corretta
4. Variare la posizione della risposta corretta (A, B, C o D)
5. Fornire una spiegazione breve del concetto

**Validazione Risposta (action: `validate_answer`) - Step 2:**

Valida la risposta dell'utente e fornisce una spiegazione dettagliata.

```
Input:
{
  "action": "validate_answer",
  "cardContent": "# Titolo\n\nContenuto markdown della carta...",
  "question": "Qual e il principio fondamentale...",
  "userAnswer": "B",
  "correctAnswer": "A",
  "provider": "openai" | "anthropic",
  "model": "gpt-5.1" | "claude-sonnet-4-5" | ...
}

Output:
{
  "success": true,
  "validation": {
    "isCorrect": false,
    "explanation": "Spiegazione dettagliata del concetto, perche la risposta corretta e A e non B...",
    "tips": ["Suggerimento 1 per ricordare meglio", "Suggerimento 2"]
  }
}
```

**Flusso validazione risposta:**
```
Client                    Edge Function                    LLM Provider
   │                            │                              │
   │  validate_answer(...)      │                              │
   │ ─────────────────────────▶ │                              │
   │                            │  1. getUserId() (auth)       │
   │                            │  2. getDecryptedKey()        │
   │                            │  3. Build validation prompt  │
   │                            │  4. Call LLM API             │
   │                            │ ─────────────────────────────▶│
   │                            │ ◀─────────────────────────────│
   │                            │  5. Parse JSON response      │
   │                            │  6. Validate structure       │
   │   { success, validation }  │                              │
   │ ◀───────────────────────── │                              │
```

**Prompt di sistema per validazione (italiano):**

Il prompt istruisce l'AI a:
1. Verificare se la risposta dell'utente e corretta
2. Fornire una spiegazione DETTAGLIATA e CORPOSA del concetto
3. Spiegare PERCHE la risposta corretta e quella giusta
4. Se sbagliato, spiegare PERCHE la risposta dell'utente e errata
5. Fornire suggerimenti per memorizzare meglio il concetto

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

### 4.3 Scheduled Jobs (n8n)

I job schedulati sono gestiti esternamente tramite **n8n** invece di pg_cron, per maggiore affidabilità e facilità di debugging.

| Job | Schedule | Endpoint | Body |
|-----|----------|----------|------|
| `sync_repositories` | `0 * * * *` (ogni ora) | `POST /functions/v1/git-sync` | `{"action": "check_updates"}` |
| `recalculate_study_plans` | `0 3 * * *` (ogni notte alle 3) | `POST /functions/v1/study-planner` | `{"action": "recalculate_all"}` |

**Configurazione n8n:**
- Autenticazione: `Authorization: Bearer <SERVICE_ROLE_KEY>`
- Content-Type: `application/json`

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

// redirectTo è opzionale: se non specificato, usa window.location.origin
export const signInWithGoogle = async (redirectTo?: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
};
```

### 5.2 Redirect URLs per Ambiente

| Ambiente | Web | Mobile (PWA) |
|----------|-----|--------------|
| **DEV** | `http://localhost:5173/auth/callback` | `http://localhost:5174/auth/callback` |
| **PROD** | `https://lumio.toto-castaldi.com/auth/callback` | `https://m-lumio.toto-castaldi.com/auth/callback` |

**Configurazione Supabase Production:**
Aggiungere tutti i redirect URLs nelle impostazioni Authentication > URL Configuration del progetto Supabase.

### 5.3 Session Token Management

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

### 6.3 Versioning con Auto-Release

Il progetto usa un **job custom `auto-release`** per il versioning completamente automatico, integrato nel workflow `ci-deploy.yml`.

**Come funziona:**
1. Ogni push su `main` → `auto-release` analizza i commit dall'ultimo tag
2. Se ci sono commit `feat:` o `fix:` → bump automatico, tag Git, push
3. I job di deploy fanno `git pull` per avere la versione aggiornata
4. **Nessuna PR richiesta** - release completamente automatiche

**Flusso nel workflow:**
```
push main
    │
    ▼
auto-release (analizza feat/fix commits)
    │
    ├── Se ci sono commit releasabili:
    │   ├── Calcola nuova versione
    │   ├── Aggiorna package.json, version.ts
    │   ├── Commit "chore(release): vX.Y.Z"
    │   └── Crea e pusha tag
    │
    ▼
lint-and-typecheck
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
build-web    build-mobile   deploy-migrations
    │              │              │
    ▼              ▼              ▼
deploy-web   deploy-mobile  deploy-functions
(git pull)   (git pull)     (git pull)
```

I deploy fanno `git pull origin main` per catturare la versione aggiornata.

**File aggiornati automaticamente:**
- `package.json` (campo `version`)
- `packages/shared/src/version.ts`
- `.release-please-manifest.json` (tracking)

**Conventional Commits:**

| Tipo | Bump |
|------|------|
| `feat:` | MINOR (0.x.0) |
| `fix:` | PATCH (0.0.x) |
| `feat!:` o `fix!:` | MAJOR (x.0.0) |

> Per dettagli completi vedere [docs/VERSIONING.md](./VERSIONING.md)

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

### 8.0 Funzionalità Mobile (Fase 7)

L'app mobile offre funzionalità di studio complete, equivalenti alla versione web:

**Pagine disponibili:**
| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/login` | LoginPage | Login con Google OAuth |
| `/auth/callback` | AuthCallbackPage | Gestione callback OAuth |
| `/dashboard` | DashboardPage | Statistiche e bottone "Studia" |
| `/repositories` | RepositoriesPage | Lista repository sincronizzati |
| `/study` | StudyPage | Sessione di studio completa |

**Design System Mobile:**
- Touch targets minimo 44px per accessibilità
- Layout full-width ottimizzato per mobile
- Gradienti soft (from-slate-50 to-white)
- Rounded corners consistenti (rounded-2xl, rounded-xl)
- Palette colori slate per testi e sfondi

**Nessuna pagina Settings su mobile:**
- Tutti i link settings aprono la versione web (`https://lumio.toto-castaldi.com/settings`)
- Configurazione API keys, preferenze e gestione account solo su web

**Componenti principali:**
```
apps/mobile/src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── collapsible.tsx    # Prompt settings collapsible
│   │   ├── dialog.tsx         # Card preview dialog
│   │   ├── scroll-area.tsx    # Scrollable content
│   │   ├── select.tsx         # Provider/model selection
│   │   ├── sonner.tsx         # Toast notifications
│   │   └── textarea.tsx       # Prompt customization
│   ├── CardPreviewDialog.tsx  # Full-screen card preview
│   └── NeedsApiKeyMessage.tsx # Message when no API keys
├── pages/
│   ├── LoginPage.tsx
│   ├── AuthCallbackPage.tsx
│   ├── DashboardPage.tsx
│   ├── RepositoriesPage.tsx
│   └── StudyPage.tsx          # Mobile study session
└── contexts/
    └── AuthContext.tsx
```

**StudyPage Mobile Features:**
- Selezione provider (OpenAI, Anthropic)
- Selezione modello
- Customizzazione prompt (sezione collapsible)
- Flusso two-step: `generateQuiz()` → `validateAnswer()`
- Preview carta completa in dialog full-screen
- Progress tracking (carte rimanenti)
- Animazioni fluide per transizioni stati

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
| **PROD** | `m-lumio.toto-castaldi.com` | `/var/www/lumio-mobile` |

**Vantaggi PWA vs App Nativa:**
- Nessun app store, installazione immediata
- Aggiornamenti automatici (no download)
- Stesso codebase web, manutenzione semplificata
- Funziona su qualsiasi dispositivo con browser moderno

### 8.4 Logo e Assets

Il logo Lumio è una lampadina stilizzata con raggi, rappresenta l'illuminazione della conoscenza.

**File sorgente:** `lumio.svg` nella root del progetto

| File | Ubicazione | Utilizzo |
|------|------------|----------|
| `favicon.svg` | `apps/web/public/`, `apps/mobile/public/` | Favicon nel browser tab |
| `logo.svg` | `apps/web/public/`, `apps/mobile/public/` | Logo nell'UI (LoginPage, Dashboard header) |
| `icon-192.png` | `apps/mobile/public/` | Icona PWA 192x192 (richiesta per installazione) |
| `icon-512.png` | `apps/mobile/public/` | Icona PWA 512x512 (richiesta per installazione) |

**Generazione icone PWA:**
```bash
# Da lumio.svg genera le icone PNG per PWA
npx sharp-cli -i lumio.svg -o apps/mobile/public/icon-192.png resize 192 192
npx sharp-cli -i lumio.svg -o apps/mobile/public/icon-512.png resize 512 512
```

> **Nota:** Le icone PNG sono necessarie per il prompt di installazione PWA. Senza di esse, il browser non propone l'installazione dell'app.

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

- Node.js >= 22
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
