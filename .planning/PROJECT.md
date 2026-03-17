# Lumio

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive con ripetizione spaziata. Due frontend: app nativa Android (React Native/Expo) per lo studio e web app React SPA (deck.lumio.toto-castaldi.com) per la creazione di deck e carte. L'app Android è bilingue IT/EN con branding Lumio, ripetizione spaziata SM-2, sessioni configurabili con cap RPC, dashboard compatta 2x2, card browse, storico sessioni, gestione errori sync, autenticazione dual-mode (Google OAuth + email/password), account linking bidirezionale, password reset via OTP, e discovery di deck condivisi con ricerca fulltext e iscrizione. Il deck builder web permette di creare/modificare deck e carte in markdown con editor live preview e metadata (nome, descrizione, lingua, tag) salvati in deck.yaml, committate via edge function su un repo Git condiviso. Il contenuto viene dai repository Git, le domande sono pre-generate dal sistema. Docora sincronizza e genera domande AI per entrambi i flussi (repo utente e repo condiviso), e indicizza i metadata deck nel deck_index per la ricerca fulltext.

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
- ✓ RPC cap rigido sessione: scadute first (più vecchie prima), poi nuove, totale mai oltre p_limit — v2.2
- ✓ Dashboard counter mostra carte della prossima sessione (LEAST capping), non debito totale — v2.2
- ✓ Selettore "Auto" con icona sparkles al posto di "Tutte/∞" — v2.2
- ✓ Backward-compatible AsyncStorage migration da 'all' a 'auto' — v2.2
- ✓ Dashboard 2x2 stat card grid: "Ultimo studio" e "Da ripassare oggi" sulla stessa riga a metà larghezza — v2.3
- ✓ Tempo relativo localizzato IT/EN su "Ultimo studio" ("ieri", "2 giorni fa", "yesterday", "2 days ago") — v2.3
- ✓ "Ultimo studio" non navigabile (rimosso tap → storico sessioni) — v2.3
- ✓ Pulsante studio circolare centrato con sola icona play (60px, nessun testo) — v2.3
- ✓ Web app React SPA con auth Supabase condivisa (Google OAuth + email/password) — v3.0
- ✓ Layout responsive con sidebar deck list e area editor principale — v3.0
- ✓ Dark mode e i18n IT/EN nel deck builder web — v3.0
- ✓ CRUD deck (crea, rinomina, elimina con conferma) — v3.0
- ✓ CRUD carte con editor markdown, live preview, toolbar, metadata form — v3.0
- ✓ Edge function deck-commit con 8 azioni GitHub API e isolamento path utente — v3.0
- ✓ Docora sync repo condiviso per generazione AI — v3.0
- ✓ Deploy produzione deck.lumio.toto-castaldi.com con SSL e CI/CD — v3.0
- ✓ deck_index table con fulltext search tsvector/GIN e ranking pesato (name > tags > description) — v3.1
- ✓ search_decks RPC con prefix matching per search-as-you-type e filtro tag — v3.1
- ✓ Iscrizione a sottocartella deck (subfolder_path su user_repositories) con studio filtrato — v3.1
- ✓ lumio-decks repo piattaforma sempre disponibile per sync Docora — v3.1
- ✓ docora-webhook indicizza deck.yaml in deck_index (upsert/delete) — v3.1
- ✓ deck-commit commit_yaml action con autore server-enforced e serializzazione YAML — v3.1
- ✓ DeckMetadataForm nel deck builder (nome, descrizione, lingua, tag) con caricamento/salvataggio YAML — v3.1
- ✓ Discovery tab (4° tab, icona bussola) con ricerca fulltext, chip tag, subscribe/unsubscribe ottimistico — v3.1
- ✓ Deck condivisi visibili nella schermata Repos con display_name arricchito da deck_index — v3.1
- ✓ i18n completa Discovery IT/EN (17 chiavi per lingua) — v3.1
- ✓ Tab Discovery promosso a 2° posizione nav (Dashboard → Discovery → Repos → Settings) — v3.2
- ✓ Repo piattaforma lumio-decks nascosto da lista repo, stats, e add manuale con info toast — v3.2
- ✓ Unsubscribe atomico da mazzo condiviso via SECURITY DEFINER RPC (card_review_schedule + user_repositories) — v3.2
- ✓ Swipe-to-unsubscribe su mazzi condivisi con dialog conferma e toast — v3.2
- ✓ Lista unificata FlatList con discriminated union (deck | repo) per repos e mazzi condivisi — v3.2
- ✓ Filtro carte per subfolder e navigazione CardDetail per mazzi condivisi — v3.2

### Active

(No active milestone — start next with `/gsd:new-milestone`)

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
- Studio/quiz nel browser — l'app mobile è l'esperienza di studio, nessuna duplicazione
- Editor WYSIWYG — conflitto con code blocks e math; markdown + preview è consolidato
- Collaborazione real-time — singolo sviluppatore, uso personale
- Upload immagini nelle carte — complessità Git binari; URL esterni supportati
- UI versioning carte — Git fornisce lo storico; costruire UI è complesso e raramente necessario
- Autosave — save manuale prima; autosave aggiunge complessità commit
- Ricerca fulltext carte — scala non lo richiede; navigazione gerarchica sufficiente

## Context

**Stato attuale (post v3.2):**
- Monorepo pnpm: apps/android (Expo/React Native), apps/deck-builder (Vite/React SPA), apps/landing (static HTML), packages/core, packages/shared
- Backend Supabase: auth (Google OAuth + email/password), DB, storage, edge functions (deck-commit con 9 azioni GitHub API + docora-webhook con deck.yaml indexing), Docora webhook + study_sessions + card_review_schedule + deck_index tables
- Tech stack Android: Expo SDK 54, React Native 0.81, react-navigation, @lumio/core, i18n-js, react-native-marked, supermemo@2.0.23
- Tech stack Deck Builder: Vite 7, React 19, react-router 7, Tailwind 4, @uiw/react-md-editor 4, vitest
- CI/CD: lint-and-typecheck → build-apk → deploy-landing → deploy-deck-builder → deploy-migrations → deploy-functions
- Versioning: STATE.md milestone → extract-version.cjs → version.ts, APK versionName, landing page, edge function
- Auth condivisa: dual-mode Google OAuth + email/password, OTP verification, password reset, account linking bidirezionale
- App Android bilingue IT/EN con branding Lumio, SM-2, sessioni configurabili, dashboard 2x2, card browse, study history, sync error handling, Discovery tab
- Deck builder web bilingue IT/EN con dark mode, deck CRUD, card authoring con markdown editor, live preview, toolbar, metadata form (deck.yaml)
- Discovery pipeline: deck.yaml → Docora webhook → deck_index (tsvector/GIN) → search_decks RPC → Discovery screen
- ~56,900 LOC (TS/TSX/CSS/SQL) — ~28,300 Android + ~28,600 deck-builder
- 14 milestones shipped: v1.1 → v3.2

## Constraints

- **Platform**: Android (studio) + Web (deck authoring)
- **Distribution**: APK diretto via GitHub Releases, web app via CI/CD SCP
- **Backend**: Supabase (auth, DB, storage, edge functions)
- **Build Android**: Expo prebuild + Gradle (no EAS Build)
- **Build Web**: Vite 7 production build
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
| IF/ELSE in plpgsql for NULL vs non-NULL p_limit | Cleaner than COALESCE with large sentinel for unlimited vs capped logic | ✓ Good — v2.2 |
| p_limit DEFAULT NULL for RPC parameters | Matches production unlimited behavior as safe default | ✓ Good — v2.2 |
| LEAST(total, p_limit) for count capping | Simpler than IF/ELSE with separate queries for scalar cap | ✓ Good — v2.2 |
| Hardcoded 'Auto' label (universal across languages) | "Auto" is understood in both IT and EN, no translation needed | ✓ Good — v2.2 |
| AsyncStorage backward-compat migration 'all' → 'auto' | Read old value, return new enum value silently | ✓ Good — v2.2 |
| Verbose relative time keys alongside abbreviated | Backwards compat for StudyHistoryScreen, new verbose keys for dashboard | ✓ Good — v2.3 |
| justNow threshold extended to <5min | Less jittery display for recent sessions | ✓ Good — v2.3 |
| Always relative time (no absolute date fallback) | Simpler code, consistent UX — even "years ago" is relative | ✓ Good — v2.3 |
| 60px circular play button (borderRadius 30) | Middle of 56-64 range, visually prominent centered CTA | ✓ Good — v2.3 |
| Removed unused i18n keys after button text removal | Clean codebase, no orphaned translations | ✓ Good — v2.3 |
| Vite 7 + React 19 + Tailwind 4 for deck builder | Modern stack, fast builds, Tailwind utility-first CSS | ✓ Good — v3.0 |
| Shared Supabase project for web and mobile | Single auth, single DB, no user sync complexity | ✓ Good — v3.0 |
| Edge function for GitHub commits (not direct API) | Server-side path isolation, API key protection | ✓ Good — v3.0 |
| UUID prefix path isolation in shared repo | User can only write to `/{user_id}/` directory | ✓ Good — v3.0 |
| .gitkeep for empty deck directories | Git doesn't track empty dirs; .gitkeep creates presence | ✓ Good — v3.0 |
| localStorage-backed timestamps for deck sort | GitHub API has no directory timestamps; client-side proxy | ✓ Good — v3.0 |
| yaml package over gray-matter for browser | gray-matter requires Buffer polyfill in browser | ✓ Good — v3.0 |
| Responsive MDEditor: split desktop, toggle mobile | Optimal UX per viewport via matchMedia | ✓ Good — v3.0 |
| HTTP-only Nginx template, Certbot adds SSL on server | SSL config is server-specific, not repo-portable | ✓ Good — v3.0 |
| deploy-deck-builder parallels deploy-landing in CI | Independent apps, no build dependency between them | ✓ Good — v3.0 |
| Immutable wrapper function for tsvector generated column | PostgreSQL requires IMMUTABLE for generated columns; to_tsvector is STABLE | ✓ Good — v3.1 |
| 'simple' tsvector config (no stemming) | Multilingual deck names need exact token match, not language-specific stemming | ✓ Good — v3.1 |
| subfolder_path on user_repositories (not separate table) | Simpler schema, reuses existing subscription model | ✓ Good — v3.1 |
| COALESCE-based unique index for nullable subfolder_path | Broader compatibility than NULLS NOT DISTINCT, clearer semantics | ✓ Good — v3.1 |
| websearch_to_tsquery replaced with prefix matching | Search-as-you-type requires partial word matching (:* suffix) | ✓ Good — v3.1 |
| Card count computed at query time (not stored) | Avoids sync complexity between cards table and deck_index | ✓ Good — v3.1 |
| Transparent subfolder filter via JOIN conditions | No RPC signature changes, backward compatible with NULL subfolder_path | ✓ Good — v3.1 |
| parseYaml wrapper reusing parseFrontmatter | No new YAML library needed; existing parser handles deck.yaml structure | ✓ Good — v3.1 |
| Server-enforced author from user profile | Client value always ignored; prevents impersonation | ✓ Good — v3.1 |
| UPSERT for idempotent webhook delivery | Handles out-of-order Docora webhook events gracefully | ✓ Good — v3.1 |
| Client-side join for user_repositories + deck_index | No FK relationship, PostgREST cannot embed | ✓ Good — v3.1 |
| 409 conflict as success in subscribeToDeck | Idempotent double-tap handling without error UI | ✓ Good — v3.1 |
| Optimistic UI with Set rollback for subscribe | Immediate visual feedback, revert on error | ✓ Good — v3.1 |
| Collapsible metadata form (collapsed by default) | Non-intrusive for quick deck browsing, expand when needed | ✓ Good — v3.1 |
| Post-query array filter for is_platform exclusion | Simpler than nested Supabase filter syntax | ✓ Good — v3.2 |
| Sentinel error string PLATFORM_REPO for client detection | Clean client-side routing to info toast vs error toast | ✓ Good — v3.2 |
| SECURITY DEFINER RPC for atomic unsubscribe | Deletes card_review_schedule + user_repositories in single transaction | ✓ Good — v3.2 |
| Discriminated union (kind: 'deck' \| 'repo') for FlatList | Type-safe rendering of mixed shared decks and personal repos | ✓ Good — v3.2 |
| Skip .lumioignore when subfolderPath is set | Shared decks don't have per-user .lumioignore | ✓ Good — v3.2 |
| Fallback Repository object for shared deck CardDetail | Enables CardDetail navigation without repo in user's personal collection | ✓ Good — v3.2 |

---
*Last updated: 2026-03-17 after v3.2 milestone*
