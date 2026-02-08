# Lumio

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive. App nativa Android (React Native/Expo) con landing page per il download dell'APK. Il contenuto viene dai repository Git, le domande sono pre-generate dal sistema.

## Core Value

Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## Requirements

### Validated

- ✓ Autenticazione Google OAuth via Supabase — existing
- ✓ Gestione repository (aggiunta/rimozione) via Docora webhook — existing
- ✓ Sync automatico card da repository GitHub (pubblici e privati) — existing
- ✓ Pre-generazione domande in batch con sistema voti — existing
- ✓ Storage immagini in Supabase con signed URLs — existing
- ✓ API keys AI centralizzate a livello piattaforma — existing
- ✓ Filtro .lumioignore applicato nel backend — existing
- ✓ App nativa Android con React Native — v1.1
- ✓ Login Google OAuth nativo — v1.1
- ✓ Dashboard con statistiche (repos, cards) — v1.1
- ✓ Gestione repository (aggiungi/rimuovi con PAT) — v1.1
- ✓ Studio con quiz pre-generati e sistema voti — v1.1
- ✓ Preview card con markdown, syntax highlighting, LaTeX, immagini — v1.1
- ✓ Landing page statica su lumio.toto-castaldi.com — v1.1
- ✓ Download APK dalla landing page — v1.1
- ✓ Rimozione apps/web e apps/mobile (PWA) — v1.1
- ✓ Dark mode con toggle (system/light/dark) — v1.1
- ✓ Haptic feedback su risposte quiz — v1.1
- ✓ CI/CD per build APK e deploy landing — v1.1

### Active

- [ ] Logo Lumio nell'app e landing page
- [ ] Internazionalizzazione (IT/EN) con toggle in Settings
- [ ] Numero carte per sessione configurabile in Settings
- [ ] Fix preview carta tagliata nel bottom-sheet
- [ ] Versione dinamica da @lumio/shared (non hardcoded)

### Out of Scope

- iOS — rimandato a milestone futura
- Distribuzione su Google Play Store — per ora solo APK diretto
- Offline mode — richiede connessione per studio
- Notifiche push — da valutare in futuro
- Unificazione packages/core e packages/shared — @lumio/core riusato as-is, funziona bene

## Context

**Stato attuale (post v1.1):**
- Monorepo pnpm: apps/android (Expo/React Native), apps/landing (static HTML), packages/core, packages/shared
- Backend Supabase invariato (auth, DB, storage, edge functions, Docora webhook)
- 5,019 LOC TypeScript/JS (4,538 Android + 481 landing)
- Tech stack: Expo SDK 54, React Native 0.81, react-navigation, @lumio/core
- CI/CD: auto-release → lint → build-apk → deploy-landing → deploy-migrations → deploy-functions
- Versione corrente: v1.1.4
- App funzionante su Android con Google OAuth, studio quiz, card rendering

## Constraints

- **Platform**: Solo Android
- **Distribution**: APK diretto via GitHub Releases
- **Backend**: Nessuna modifica alle Edge Functions o schema DB
- **Build**: Expo prebuild + Gradle (no EAS Build)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native over Flutter | Riuso competenze React, ecosistema familiare | ✓ Good |
| Expo managed workflow | Semplifica build/deploy, buon supporto community | ✓ Good |
| react-navigation over expo-router | expo-router incompatibile con pnpm monorepo | ✓ Good |
| Android-first | Dispositivo principale dello sviluppatore | ✓ Good |
| APK diretto vs Play Store | Velocità rilascio, nessuna review | ✓ Good (per ora) |
| @lumio/core riusato as-is | Platform-agnostic types/utilities, nessun overhead | ✓ Good |
| SecureStore per auth tokens | Encryption hardware-backed per sessioni Supabase | ✓ Good |
| CDN libraries in WebView | LaTeX + code blocks impossibili con RN text components | ✓ Good |
| Prev/Next buttons over swipe | ScrollView conflict con QuizCard su device reale | ✓ Good |
| Bottom-sheet modal over fullscreen | Android nav controls coprono contenuto fullscreen | ✓ Good |
| Expo config plugin per signing | android/ è gitignored, plugin sopravvive a prebuild | ✓ Good |

## Current Milestone: v1.2 Polish & UX

**Goal:** Migliorare la qualità dell'esperienza utente con branding, internazionalizzazione, sessioni di studio configurabili e bugfix.

**Target features:**
- Logo Lumio integrato in app e landing
- Toggle lingua IT/EN persistente
- Carte per sessione configurabili
- Fix preview carta tagliata
- Versione dinamica da versionamento automatico

---
*Last updated: 2026-02-08 after v1.2 milestone started*
