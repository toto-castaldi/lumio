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

### 1.11 FIX VERSIONING SYSTEM ✅

- [x] Reset sistema di versionamento a v0.1.0
- [x] Fix configurazione Husky v9 (hooks in `.husky/`)
- [x] Migrato da standard-version a **release-please** (Google)
- [x] Configurato workflow `.github/workflows/release-please.yml`
- [x] Aggiunto marker `x-release-please-version` in `version.ts`
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

## 5 - STUDIO AVANZATO (Evoluzione)

### Obiettivi

- Permettere cambio dinamico di provider/modello/prompt durante la sessione di studio
- Aggiornare i modelli AI (solo i piu recenti, rimuovere i vecchi)
- Persistere le preferenze utente (ultimo modello/provider scelto) su DATABASE
- Implementare chat contestuale con validazione a due step per ogni carta
- Aggiungere popup per visualizzare la card completa durante lo studio

### 5.1 Backend - Nuovi Modelli AI

- [ ] 5.1.1 Aggiornare `AVAILABLE_MODELS` in llm-proxy con nuovi modelli:
  - Anthropic: `claude-haiku-4-5`, `claude-sonnet-4-5`, `claude-opus-4-5`
  - OpenAI: `gpt-5.1`, `gpt-5.2`
- [ ] 5.1.2 Rimuovere modelli obsoleti (`gpt-4o-mini`, `gpt-4o`, `claude-3-5-haiku`, `claude-3-5-sonnet`, `claude-3-opus`)

### 5.2 Backend - Nuova Action validate_answer

- [ ] 5.2.1 Aggiungere action `validate_answer` in llm-proxy
- [ ] 5.2.2 Implementare prompt di validazione (italiano, spiegazione corposa)
- [ ] 5.2.3 Input: cardContent, question, userAnswer, correctAnswer, provider, model
- [ ] 5.2.4 Output: isCorrect, explanation (dettagliata), tips (suggerimenti opzionali)

### 5.3 Database - Preferenze Studio Utente

- [ ] 5.3.1 Creare migrazione per tabella `user_study_preferences`
- [ ] 5.3.2 Colonne: user_id, preferred_provider, preferred_model, created_at, updated_at
- [ ] 5.3.3 RLS policy per accesso solo ai propri dati
- [ ] 5.3.4 Aggiornare `@lumio/core` con funzioni CRUD per preferenze

### 5.4 Frontend - UI Studio Refactoring

- [ ] 5.4.1 Refactoring `StudyPage.tsx` con controlli sempre visibili in alto
- [ ] 5.4.2 Creare `StudyControls.tsx` (provider/modello/prompt collapsabile)
- [ ] 5.4.3 Cambio dinamico provider/modello durante sessione (senza reload)
- [ ] 5.4.4 Caricare preferenze salvate da DB all'avvio sessione
- [ ] 5.4.5 Salvare preferenze su DB quando l'utente cambia selezione

### 5.5 Frontend - Chat Contestuale con Due Step

- [ ] 5.5.1 Modificare flusso quiz: Step 1 genera domanda, Step 2 valida risposta
- [ ] 5.5.2 Chat in memoria (stato React, si perde al reload pagina)
- [ ] 5.5.3 Mostrare spiegazione corposa dopo validazione (Step 2)
- [ ] 5.5.4 UI chat-like per mostrare domanda/risposta/spiegazione

### 5.6 Frontend - Popup Card Completa

- [ ] 5.6.1 Creare `CardPreviewDialog.tsx` (dialog modale)
- [ ] 5.6.2 Bottone "Vedi carta" sempre visibile durante lo studio
- [ ] 5.6.3 Render markdown completo della carta nel dialog
- [ ] 5.6.4 Scroll se contenuto lungo, chiudibile con ESC o click fuori

### 5.7 Core/Shared Updates

- [ ] 5.7.1 Aggiornare tipi in `@lumio/shared` (ValidateAnswerRequest, ValidateAnswerResponse)
- [ ] 5.7.2 Aggiornare tipo `LLMModel` con nuovi modelli
- [ ] 5.7.3 Aggiungere funzione `validateAnswer()` in `@lumio/core`
- [ ] 5.7.4 Aggiungere funzioni per user_study_preferences in `@lumio/core`

### Criteri di Successo Fase 5

- L'utente puo cambiare provider/modello durante la sessione senza ricaricare
- Le preferenze (ultimo provider/modello) sono persistite su DB
- Ogni carta ha validazione a due step: domanda + validazione con spiegazione
- L'utente puo sempre vedere la carta completa tramite popup
- I controlli sono sempre visibili e accessibili durante lo studio
- Solo i nuovi modelli AI sono disponibili (Haiku 4.5, Sonnet 4.5, Opus 4.5, GPT-5.1, GPT-5.2)

### Note Fase 5

- **Chat in memoria**: Il contesto chat si perde ricaricando la pagina (design intenzionale per semplicita)
- **Validazione sempre eseguita**: Step 2 viene SEMPRE chiamato dopo la risposta utente
- **Prompt italiano**: La validazione usa un prompt in italiano per spiegazioni piu naturali
- **Costi API**: Due chiamate AI per carta (domanda + validazione) invece di una

---

## 6 - NUOVO FLUSSO ONBOARDING WEB

### Obiettivi Fase 6

- Permettere accesso immediato alla dashboard dopo login (senza blocco API keys)
- Creare sezione Impostazioni dedicata per API keys e logout
- Migliorare UX del bottone "Studia" con messaggi esplicativi sui requisiti mancanti

### 6.1 Modificare AuthState e AuthContext

- [x] 6.1.1 Aggiornare tipo `AuthState` in `packages/shared/src/types/index.ts`
  - Rimuovere stato `needs_api_key` come stato bloccante
  - Dopo login, stato passa direttamente a `ready`
- [x] 6.1.2 Aggiornare `apps/web/src/contexts/AuthContext.tsx`
  - Rimuovere logica che imposta `needs_api_key`
  - Mantenere `hasApiKey` come flag informativo (non bloccante)

### 6.2 Creare pagina Impostazioni

- [x] 6.2.1 Creare `apps/web/src/pages/SettingsPage.tsx`
  - Header con titolo "Impostazioni"
  - Sezione "API Keys" con configurazione provider (OpenAI/Anthropic)
  - Sezione "Account" con bottone logout
  - Link per tornare alla dashboard

### 6.3 Refactor configurazione API Keys

- [x] 6.3.1 Estrarre logica form da `SetupApiKeysPage.tsx` in componente riutilizzabile
- [x] 6.3.2 Creare componente `ApiKeySettings.tsx` per visualizzare/gestire chiavi esistenti
- [x] 6.3.3 Integrare componente in SettingsPage
- [x] 6.3.4 Rimuovere `apps/web/src/pages/setup/SetupApiKeysPage.tsx`

### 6.4 Modificare DashboardPage

- [x] 6.4.1 Rimuovere bottone logout dall'header
- [x] 6.4.2 Aggiungere icona "Impostazioni" (ingranaggio) nell'header con link a `/settings`
- [x] 6.4.3 Migliorare messaggi bottone "Studia" in base ai requisiti mancanti:
  - Nessuna API key configurata: "Configura le API Keys per studiare" (con link a /settings)
  - Nessuna carta: "Aggiungi un repository per iniziare"
  - Entrambi mancanti: mostrare prima il messaggio API keys (priorita)
  - Bottone sempre disabled se manca almeno uno dei requisiti

### 6.5 Aggiornare routing

- [x] 6.5.1 Aggiungere route `/settings` con ProtectedRoute (richiede solo login)
- [x] 6.5.2 Rimuovere route `/setup/api-keys` completamente
- [x] 6.5.3 Modificare `ProtectedRoute`: rimuovere redirect a `/setup/api-keys`
- [x] 6.5.4 Modificare `HomeRoute`: dopo login vai direttamente a dashboard
- [x] 6.5.5 Modificare `GuestRoute`: non considerare piu `needs_api_key`

### Criteri di Successo Fase 6

- L'utente accede alla dashboard subito dopo il login (nessun blocco)
- La sezione Impostazioni e accessibile dalla dashboard tramite icona nell'header
- La configurazione API keys funziona dalla pagina Impostazioni
- Il logout funziona dalla sezione Impostazioni
- Il bottone "Studia" e disabilitato con messaggio chiaro se mancano requisiti
- Il messaggio indica prima API keys (priorita), poi repository
- Il flusso mobile (PWA) rimane completamente invariato

### Note Fase 6

- **Solo Web**: Questo cambio riguarda esclusivamente l'app web, la PWA mobile mantiene il flusso attuale
- **Backward compatibility**: Gli utenti gia configurati non noteranno differenze nel funzionamento
- **StudyPage**: Ha gia fallback per gestire assenza API keys (mostra messaggio configurazione)

### File coinvolti

| File | Azione |
| ------ | -------- |
| `packages/shared/src/types/index.ts` | MODIFICA - Rimuovere `needs_api_key` da AuthState |
| `apps/web/src/contexts/AuthContext.tsx` | MODIFICA - Semplificare logica stato |
| `apps/web/src/router.tsx` | MODIFICA - Aggiungere /settings, rimuovere /setup/api-keys |
| `apps/web/src/pages/DashboardPage.tsx` | MODIFICA - Header e messaggi bottone Studia |
| `apps/web/src/pages/SettingsPage.tsx` | NUOVO - Pagina impostazioni |
| `apps/web/src/components/ApiKeySettings.tsx` | NUOVO - Componente gestione API keys |
| `apps/web/src/pages/setup/SetupApiKeysPage.tsx` | RIMUOVERE |

---

## BACKLOG - Miglioramenti Futuri

- [ ] Proteggere le edge functions con JWT
- [ ] Ogni carta deve spiegare le sue fonti
- [ ] Web Push Notifications per PWA
- [ ] Offline mode con Service Worker + IndexedDB
- [ ] lumio.toto-castaldi.com diventa sito ufficiale, invece web va su w-lumio.toto-castaldi.com
- [ ] le card come PDF !!!! Quando vengono importate vengono trasformate, vengono passate a AI come file e quando si aprono si vedono bene (compreso immagini)
- [ ] le notifiche solo su PWA (no mail). Aggiorna documenti
- [ ] termini di servizio

## BUG

- [x] le carte dei repo non vengono ricaricate → **FIX: configurare job n8n per chiamare `POST /functions/v1/git-sync` con `{"action": "check_updates"}`**
- [x] NON FUNZIONA IL VERSIONING → **FIX: migrato da standard-version a release-please (Google)**
