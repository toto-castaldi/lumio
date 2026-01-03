# Lumio — User Flows

**Versione:** 1.0  
**Data:** 2025-12-28  
**Status:** Draft

---

## 1. Overview

Questo documento descrive i principali percorsi utente in Lumio. Ogni flow include stati, azioni, e condizioni per guidare lo sviluppo dell'interfaccia.

### Legenda

```
[Schermata]     → Pagina/view dell'app
(Azione)        → Azione dell'utente
{Condizione}    → Branch logico
<Sistema>       → Azione automatica del sistema
```

---

## 2. Onboarding (Primo Accesso) - Web

> **Nota Fase 6:** L'utente accede direttamente alla Dashboard dopo il login. La configurazione delle API keys avviene dalla sezione Impostazioni, accessibile dalla Dashboard.

### 2.1 Flow Diagram

```
┌─────────────────┐
│  Landing Page   │
│  [Web]          │
└────────┬────────┘
         │
         ▼
    (Login Google)
         │
         ▼
┌─────────────────┐
│  Supabase Auth  │
│  <crea utente>  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard]                                                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Header: [Logo]  [⚙️ Impostazioni]                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Benvenuto in Lumio!                                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Studia] (DISABLED)                                 │    │
│  │                                                      │    │
│  │  ⚠️ Configura le API Keys per studiare              │    │
│  │     [Vai alle Impostazioni →]                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Repository: 0  •  Card: 0                                   │
│                                                              │
│  [+ Aggiungi Repository]                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Click ⚙️ Impostazioni)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  [Impostazioni]                                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  API Keys                                            │    │
│  │                                                      │    │
│  │  "Per generare le domande, Lumio usa AI.             │    │
│  │   Configura le tue API keys."                        │    │
│  │                                                      │    │
│  │  Provider: [OpenAI ▼]                                │    │
│  │  API Key:  [••••••••••]                              │    │
│  │  [Test Connessione]  [Salva]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Account                                             │    │
│  │  [🚪 Logout]                                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [← Torna alla Dashboard]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Dopo aver configurato API keys e aggiunto repository)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] (configurata)                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Studia] (ENABLED)                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Repository: 2  •  Card: 45                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Step-by-Step

| Step | Schermata | Azione Utente | Sistema | Next |
|------|-----------|---------------|---------|------|
| 1 | Landing | Click "Accedi con Google" | Redirect OAuth | 2 |
| 2 | Google OAuth | Autorizza | Crea utente in DB | 3 |
| 3 | Dashboard | - | Mostra dashboard con bottone Studia disabilitato e messaggio | 4 |
| 4 | Dashboard | Click "Impostazioni" | Naviga a /settings | 5 |
| 5 | Impostazioni | Inserisce API key, click "Test" | Valida key con LLM provider | 6 |
| 6 | Impostazioni | Click "Salva" | Salva key (encrypted) | 7 |
| 7 | Dashboard | Click "Aggiungi Repository" | Naviga a form repository | 8 |
| 8 | Aggiungi Repository | Inserisce URL, click "Aggiungi" | Valida formato, avvia sync | 9 |
| 9 | Dashboard | - | Bottone Studia ora abilitato | - |

### 2.3 Messaggi bottone "Studia"

| Condizione | Stato Bottone | Messaggio |
|------------|---------------|-----------|
| Nessuna API key configurata | DISABLED | "Configura le API Keys per studiare" + link a /settings |
| API key OK, nessuna carta | DISABLED | "Aggiungi un repository per iniziare" |
| Entrambi mancanti | DISABLED | "Configura le API Keys per studiare" (priorita API) |
| Tutto configurato | ENABLED | - |

### 2.4 Validazioni

| Campo | Regola | Messaggio Errore |
|-------|--------|------------------|
| API Key OpenAI | Inizia con `sk-`, test call funziona | "Chiave non valida o scaduta" |
| API Key Anthropic | Inizia con `sk-ant-`, test call funziona | "Chiave non valida o scaduta" |
| URL Repository | URL Git valido, README con lumio_format_version | "Repository non compatibile con Lumio" |

---

## 2B. Onboarding Mobile (PWA)

> **Nota:** Il flusso mobile è semplificato rispetto al web. La configurazione delle API keys avviene esclusivamente su Web.

### 2B.1 Flow Diagram — Login Mobile

```
┌─────────────────────────────────┐
│  [Login Page - Mobile]          │
│  m-lumio.toto-castaldi.com      │
│                                 │
│  ┌─────────────────────────┐    │
│  │     🌟 Lumio            │    │
│  │                         │    │
│  │  [Accedi con Google]    │    │
│  │                         │    │
│  └─────────────────────────┘    │
└────────────────┬────────────────┘
                 │
          (Login Google)
                 │
                 ▼
┌─────────────────────────────────┐
│  Google OAuth                   │
│  <autorizza app>                │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  [Auth Callback]                │
│  /auth/callback?code=xxx        │
│                                 │
│  <exchange code per sessione>   │
│  <verifica API keys>            │
└────────────────┬────────────────┘
                 │
                 ▼
          {Ha API Keys?}
           │         │
          No        Sì
           │         │
           ▼         ▼
┌──────────────────┐  ┌─────────────────────────────────┐
│ [Dashboard]      │  │  [Dashboard]                    │
│                  │  │                                 │
│ ⚠️ Configura     │  │  Benvenuto, Mario!              │
│ API Keys         │  │                                 │
│                  │  │  Repository: 2                  │
│ Per utilizzare   │  │  Card totali: 45                │
│ Lumio, configura │  │                                 │
│ le API keys su   │  │  [Vedi Repository →]            │
│ Web.             │  │                                 │
│                  │  │  ────────────────────           │
│ [Apri Lumio Web] │  │                                 │
│ [Logout]         │  │  [Logout]                       │
└──────────────────┘  └─────────────────────────────────┘
```

### 2B.2 Step-by-Step Mobile

| Step | Schermata | Azione Utente | Sistema | Next |
|------|-----------|---------------|---------|------|
| 1 | Login | Click "Accedi con Google" | Redirect OAuth a `m-lumio.toto-castaldi.com/auth/callback` | 2 |
| 2 | Google OAuth | Autorizza | Redirect a callback | 3 |
| 3 | Auth Callback | - | Exchange code, crea sessione, verifica API keys | 4 |
| 4a | Dashboard | - (no API keys) | Mostra messaggio "Configura su Web" + logout | - |
| 4b | Dashboard | - (ha API keys) | Mostra dashboard con repository e logout | 5 |
| 5 | Dashboard | Click "Vedi Repository" | Naviga a lista repository | - |

### 2B.3 Componente NeedsApiKeyMessage

Quando l'utente non ha configurato le API keys:

```
┌─────────────────────────────────┐
│  ⚠️ Configurazione richiesta    │
│                                 │
│  Per utilizzare Lumio, devi     │
│  configurare le tue API keys    │
│  (OpenAI o Anthropic).          │
│                                 │
│  Questa operazione è            │
│  disponibile solo su Web.       │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🌐 Apri Lumio Web      │    │
│  └─────────────────────────┘    │
│                                 │
│  [Logout per cambiare account]  │
└─────────────────────────────────┘
```

**Comportamento:**
- "Apri Lumio Web" → apre `https://lumio.toto-castaldi.com/settings` in nuova tab
- "Logout" → chiama `signOut()` e torna a `/login`

### 2B.4 Logout Mobile

```
┌─────────────────────────────────┐
│  [Dashboard]                    │
│                                 │
│  👤 Mario Rossi                 │
│  mario@example.com              │
│                                 │
│  ...contenuto...                │
│                                 │
│  ────────────────────           │
│                                 │
│  [🚪 Logout]                    │
└────────────────┬────────────────┘
                 │
            (Click Logout)
                 │
                 ▼
          <signOut()>
          <clear session>
                 │
                 ▼
┌─────────────────────────────────┐
│  [Login Page]                   │
│                                 │
│  [Accedi con Google]            │
└─────────────────────────────────┘
```

---

## 3. Sessione di Studio (Fase 5 - Studio Avanzato)

> **Nota Fase 5**: Questa versione include controlli dinamici, validazione a due step e popup card.
> Include: cambio provider/modello durante sessione, validazione AI con spiegazione corposa, preview card.
> Persistenza: preferenze su DB, chat solo in memoria (si perde al reload).

### 3.1 Flow Diagram

```
┌─────────────────────────────────┐
│  [Dashboard]                    │
│                                 │
│  ┌─────────────────────────┐    │
│  │     [Studia]            │    │  <-- Bottone prominente
│  └─────────────────────────┘    │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────────┐   │
│  │Repo │ │Card │ │Obiettivo│   │
│  │  2  │ │ 45  │ │    -    │   │
│  └─────┘ └─────┘ └─────────┘   │
└────────────────┬────────────────┘
                 │
            (Click Studia)
                 │
                 ▼
          {Ha carte?}
           │       │
          No      Si
           │       │
           ▼       ▼
    [Toast error]  <Carica preferenze da DB>
    "Aggiungi     <Carica tutte le carte>
     repository"  <Seleziona carta random>
                  <Chiama AI per quiz (Step 1)>
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  [Studio - Sessione Attiva]                                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CONTROLLI (sempre visibili, collapsabile)                      │ │
│  │  Provider: [OpenAI ▼]  Modello: [gpt-5.1 ▼]  [Vedi carta]      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Carta 1 di 45                                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CHAT CONTESTUALE                                               │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ AI: Qual e il principio fondamentale della               │  │ │
│  │  │     respirazione nel Pilates?                            │  │ │
│  │  │                                                          │  │ │
│  │  │     [A] Respirazione addominale                          │  │ │
│  │  │     [B] Respirazione laterale                            │  │ │
│  │  │     [C] Respirazione toracica                            │  │ │
│  │  │     [D] Apnea controllata                                │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [Caricamento...] (se AI lenta)                                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                          (Seleziona risposta A/B/C/D)
                                   │
                                   ▼
                          <Chiama AI per validazione (Step 2)>
                          <SEMPRE eseguito dopo risposta>
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  [Studio - Sessione Attiva con Feedback]                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CONTROLLI (sempre visibili)                                    │ │
│  │  Provider: [OpenAI ▼]  Modello: [gpt-5.1 ▼]  [Vedi carta]      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CHAT CONTESTUALE (continua)                                    │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ AI: Qual e il principio fondamentale...                  │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ Tu: Ho risposto B - Respirazione laterale                │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ AI: Corretto!                                            │  │ │
│  │  │                                                          │  │ │
│  │  │ La respirazione laterale (o costale) e la tecnica        │  │ │
│  │  │ fondamentale nel Pilates. Questo tipo di respirazione    │  │ │
│  │  │ permette di:                                             │  │ │
│  │  │                                                          │  │ │
│  │  │ 1. Mantenere l'attivazione del core durante tutto        │  │ │
│  │  │    il movimento                                          │  │ │
│  │  │ 2. Espandere la gabbia toracica lateralmente             │  │ │
│  │  │ 3. Evitare la distensione addominale che                 │  │ │
│  │  │    comprometterebbe la stabilita del tronco              │  │ │
│  │  │                                                          │  │ │
│  │  │ Suggerimenti per ricordare:                              │  │ │
│  │  │ - Pensa alle costole che si aprono come un fisarmonica   │  │ │
│  │  │ - "Respira nelle costole, non nella pancia"              │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [Prossima carta]                                                    │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                          (Click Prossima carta)
                                   │
                                   ▼
                          <Marca carta come vista>
                          <Salva preferenze su DB se cambiate>
                                   │
                                   ▼
                           {Altre carte?}
                            │        │
                           Si       No
                            │        │
                            ▼        ▼
            <Seleziona nuova carta>  ┌─────────────────────────────────┐
            <Chiama AI (Step 1)>     │  [Studio - Completato]          │
            (loop)                   │                                 │
                                     │  Hai completato tutte le carte! │
                                     │                                 │
                                     │  [Torna alla Dashboard]         │
                                     └─────────────────────────────────┘
```

### 3.2 Popup Card Completa (Fase 8 - Visualizzazione Migliorata)

> **Nota Fase 8**: Il rendering markdown è stato migliorato con syntax highlighting, formule LaTeX e supporto immagini.

```
┌─────────────────────────────────────────────────────────────────────┐
│  [CardPreviewDialog]                                        [X]     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  # Respirazione nel Pilates                                     │ │
│  │                                                                  │ │
│  │  La respirazione è uno dei principi fondamentali del Pilates.   │ │
│  │                                                                  │ │
│  │  ## Formula del ritmo respiratorio                              │ │
│  │                                                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │        f = 60 / (t_in + t_out)                           │  │ │
│  │  │  (formula LaTeX renderizzata con KaTeX)                  │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ## Esempio di codice                                           │ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │ typescript                                    [📋 Copia] │   │ │
│  │  ├─────────────────────────────────────────────────────────┤   │ │
│  │  │ function breathe(inhale: number, exhale: number) {      │   │ │
│  │  │   return { inhale, exhale, total: inhale + exhale };    │   │ │
│  │  │ }                                                        │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │                                                                  │ │
│  │  ## Tabella comparativa                                         │ │
│  │                                                                  │ │
│  │  ┌──────────────┬─────────────┬─────────────┐                  │ │
│  │  │ Tecnica      │ Inspirare   │ Espirare    │                  │ │
│  │  ├──────────────┼─────────────┼─────────────┤                  │ │
│  │  │ Laterale     │ 4 sec       │ 6 sec       │ (header)         │ │
│  │  │ Addominale   │ 3 sec       │ 3 sec       │ (righe alternate)│ │
│  │  └──────────────┴─────────────┴─────────────┘                  │ │
│  │                                                                  │ │
│  │  ## Immagine                                                    │ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  [📷 Diagramma respirazione]                             │   │ │
│  │  │  (immagine dal repository con lazy loading)              │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │                                                                  │ │
│  │  (scroll per contenuto lungo)                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [Chiudi] (ESC o click fuori)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2.1 Elementi Markdown Supportati (Fase 8)

| Elemento | Rendering | Plugin |
|----------|-----------|--------|
| **Codice** | Syntax highlighting colorato | rehype-highlight |
| **Formule** | LaTeX inline `$...$` e block `$$...$$` | remark-math + rehype-katex |
| **Tabelle** | Bordi, header, righe alternate | remark-gfm + CSS custom |
| **Immagini** | Lazy loading, placeholder, fallback | Custom Image component |
| **Task lists** | Checkbox stilizzate | remark-gfm |
| **Strikethrough** | Testo barrato | remark-gfm |

### 3.2.2 CodeBlock Features

```
┌─────────────────────────────────────────────────────────────────────┐
│  typescript                                              [📋 Copia] │
├─────────────────────────────────────────────────────────────────────┤
│  1 │ function calculateMastery(correct: number, total: number) {    │
│  2 │   const ratio = correct / total;                                │
│  3 │   return Math.round(ratio * 100);                               │
│  4 │ }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Header con nome linguaggio
- Bottone "Copia" con feedback (✓ Copiato!)
- Syntax highlighting con tema appropriato (light/dark)
- Line numbers opzionali
- Scroll orizzontale per codice lungo

### 3.3 Step-by-Step

| Step | Schermata | Azione Utente | Sistema | Next |
|------|-----------|---------------|---------|------|
| 1 | Dashboard | Click "Studia" | Verifica se ha carte, carica preferenze da DB | 2 o errore |
| 2 | Studio | - | Seleziona carta random, chiama AI Step 1 | 3 |
| 3 | Quiz | Legge domanda | Mostra 4 opzioni con controlli visibili | 4 |
| 4 | Quiz | (opzionale) Click "Vedi carta" | Apre CardPreviewDialog | 3 |
| 5 | Quiz | (opzionale) Cambia provider/modello | Aggiorna selezione (effetto su prossime chiamate) | 3 |
| 6 | Quiz | Seleziona risposta (A/B/C/D) | Chiama AI Step 2 (validate_answer) | 7 |
| 7 | Feedback | Legge spiegazione dettagliata | Chat mostra validazione corposa | 8 |
| 8 | Feedback | Click "Prossima carta" | Marca vista, salva preferenze se cambiate, seleziona nuova | 2 o 9 |
| 9 | Completato | Click "Torna alla Dashboard" | - | Dashboard |

### 3.4 Logica Selezione Carta

```
1. Carica preferenze utente da DB (user_study_preferences)
2. Imposta provider/modello da preferenze (o default)
3. Carica tutte le carte dell'utente (da tutti i repository)
4. Inizializza array vuoto: seenCardIds = []
5. Inizializza chatHistory = [] (in memoria)
6. Per ogni carta richiesta:
   a. Filtra carte non in seenCardIds
   b. Se nessuna carta disponibile -> fine sessione
   c. Seleziona carta random
   d. Aggiungi card.id a seenCardIds
   e. Reset chatHistory per nuova carta
   f. Ritorna carta selezionata
```

**Nota**: Le carte viste e la chat sono tracciate solo in memoria (stato React). Ricaricando la pagina si resetta. Le preferenze provider/modello sono invece persistite su DB.

### 3.5 Flusso Due Step per Carta

```
STEP 1: Generazione Domanda
─────────────────────────────────────────────────
1. Seleziona carta random
2. Chiama llm-proxy action: generate_quiz
3. Ricevi domanda + 4 opzioni + risposta corretta
4. Mostra domanda nella chat
5. Attendi risposta utente

STEP 2: Validazione Risposta (SEMPRE eseguito)
─────────────────────────────────────────────────
1. Utente seleziona risposta (A/B/C/D)
2. Aggiungi risposta utente alla chat
3. Chiama llm-proxy action: validate_answer
4. Ricevi validazione + spiegazione dettagliata + tips
5. Mostra feedback nella chat
6. Abilita bottone "Prossima carta"
```

### 3.6 Chiamate API

**Step 1 - Generazione Quiz:**
```json
{
  "action": "generate_quiz",
  "cardContent": "# Titolo\n\nContenuto markdown della carta...",
  "provider": "openai",
  "model": "gpt-5.1"
}
```

**Risposta Step 1:**
```json
{
  "success": true,
  "quiz": {
    "question": "Qual e il principio fondamentale della respirazione nel Pilates?",
    "options": [
      { "id": "A", "text": "Respirazione addominale" },
      { "id": "B", "text": "Respirazione laterale" },
      { "id": "C", "text": "Respirazione toracica" },
      { "id": "D", "text": "Apnea controllata" }
    ],
    "correctAnswer": "B"
  }
}
```

**Step 2 - Validazione Risposta:**
```json
{
  "action": "validate_answer",
  "cardContent": "# Titolo\n\nContenuto markdown della carta...",
  "question": "Qual e il principio fondamentale della respirazione nel Pilates?",
  "userAnswer": "B",
  "correctAnswer": "B",
  "provider": "openai",
  "model": "gpt-5.1"
}
```

**Risposta Step 2:**
```json
{
  "success": true,
  "validation": {
    "isCorrect": true,
    "explanation": "Esatto! La respirazione laterale (o costale) e la tecnica fondamentale nel Pilates...",
    "tips": [
      "Pensa alle costole che si aprono come un fisarmonica",
      "Respira nelle costole, non nella pancia"
    ]
  }
}
```

### 3.7 Modelli Disponibili (Fase 5+)

| Provider | Modello | Caratteristiche |
|----------|---------|-----------------|
| OpenAI | gpt-5.1 | Buon rapporto qualita/costo |
| OpenAI | gpt-5.2 | Alta qualita |
| Anthropic | claude-haiku-4-5 | Economico, veloce |
| Anthropic | claude-sonnet-4-5 | Bilanciato |
| Anthropic | claude-opus-4-5 | Massima qualita |

### 3.8 Gestione Preferenze

```
Caricamento (all'avvio sessione):
1. Query user_study_preferences WHERE user_id = current_user
2. Se esiste: imposta provider e model da DB
3. Se non esiste: usa default (primo provider configurato, primo modello)

Salvataggio (quando utente cambia selezione):
1. Upsert in user_study_preferences
2. Set preferred_provider = selezione corrente
3. Set preferred_model = selezione corrente
4. Update updated_at
```

### 3.9 Gestione Errori

| Errore | Comportamento |
|--------|---------------|
| Nessuna carta | Bottone "Studia" disabilitato con messaggio "Aggiungi un repository per iniziare" |
| Nessuna API key configurata | Bottone "Studia" disabilitato con messaggio "Configura le API Keys per studiare" + link a /settings |
| Errore Step 1 (generate_quiz) | Mostra errore con bottone "Riprova" |
| Errore Step 2 (validate_answer) | Mostra errore, permette comunque "Prossima carta" |
| API key scaduta/invalida | Messaggio con link a /settings |
| Timeout AI | Messaggio con bottone "Riprova" |
| Cambio provider senza chiave | Disabilita provider, mostra avviso |

---

## 3B. Sessione di Studio Mobile (Fase 7)

> **Nota Fase 7**: La sessione di studio mobile replica le funzionalità della versione web con UI ottimizzata per dispositivi mobili.
> Differenze rispetto a web: layout verticale, touch targets grandi (≥44px), design distintivo mobile, nessuna pagina settings (link a web).

### 3B.1 Flow Diagram Mobile

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Dashboard Mobile]                                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [Studia] (bottone prominente)                                  │ │
│  │  ────────────────────────────────                              │ │
│  │  {ENABLED se hasApiKey && cardCount > 0}                       │ │
│  │  {DISABLED con messaggio se manca qualcosa}                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Repository: 2  •  Card: 45                                          │
│                                                                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                              (Tap Studia)
                                   │
                                   ▼
                            {Requisiti OK?}
                             │         │
                            No        Sì
                             │         │
                             ▼         ▼
                    [Messaggio]     <Naviga a /study>
                    "Apri Lumio     <Carica preferenze>
                     Web" + link    <Carica carte>
                                    <Seleziona carta random>
                                    <Genera quiz (Step 1)>
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  [Studio Mobile - Header sticky]                                     │
│  ← Esci                        Studio                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CONTROLLI (provider/model + prompt collapsibile)              │ │
│  │                                                                 │ │
│  │  Provider: [OpenAI ▼]    Modello: [gpt-5.1 ▼]                  │ │
│  │  [Vedi carta completa]                                         │ │
│  │                                                                 │ │
│  │  [▼ Impostazioni Prompt]  (collapsibile)                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  📖 Titolo Carta • 5 rimanenti                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ✨ Qual è il principio fondamentale della                     │ │
│  │     respirazione nel Pilates?                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [A] Respirazione addominale                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [B] Respirazione laterale                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [C] Respirazione toracica                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [D] Apnea controllata                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                          (Tap opzione B)
                                   │
                                   ▼
                          <Valida risposta (Step 2)>
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  [Studio Mobile - Feedback]                                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ✅ Corretto!                                                   │ │
│  │                                                                 │ │
│  │  La respirazione laterale (o costale) è la tecnica              │ │
│  │  fondamentale nel Pilates. Questo tipo di respirazione          │ │
│  │  permette di mantenere l'attivazione del core...               │ │
│  │                                                                 │ │
│  │  Suggerimenti:                                                  │ │
│  │  • Pensa alle costole che si aprono come un fisarmonica        │ │
│  │  • "Respira nelle costole, non nella pancia"                   │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │              [Prossima carta]                             │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3B.2 Stati della Dashboard Mobile

| Condizione | Stato Bottone Studia | Messaggio |
|------------|---------------------|-----------|
| hasApiKey && cardCount > 0 | ENABLED | - |
| !hasApiKey | DISABLED | "Configura le API Keys dalla versione web per studiare" + [Apri Lumio Web] |
| hasApiKey && cardCount == 0 | DISABLED | "Aggiungi un repository per iniziare a studiare" + [Gestisci Repository] |

### 3B.3 Differenze Mobile vs Web

| Aspetto | Web | Mobile |
|---------|-----|--------|
| Layout | max-width 2xl, centrato | Full-width, touch-first |
| Touch targets | Standard | ≥44px |
| Header | Fisso | Sticky con backdrop blur |
| Opzioni quiz | Card standard | Card grandi con feedback visivo |
| Prompt settings | Sempre visibile | Collapsibile |
| Settings | Pagina dedicata | Link a versione web |
| Design | shadcn standard | Design distintivo mobile |

### 3B.4 Card Preview Mobile

```
┌─────────────────────────────────────────────────────────────────────┐
│  [CardPreviewDialog - Full Screen]                          [X]     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  # Respirazione nel Pilates                                    │ │
│  │                                                                 │ │
│  │  La respirazione è uno dei principi fondamentali...            │ │
│  │                                                                 │ │
│  │  ## Tipi di respirazione                                       │ │
│  │  ...                                                            │ │
│  │                                                                 │ │
│  │  (scroll per contenuto lungo)                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      [Chiudi]                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Gestione Obiettivi

### 4.1 Flow Diagram — Creazione

```
┌─────────────────────────────────┐
│  [Dashboard]                    │
│                                 │
│  Nessun obiettivo attivo        │
│                                 │
│  [+ Nuovo Obiettivo]            │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  [Nuovo Obiettivo]              │
│                                 │
│  I tuoi repository:             │
│  ☑ pilates-deck (45 card)       │
│  ☑ yoga-basics (32 card)        │
│  ☐ cooking-101 (28 card)        │
│                                 │
│  Tag disponibili (dai repo ☑):  │
│  [pilates ●] [respirazione ●]   │
│  [yoga ○] [postura ●] ...       │
│                                 │
│  Card totali selezionate: 28    │
│                                 │
│  ──────────────────────────     │
│                                 │
│  Target mastery: [85%]          │
│  Deadline: [📅 ___________]     │
│                                 │
│  ──────────────────────────     │
│                                 │
│  Stima: ~15 card/giorno         │
│  per raggiungere l'obiettivo    │
│                                 │
│  [Annulla]  [Crea Obiettivo]    │
└────────────────┬────────────────┘
                 │
          (Crea Obiettivo)
                 │
                 ▼
          <Disattiva obiettivo precedente>
          <Crea nuovo obiettivo>
          <Calcola piano studio>
                 │
                 ▼
┌─────────────────────────────────┐
│  [Dashboard]                    │
│                                 │
│  Obiettivo attivo: Pilates      │
│  0% → 85% entro 15 Mar          │
│                                 │
│  [▶ Studia]                     │
└─────────────────────────────────┘
```

### 4.2 Flow Diagram — Dashboard Obiettivo

```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard Obiettivo]                                      │
│                                                             │
│  📎 Pilates Fundamentals                                    │
│  Tag: pilates, respirazione, postura                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Progresso                                          │   │
│  │  ████████████░░░░░░░░░ 52% / 85%                    │   │
│  │                                                     │   │
│  │  Card: 28 totali                                    │   │
│  │  • 14 completate (≥85% mastery)                     │   │
│  │  • 8 in corso                                       │   │
│  │  • 6 non iniziate                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Timeline                                           │   │
│  │                                                     │   │
│  │  Deadline: 15 Mar 2025 (18 giorni)                  │   │
│  │  Ritmo attuale: 12 card/giorno                      │   │
│  │  Ritmo necessario: 10 card/giorno                   │   │
│  │                                                     │   │
│  │  ✅ Sei in linea con l'obiettivo!                   │   │
│  │  ── oppure ──                                       │   │
│  │  ⚠️ Sei in ritardo, aumenta il ritmo               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Oggi                                               │   │
│  │                                                     │   │
│  │  Card da studiare: 12                               │   │
│  │  Card completate: 5                                 │   │
│  │  ████████████░░░░░░░░░ 5/12                         │   │
│  │                                                     │   │
│  │  [▶ Continua a studiare]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Modifica Obiettivo]  [Abbandona Obiettivo]               │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  Storico obiettivi completati:                             │
│  ✅ Yoga Basics — 85% — completato 10 Gen                  │
│  ✅ Cooking 101 — 90% — completato 5 Dic                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Regole Obiettivi

| Regola | Descrizione |
|--------|-------------|
| Un solo obiettivo attivo | Creare un nuovo obiettivo disattiva quello precedente |
| Calcolo automatico ritmo | `card_per_day = remaining_cards / days_to_deadline` |
| Status "in linea" | `cards_studied_today >= daily_target` |
| Obiettivo completato | Quando tutte le card hanno mastery ≥ target |

---

## 5. Gestione Repository

### 5.1 Flow Diagram — Lista Repository

> **Nota Fase 9:** I repository privati sono indicati con icona lucchetto (🔒). Se il token è invalido, viene mostrato un badge di avviso con possibilità di aggiornare il token.

```
┌─────────────────────────────────────────────────────────────┐
│  [I Miei Repository]                                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📁 pilates-deck                                    │   │
│  │  github.com/user/pilates-deck                       │   │
│  │  45 card • Ultimo sync: 2 ore fa                    │   │
│  │  Tag: pilates, respirazione, postura, core          │   │
│  │  [🔄 Sync] [🗑️ Rimuovi]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📁 yoga-basics                                     │   │
│  │  github.com/user/yoga-basics                        │   │
│  │  32 card • Ultimo sync: 1 giorno fa                 │   │
│  │  Tag: yoga, stretching, meditazione                 │   │
│  │  [🔄 Sync] [🗑️ Rimuovi]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔒 private-deck                            [Privato]│   │
│  │  github.com/company/internal-training               │   │
│  │  18 card • Ultimo sync: 5 ore fa                    │   │
│  │  Tag: onboarding, compliance                        │   │
│  │  [🔄 Sync] [🗑️ Rimuovi]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔒 company-docs                   ⚠️ Token invalido │   │
│  │  github.com/company/docs                            │   │
│  │  -- card • Sync fallito                             │   │
│  │  "Token scaduto o revocato"                         │   │
│  │  [🔑 Aggiorna Token] [🗑️ Rimuovi]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Aggiungi Repository]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Flow Diagram — Aggiungi Repository

> **Nota Fase 9:** Il form supporta sia repository pubblici che privati. Per i repo privati è richiesto un Personal Access Token (PAT) GitHub con scope `repo`.

```
┌─────────────────────────────────────────────────────────────┐
│  [Aggiungi Repository]                                      │
│                                                             │
│  URL Repository Git:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://github.com/user/deck-name                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tipo:                                                      │
│  ○ Pubblico                                                 │
│  ● Privato (richiede autenticazione)                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Personal Access Token (PAT):                       │   │
│  │  [ghp_••••••••••••••••••••••••••••••]               │   │
│  │                                                     │   │
│  │  ℹ️ Crea un token con scope "repo" su GitHub       │   │
│  │  [📖 Come creare un PAT →]                          │   │
│  │                                                     │   │
│  │  Il token viene criptato e salvato in modo sicuro.  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Annulla]  [Verifica e Aggiungi]                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                    (Verifica e Aggiungi)
                             │
                             ▼
                    {Repository privato?}
                        │         │
                       No        Sì
                        │         │
                        │         ▼
                        │    <Valida token con GitHub API>
                        │         │
                        │         ▼
                        │    {Token valido?}
                        │      │       │
                        │     No      Sì
                        │      │       │
                        │      ▼       │
                        │  [Errore]    │
                        │  "Token non  │
                        │   valido o   │
                        │   senza      │
                        │   permessi"  │
                        │              │
                        ▼              ▼
                    <Fetch README.md>
                    <Valida lumio_format_version>
                             │
                             ▼
                      {Formato valido?}
                        │         │
                       No        Sì
                        │         │
                        ▼         ▼
              ┌───────────────┐  <Cripta e salva token (se privato)>
              │ [Errore]      │  <Avvia sync completo>
              │               │         │
              │ "Repository   │         ▼
              │  non          │  ┌───────────────────────┐
              │  compatibile" │  │ [Sync in corso]       │
              │               │  │                       │
              │ Dettagli:     │  │ Sincronizzazione...   │
              │ - README      │  │ ████████░░ 80%        │
              │   mancante    │  │                       │
              │ - Versione    │  │ Card trovate: 45      │
              │   non         │  │ Card valide: 42       │
              │   supportata  │  │ Card ignorate: 3      │
              └───────────────┘  └───────────┬───────────┘
                                             │
                                             ▼
                                    ┌───────────────────────┐
                                    │ [Sync completato]     │
                                    │                       │
                                    │ ✅ Repository aggiunto │
                                    │    🔒 (privato)       │
                                    │                       │
                                    │ 42 card importate     │
                                    │ 3 card ignorate       │
                                    │ [Vedi dettagli]       │
                                    │                       │
                                    │ [Vai ai Repository]   │
                                    └───────────────────────┘
```

### 5.2.1 Flow Diagram — Aggiorna Token (Fase 9)

Quando un token diventa invalido (scaduto o revocato), l'utente può aggiornarlo:

```
┌─────────────────────────────────────────────────────────────┐
│  [Aggiorna Token]                                           │
│                                                             │
│  Repository: company-docs                                   │
│  github.com/company/docs                                    │
│                                                             │
│  ⚠️ Il token attuale non è più valido.                     │
│  Errore: "Bad credentials" / "Token expired"                │
│                                                             │
│  Nuovo Personal Access Token:                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ghp_•••••••••••••••••••••••••••••••]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ Assicurati che il token abbia scope "repo"             │
│  [📖 Come creare un PAT →]                                  │
│                                                             │
│  [Annulla]  [Verifica e Aggiorna]                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                    (Verifica e Aggiorna)
                             │
                             ▼
                    <Valida token con GitHub API>
                             │
                             ▼
                      {Token valido?}
                        │         │
                       No        Sì
                        │         │
                        ▼         ▼
              ┌───────────────┐  <Cripta e aggiorna token>
              │ [Errore]      │  <Reset token_status = 'valid'>
              │               │  <Avvia sync>
              │ "Token non    │         │
              │  valido"      │         ▼
              │               │  ┌───────────────────────┐
              │ [Riprova]     │  │ ✅ Token aggiornato    │
              └───────────────┘  │                       │
                                 │ Sync in corso...      │
                                 └───────────────────────┘
```

### 5.3 Stati Sync Repository

| Stato | Icona | Descrizione |
|-------|-------|-------------|
| `synced` | ✅ | Ultimo sync completato con successo |
| `syncing` | 🔄 | Sync in corso |
| `error` | ❌ | Ultimo sync fallito |
| `outdated` | ⚠️ | Repository remoto ha nuovi commit |

---

## 6. Notifiche (Email)

> **Nota:** Con l'architettura PWA, le notifiche sono inviate via email tramite Resend. Le Web Push Notifications saranno considerate in v2+.

### 6.1 Tipi di Notifica

| Trigger | Oggetto Email | Contenuto | Link |
|---------|---------------|-----------|------|
| Mattina (configurabile) | "Lumio: 12 card da studiare oggi" | Riepilogo obiettivo e card in scadenza | Link a sessione studio |
| Deadline vicina (3 giorni) | "Lumio: Deadline in arrivo!" | Avviso deadline con progresso attuale | Link a dashboard obiettivo |
| Obiettivo raggiunto | "Lumio: Obiettivo completato!" | Congratulazioni e statistiche | Link a storico obiettivi |
| Repository aggiornato | "Lumio: Nuove card disponibili" | Elenco nuove card importate | Link a repository |

### 6.2 Preferenze Notifiche Email

```
┌─────────────────────────────────────────────────────────────┐
│  [Impostazioni Notifiche Email]                             │
│                                                             │
│  Email: user@example.com                                    │
│                                                             │
│  Promemoria studio                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Attivo: [●]                                        │   │
│  │  Frequenza: [Giornaliera ▼]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Altre notifiche                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Obiettivo completato: [●]                          │   │
│  │  Aggiornamenti repository: [●]                      │   │
│  │  Avvisi deadline: [●]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Salva]                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Configurazione API Keys (Solo Web)

> ⚠️ **Disponibile solo su Web** - La configurazione delle API Keys non è disponibile su mobile per v1.0. Gli utenti devono configurare le chiavi tramite l'app web.

### 7.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  [Impostazioni > API Keys]                                  │
│                                                             │
│  Le tue chiavi API per la generazione delle domande.        │
│  Lumio non memorizza le chiavi in chiaro.                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OpenAI                                             │   │
│  │  Status: ✅ Configurata                             │   │
│  │  Ultimo test: 2 ore fa                              │   │
│  │                                                     │   │
│  │  [Modifica] [Rimuovi] [🔄 Test]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Anthropic                                          │   │
│  │  Status: ⚪ Non configurata                         │   │
│  │                                                     │   │
│  │  [+ Configura]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  Provider preferito per le domande:                         │
│  [OpenAI ▼]                                                 │
│                                                             │
│  Modello:                                                   │
│  [gpt-4o-mini ▼]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Modelli Supportati (v1)

| Provider | Modelli |
|----------|---------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Anthropic | claude-3-5-sonnet, claude-3-5-haiku |

---

## 8. Navigation Map

### 8.1 Web App

```
/
├── /login                    # Login con Google
├── /dashboard                # Home principale (sempre accessibile dopo login)
├── /study                    # Sessione di studio
├── /goals                    # Gestione obiettivi
│   ├── /goals/new
│   └── /goals/:id
├── /repositories             # Gestione repository
│   ├── /repositories/new
│   └── /repositories/:id
├── /settings                 # Impostazioni (API Keys + Logout)
└── /public/decks             # Pagina pubblica deck compatibili
```

### 8.2 Mobile App (PWA)

**URL:** `m-lumio.toto-castaldi.com`

```
/
├── /login                    # Login con Google OAuth
├── /auth/callback            # Callback OAuth
├── /                         # Home (redirect basato su stato)
├── /dashboard                # Dashboard con bottone Studia
├── /repositories             # Visualizzazione repository
└── /study                    # Sessione di studio (Fase 7)

Note: API Keys configuration è disponibile solo su Web.
      L'utente deve configurare le chiavi via web prima di usare l'app mobile.
      Se mancano API keys, viene mostrato messaggio con link a configurazione web.
```

---

## 9. Stati dell'App

### 9.1 Condizioni e Redirect

| Condizione | Stato App | Redirect |
|------------|-----------|----------|
| Non autenticato | `logged_out` | → /login |
| Autenticato | `ready` | → Dashboard |

> **Nota Fase 6:** Non c'è più blocco per API keys o repository mancanti. L'utente accede sempre alla Dashboard dopo il login. Il bottone "Studia" è disabilitato con messaggio appropriato se mancano API keys o carte.

### 9.2 Empty States

| Schermata | Condizione | Messaggio | CTA |
|-----------|------------|-----------|-----|
| Dashboard | No obiettivo | "Imposta un obiettivo per iniziare a studiare" | "Crea Obiettivo" |
| Repository | Nessun repo | "Aggiungi il tuo primo deck di flashcard" | "Aggiungi Repository" |
| Studio | No card da studiare | "Hai completato tutte le card per oggi! 🎉" | "Torna domani" / "Continua comunque" |

---

## 10. Responsive Behavior

### 10.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, bottom nav |
| Tablet | 768px - 1024px | Two column where appropriate |
| Desktop | > 1024px | Sidebar + main content |

### 10.2 Differenze Web vs Mobile (PWA)

| Feature | Web | Mobile (PWA) |
|---------|-----|--------------|
| URL | `lumio.toto-castaldi.com` | `m-lumio.toto-castaldi.com` |
| Navigazione | Sidebar | Bottom tabs |
| Studio | Click per rispondere | Tap per rispondere |
| Notifiche | Email | Email |
| Configurazione API Keys | ✅ Completa | ❌ Solo su Web |
| Gestione repository | Completa | Semplificata |
| Installabile | No | Sì (Add to Home Screen) |

> **Nota:** L'app mobile è una PWA (Progressive Web App) con lo stesso stack tecnologico della web app ma con UI ottimizzata per mobile. La configurazione delle API Keys rimane disponibile solo su Web.

---

*Documento generato durante sessione di brainstorming. Da revisionare e approvare prima dello sviluppo.*
