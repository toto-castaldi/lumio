# Lumio Native

## What This Is

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'AI per trasformare concetti in sessioni di apprendimento interattive. Questa milestone segna il passaggio da due app web (React PWA) a una singola app nativa Android (React Native), con un sito informativo per il download dell'APK.

## Core Value

Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.

## Requirements

### Validated

Funzionalità esistenti nel backend che rimangono invariate:

- ✓ Autenticazione Google OAuth via Supabase — existing
- ✓ Gestione repository (aggiunta/rimozione) via Docora webhook — existing
- ✓ Sync automatico card da repository GitHub (pubblici e privati) — existing
- ✓ Pre-generazione domande in batch con sistema voti — existing
- ✓ Storage immagini in Supabase con signed URLs — existing
- ✓ API keys AI centralizzate a livello piattaforma — existing
- ✓ Filtro .lumioignore applicato nel backend — existing

### Active

Nuove funzionalità da implementare:

- [ ] App nativa Android con React Native
- [ ] Login Google OAuth nativo
- [ ] Dashboard con statistiche (repos, cards)
- [ ] Gestione repository (aggiungi/rimuovi)
- [ ] Studio con quiz pre-generati e sistema voti
- [ ] Preview card con markdown, syntax highlighting, LaTeX, immagini
- [ ] Landing page statica su lumio.toto-castaldi.com
- [ ] Download APK dalla landing page
- [ ] Rimozione apps/web e apps/mobile (PWA)
- [ ] Unificazione codebase (rimozione packages/core e packages/shared)

### Out of Scope

- iOS — rimandato a milestone futura
- Distribuzione su Google Play Store — per ora solo APK diretto
- Offline mode — richiede connessione per studio
- Notifiche push — da valutare in futuro

## Context

**Stato attuale:**
- Monorepo pnpm con apps/web, apps/mobile (PWA), packages/core, packages/shared
- Backend Supabase completo e funzionante (auth, DB, storage, edge functions)
- 13 milestone completate, versione v1.0.1
- Unico utente attivo (developer), nessuna migrazione utenti necessaria

**Motivazione del cambio:**
- PWA ha limitazioni su mobile (OAuth flow, performance, UX)
- Una sola app semplifica manutenzione
- React Native permette riuso parziale competenze React
- Preparazione per futuro rilascio iOS

**Stack backend (invariato):**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Docora per sync repository via webhook
- OpenAI/Anthropic per generazione quiz (API keys centrali)

## Constraints

- **Platform**: Solo Android per questa milestone
- **Distribution**: APK diretto, no app store
- **Tech stack**: React Native (da ricercare: Expo vs bare)
- **Backend**: Nessuna modifica alle Edge Functions o schema DB
- **Timeline**: MVP, iterazione rapida

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native over Flutter | Riuso competenze React, ecosistema familiare | — Pending |
| Android-first | Dispositivo principale dello sviluppatore | — Pending |
| APK diretto vs Play Store | Velocità rilascio, nessuna review | — Pending |
| Unificare codebase | Semplificazione, meno overhead packages | — Pending |

---
*Last updated: 2026-01-29 after initialization*
