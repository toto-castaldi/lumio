# Lumio

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive con ripetizione spaziata. App nativa Android (React Native/Expo) bilingue IT/EN con branding Lumio, ripetizione spaziata SM-2 (carte scadute prima, nuove dopo), sessioni di studio configurabili, counter "carte da ripassare oggi" sulla dashboard, navigazione carte nei repository, storico sessioni con conteggio carte, gestione errori sync con aggiornamento token in-app, autenticazione dual-mode (Google OAuth + email/password con verifica OTP), account linking bidirezionale (Google ↔ email), password reset via OTP, e landing page con versione dinamica per il download dell'APK. Il contenuto viene dai repository Git, le domande sono pre-generate dal sistema. Il versioning è derivato da STATE.md (GSD milestone) tramite CI pipeline.

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

- ✓ Rimozione husky, commitlint, commitizen, release-please, auto-release CI, CHANGELOG, git tags — v1.7
- ✓ Versione estratta da STATE.md al build time (extract-version.cjs → version.ts) — v1.7
- ✓ Landing page mostra versione corrente via CI sed injection — v1.7
- ✓ Edge function /version usa versione da STATE.md — v1.7
- ✓ docs/VERSIONING.md documenta il nuovo flusso GSD — v1.7

- ✓ Ripetizione spaziata SM-2 con scheduling basato su risposte (giusto → intervallo più lungo, sbagliato → reset a 1 giorno) — v2.0
- ✓ Mix intelligente sessioni: carte scadute prima, nuove dopo, proporzionate automaticamente — v2.0
- ✓ Ease factor adattivo per carta (2.5 iniziale, floor 1.3, ceiling 2.5, intervallo max 365 giorni) — v2.0
- ✓ SRS state reset quando il contenuto della carta cambia (sync da GitHub) — v2.0
- ✓ Dashboard counter "carte da ripassare oggi" con colori contestuali — v2.0
- ✓ Badge "Ripasso"/"Nuova" durante lo studio — v2.0
- ✓ Storico sessioni con conteggio carte, date relative, e CTA per nuovi utenti — v2.0
- ✓ RPCs timezone-aware con AT TIME ZONE e CHECK constraints per integrità dati — v2.0

- ✓ Signup con email/password e verifica OTP a 6 cifre via email brandizzata Lumio — v2.1
- ✓ Login email con progressive disclosure (Google OAuth prominente in alto, form email sotto separatore) — v2.1
- ✓ Reset password via OTP con schermata two-phase (OTP poi nuova password) e invalidazione globale sessioni — v2.1
- ✓ Account linking: aggiunta Google ad account email e email/password ad account Google, unlink con protezione singola identità — v2.1
- ✓ Trigger database provider-aware per signup email (display_name da prefisso email, avatar generato) — v2.1
- ✓ 71 chiavi i18n per auth in IT e EN con validazione DeepStringify a compile-time — v2.1
- ✓ SignOut guard per utenti email-only (GoogleSignin.signOut condizionale) — v2.1
- ✓ Recovery state machine con persistenza AsyncStorage per reset password — v2.1

### Active

## Current Milestone: v2.2 Session Limits

**Goal:** Rispettare il limite carte-per-sessione scelto dall'utente, con dashboard coerente e label "Auto" per il selettore.

**Target features:**
- Cap rigido RPC: scadute first (più vecchie prima), poi nuove, totale mai oltre il limite scelto
- Dashboard counter mostra carte della prossima sessione (non debito totale)
- Selettore: rinomina "Tutte/∞" → "Auto" (stessa logica, label diversa)

### Out of Scope

- iOS — rimandato a milestone futura
- Distribuzione su Google Play Store — per ora solo APK diretto
- Offline mode — richiede connessione per studio
- Notifiche push — da valutare in futuro (incluso promemoria carte scadute)
- Unificazione packages/core e packages/shared — @lumio/core riusato as-is, funziona bene
- react-native-svg per logo — native rebuild richiesto, SDK 54 press event regressions, si usa PNG
- Slider per cards-per-session — decision paralysis, preset radio buttons sufficienti
- Traduzione contenuto card — il materiale educativo resta nella lingua originale
- Supporto lingue RTL — nessuna lingua RTL pianificata
- Piattaforma di gestione traduzioni (Crowdin etc.) — 2 lingue, ~85 stringhe, singolo sviluppatore
- Statistiche con grafici/trend — lista sessioni sufficiente per ora, analytics avanzata futura
- Auto-retry sync dall'app — Docora gestisce circuit breaker e retry internamente
- Trigger sync manuale — Docora controlla la schedulazione sync
- Push notification per errori sync — rimandato a milestone futura
- UI circuit breaker (timer cooldown, conteggio retry) — over-engineering, messaggio errore sufficiente
- Full SM-2 grade scale (0-5 buttons) — ridondante con quiz multiple choice binario
- Undo/reschedule button — compromette integrità algoritmo; studio forward-only
- FSRS algorithm — richiede 400+ review per calibrare ML; prematuro
- Per-card statistics detail — risultato sessione sufficiente
- Deep link email verification — OTP approach chosen, più affidabile su Android
- Social login (Apple, GitHub, etc.) — Google + email copre gli utenti target
- Custom password policy (oltre default Supabase) — 6 char minimo sufficiente per app studio personale
- Bilingual email templates — Supabase invia un template per tipo; EN singola lingua accettabile
- SMTP configuration — config dashboard produzione, non codice

## Context

**Stato attuale (post v2.1):**
- Monorepo pnpm: apps/android (Expo/React Native), apps/landing (static HTML), packages/core, packages/shared
- Backend Supabase: auth (Google OAuth + email/password), DB, storage, edge functions, Docora webhook + study_sessions + card_review_schedule tables
- Tech stack: Expo SDK 54, React Native 0.81, react-navigation, @lumio/core, i18n-js, react-native-marked, supermemo@2.0.23, vitest@4.0.18
- CI/CD: lint → build-apk → deploy-landing → deploy-migrations → deploy-functions (version from STATE.md)
- Versioning: STATE.md milestone → extract-version.cjs → version.ts, APK versionName, landing page, edge function
- Auth: dual-mode Google OAuth + email/password con OTP verification, password reset, account linking bidirezionale
- App bilingue IT/EN con branding Lumio, ripetizione spaziata SM-2, sessioni configurabili, card browse, study history con conteggio carte, studio forward-only, sync error handling con token update in-app
- ~26,000 LOC (TS/TSX/SQL) — +9,897 lines in v2.1
- 9 milestones shipped: v1.1 (native app), v1.2 (polish & i18n), v1.3 (bugfix & UX), v1.4 (card browse & stats), v1.5 (study UX fixes), v1.6 (sync error handling), v1.7 (GSD versioning), v2.0 (spaced repetition), v2.1 (email auth)

## Constraints

- **Platform**: Solo Android
- **Distribution**: APK diretto via GitHub Releases
- **Backend**: Supabase (auth, DB, storage, edge functions)
- **Build**: Expo prebuild + Gradle (no EAS Build)
- **Auth**: Google OAuth + email/password (no social login beyond Google)

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
| CommonJS (.cjs) for extract-version script | No build step, maximum Node.js compatibility, zero npm deps | ✓ Good — v1.7 |
| Script generates entire version.ts (not patch) | Ensures consistent output, no merge conflicts | ✓ Good — v1.7 |
| CI-time sed injection for landing page version | Zero JS overhead, no runtime fetch needed | ✓ Good — v1.7 |
| STATE.md as single source of truth for version | One file drives APK, landing, edge function, shared package | ✓ Good — v1.7 |
| SM-2 over FSRS | Binary quiz input (correct/wrong) loses FSRS's granular-feedback advantage | ✓ Good — v2.0 |
| supermemo@2.0.23 with thin wrapper | Only adds 365-day cap and EF ceiling clamps, no logic changes | ✓ Good — v2.0 |
| Server-side SM-2 in upsert_card_review RPC | Atomic UPSERT prevents race conditions, simpler client | ✓ Good — v2.0 |
| SECURITY DEFINER RPCs with (select auth.uid()) | Performance pattern for Supabase RLS bypass in trusted RPCs | ✓ Good — v2.0 |
| DATE type for next_review_at (not TIMESTAMPTZ) | Avoids timezone flip bugs — "today" is always a date, not an instant | ✓ Good — v2.0 |
| Fire-and-forget recordCardReview with dedup set | Non-blocking SRS write-back, single retry, writtenBackCardIds prevents double-writes | ✓ Good — v2.0 |
| Sequential card iteration (not random) | Preserves SRS ordering: overdue first, then new | ✓ Good — v2.0 |
| useFocusEffect for dashboard refresh | Refreshes on every screen focus including return from study | ✓ Good — v2.0 |
| AT TIME ZONE with fallback for timezone-aware RPCs | Local date comparison near midnight, degrades to CURRENT_DATE on invalid timezone | ✓ Good — v2.0 |
| CHECK constraints on card_review_schedule | Database-level enforcement of EF floor/ceiling and interval bounds | ✓ Good — v2.0 |
| OTP over deep link for email verification | More reliable on Android, no deep link infrastructure needed | ✓ Good — v2.1 |
| Email-first progressive disclosure on login | Email + Continue reveals password, reduces cognitive load | ✓ Good — v2.1 |
| Google OAuth button on top, email below separator | Dual-auth layout with equal visual weight | ✓ Good — v2.1 |
| Provider-aware trigger (raw_app_meta_data->>'provider') | Explicit provider detection with COALESCE default 'email' | ✓ Good — v2.1 |
| Recovery state machine with AsyncStorage | Password reset flow survives app restarts | ✓ Good — v2.1 |
| Guard GoogleSignin.signOut with hasPreviousSignIn | Prevents crash for email-only users | ✓ Good — v2.1 |
| Global signOut on password change | Invalidates all sessions across devices for security | ✓ Good — v2.1 |
| Two-phase screen pattern (OTP then password) | Single component for OTP verification + password entry | ✓ Good — v2.1 |
| addPasswordModeRef to suppress PASSWORD_RECOVERY | Prevents recovery nav during add-password OTP flow | ✓ Good — v2.1 |
| Supabase linkIdentity with queryParams | Google token exchange for account linking | ✓ Good — v2.1 |
| Session JSON size logging after identity change | SecureStore monitoring for dual-identity JWT stability | ✓ Good — v2.1 |

---
*Last updated: 2026-03-04 after v2.2 milestone start*
