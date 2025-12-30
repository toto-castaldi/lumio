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

## 2. Onboarding (Primo Accesso)

### 2.1 Flow Diagram

```
┌─────────────────┐
│  Landing Page   │
│  [Web/Mobile]   │
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
┌─────────────────────────────────┐
│  [Setup API Keys]               │
│                                 │
│  "Per generare le domande,      │
│   Lumio usa AI. Configura       │
│   le tue API keys."             │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Provider: [OpenAI ▼]    │    │
│  │ API Key:  [••••••••••]  │    │
│  │ [Test Connessione]      │    │
│  └─────────────────────────┘    │
│                                 │
│  [Continua →]                   │
└────────────────┬────────────────┘
                 │
                 ▼
        {API Key valida?}
           │       │
          No      Sì
           │       │
           ▼       ▼
    [Errore]    ┌─────────────────────────────────┐
    "Chiave     │  [Aggiungi Repository]          │
     invalida"  │                                 │
                │  "Aggiungi il tuo primo deck    │
                │   di flashcard"                 │
                │                                 │
                │  ┌─────────────────────────┐    │
                │  │ URL: [github.com/...]   │    │
                │  │ Tipo: [Pubblico ▼]      │    │
                │  │ [+ Aggiungi]            │    │
                │  └─────────────────────────┘    │
                │                                 │
                │  [Continua →]                   │
                └────────────────┬────────────────┘
                                 │
                                 ▼
                        {Repo valido?}
                           │       │
                          No      Sì
                           │       │
                           ▼       ▼
                    [Errore]    <Sync repository>
                    "Formato         │
                     non valido"     ▼
                             ┌─────────────────────────────────┐
                             │  [Crea Obiettivo]               │
                             │                                 │
                             │  "Cosa vuoi studiare?"          │
                             │                                 │
                             │  Tag disponibili:               │
                             │  [pilates] [respirazione]       │
                             │  [postura] [core] ...           │
                             │                                 │
                             │  Target: [85%] mastery          │
                             │  Entro:  [📅 15 Mar 2025]       │
                             │                                 │
                             │  [Inizia a studiare →]          │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │  [Dashboard]  │
                                      │  Home App     │
                                      └───────────────┘
```

### 2.2 Step-by-Step

| Step | Schermata | Azione Utente | Sistema | Next |
|------|-----------|---------------|---------|------|
| 1 | Landing | Click "Accedi con Google" | Redirect OAuth | 2 |
| 2 | Google OAuth | Autorizza | Crea utente in DB | 3 |
| 3 | Setup API Keys | Inserisce API key, click "Test" | Valida key con LLM provider | 4 |
| 4 | Setup API Keys | Click "Continua" | Salva key (encrypted) | 5 |
| 5 | Aggiungi Repository | Inserisce URL, click "Aggiungi" | Valida formato, avvia sync | 6 |
| 6 | Aggiungi Repository | Click "Continua" | - | 7 |
| 7 | Crea Obiettivo | Seleziona tag, imposta target e deadline | Crea obiettivo, calcola piano | 8 |
| 8 | Dashboard | - | Mostra home con prima sessione pronta | - |

### 2.3 Validazioni

| Campo | Regola | Messaggio Errore |
|-------|--------|------------------|
| API Key OpenAI | Inizia con `sk-`, test call funziona | "Chiave non valida o scaduta" |
| API Key Anthropic | Inizia con `sk-ant-`, test call funziona | "Chiave non valida o scaduta" |
| URL Repository | URL Git valido, README con lumio_format_version | "Repository non compatibile con Lumio" |
| Obiettivo Tag | Almeno 1 tag selezionato | "Seleziona almeno un tag" |
| Obiettivo Deadline | Data futura | "La deadline deve essere nel futuro" |

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
- "Apri Lumio Web" → apre `https://lumio.toto-castaldi.com/setup/api-keys` in nuova tab
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

## 3. Sessione di Studio (v1 - Semplificata)

> **Nota Fase 4**: Questa e la versione semplificata del flusso di studio implementata nella Fase 4.
> Non include: tracciamento progressi, SM-2, obiettivi, storico risposte.
> Include: selezione provider/modello, quiz AI, carte random senza ripetizioni.

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
    [Toast error]  ┌─────────────────────────────────┐
    "Aggiungi     │  [Studio - Setup]               │
     repository"  │                                 │
                  │  Seleziona provider e modello   │
                  │                                 │
                  │  Provider:                      │
                  │  ○ OpenAI     ○ Anthropic       │
                  │  (solo quelli configurati)      │
                  │                                 │
                  │  Modello:                       │
                  │  [gpt-4o-mini ▼]                │
                  │                                 │
                  │  [Inizia a studiare]            │
                  └────────────────┬────────────────┘
                                   │
                          (Click Inizia)
                                   │
                                   ▼
                          <Carica tutte le carte>
                          <Seleziona carta random>
                          <Chiama AI per quiz>
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │  [Studio - Quiz]                │
                  │                                 │
                  │  Carta 1 di 45                  │
                  │                                 │
                  │  ┌─────────────────────────┐    │
                  │  │  Qual e il principio    │    │
                  │  │  fondamentale della     │    │
                  │  │  respirazione nel       │    │
                  │  │  Pilates?               │    │
                  │  └─────────────────────────┘    │
                  │                                 │
                  │  [A] Respirazione addominale    │
                  │  [B] Respirazione laterale      │
                  │  [C] Respirazione toracica      │
                  │  [D] Apnea controllata          │
                  │                                 │
                  │  [Caricamento...] (se AI lenta) │
                  └────────────────┬────────────────┘
                                   │
                          (Seleziona risposta)
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │  [Studio - Feedback]            │
                  │                                 │
                  │  Corretto! / Sbagliato          │
                  │                                 │
                  │  La risposta corretta e B.      │
                  │                                 │
                  │  ┌─────────────────────────┐    │
                  │  │  Spiegazione:           │    │
                  │  │  La respirazione        │    │
                  │  │  laterale permette di   │    │
                  │  │  mantenere il core...   │    │
                  │  └─────────────────────────┘    │
                  │                                 │
                  │  [Prossima carta]               │
                  └────────────────┬────────────────┘
                                   │
                          <Marca carta come vista>
                                   │
                                   ▼
                           {Altre carte?}
                            │        │
                           Si       No
                            │        │
                            ▼        ▼
                  [Quiz]         ┌─────────────────────────────────┐
                  (loop)         │  [Studio - Completato]          │
                                 │                                 │
                                 │  Hai completato tutte le carte! │
                                 │                                 │
                                 │  [Torna alla Dashboard]         │
                                 └─────────────────────────────────┘
```

### 3.2 Step-by-Step

| Step | Schermata | Azione Utente | Sistema | Next |
|------|-----------|---------------|---------|------|
| 1 | Dashboard | Click "Studia" | Verifica se ha carte | 2 o errore |
| 2 | Setup | Seleziona provider | Mostra modelli disponibili | 3 |
| 3 | Setup | Seleziona modello, click "Inizia" | Carica carte, seleziona random, chiama AI | 4 |
| 4 | Quiz | Legge domanda | Mostra 4 opzioni | 5 |
| 5 | Quiz | Seleziona risposta (A/B/C/D) | Valuta risposta | 6 |
| 6 | Feedback | Legge feedback e spiegazione | - | 7 |
| 7 | Feedback | Click "Prossima carta" | Marca carta vista, seleziona nuova random | 4 o 8 |
| 8 | Completato | Click "Torna alla Dashboard" | - | Dashboard |

### 3.3 Logica Selezione Carta (v1 Semplificata)

```
1. Carica tutte le carte dell'utente (da tutti i repository)
2. Inizializza array vuoto: seenCardIds = []
3. Per ogni carta richiesta:
   a. Filtra carte non in seenCardIds
   b. Se nessuna carta disponibile -> fine sessione
   c. Seleziona carta random
   d. Aggiungi card.id a seenCardIds
   e. Ritorna carta selezionata
```

**Nota**: Le carte viste sono tracciate solo in memoria (stato React). Ricaricando la pagina si resetta.

### 3.4 Generazione Domanda AI

**Chiamata a llm-proxy:**
```json
{
  "action": "generate_quiz",
  "cardContent": "# Titolo\n\nContenuto markdown della carta...",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

**Risposta attesa:**
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
    "correctAnswer": "B",
    "explanation": "La respirazione laterale (o costale) e la tecnica fondamentale nel Pilates perche permette di mantenere l'attivazione del core durante il movimento..."
  }
}
```

### 3.5 Modelli Disponibili

| Provider | Modello | Caratteristiche |
|----------|---------|-----------------|
| OpenAI | gpt-4o-mini | Economico, veloce |
| OpenAI | gpt-4o | Alta qualita |
| Anthropic | claude-3-5-haiku | Economico, veloce |
| Anthropic | claude-3-5-sonnet | Bilanciato |
| Anthropic | claude-3-opus | Massima qualita |

### 3.6 Gestione Errori

| Errore | Comportamento |
|--------|---------------|
| Nessuna carta | Toast "Aggiungi un repository per iniziare" |
| Nessuna API key configurata | Redirect a /setup/api-keys |
| Errore chiamata AI | Mostra errore con bottone "Riprova" |
| API key scaduta/invalida | Messaggio con link a configurazione |
| Timeout AI | Messaggio con bottone "Riprova" |

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
│  │  🔒 private-deck                                    │   │
│  │  github.com/company/internal-training               │   │
│  │  18 card • Ultimo sync: 5 ore fa                    │   │
│  │  Tag: onboarding, compliance                        │   │
│  │  [🔄 Sync] [🗑️ Rimuovi]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Aggiungi Repository]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Flow Diagram — Aggiungi Repository

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
│  │  Personal Access Token:                             │   │
│  │  [••••••••••••••••••••••••••••••]                   │   │
│  │                                                     │   │
│  │  ℹ️ Crea un token con permesso "repo" su GitHub    │   │
│  │  [Come creare un PAT →]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Annulla]  [Verifica e Aggiungi]                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                    (Verifica e Aggiungi)
                             │
                             ▼
                    <Fetch README.md>
                    <Valida lumio_format_version>
                             │
                             ▼
                      {Formato valido?}
                        │         │
                       No        Sì
                        │         │
                        ▼         ▼
              ┌───────────────┐  <Avvia sync completo>
              │ [Errore]      │         │
              │               │         ▼
              │ "Repository   │  ┌───────────────────────┐
              │  non          │  │ [Sync in corso]       │
              │  compatibile" │  │                       │
              │               │  │ Sincronizzazione...   │
              │ Dettagli:     │  │ ████████░░ 80%        │
              │ - README      │  │                       │
              │   mancante    │  │ Card trovate: 45      │
              │ - Versione    │  │ Card valide: 42       │
              │   non         │  │ Card ignorate: 3      │
              │   supportata  │  └───────────┬───────────┘
              └───────────────┘              │
                                             ▼
                                    ┌───────────────────────┐
                                    │ [Sync completato]     │
                                    │                       │
                                    │ ✅ Repository aggiunto │
                                    │                       │
                                    │ 42 card importate     │
                                    │ 3 card ignorate       │
                                    │ [Vedi dettagli]       │
                                    │                       │
                                    │ [Vai ai Repository]   │
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
├── /setup                    # Onboarding (se nuovo utente)
│   ├── /setup/api-keys
│   ├── /setup/repository
│   └── /setup/goal
├── /dashboard                # Home principale
├── /study                    # Sessione di studio
├── /goals                    # Gestione obiettivi
│   ├── /goals/new
│   └── /goals/:id
├── /repositories             # Gestione repository
│   ├── /repositories/new
│   └── /repositories/:id
├── /settings                 # Impostazioni
│   ├── /settings/api-keys
│   ├── /settings/notifications
│   └── /settings/account
└── /public/decks             # Pagina pubblica deck compatibili
```

### 8.2 Mobile App (PWA)

**URL:** `m-lumio.toto-castaldi.com`

```
/
├── /login                    # Login con Google OAuth
├── /auth/callback            # Callback OAuth
├── /                         # Home (redirect basato su stato)
├── /dashboard                # Dashboard semplificata
├── /repositories             # Visualizzazione repository (fase 3)
└── (future) /study           # Sessione di studio (non in scope v1)

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
| Autenticato, no API key | `needs_setup` | → /setup/api-keys |
| Autenticato, no repository | `needs_setup` | → /setup/repository |
| Autenticato, no obiettivo | `no_goal` | → Dashboard (con CTA "Crea obiettivo") |
| Autenticato, tutto configurato | `ready` | → Dashboard |

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
