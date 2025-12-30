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

## 4 - PRIMA VERSIONE STUDIO - SOLO WEB - CARTE RANDOM

- L'utente preme su studia. 
- Lumio inizia ad usare AI del cliente tramite le API KEY.
- Si crea una chat con un contesto iniziale del tipo :
```
Voglio ripassare gli argomenti delle carte che ti invierò una alla volta.
Una volta ricevuto la carta, la leggi e mi proponi quattro scelte multiple tra cui solo una corretta.
Non mi devi dare subito la risposta, io la devo scegliere scelgo io e se sbaglio mi correggi.
Le opzioni che mi proponi devono essere tutte diverse.
Dopo che ho risposto fai un piccolo ripasso dell'argomento sia nel caso in cui ho sbagliato sia nel caso in cui ho risposto correttamente.
Vai a capo tra una opzione e l'altra.
Varia la risposta corretta tra una carta e e l'altra. Può essere corretta la A, B, C o D.
```
- Lumio sceglie una carta a caso tra quelle da studiare e la invia alla AI (tutto il file , anche immagini collegate se si riesce).
- Lumio chiede alla AI : "dimmi le quattro opzioni per questa carta"
- L'utente risponde
- L'AI dice se corretta o meno e ripasso
- Il processo si ripete riscegliendo una carta a caso




# BACKLOG - Miglioramenti Futuri

- [ ] Proteggere le edge functions con JWT
- [ ] Ogni carta deve spiegare le sue fonti
- [ ] Web Push Notifications per PWA
- [ ] Offline mode con Service Worker + IndexedDB
- [ ] lumio.toto-castaldi.com diventa sito ufficiale, invece web va su w-lumio.toto-castaldi.com

## BUG

- [x] le carte dei repo non vengono ricaricate → **FIX: configurare job n8n per chiamare `POST /functions/v1/git-sync` con `{"action": "check_updates"}`**
