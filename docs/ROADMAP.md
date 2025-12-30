# Lumio Roadmap v1.0

## 1 - SETUP

### 1.1 PNPM WORKSPACE

- [x] `pnpm-workspace.yaml` - definizione monorepo
- [x] `package.json` root con scripts workspace
- [x] `tsconfig.base.json` - configurazione TypeScript condivisa
- [x] `.npmrc` - configurazione pnpm
- [x] `.gitignore` aggiornato per monorepo

### 1.2 PACKAGES

- [x] `@lumio/shared` - VERSION, types, constants
- [x] `@lumio/core` - Supabase client, SM-2 algorithm

### 1.3 APPS

- [x] `apps/web` - React 19 + Vite + Tailwind + shadcn/ui
- [x] `apps/mobile` - PWA: React 19 + Vite + Tailwind + shadcn/ui

### 1.4 AMBIENTE DI DEV

- [x] Supabase local (`supabase/config.toml`)
- [x] `.env.example` files per web e mobile
- [x] Script `pnpm dev:web` e `pnpm dev:mobile`

### 1.5 AMBIENTE DI PROD

- [x] Progetto Supabase su supabase.com
- [x] Configurazione Nginx per subdomain `lumio.toto-castaldi.com`
- [x] SSL con Let's Encrypt

### 1.6 CONTINUOUS DELIVERY

- [x] `.github/workflows/ci-deploy.yml` - CI/CD unificato (lint, typecheck, deploy web, deploy mobile)
- [x] GitHub Secrets configurati (SUPABASE_*, DO_*)

### 1.7 UPDATE BACKEND

- [x] Deploy Edge Functions tramite `supabase functions deploy`
- [x] Placeholder functions: git-sync, llm-proxy, study-planner

### 1.8 UPDATE DESKTOP (Web)

- [x] Build con Vite
- [x] SCP a DigitalOcean `/var/www/lumio`
- [x] Reload Nginx automatico

### 1.9 UPDATE MOBILE (PWA)

- [x] Vite + React 19 + Tailwind configuration
- [x] PWA manifest e service worker (vite-plugin-pwa)
- [x] Asset icons (icon-192.png, icon-512.png)
- [x] Deploy su `m-lumio.toto-castaldi.com`
- [x] Nginx configuration per subdomain mobile

### 1.10 VERSION IDENTIFIER

- [x] adopt docs/VERSIONING.md conventions
- [x] Visualize version in web
- [x] Visualize version in mobile
- [x] Visualize version in supabase responses

### 1.11 FIX VERSIONING SYSTEM (Reset to v0.1.0) ✅

- [x] Reset sistema di versionamento a v0.1.0
- [x] Fix configurazione Husky v9 (hooks in `.husky/`)
- [x] Fix CI/CD release workflow (logica semplificata)
- [x] Fix standard-version bumpFiles (include package.json)
- [x] Verificato: commit `fix:` → v0.1.1 creata automaticamente
- [x] Verificato: UI web/mobile mostrano versione corretta

### 1.2 DELIVERY

- [x] Richiesta di aggiornamento automatico su PWA

---

## 2 - ONBOARDING

- [x] aggiungere sicurezza RLS
- [x] Login/logout con Google OAuth Web
- [x] Login/logout con Google OAuth Mobile (PWA)
  - [x] 2.1 Configurazione Supabase Production: aggiungere `https://m-lumio.toto-castaldi.com/auth/callback` alle redirect URLs
  - [x] 2.2 Aggiornare `supabase/config.toml` con URL mobile dev (`http://localhost:5174/auth/callback`)
  - [x] 2.3 Creare `AuthContext.tsx` per mobile (replica da web con adattamenti)
  - [x] 2.4 Creare `LoginPage.tsx` mobile con Google OAuth
  - [x] 2.5 Creare `AuthCallbackPage.tsx` mobile per gestione callback OAuth
  - [x] 2.6 Creare `DashboardPage.tsx` mobile (semplificata, con logout)
  - [x] 2.7 Creare `NeedsApiKeyMessage.tsx` componente per redirect a configurazione web
  - [x] 2.8 Creare `RepositoriesPage.tsx` mobile (visualizzazione repository, fase 3)
  - [x] 2.9 Creare `router.tsx` con protezione route (ProtectedRoute, GuestRoute)
  - [x] 2.10 Implementare logout funzionale
  - [x] 2.11 Test end-to-end del flusso OAuth su mobile (dev) - Test prod dopo deploy
- [x] pagina di configurazione solo su Web: Setup API Keys (OpenAI/Anthropic)

---

## 3 - REPO PUBBLICO (solo da WEB)

- [x] CRUD (solo aggiunta e cancellazione) censimento di REPO pubblici git con carte
- [x] se viene aggiunto un nuovo REPO questo viene importato nel DB locale. Tutte le carte vengono prese.
- [x] se viene cancellato, anche localmente le carte vengono cancellate
- [x] Devops : creo artifact con il backup DB di PROD prima di migrazioni
- [x] ogni ora (configurabile via n8n), il sistema controlla se i repo degli utenti hanno cambiato versione (tramite storia dei commit). In caso di cambiamento le carte vengono tutte reimportate da zero
- [x] nella home page è possibile vedere i contatori dei repository e delle carte aggiornati
- [x] preview delle carte: click su contatore card → lista carte → click su carta → visualizzazione markdown completo

---

## 4 - PRIMA VERSIONE STUDIO (Solo Web - Carte Random)

### 4.1 Backend - Edge Function llm-proxy

- [x] 4.1.1 Aggiungere action `generate_quiz` per generare domande a scelta multipla
- [x] 4.1.2 Implementare chiamata a OpenAI API (gpt-4o-mini, gpt-4o)
- [x] 4.1.3 Implementare chiamata a Anthropic API (claude-3-5-haiku, claude-sonnet-4, claude-opus-4)
- [x] 4.1.4 Costruire prompt di sistema per quiz (4 opzioni, risposta variabile, spiegazione)
- [x] 4.1.5 Aggiungere action `get_available_models` per lista modelli per provider

### 4.2 Core Package

- [x] 4.2.1 Creare `packages/core/src/supabase/study.ts` con funzioni per studio
- [x] 4.2.2 Aggiungere tipi TypeScript in `@lumio/shared` (QuizQuestion, LLMModel)
- [x] 4.2.3 Implementare `getStudyCards()` per ottenere carte utente

### 4.3 Frontend - Pagina Studio

- [x] 4.3.1 Creare `/study` route in router.tsx
- [x] 4.3.2 Creare `StudyPage.tsx` con gestione stati (setup/quiz/completed)
- [x] 4.3.3 Creare `ProviderModelSelector.tsx` per selezione provider e modello
- [x] 4.3.4 Creare `QuizCard.tsx` per visualizzazione domanda e opzioni
- [x] 4.3.5 Creare `StudyCompleted.tsx` per fine sessione
- [x] 4.3.6 Implementare logica selezione carta random senza ripetizioni

### 4.4 Frontend - Dashboard

- [x] 4.4.1 Aggiungere bottone "Studia" prominente sopra la griglia
- [x] 4.4.2 Disabilitare bottone se nessuna carta disponibile

### 4.5 Error Handling

- [x] 4.5.1 Gestire errori chiamata AI con possibilita di riprovare
- [x] 4.5.2 Gestire caso nessuna carta disponibile
- [x] 4.5.3 Gestire API key non valida/scaduta

### Criteri di Successo Fase 4

- L'utente puo avviare una sessione di studio dalla dashboard
- L'utente puo scegliere provider (OpenAI/Anthropic) e modello
- L'AI genera domande a scelta multipla basate sul contenuto delle carte
- Le carte non si ripetono nella stessa sessione
- L'utente riceve feedback immediato (corretto/sbagliato + spiegazione)
- La sessione termina quando tutte le carte sono state viste
- Gli errori AI sono gestiti con possibilita di riprovare

### Note Fase 4

- **Immagini**: Non supportate in questa fase (solo testo delle carte)
- **Tracciamento**: Nessun salvataggio progressi/storico in questa fase
- **Costi API**: Ogni domanda genera una chiamata API a carico dell'utente
- **Latenza**: Le risposte AI possono richiedere 2-5 secondi

---

## BACKLOG - Miglioramenti Futuri

- [ ] Proteggere le edge functions con JWT
- [ ] Ogni carta deve spiegare le sue fonti
- [ ] Web Push Notifications per PWA
- [ ] Offline mode con Service Worker + IndexedDB
- [ ] lumio.toto-castaldi.com diventa sito ufficiale, invece web va su w-lumio.toto-castaldi.com
- [ ] modelli : Anthropic - Haiku4.5, Sonnet4.5 e Opus4.5 . OpenAI GPT4o e GPT5.1

## BUG

- [x] le carte dei repo non vengono ricaricate → **FIX: configurare job n8n per chiamare `POST /functions/v1/git-sync` con `{"action": "check_updates"}`**
