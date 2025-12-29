# Lumio Roadmap v1.0

## 1 - SETUP

### 1.1 PNPM WORKSPACE

- [x] `pnpm-workspace.yaml` - definizione monorepo
- [x] `package.json` root con scripts workspace
- [x] `tsconfig.base.json` - configurazione TypeScript condivisa
- [x] `.npmrc` - node-linker=hoisted per compatibilità Expo
- [x] `.gitignore` aggiornato per monorepo

### 1.2 PACKAGES

- [x] `@lumio/shared` - VERSION, types, constants
- [x] `@lumio/core` - Supabase client, SM-2 algorithm

### 1.3 APPS

- [x] `apps/web` - React 19 + Vite + Tailwind + shadcn/ui
- [x] `apps/mobile` - Expo SDK 54 + React Native + React 19

### 1.4 AMBIENTE DI DEV

- [x] Supabase local (`supabase/config.toml`)
- [x] `.env.example` files per web e mobile
- [x] Script `pnpm dev:web` e `pnpm dev:mobile`

### 1.5 AMBIENTE DI PROD

- [x] Progetto Supabase su supabase.com
- [x] Configurazione Nginx per subdomain `lumio.toto-castaldi.com`
- [x] SSL con Let's Encrypt

### 1.6 CONTINUOUS DELIVERY

- [x] `.github/workflows/ci-deploy.yml` - CI/CD unificato (lint, typecheck, deploy, build APK)
- [x] GitHub Secrets configurati (SUPABASE_*, DO_*, EXPO_TOKEN)

### 1.7 UPDATE BACKEND

- [x] Deploy Edge Functions tramite `supabase functions deploy`
- [x] Placeholder functions: git-sync, llm-proxy, study-planner

### 1.8 UPDATE DESKTOP (Web)

- [x] Build con Vite
- [x] SCP a DigitalOcean `/var/www/lumio`
- [x] Reload Nginx automatico

### 1.9 UPDATE MOBILE (Android only per v1.0)

- [x] EAS Build configuration (`eas.json`)
- [x] Asset icons (icon.png, splash.png, adaptive-icon.png)
- [x] CI: Build APK automatico su push a main
- [x] Build APK preview per testing interno

### 1.10 VERSION IDENTIFIER

- [x] adopt docs/VERSIONING.md conventions
- [x] Visualize version in web
- [x] Visualize version in mobile
- [x] Visualize version in supabase responses

---

## 2 - ONBOARDING

- [ ] Login con Google OAuth
- [ ] Setup API Keys (OpenAI/Anthropic)
- [ ] Aggiungi primo repository
- [ ] Devops : backup db prima di migrazioni
- [ ] Crea primo obiettivo

---

## 3 - STUDIO

- [ ] Sessione di studio
- [ ] Generazione domande AI
- [ ] Algoritmo SM-2
- [ ] Feedback qualità domanda

---

## 4 - OBIETTIVI

- [ ] Creazione obiettivo per tag
- [ ] Dashboard progresso
- [ ] Calcolo piano studio giornaliero

---

## 5 - REPOSITORY

- [ ] Sync repository Git
- [ ] Validazione formato card
- [ ] Gestione repository privati con PAT
