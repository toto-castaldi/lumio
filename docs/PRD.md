# Lumio — Product Requirements Document

**Versione:** 1.0  
**Data:** 2025-12-28  
**Status:** Draft

---

## 1. Vision

Lumio è una piattaforma di studio basata su flashcard che sfrutta l'intelligenza artificiale per trasformare semplici concetti in sessioni di apprendimento interattive. A differenza delle flashcard tradizionali, le card di Lumio contengono solo la spiegazione del concetto: l'AI si occupa di generare domande, valutare le risposte e fornire spiegazioni approfondite.

**Idea chiave:** Separare il *contenuto* (mantenuto dalla community in repository Git) dalla *didattica* (generata dinamicamente dall'AI).

---

## 2. Problema

### Problema principale
Creare e mantenere deck di flashcard di qualità richiede troppo tempo. Ogni card necessita di:
- Formulazione della domanda
- Risposta corretta
- Eventuali varianti e spiegazioni

Questo scoraggia la creazione collaborativa e rende i deck rapidamente obsoleti.

### Problemi secondari
- Anki e strumenti simili hanno una curva di apprendimento ripida
- Le flashcard statiche non si adattano al livello dello studente
- Manca un ecosistema di contenuti community-driven con manutenzione distribuita

---

## 3. Soluzione

Lumio risolve questi problemi con un approccio innovativo:

| Flashcard Tradizionali | Lumio |
|------------------------|-------|
| Card = Domanda + Risposta | Card = Solo il concetto |
| Contenuto statico | Domande generate dall'AI |
| Feedback binario (giusto/sbagliato) | Spiegazioni contestuali e approfondimenti |
| Deck creati individualmente | Repository Git collaborativi |
| Manutenzione onerosa | Manutenzione leggera (solo concetti) |

---

## 4. Target Users

### Primario: Studenti (16+)
- Studenti delle scuole superiori
- Universitari
- Preparazione esami e test standardizzati

### Secondario: Professionisti
- Certificazioni professionali (cloud, PM, lingue...)
- Upskilling tecnico
- Formazione continua

### Caratteristiche comuni
- Familiarità con strumenti digitali
- Motivazione all'apprendimento strutturato
- Disponibilità a configurare strumenti (API keys per LLM)

---

## 5. Funzionalità v1.0

### 5.1 Must-Have

#### Autenticazione
- [ ] Login con Google OAuth (via Supabase)
- [ ] Gestione sessione cross-device

#### Configurazione LLM
- [ ] Interfaccia web per configurare API keys dei modelli AI
- [ ] Supporto provider v1: **OpenAI** e **Anthropic**
- [ ] Test connessione e validazione chiavi
- [ ] Selezione modello preferito per generazione domande

> **Nota:** Ogni utente usa le proprie API keys. I costi delle chiamate AI sono a carico dell'utente.

#### Gestione Repository
- [ ] Aggiunta repository tramite URL Git
- [ ] Supporto repository pubblici (no auth) e privati (Personal Access Token)
- [ ] **Sync in background**: job batch che verifica ultima versione del repo e aggiorna la base dati locale delle card
- [ ] Validazione formato card Lumio
- [ ] Visualizzazione stato sync per ogni repository

#### Studio
- [ ] Sessione di studio quotidiana (web + mobile)
- [ ] Algoritmo spaced repetition SM-2
- [ ] Domande generate dall'AI basate sul concetto
- [ ] Valutazione risposta con feedback AI
- [ ] Spiegazioni approfondite post-risposta
- [ ] **Feedback qualità domanda**: scala -2 (scarsa) a +2 (ottima)

#### Obiettivi
- [ ] **Un solo obiettivo attivo alla volta**
- [ ] Definizione obiettivo per tag ("Voglio studiare PILATES")
- [ ] Percentuale mastery configurabile (default 85%)
- [ ] Deadline configurabile ("Voglio raggiungerlo entro il 15 marzo")
- [ ] Prioritizzazione automatica delle card in base all'obiettivo attivo

#### Dashboard Obiettivo
- [ ] Visualizzazione progresso verso l'obiettivo attivo
- [ ] Percentuale mastery attuale vs target
- [ ] Tempo rimanente alla deadline
- [ ] Stima "sei in linea / sei in ritardo" basata sul ritmo di studio
- [ ] Storico obiettivi completati

#### Discovery
- [ ] Pagina pubblica con elenco repository compatibili
- [ ] Gestione manuale dell'elenco (admin)

### 5.2 Esplicitamente Escluse (v1)

| Funzionalità | Motivo esclusione |
|--------------|-------------------|
| Creazione/modifica card in-app | Focus su consumo, non produzione |
| Modalità offline | Complessità sync, AI richiede connessione |
| Gamification (punti, badge, streak) | Distrazione dal core value |
| Social features | Complessità, non core per v1 |
| Marketplace deck a pagamento | Modello free/opensource |

---

## 6. User Stories

### Onboarding
> Come nuovo utente, voglio registrarmi con Google e configurare la mia API key (OpenAI o Anthropic) per iniziare a studiare in meno di 5 minuti.

### Collegamento Repository  
> Come studente, voglio aggiungere l'URL di un repository Git di anatomia e lasciare che Lumio sincronizzi automaticamente le card.

### Collegamento Repository Privato
> Come utente, voglio collegare un repository privato inserendo un Personal Access Token per accedere a card non pubbliche.

### Definizione Obiettivo
> Come utente, voglio impostare l'obiettivo "studiare PILATES all'80% entro il 1 aprile" e avere Lumio che pianifica il mio studio.

### Sessione di Studio
> Come utente, voglio aprire l'app mobile e fare una sessione di 15 minuti con domande generate dall'AI sulle card prioritarie per il mio obiettivo.

### Feedback Domanda
> Come utente, dopo aver risposto voglio poter dare un voto alla qualità della domanda (-2 a +2) per aiutare a migliorare il sistema.

### Dashboard Progresso
> Come utente, voglio vedere nella dashboard quanto sono vicino all'obiettivo, se sono in linea con i tempi, e quanti giorni mancano alla deadline.

---

## 7. Architettura di Alto Livello

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │   Web App       │          │   Mobile (PWA)  │           │
│  │   React 19      │          │   React 19      │           │
│  │   Vite + TS     │          │   Vite + TS     │           │
│  │   Tailwind      │          │   Tailwind      │           │
│  │   shadcn/ui     │          │   shadcn/ui     │           │
│  └────────┬────────┘          └────────┬────────┘           │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │PostgreSQL│ │   Auth   │ │ Storage  │ │ Realtime │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────────────────────────────────┐                   │
│  │         Edge Functions               │                   │
│  │  - Git sync                          │                   │
│  │  - LLM proxy                         │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
            │                            │
            ▼                            ▼
    ┌──────────────┐            ┌──────────────┐
    │  Git Repos   │            │  LLM APIs    │
    │  (GitHub,    │            │  (OpenAI,    │
    │   GitLab...) │            │   Anthropic) │
    └──────────────┘            └──────────────┘
```

---

## 8. Requisiti Non Funzionali

| Requisito | Target |
|-----------|--------|
| Tempo di caricamento app | < 3 secondi |
| Latenza generazione domanda AI | < 5 secondi |
| Uptime | 99% |
| Supporto browser | Chrome, Firefox, Safari (ultime 2 versioni) |
| Supporto mobile | Browser moderni su iOS/Android (PWA) |

---

## 9. Metriche di Successo

### North Star Metric
**90% degli utenti registrati raggiunge i propri obiettivi** (mastery configurabile sui tag selezionati, entro la deadline impostata)

### Metriche di Supporto
| Metrica | Target v1 |
|---------|-----------|
| Utenti registrati | Baseline da stabilire |
| DAU / MAU | > 30% |
| Sessioni completate / settimana | ≥ 5 per utente attivo |
| Tempo medio sessione | 10-20 minuti |
| Retention D7 | > 40% |
| Repository collegati / utente | ≥ 2 |

---

## 10. Roadmap

Vedere [ROADMAP.md](./ROADMAP.md) per lo stato dettagliato di implementazione.

---

## 11. Open Questions

1. **Frequenza sync repository**: Ogni quanto il batch verifica aggiornamenti? (ogni ora? ogni 6 ore? configurabile?)
2. **Formato card**: Serve un documento separato per la specifica del formato Markdown — **prossimo documento**
3. **Utilizzo feedback domande**: Come usiamo i rating -2/+2? (miglioramento prompt, blacklist domande, analytics?)
4. **Notifiche**: L'utente riceve reminder per studiare? (push notification, email via Resend?)

---

## 12. Riferimenti

- [Algoritmo SM-2](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

*Documento generato durante sessione di brainstorming. Da revisionare e approvare prima dello sviluppo.*
