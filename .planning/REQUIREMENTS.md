# Requirements: Lumio Native

**Defined:** 2026-01-29
**Core Value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## v1 Requirements

Requirements per il rilascio iniziale dell'app nativa Android.

### App Setup

- [x] **APP-01**: Progetto Expo SDK 54 con React Native 0.81
- [x] **APP-02**: Configurazione NativeWind per styling Tailwind
- [x] **APP-03**: Integrazione Supabase client con AsyncStorage
- [x] **APP-04**: Bottom navigation con tab bar nativa (Dashboard, Repository, Settings)

### Autenticazione

- [x] **AUTH-01**: Login Google OAuth nativo via @react-native-google-signin
- [x] **AUTH-02**: Sessione persistente con SecureStore
- [x] **AUTH-03**: Logout con pulizia sessione

### Dashboard

- [x] **DASH-01**: Visualizzazione contatori (repository, card totali)
- [x] **DASH-02**: Bottone "Studia" prominente (disabled se no card)
- [x] **DASH-03**: Dark mode automatico (segue impostazione sistema)

### Repository

- [x] **REPO-01**: Lista repository con FlatList ottimizzata
- [x] **REPO-02**: Aggiunta repository pubblico via URL
- [x] **REPO-03**: Aggiunta repository privato con PAT
- [x] **REPO-04**: Rimozione repository con dialog conferma
- [x] **REPO-05**: Indicatore visivo per repository privati

### Studio

- [ ] **STUD-01**: Caricamento card con domande pre-generate
- [ ] **STUD-02**: Quiz con 4 opzioni multiple e feedback immediato
- [ ] **STUD-03**: Spiegazione post-risposta (pre-generata)
- [ ] **STUD-04**: Sistema voti domande (like/dislike)
- [ ] **STUD-05**: Skip card durante studio
- [ ] **STUD-06**: Swipe gestures per navigazione tra card
- [ ] **STUD-07**: Haptic feedback su azioni (risposta corretta/sbagliata)
- [ ] **STUD-08**: Progress bar sessione studio

### Card Preview

- [ ] **CARD-01**: Rendering markdown base (titoli, liste, grassetto, corsivo, link)
- [ ] **CARD-02**: Syntax highlighting per blocchi codice (linguaggi comuni)
- [ ] **CARD-03**: Rendering formule LaTeX inline e block
- [ ] **CARD-04**: Immagini da Supabase Storage con signed URLs
- [ ] **CARD-05**: Scroll per contenuti lunghi

### Distribuzione

- [ ] **DIST-01**: Build APK con EAS Build (Android)
- [ ] **DIST-02**: Landing page statica su lumio.toto-castaldi.com
- [ ] **DIST-03**: Download APK dalla landing page
- [ ] **DIST-04**: Descrizione prodotto e screenshot nella landing

### Cleanup Codebase

- [ ] **CLEAN-01**: Rimozione apps/web
- [ ] **CLEAN-02**: Rimozione apps/mobile (PWA)
- [x] **CLEAN-03**: Valutazione riuso @lumio/core vs unificazione

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Native Enhancements

- **NAT-01**: Push notifications per reminder studio
- **NAT-02**: Home screen widget con card del giorno
- **NAT-03**: In-app update check con notifica nuova versione
- **NAT-04**: Offline mode base (card pre-cachate)

### Gamification

- **GAM-01**: Streak di studio (giorni consecutivi)
- **GAM-02**: Progress visualization avanzata

### Platform

- **PLAT-01**: iOS support
- **PLAT-02**: Google Play Store distribution

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Creazione/modifica card in-app | Focus su consumo, non produzione. Content via Git. |
| Social features | Complessita, non core per v1 |
| Spaced repetition algorithm | Non implementato neanche in PWA, defer |
| Voice input | Valore incerto, richiede user research |
| Focus timer / Pomodoro | Feature creep, non essenziale |
| Multiple simultaneous goals | Contrario al design "un obiettivo alla volta" |
| Web app mantenuta | Sostituita da landing page statica |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| APP-01 | Phase 1 | Complete |
| APP-02 | Phase 1 | Complete |
| APP-03 | Phase 1 | Complete |
| APP-04 | Phase 2 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| DASH-01 | Phase 3 | Complete |
| DASH-02 | Phase 3 | Complete |
| DASH-03 | Phase 3 | Complete |
| REPO-01 | Phase 3 | Complete |
| REPO-02 | Phase 3 | Complete |
| REPO-03 | Phase 3 | Complete |
| REPO-04 | Phase 3 | Complete |
| REPO-05 | Phase 3 | Complete |
| STUD-01 | Phase 4 | Pending |
| STUD-02 | Phase 4 | Pending |
| STUD-03 | Phase 4 | Pending |
| STUD-04 | Phase 4 | Pending |
| STUD-05 | Phase 4 | Pending |
| STUD-06 | Phase 4 | Pending |
| STUD-07 | Phase 4 | Pending |
| STUD-08 | Phase 4 | Pending |
| CARD-01 | Phase 4 | Pending |
| CARD-02 | Phase 4 | Pending |
| CARD-03 | Phase 4 | Pending |
| CARD-04 | Phase 4 | Pending |
| CARD-05 | Phase 4 | Pending |
| DIST-01 | Phase 5 | Pending |
| DIST-02 | Phase 5 | Pending |
| DIST-03 | Phase 5 | Pending |
| DIST-04 | Phase 5 | Pending |
| CLEAN-01 | Phase 5 | Pending |
| CLEAN-02 | Phase 5 | Pending |
| CLEAN-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-02-07 after Phase 3 completion*
