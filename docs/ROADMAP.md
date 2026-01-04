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

- [x] 5.1.1 Aggiornare `AVAILABLE_MODELS` in llm-proxy con nuovi modelli:
  - Anthropic: `claude-haiku-4-5`, `claude-sonnet-4-5`, `claude-opus-4-5`
  - OpenAI: `gpt-5.1`, `gpt-5.2`
- [x] 5.1.2 Rimuovere modelli obsoleti (`gpt-4o-mini`, `gpt-4o`, `claude-3-5-haiku`, `claude-3-5-sonnet`, `claude-3-opus`)

### 5.2 Backend - Nuova Action validate_answer

- [x] 5.2.1 Aggiungere action `validate_answer` in llm-proxy
- [x] 5.2.2 Implementare prompt di validazione (italiano, spiegazione corposa)
- [x] 5.2.3 Input: cardContent, question, userAnswer, correctAnswer, provider, model
- [x] 5.2.4 Output: isCorrect, explanation (dettagliata), tips (suggerimenti opzionali)

### 5.3 Database - Preferenze Studio Utente

- [x] 5.3.1 Creare migrazione per tabella `user_study_preferences`
- [x] 5.3.2 Colonne: user_id, preferred_provider, preferred_model, created_at, updated_at
- [x] 5.3.3 RLS policy per accesso solo ai propri dati
- [x] 5.3.4 Aggiornare `@lumio/core` con funzioni CRUD per preferenze

### 5.4 Frontend - UI Studio Refactoring

- [x] 5.4.1 Refactoring `StudyPage.tsx` con controlli sempre visibili in alto
- [x] 5.4.2 Creare `StudyControls.tsx` (provider/modello/prompt collapsabile)
- [x] 5.4.3 Cambio dinamico provider/modello durante sessione (senza reload)
- [x] 5.4.4 Caricare preferenze salvate da DB all'avvio sessione
- [x] 5.4.5 Salvare preferenze su DB quando l'utente cambia selezione

### 5.5 Frontend - Chat Contestuale con Due Step

- [x] 5.5.1 Modificare flusso quiz: Step 1 genera domanda, Step 2 valida risposta
- [x] 5.5.2 Chat in memoria (stato React, si perde al reload pagina)
- [x] 5.5.3 Mostrare spiegazione corposa dopo validazione (Step 2)
- [x] 5.5.4 UI chat-like per mostrare domanda/risposta/spiegazione

### 5.6 Frontend - Popup Card Completa

- [x] 5.6.1 Creare `CardPreviewDialog.tsx` (dialog modale)
- [x] 5.6.2 Bottone "Vedi carta" sempre visibile durante lo studio
- [x] 5.6.3 Render markdown completo della carta nel dialog
- [x] 5.6.4 Scroll se contenuto lungo, chiudibile con ESC o click fuori

### 5.7 Core/Shared Updates

- [x] 5.7.1 Aggiornare tipi in `@lumio/shared` (ValidateAnswerRequest, ValidateAnswerResponse)
- [x] 5.7.2 Aggiornare tipo `LLMModel` con nuovi modelli
- [x] 5.7.3 Aggiungere funzione `validateAnswer()` in `@lumio/core`
- [x] 5.7.4 Aggiungere funzioni per user_study_preferences in `@lumio/core`

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

## 7 - STUDIARE DA MOBILE

### Obiettivi Fase 7

- Permettere agli utenti di studiare dalla PWA mobile con interfaccia semplificata
- Login → Dashboard diretta (nessun blocco per API keys)
- Dashboard mostra repository count e card count
- Bottone "Studia" abilitato se hasApiKey && cardCount > 0
- Se requisiti mancanti: messaggio che invita ad andare su web
- Pagina studio con stesse funzioni della versione web
- UX/UI armonizzata con design distintivo mobile

### 7.1 Dipendenze Mobile

- [x] Aggiungere dipendenze Radix UI (collapsible, dialog, scroll-area, select)
- [x] Aggiungere react-markdown e sonner

### 7.2 Componenti UI Mobile

- [x] Creare `apps/mobile/src/components/ui/collapsible.tsx`
- [x] Creare `apps/mobile/src/components/ui/select.tsx` (touch-optimized)
- [x] Creare `apps/mobile/src/components/ui/dialog.tsx` (full-screen mobile)
- [x] Creare `apps/mobile/src/components/ui/scroll-area.tsx`
- [x] Creare `apps/mobile/src/components/ui/sonner.tsx`
- [x] Creare `apps/mobile/src/components/ui/textarea.tsx`

### 7.3 CardPreviewDialog Mobile

- [x] Creare `apps/mobile/src/components/CardPreviewDialog.tsx`
- [x] Dialog full-screen (stile sheet)
- [x] ScrollArea per contenuto lungo
- [x] Render markdown con react-markdown

### 7.4 StudyPage Mobile

- [x] Creare `apps/mobile/src/pages/StudyPage.tsx` con design distintivo (frontend-design)
- [x] Layout verticale ottimizzato per mobile
- [x] Touch targets grandi (min 44px)
- [x] Animazioni fluide per feedback
- [x] Selezione provider/model
- [x] Customizzazione prompt (sezione collapsible)
- [x] Flusso a due step (generateQuiz → validateAnswer)

### 7.5 Dashboard Mobile

- [x] Rimuovere blocco NeedsApiKeyMessage che impedisce l'accesso
- [x] Aggiungere bottone "Studia" prominente
- [x] ENABLED se hasApiKey && cardCount > 0 → naviga a /study
- [x] DISABLED se no API key → messaggio "Apri Lumio Web" + link esterno
- [x] DISABLED se no cards → messaggio "Aggiungi un repository"

### 7.6 Router e App

- [x] Aggiungere route `/study` con ProtectedRoute
- [x] Aggiungere Toaster (sonner) in App.tsx

### 7.7 Fix e Armonizzazione

- [x] Fix link NeedsApiKeyMessage (da /setup/api-keys a /settings web)
- [x] Armonizzare UX/UI LoginPage
- [x] Armonizzare UX/UI RepositoriesPage
- [x] Armonizzare UX/UI AuthCallbackPage
- [x] Armonizzare NeedsApiKeyMessage

### Criteri di Successo Fase 7

- L'utente accede alla dashboard senza blocchi
- Il bottone "Studia" è abilitato solo se ha API key + carte
- La pagina studio funziona con flusso a due step (generate + validate)
- L'utente può vedere la carta completa durante lo studio
- L'utente può customizzare il prompt anche da mobile
- Le preferenze provider/model/prompt sono salvate
- L'interfaccia usa design distintivo mobile con touch targets ≥ 44px
- Tutti i documenti sono aggiornati (ROADMAP, USER-FLOWS, TECHNICAL-ARCHITECTURE)

### Note Fase 7

- **No Settings su mobile**: La configurazione API keys rimane solo su Web
- **Link esterni**: I link alle impostazioni aprono la versione Web in nuova tab
- **Chat in memoria**: Come su web, il contesto chat si perde ricaricando la pagina

---

## 8 - VISUALIZZAZIONE CARD MIGLIORATA

### Obiettivi Fase 8

- Migliorare la visualizzazione delle card durante lo studio (web e mobile)
- Supportare syntax highlighting per blocchi di codice
- Supportare formule matematiche LaTeX con KaTeX
- Migliorare rendering tabelle con styling appropriato
- Supportare immagini dai repository Git
- Styling "Notion-like" pulito e professionale

### 8.1 Core Package - Configurazione Markdown Condivisa

- [x] 8.1.1 Creare `packages/core/src/markdown/index.ts`
- [x] 8.1.2 Creare `packages/core/src/markdown/config.ts` con configurazione plugin:
  - `remark-gfm` per GitHub Flavored Markdown (tabelle, task lists, strikethrough)
  - `remark-math` per parsing formule LaTeX
  - `rehype-katex` per rendering formule
  - `rehype-highlight` per syntax highlighting codice
- [x] 8.1.3 Creare `packages/core/src/markdown/utils.ts` con helper per URL immagini GitHub
- [x] 8.1.4 Esportare configurazione da `@lumio/core`
- [x] 8.1.5 Aggiungere dipendenze a `packages/core/package.json`:
  - `remark-gfm`
  - `remark-math`
  - `rehype-katex`
  - `rehype-highlight`

> **Nota**: I componenti React (CodeBlock, MarkdownImage, MarkdownRenderer) sono in web/mobile, non in core (per evitare React come dipendenza di core)

### 8.2 Web App - MarkdownRenderer Component

- [x] 8.2.1 Creare `apps/web/src/components/markdown/MarkdownRenderer.tsx`
- [x] 8.2.2 Usare configurazione condivisa da `@lumio/core`
- [x] 8.2.3 Importare CSS KaTeX e highlight.js theme in globals.css
- [x] 8.2.4 Aggiornare `CardPreviewDialog.tsx` per usare nuovo MarkdownRenderer
- [x] 8.2.5 Aggiungere @tailwindcss/typography plugin

### 8.3 Mobile App - MarkdownRenderer Component

- [x] 8.3.1 Creare `apps/mobile/src/components/markdown/MarkdownRenderer.tsx`
- [x] 8.3.2 Usare stessa configurazione condivisa da `@lumio/core`
- [x] 8.3.3 Importare CSS KaTeX e highlight.js theme in globals.css
- [x] 8.3.4 Aggiornare `CardPreviewDialog.tsx` mobile per usare nuovo MarkdownRenderer
- [x] 8.3.5 Aggiungere @tailwindcss/typography plugin e darkMode config

### 8.4 Styling "Notion-like"

- [x] 8.4.1 Styling Tailwind inline nei componenti React:
  - Code blocks con sfondo, bordi arrotondati, header linguaggio
  - Tabelle con bordi, header evidenziato, righe alternate, hover
  - Immagini con bordi arrotondati, lazy loading, placeholder
- [x] 8.4.2 Configurare Tailwind prose con @tailwindcss/typography
- [x] 8.4.3 Supporto dark mode per tutti gli elementi (web completo, mobile predisposto)

### 8.5 CodeBlock Component

- [x] 8.5.1 Header con nome linguaggio (es. "typescript", "python")
- [x] 8.5.2 Bottone "Copia" con feedback visivo (icona + testo)
- [x] 8.5.3 Syntax highlighting con tema GitHub (light/dark)
- [x] 8.5.4 Scroll orizzontale per codice lungo

### 8.6 Supporto Immagini

- [x] 8.6.1 Implementare lazy loading per immagini
- [x] 8.6.2 Placeholder animato durante caricamento
- [x] 8.6.3 Fallback per immagini non trovate (icona + messaggio)
- [x] 8.6.4 Gestione URL relativi (conversione a GitHub raw URLs per repo pubblici)
- [ ] 8.6.5 Click per zoom/lightbox (opzionale - non implementato)

### 8.7 Testing e Documentazione

- [x] 8.7.1 Creare card di test con tutti gli elementi (codice, tabelle, formule, immagini)
- [x] 8.7.2 Testare su web e mobile
- [x] 8.7.3 Verificare performance rendering
- [x] 8.7.4 CARD-FORMAT-SPEC.md già contiene esempi formule (aggiornato in precedenza)

### Criteri di Successo Fase 8

- Le card mostrano syntax highlighting per tutti i linguaggi comuni
- Le formule LaTeX sono renderizzate correttamente (inline e block)
- Le tabelle hanno styling pulito con bordi e righe alternate
- I blocchi di codice hanno header con linguaggio e bottone copia funzionante
- Le immagini dai repository vengono caricate e mostrate
- Lo styling è consistente tra web e mobile
- La configurazione markdown è centralizzata in `@lumio/core` (DRY)
- Il rendering è performante anche con card lunghe

### Note Fase 8

- **Architettura DRY**: La configurazione markdown è in `@lumio/core`, web e mobile la importano
- **Bundle size**: KaTeX e highlight.js aumentano il bundle, considerare lazy loading
- **Immagini repo privati**: Non supportate in questa fase (richiederebbe auth GitHub)
- **Formule**: Supporto LaTeX standard, non estensioni custom
- **Performance**: Per card molto lunghe, considerare virtualizzazione futura

### File coinvolti

| File | Azione |
|------|--------|
| `packages/core/package.json` | MODIFICA - Aggiunte dipendenze markdown |
| `packages/core/src/markdown/index.ts` | NUOVO - Entry point |
| `packages/core/src/markdown/config.ts` | NUOVO - Configurazione plugin |
| `packages/core/src/markdown/utils.ts` | NUOVO - Helper URL immagini |
| `packages/core/src/index.ts` | MODIFICA - Esporta markdown |
| `apps/web/package.json` | MODIFICA - katex, highlight.js, typography |
| `apps/web/tailwind.config.ts` | MODIFICA - Plugin typography |
| `apps/web/src/styles/globals.css` | MODIFICA - Import CSS |
| `apps/web/src/components/markdown/` | NUOVO - CodeBlock, MarkdownImage, MarkdownRenderer |
| `apps/web/src/components/CardPreviewDialog.tsx` | MODIFICA - Usa MarkdownRenderer |
| `apps/mobile/package.json` | MODIFICA - katex, highlight.js, typography |
| `apps/mobile/tailwind.config.ts` | MODIFICA - Plugin typography, darkMode |
| `apps/mobile/src/styles/globals.css` | MODIFICA - Import CSS |
| `apps/mobile/src/components/markdown/` | NUOVO - CodeBlock, MarkdownImage, MarkdownRenderer |
| `apps/mobile/src/components/CardPreviewDialog.tsx` | MODIFICA - Usa MarkdownRenderer |

---

## 9 - REPOSITORY PRIVATI GITHUB ✅

### Obiettivi

- Permettere agli utenti di aggiungere repository GitHub privati
- Autenticazione tramite Personal Access Token (PAT) inserito manualmente dall'utente
- Crittografia sicura del PAT server-side (AES-256-GCM)
- Gestione token invalidi/scaduti con possibilità di aggiornamento
- Fase 9A: Solo card testuali (immagini rimandate a fase successiva)

### 9.1 Database - Migrazione ✅

- [x] 9.1.1 Creare migrazione `add_repository_token_status.sql`:
  - Aggiungere colonna `token_status` ENUM ('valid', 'invalid', 'not_required') DEFAULT 'not_required'
  - Aggiungere colonna `token_error_message` TEXT NULL
  - Aggiungere indice su `token_status` per query efficienti

### 9.2 Edge Function git-sync - Autenticazione GitHub ✅

- [x] 9.2.1 Aggiungere funzioni crittografia (copia da llm-proxy):
  - `encryptToken(plainToken: string): Promise<string>`
  - `decryptToken(encryptedToken: string): Promise<string>`
- [x] 9.2.2 Creare `fetchGitHubAuthenticated(path, token?)` che:
  - Usa header `Authorization: Bearer ${token}` se token presente
  - Fallback a chiamata pubblica se token assente
- [x] 9.2.3 Modificare `importRepository()`:
  - Accettare parametri `isPrivate` e `accessToken`
  - Se privato: validare token con chiamata a GitHub, criptare e salvare
  - Impostare `token_status = 'valid'` se autenticazione OK
- [x] 9.2.4 Modificare `syncRepository()` e `checkUpdates()`:
  - Decriptare token se presente
  - Usare `fetchGitHubAuthenticated()` per tutte le chiamate
  - Gestire errori 401/403: impostare `token_status = 'invalid'`
- [x] 9.2.5 Aggiungere action `update_token`:
  - Input: `repositoryId`, `accessToken`
  - Validare nuovo token con GitHub
  - Criptare e aggiornare `encrypted_access_token`
  - Reset `token_status = 'valid'`
- [x] 9.2.6 Aggiungere action `validate_token`:
  - Input: `url`, `accessToken`
  - Verificare accesso al repo con il token fornito
  - Ritornare `{ valid: boolean, repoName?: string, error?: string }`

### 9.3 Shared Types ✅

- [x] 9.3.1 Aggiungere tipo `TokenStatus = 'valid' | 'invalid' | 'not_required'`
- [x] 9.3.2 Aggiornare tipo `Repository` con nuovi campi

### 9.4 Core Package ✅

- [x] 9.4.1 Aggiornare `addRepository()` per accettare `isPrivate` e `accessToken`
- [x] 9.4.2 Aggiungere `updateRepositoryToken(repositoryId, accessToken)`
- [x] 9.4.3 Aggiungere `validateGitHubToken(url, accessToken)`

### 9.5 Frontend Web - Form Aggiungi Repository ✅

- [x] 9.5.1 Modificare `RepositoriesPage.tsx`:
  - Aggiungere switch/toggle "Repository privato"
  - Aggiungere campo "Personal Access Token" (visibile solo se privato)
  - Aggiungere link "Come creare un PAT" → docs GitHub
  - Validazione: se privato, token obbligatorio
- [x] 9.5.2 Aggiungere validazione token prima di submit:
  - Chiamare `validate_token` per verificare accesso
  - Mostrare errore se token non valido
- [x] 9.5.3 Aggiornare chiamata `addRepository` con nuovi parametri

### 9.6 Frontend Web - Lista Repository ✅

- [x] 9.6.1 Modificare visualizzazione repository:
  - Aggiungere icona lucchetto per repo privati
  - Mostrare badge "Token invalido" se `token_status = 'invalid'`
  - Mostrare `token_error_message` sotto il nome
- [x] 9.6.2 Creare dialog "Aggiorna Token":
  - Campo per nuovo PAT
  - Validazione prima di salvare
  - Chiamata a `update_token`
- [x] 9.6.3 Aggiungere bottone "Aggiorna token" per repo con token invalido

### 9.7 Frontend Mobile - Adattamenti ✅

- [x] 9.7.1 Aggiornare `RepositoriesPage.tsx` mobile:
  - Mostrare icona lucchetto per repo privati
  - Mostrare badge "Token invalido"
  - Link a versione web per gestione token (footer aggiornato)

### 9.8 Sicurezza ✅

- [x] 9.8.1 Verificare che `encrypted_access_token` non sia mai esposto al client (sanitizeRepository)
- [x] 9.8.2 Token accessibile solo via service role (Edge Function usa service role)
- [x] 9.8.3 Logging: token mai loggato in chiaro
- [x] 9.8.4 Scope minimo richiesto per PAT: `repo` (read access)

### 9.9 Testing e Documentazione ✅

- [x] 9.9.1 TypeScript compila senza errori
- [x] 9.9.2 USER-FLOWS.md già aggiornato con flusso repo privato
- [x] 9.9.3 TECHNICAL-ARCHITECTURE.md già aggiornato
- [x] 9.9.4 DATA-MODEL.md già aggiornato con nuove colonne

### Criteri di Successo Fase 9

- L'utente può aggiungere un repository GitHub privato inserendo un PAT
- Il PAT viene criptato e salvato in modo sicuro
- Il sync funziona correttamente per repo privati (card testuali)
- Se il token scade/viene revocato, il repo viene marcato come "token invalido"
- L'utente può aggiornare il token per un repo esistente
- Le immagini nei repo privati vengono ignorate (placeholder o nascoste)
- La lista repository mostra chiaramente quali sono privati

### Note Fase 9

- **Immagini**: Le immagini nei repo privati NON sono supportate in questa fase
  - Il componente `MarkdownImage` deve gestire gracefully il fallimento per repo privati
  - Considerare di nascondere le immagini o mostrare placeholder "Immagine non disponibile"
- **Scope PAT**: Richiedere solo `repo` scope (accesso lettura a repo privati)
- **Rate limiting**: GitHub ha limiti più alti per chiamate autenticate (5000/ora vs 60/ora)
- **Crittografia**: Usare stessa `ENCRYPTION_KEY` delle API keys LLM

### File coinvolti

| File | Azione |
|------|--------|
| `supabase/migrations/XXX_add_token_status.sql` | NUOVO |
| `supabase/functions/git-sync/index.ts` | MODIFICA - Auth GitHub |
| `packages/shared/src/types/index.ts` | MODIFICA - TokenStatus |
| `packages/core/src/supabase/repositories.ts` | MODIFICA - Nuove funzioni |
| `apps/web/src/pages/RepositoriesPage.tsx` | MODIFICA - UI repo privati |
| `apps/web/src/components/AddRepositoryForm.tsx` | MODIFICA - Toggle privato + PAT |
| `apps/web/src/components/UpdateTokenDialog.tsx` | NUOVO |
| `apps/mobile/src/pages/RepositoriesPage.tsx` | MODIFICA - Icona privato |
| `docs/USER-FLOWS.md` | MODIFICA |
| `docs/TECHNICAL-ARCHITECTURE.md` | MODIFICA |

---

## 9B - IMMAGINI UNIFICATE (PUBBLICI E PRIVATI) ✅

> **Prerequisito**: Fase 9A completata

### Obiettivi Fase 9B ✅

- Unificare gestione immagini per repository pubblici e privati
- Scaricare tutte le immagini durante il sync (non solo privati)
- Salvare immagini in Supabase Storage con accesso RLS
- Servire immagini tramite URL firmati

### Implementazione Completata ✅

**Soluzione: Download in Supabase Storage**

1. Durante il sync, identificare tutte le immagini referenziate nelle card (regex markdown)
2. Scaricare le immagini usando PAT per privati o raw.githubusercontent.com per pubblici
3. Calcolare hash SHA-256 del contenuto per deduplicazione
4. Salvare in Supabase Storage bucket `card-assets/{user_id}/{repo_id}/{hash}.{ext}`
5. Salvare mapping in tabella `card_assets` (card_id, original_path, storage_path, content_hash, mime_type)
6. Frontend: fetch assets, generare signed URLs, sostituire path nel markdown

### 9B.1 Database - Migrazione ✅

- [x] Creare tabella `card_assets` con:
  - `id`, `card_id` (FK con CASCADE DELETE), `original_path`, `storage_path`
  - `content_hash` (SHA-256 per deduplicazione), `mime_type`, `size_bytes`
  - Indici su `card_id`, `content_hash`, `storage_path`
- [x] RLS policies per `card_assets` (utenti vedono solo propri assets)
- [x] Creare bucket Storage `card-assets` (privato, 10MB max, solo immagini)
- [x] RLS policies per Storage (accesso solo a propria cartella user_id/)

### 9B.2 Edge Function git-sync ✅

- [x] Aggiungere funzioni per gestione immagini:
  - `resolveRelativePath()`: risolve path relativi (`../assets/`) rispetto alla card
  - `extractImageReferences()`: estrae path immagini dal markdown (originale + risolto)
  - `downloadImage()`: scarica da GitHub (con o senza PAT)
  - `hashImageContent()`: calcola SHA-256
  - `uploadImageToStorage()`: upload con deduplicazione
  - `processCardImages()`: processa tutte le immagini di una card
- [x] Modificare `importRepository()` per processare immagini dopo insert cards
- [x] Modificare `syncRepository()` per processare immagini dopo insert cards
- [x] Modificare `checkUpdates()` per processare immagini dopo insert cards
- [x] Supporto path relativi: `/assets/`, `../assets/`, `./`, path semplici

### 9B.3 Shared Types ✅

- [x] Aggiungere tipo `CardAsset` in `@lumio/shared`

### 9B.4 Core Package ✅

- [x] Creare `packages/core/src/supabase/assets.ts` con:
  - `getCardAssets()`: fetch assets di una card
  - `getCardAssetsBatch()`: fetch assets di più cards (batch)
  - `getAssetSignedUrl()`: genera signed URL per un asset
  - `getAssetSignedUrls()`: genera signed URLs (batch)
  - `transformCardContentImages()`: sostituisce path nel markdown con signed URLs

### 9B.5 Frontend Web ✅

- [x] Aggiornare `CardPreviewDialog.tsx`:
  - Fetch assets quando dialog si apre
  - Trasformare contenuto con signed URLs
  - Mostrare loading spinner durante fetch
  - Fallback a contenuto originale su errore
- [x] Rimuovere logica `repoUrl` (non più necessaria)

### 9B.6 Frontend Mobile ✅

- [x] Aggiornare `CardPreviewDialog.tsx` mobile (stessa logica del web)
- [x] Rimuovere logica `repoUrl` (non più necessaria)

### Criteri di Successo Fase 9B ✅

- Le immagini funzionano sia per repo pubblici che privati
- Le immagini sono deduplicate tramite content hash
- Gli asset vengono eliminati automaticamente (CASCADE) quando le card vengono eliminate
- I signed URLs hanno validità di 1 ora
- Il fallback funziona se gli assets non sono disponibili

### Note Fase 9B

- **Unificazione**: Stesso comportamento per repo pubblici e privati (più semplice da mantenere)
- **Deduplicazione**: Immagini identiche in card diverse usano lo stesso file
- **Cascade delete**: Gli asset vengono eliminati automaticamente con la card
- **Signed URLs**: Validità 1 ora, rigenerati ad ogni apertura della card
- **Formati supportati**: PNG, JPG, JPEG, GIF, SVG, WebP

### File coinvolti

| File | Azione |
|------|--------|
| `supabase/migrations/20260103000002_add_card_assets.sql` | NUOVO |
| `supabase/functions/git-sync/index.ts` | MODIFICA - Image processing |
| `packages/shared/src/types/index.ts` | MODIFICA - CardAsset type |
| `packages/core/src/supabase/assets.ts` | NUOVO |
| `packages/core/src/index.ts` | MODIFICA - Export assets |
| `apps/web/src/components/CardPreviewDialog.tsx` | MODIFICA - Use signed URLs |
| `apps/web/src/pages/StudyPage.tsx` | MODIFICA - Remove repoUrl |
| `apps/web/src/pages/CardsPage.tsx` | MODIFICA - Remove repoUrl |
| `apps/mobile/src/components/CardPreviewDialog.tsx` | MODIFICA - Use signed URLs |
| `apps/mobile/src/pages/StudyPage.tsx` | MODIFICA - Remove repoUrl |

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
- [x] Logo Lumio (lampadina stilizzata con raggi)
  - File sorgente: `lumio.svg` nella root del progetto
  - Favicon e logo per web: `apps/web/public/favicon.svg`, `apps/web/public/logo.svg`
  - Favicon e logo per mobile: `apps/mobile/public/favicon.svg`, `apps/mobile/public/logo.svg`
  - Icone PWA: `apps/mobile/public/icon-192.png`, `apps/mobile/public/icon-512.png`
  - Integrato in: LoginPage, DashboardPage (header) per web e mobile
- [ ] Il warning sulla dimensione del chunk (785 KB) è normale per un'app React con tutte le dipendenze - può essere ottimizzato in futuro con code-splitting ma non è bloccante.
- [ ] multilinga ?
- [ ] monitoraggio utente aggiornamento DECK
- [ ] monitoraggio di sistema aggiornamento DECK
- [ ] Lumio è anche gateway per altre app che vogliono usare le card senza implementarsi il fetch manualmente. 

## BUG

- [ ] errore durante la navigazione PWA da Chrome (solo su dev ????): Code exchange error: AuthPKCECodeVerifierMissingError: PKCE code verifier
- [x] le carte dei repo non vengono ricaricate → **FIX: configurare job n8n per chiamare `POST /functions/v1/git-sync` con `{"action": "check_updates"}`**
- [x] NON FUNZIONA IL VERSIONING → **FIX: migrato da standard-version a release-please (Google)**
