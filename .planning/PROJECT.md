# Lumio

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive. App nativa Android (React Native/Expo) bilingue IT/EN con branding, sessioni di studio configurabili, e landing page per il download dell'APK. Il contenuto viene dai repository Git, le domande sono pre-generate dal sistema.

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
- ✓ Preview card nativa con markdown, code highlighting, KaTeX (no WebView per markdown) — v1.2
- ✓ Versione dinamica da @lumio/shared con tap-to-copy — v1.2
- ✓ Logo Lumio in Login screen, Dashboard header, e landing page — v1.2
- ✓ Sessioni di studio configurabili (10/20/50/All) con persistenza — v1.2
- ✓ Internazionalizzazione IT/EN con toggle in Settings e persistenza — v1.2

### Active

(None — planning next milestone)

### Out of Scope

- iOS — rimandato a milestone futura
- Distribuzione su Google Play Store — per ora solo APK diretto
- Offline mode — richiede connessione per studio
- Notifiche push — da valutare in futuro
- Unificazione packages/core e packages/shared — @lumio/core riusato as-is, funziona bene
- react-native-svg per logo — native rebuild richiesto, SDK 54 press event regressions, si usa PNG
- Slider per cards-per-session — decision paralysis, preset radio buttons sufficienti
- Traduzione contenuto card — il materiale educativo resta nella lingua originale
- Supporto lingue RTL — nessuna lingua RTL pianificata
- Piattaforma di gestione traduzioni (Crowdin etc.) — 2 lingue, ~85 stringhe, singolo sviluppatore

## Context

**Stato attuale (post v1.2):**
- Monorepo pnpm: apps/android (Expo/React Native), apps/landing (static HTML), packages/core, packages/shared
- Backend Supabase invariato (auth, DB, storage, edge functions, Docora webhook)
- 5,960 LOC TypeScript/JS (5,506 Android + 454 landing)
- Tech stack: Expo SDK 54, React Native 0.81, react-navigation, @lumio/core, i18n-js, react-native-marked
- CI/CD: auto-release → lint → build-apk → deploy-landing → deploy-migrations → deploy-functions
- App bilingue IT/EN con branding Lumio, sessioni configurabili, card rendering nativo

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
| CDN libraries in WebView | LaTeX + code blocks impossibili con RN text components | ⚠️ Revisit (v1.2 moved to native rendering for markdown) |
| Prev/Next buttons over swipe | ScrollView conflict con QuizCard su device reale | ✓ Good |
| Bottom-sheet modal over fullscreen | Android nav controls coprono contenuto fullscreen | ✓ Good |
| Expo config plugin per signing | android/ è gitignored, plugin sopravvive a prebuild | ✓ Good |
| PNG logo over react-native-svg | SVG richiede native rebuild, SDK 54 press regressions | ✓ Good — v1.2 |
| i18n-js over react-i18next | Expo recommended, 15kb vs 45kb, sufficient for 2 locales | ✓ Good — v1.2 |
| Preset radio buttons for cards-per-session | Evita decision paralysis di un slider, UX più chiara | ✓ Good — v1.2 |
| Native markdown rendering (react-native-marked) | WebView card preview tagliato, native è più veloce e affidabile | ✓ Good — v1.2 |
| KaTeX micro-WebView for LaTeX only | Native text non supporta math, WebView isolato solo per formula | ✓ Good — v1.2 |

---
*Last updated: 2026-02-09 after v1.2 milestone*
