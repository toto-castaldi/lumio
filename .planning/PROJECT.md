# Lumio

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive. App nativa Android (React Native/Expo) bilingue IT/EN con branding Lumio, sessioni di studio configurabili, navigazione carte nei repository, storico sessioni di studio, gestione errori sync con aggiornamento token in-app, e landing page per il download dell'APK. Il contenuto viene dai repository Git, le domande sono pre-generate dal sistema.

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
- ✓ Icona launcher corretta (logo Lumio tri-color pie) — v1.3
- ✓ Brand text "Lumio" su Login screen e Dashboard header — v1.3
- ✓ Studio forward-only: nessun toast skip, nessun Prev, nessuna conferma chiusura — v1.3
- ✓ Fix navbar Android che copre contenuto card durante studio — v1.3
- ✓ Fix tracciamento "Ultimo studio" nella dashboard con AsyncStorage — v1.3
- ✓ Fix icona visibilità repo (globe per pubblici, lock per privati) — v1.3

- ✓ Fix card preview coperto da navbar durante studio — v1.4
- ✓ Sezione ACCOUNT con avatar Google in Settings — v1.4
- ✓ Navigazione carte: tap su repo → lista carte → dettaglio carta — v1.4
- ✓ Persistenza sessioni di studio con tabella study_sessions — v1.4
- ✓ Storico sessioni con score color-coding e pull-to-refresh — v1.4
- ✓ Dashboard "ultimo studio" tappabile per navigare allo storico — v1.4

- ✓ Pulsante "Scheda successiva" ancorato in basso senza spreco di spazio — v1.5
- ✓ Contrasto dark mode su opzioni risposta e pannello spiegazione — v1.5

- ✓ Webhook handler per Docora sync_failed con validazione HMAC — v1.6
- ✓ Storage dettagli errore sync (tipo, messaggio, is_auth_error) nel DB — v1.6
- ✓ Auto-recovery: campi errore azzerati su sync riuscito — v1.6
- ✓ Indicatori errore nella lista repo (ambra auth, rosso sistema) — v1.6
- ✓ Messaggio errore Docora visibile sotto URL del repo — v1.6
- ✓ Bottom-sheet modale errore con input PAT condizionale per errori auth — v1.6
- ✓ Edge function proxy per aggiornamento token PAT verso Docora API — v1.6
- ✓ Clearing ottimistico errore UI dopo aggiornamento token — v1.6

### Active

(Nessun requisito attivo — milestone v1.6 completata, prossima milestone da definire)

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
- Dettaglio per carta nelle statistiche — risultato sessione sufficiente
- Statistiche con grafici/trend — v1.4 mostra solo lista sessioni, analytics avanzata futura
- Auto-retry sync dall'app — Docora gestisce circuit breaker e retry internamente
- Trigger sync manuale — Docora controlla la schedulazione sync
- Push notification per errori sync — rimandato a milestone futura
- UI circuit breaker (timer cooldown, conteggio retry) — over-engineering, messaggio errore sufficiente

## Context

**Stato attuale (post v1.6):**
- Monorepo pnpm: apps/android (Expo/React Native), apps/landing (static HTML), packages/core, packages/shared
- Backend Supabase: auth, DB, storage, edge functions, Docora webhook + study_sessions table
- Tech stack: Expo SDK 54, React Native 0.81, react-navigation, @lumio/core, i18n-js, react-native-marked
- CI/CD: auto-release → lint → build-apk → deploy-landing → deploy-migrations → deploy-functions
- App bilingue IT/EN con branding Lumio, sessioni configurabili, card browse, study history, studio forward-only, sync error handling con token update in-app
- 6 milestones shipped: v1.1 (native app), v1.2 (polish & i18n), v1.3 (bugfix & UX), v1.4 (card browse & stats), v1.5 (study UX fixes), v1.6 (sync error handling)

## Constraints

- **Platform**: Solo Android
- **Distribution**: APK diretto via GitHub Releases
- **Backend**: Modifiche DB per statistiche sessioni; Edge Functions invariate dove possibile
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
| Prev/Next buttons over swipe | ScrollView conflict con QuizCard su device reale | ✓ Good |
| Bottom-sheet modal over fullscreen | Android nav controls coprono contenuto fullscreen | ✓ Good |
| Expo config plugin per signing | android/ è gitignored, plugin sopravvive a prebuild | ✓ Good |
| PNG logo over react-native-svg | SVG richiede native rebuild, SDK 54 press regressions | ✓ Good — v1.2 |
| i18n-js over react-i18next | Expo recommended, 15kb vs 45kb, sufficient for 2 locales | ✓ Good — v1.2 |
| Preset radio buttons for cards-per-session | Evita decision paralysis di un slider, UX più chiara | ✓ Good — v1.2 |
| Native markdown rendering (react-native-marked) | WebView card preview tagliato, native è più veloce e affidabile | ✓ Good — v1.2 |
| KaTeX micro-WebView for LaTeX only | Native text non supporta math, WebView isolato solo per formula | ✓ Good — v1.2 |
| Pie-only logo mark (no rays/signature) | Rays appeared as artifacts at small sizes, pie is clean at all scales | ✓ Good — v1.3 |
| Forward-only study (removed review mode) | Simpler UX, -130 LOC, less state to manage | ✓ Good — v1.3 |
| AsyncStorage for last-studied timestamp | Simpler than DB table, no migration, works offline | ✓ Good — v1.3 |
| Safe area insets for Android navbar | paddingBottom: static + insets.bottom pattern for consistent clearance | ✓ Good — v1.3 |
| contentPaddingBottom prop for reusable safe area | Keeps CardContentView reusable across contexts | ✓ Good — v1.4 |
| Reuse CardContentView/CardView for card browse | Avoids code duplication, consistent rendering | ✓ Good — v1.4 |
| .lumioignore filtering in card list via Deck | Consistency between card browse and study sessions | ✓ Good — v1.4 |
| repository_name nullable TEXT (not FK) | NULL means all repos since study is cross-repo | ✓ Good — v1.4 |
| Immutable study_sessions (no UPDATE/DELETE RLS) | Prevents tampering with historical session data | ✓ Good — v1.4 |
| Fire-and-forget session save | Does not block navigation to StudySummary | ✓ Good — v1.4 |
| platform_config for study_history_limit | Admin-configurable instead of hardcoded | ✓ Good — v1.4 |
| Score color-coding (green/yellow/red thresholds) | Clear visual feedback: >=70% green, >=40% yellow, else red | ✓ Good — v1.4 |
| Absolute positioning for bottom button | Simpler than flex restructure, works with ScrollView | ✓ Good — v1.5 |
| Dark mode emerald-900/red-900 backgrounds | High contrast with white text on correct/incorrect answers | ✓ Good — v1.5 |
| bottomInset prop for QuizCard | Scroll padding behind floating button, keeps component reusable | ✓ Good — v1.5 |
| is_auth_error boolean flag in webhook handler | Cleaner than raw string check in app, ready for conditional UI | ✓ Good — v1.6 |
| Unknown repos in sync_failed return 200 OK | Prevents Docora retries for repos not in our DB | ✓ Good — v1.6 |
| Error field clearing pattern on every synced update | Consistent auto-recovery across all 6 webhook success paths | ✓ Good — v1.6 |
| Amber for auth errors, red for system errors | Visual distinction: user-fixable vs auto-recoverable | ✓ Good — v1.6 |
| 50% sheet height for error modal | Simpler content than card preview (80%), appropriate sizing | ✓ Good — v1.6 |
| Optimistic error clearing after token update | Immediate UI feedback without waiting for next sync cycle | ✓ Good — v1.6 |

---
*Last updated: 2026-02-21 after v1.6 milestone completed*
