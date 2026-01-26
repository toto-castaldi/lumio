# Milestone 12: Pre-generazione Domande in Batch

**Stato**: 🟡 PIANIFICATO
**Data**: 2026-01-23

---

## Obiettivo

Migliorare la UX dello studio pre-generando domande e spiegazioni, eliminando le chiamate LLM real-time durante lo studio.

## Problemi Risolti

1. **UX lenta** → Domande già pronte, nessuna attesa
2. **Bias risposta "B"** → Shuffle opzioni al momento della visualizzazione
3. **Spreco API** → Domande generate una volta, riutilizzate
4. **JSON malformato** → Retry in batch, domande validate prima di salvare

## Decisioni di Design

| Aspetto | Decisione |
|---------|-----------|
| Spiegazione | Pre-generata con la domanda (no validate_answer real-time) |
| Studiabilità | Solo card con almeno 1 domanda sono studiabili |
| Trigger batch | pg_cron interno a Supabase |
| Num domande | Configurabile via `platform_config` |
| Fallback | Nessuno - se no domande, card non studiabile |

---

## 1. Database Schema

### 1.1 Nuova tabella: `card_questions`

```sql
CREATE TABLE public.card_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- Domanda e opzioni (ordine originale)
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,  -- [{label: "A", text: "..."}, ...]
    correct_answer TEXT NOT NULL,  -- A, B, C, D
    explanation TEXT NOT NULL,  -- Pre-generata

    -- Metadata generazione
    llm_provider llm_provider NOT NULL,
    llm_model TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Voti
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    vote_score INTEGER GENERATED ALWAYS AS (upvotes - downvotes) STORED,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at TIMESTAMPTZ,
    deactivation_reason TEXT,  -- 'vote_threshold' | 'manual'

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_card_questions_card_id ON card_questions(card_id);
CREATE INDEX idx_card_questions_card_active ON card_questions(card_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_card_questions_vote_score ON card_questions(vote_score);
```

### 1.2 Nuova tabella: `question_votes`

```sql
CREATE TABLE public.question_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES card_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_value INTEGER NOT NULL CHECK (vote_value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(question_id, user_id)
);
```

### 1.3 Nuove chiavi `platform_config`

```sql
INSERT INTO platform_config (key, value) VALUES
    ('questions_per_card', '4'),
    ('question_min_threshold', '1'),
    ('vote_deactivation_threshold', '-3'),
    ('batch_retry_on_json_error', '3');
```

### 1.4 RLS Policies

- `card_questions`: SELECT per utenti con accesso al repository della card
- `question_votes`: CRUD per propri voti
- Service role: ALL per batch job

### 1.5 Trigger per voti

- Trigger su `question_votes` per aggiornare `upvotes`/`downvotes` in `card_questions`
- Trigger su `card_questions` per disattivare se `vote_score <= threshold`

### 1.6 RPC Function per batch

```sql
CREATE FUNCTION get_cards_needing_questions(
    p_target_count INTEGER,
    p_limit INTEGER
) RETURNS TABLE (card_id UUID, content TEXT, raw_content TEXT, repository_id UUID, current_count BIGINT)
```

---

## 2. Edge Function: `question-generator`

**Nuova Edge Function** per generazione batch domande.

### Actions

| Action | Descrizione |
|--------|-------------|
| `generate_batch` | Genera domande per card che ne hanno meno del target |
| `generate_for_card` | Genera domande per una card specifica (on-demand) |

### Logica `generate_batch`

```
1. Carica config (questions_per_card, retry_count)
2. Query cards con count(domande attive) < questions_per_card
3. Per ogni card:
   a. Calcola domande mancanti
   b. Per ogni domanda:
      - Chiama LLM con prompt che include spiegazione
      - Retry su JSON error (max N tentativi)
      - Salva in card_questions
   c. Sleep 500ms (rate limiting)
4. Ritorna stats (cards processed, questions generated, errors)
```

### Prompt LLM (italiano)

Il prompt deve generare:
- `question`: la domanda
- `options`: 4 opzioni con label A/B/C/D
- `correctAnswer`: label corretta
- `explanation`: spiegazione dettagliata (3-4 frasi) del concetto

---

## 3. Modifiche a `llm-proxy`

### Nuove Actions

| Action | Descrizione |
|--------|-------------|
| `get_question` | Ritorna domanda pre-generata (shuffled) per una card |
| `vote_question` | Registra voto utente su una domanda |

### Logica `get_question`

```typescript
1. Query domande attive per card_id, ordinate per vote_score DESC
2. Se nessuna domanda → return { fallbackRequired: true }
3. Seleziona random tra le top N
4. Shuffle opzioni (Fisher-Yates)
5. Calcola nuova posizione risposta corretta
6. Return { questionId, question, options (shuffled), correctAnswer (new label) }
```

### Logica `vote_question`

```typescript
1. Upsert in question_votes (user_id, question_id, vote_value)
2. Trigger DB aggiorna upvotes/downvotes
3. Return { success, currentVoteScore }
```

---

## 4. pg_cron Configuration

Schedulare job interno a Supabase per chiamare `question-generator`.

```sql
-- Ogni 30 minuti genera domande per card che ne hanno poche
SELECT cron.schedule(
    'generate-questions-batch',
    '*/30 * * * *',  -- Ogni 30 minuti
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/question-generator',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{"action": "generate_batch"}'
    );
    $$
);
```

**Nota**: Richiede estensioni `pg_cron` e `pg_net` abilitate in Supabase.

---

## 5. Modifiche Packages

### 5.1 `@lumio/shared` - Nuovi tipi

```typescript
// Domanda pre-generata
interface CardQuestion {
  id: string;
  cardId: string;
  questionText: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  voteScore: number;
  isActive: boolean;
}

// Domanda shuffled per display
interface ShuffledQuestion {
  questionId: string;
  question: string;
  options: QuizOption[];  // Ordine shuffled
  correctAnswer: string;   // Label dopo shuffle
  explanation: string;     // Pre-generata
}

// Voto
interface VoteQuestionRequest {
  questionId: string;
  vote: 'like' | 'dislike';
}
```

### 5.2 `@lumio/core` - Nuove funzioni

```typescript
// Ottieni domanda pre-generata
async function getPreGeneratedQuestion(cardId: string): Promise<ShuffledQuestion | null>

// Vota domanda
async function voteQuestion(questionId: string, vote: 'like' | 'dislike'): Promise<void>

// Modifica getStudyCards per filtrare solo card con domande
async function getStudyCards(): Promise<Card[]>  // Solo card con almeno 1 domanda
```

---

## 6. Modifiche Frontend

### 6.1 Nuovo flusso studio

```
1. Carica card (solo quelle con domande)
2. Seleziona card random
3. Chiama getPreGeneratedQuestion(cardId)
4. Mostra domanda (opzioni già shuffled)
5. Utente risponde
6. Mostra risultato + spiegazione (pre-generata)
7. Mostra bottoni voto (like/dislike)
8. Prossima card
```

### 6.2 `StudyPage.tsx` (web + mobile)

**Cambiamenti chiave:**
- Rimuovere chiamata `generateQuiz()`
- Rimuovere chiamata `validateAnswer()`
- Aggiungere `getPreGeneratedQuestion()`
- Aggiungere stato per `questionId` e `userVote`
- Aggiungere UI bottoni voto dopo risposta

### 6.3 UI Voto

```
┌─────────────────────────────────────┐
│  ✓ Corretto!                        │
│                                     │
│  [Spiegazione pre-generata...]      │
│                                     │
│  ─────────────────────────────────  │
│  Questa domanda ti è stata utile?   │
│                                     │
│  [👍 Sì]     [👎 No]                │
│                                     │
│  [Prossima carta →]                 │
└─────────────────────────────────────┘
```

### 6.4 Gestione "nessuna domanda"

Se `getStudyCards()` ritorna array vuoto o `getPreGeneratedQuestion()` ritorna null:
- Mostrare messaggio: "Le domande per questa carta sono in preparazione. Riprova tra qualche minuto."
- Oppure saltare la carta e passare alla prossima

---

## 7. File da Modificare

| File | Azione |
|------|--------|
| `supabase/migrations/YYYYMMDD_card_questions.sql` | NUOVO - Schema completo |
| `supabase/functions/question-generator/index.ts` | NUOVO - Batch generation |
| `supabase/functions/llm-proxy/index.ts` | MODIFICA - get_question, vote_question |
| `packages/shared/src/types/index.ts` | MODIFICA - Nuovi tipi |
| `packages/core/src/supabase/study.ts` | MODIFICA - Nuove funzioni |
| `apps/web/src/pages/StudyPage.tsx` | MODIFICA - Nuovo flusso |
| `apps/mobile/src/pages/StudyPage.tsx` | MODIFICA - Nuovo flusso |
| `.github/workflows/ci-deploy.yml` | MODIFICA - Deploy question-generator |
| `docs/ROADMAP.md` | MODIFICA - Aggiungere Milestone 12 |

---

## 8. Ordine Implementazione

### Fase 1: Database (1-2 giorni)
- [ ] Migration `card_questions` + `question_votes`
- [ ] Nuove chiavi `platform_config`
- [ ] RLS policies
- [ ] Triggers per voti
- [ ] RPC `get_cards_needing_questions`
- [ ] Configurare pg_cron + pg_net

### Fase 2: Edge Functions (2-3 giorni)
- [ ] Creare `question-generator`
- [ ] Aggiungere a CI/CD
- [ ] Modificare `llm-proxy` (get_question, vote_question)
- [ ] Test locale batch generation

### Fase 3: Packages (1 giorno)
- [ ] Nuovi tipi in `@lumio/shared`
- [ ] Nuove funzioni in `@lumio/core`
- [ ] Build packages

### Fase 4: Frontend (2 giorni)
- [ ] Modificare `StudyPage.tsx` web
- [ ] Aggiungere UI voto
- [ ] Modificare `StudyPage.tsx` mobile
- [ ] Test end-to-end

### Fase 5: Documentazione (1 giorno)
- [ ] Aggiornare ROADMAP.md
- [ ] Aggiornare TECHNICAL-ARCHITECTURE.md
- [ ] Aggiornare DATA-MODEL.md

---

## 9. Verifica

### Test manuali
1. Eseguire batch manualmente (`POST /question-generator` con action `generate_batch`)
2. Verificare che domande vengano create in `card_questions`
3. Studiare una carta e verificare che domanda venga da DB (no LLM call)
4. Verificare shuffle opzioni (risposta corretta non sempre B)
5. Votare una domanda e verificare aggiornamento `vote_score`
6. Verificare disattivazione automatica con voti negativi

### Test pg_cron
1. Verificare che job giri ogni 30 minuti
2. Verificare log in Supabase Dashboard

### Metriche da monitorare
- Tempo medio risposta `get_question` (target: <100ms)
- Numero domande generate per batch run
- Distribuzione voti (like vs dislike)
- Card senza domande (dovrebbe tendere a 0)
