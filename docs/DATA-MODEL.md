# Lumio — Data Model

**Versione:** 1.0  
**Data:** 2025-12-28  
**Status:** Draft

---

## 1. Overview

Questo documento definisce lo schema del database PostgreSQL su Supabase per Lumio. Include tabelle, relazioni, indici, enum types e Row Level Security (RLS) policies.

### Principi di Design

- **User isolation**: Ogni utente vede solo i propri dati (RLS)
- **Audit trail**: Tracciamento completo delle risposte per analytics
- **Soft delete**: Dove appropriato, per recovery e audit
- **Timestamps**: `created_at` e `updated_at` su tutte le tabelle

---

## 2. Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  user_api_keys  │       │  repositories   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │       │ id (PK)         │
│ email           │  │    │ user_id (FK)  ◄─┼───────│ user_id (FK)    │
│ display_name    │  │    │ provider        │       │ url             │
│ avatar_url      │  │    │ encrypted_key   │       │ name            │
│ created_at      │  │    │ is_valid        │       │ description     │
│ updated_at      │  │    │ last_tested_at  │       │ is_private      │
└─────────────────┘  │    │ created_at      │       │ access_token    │
                     │    └─────────────────┘       │ format_version  │
                     │                              │ last_synced_at  │
                     │                              │ sync_status     │
                     │                              │ created_at      │
                     │                              └────────┬────────┘
                     │                                       │
                     │    ┌─────────────────┐                │
                     │    │     cards       │                │
                     │    ├─────────────────┤                │
                     │    │ id (PK)         │◄───────────────┘
                     │    │ repository_id(FK)                │
                     │    │ file_path       │                │
                     │    │ title           │                │
                     │    │ content         │    ┌───────────────────┐
                     │    │ tags            │    │   card_assets     │
                     │    │ difficulty      │    ├───────────────────┤
                     │    │ language        │───►│ id (PK)           │
                     │    │ content_hash    │    │ card_id (FK)      │
                     │    │ created_at      │    │ original_path     │
                     │    │ updated_at      │    │ storage_path      │
                     │    └────────┬────────┘    │ content_hash      │
                     │             │             │ mime_type         │
                     │             │             │ size_bytes        │
                     │             │             │ created_at        │
                     │             │             └───────────────────┘
┌────────────────────┼─────────────┼────────────────────────────────────┐
│                    │             │                                    │
│    ┌───────────────▼─────────────▼───────────┐                       │
│    │           user_cards                     │                       │
│    ├──────────────────────────────────────────┤                       │
│    │ id (PK)                                  │                       │
│    │ user_id (FK)                             │                       │
│    │ card_id (FK)                             │                       │
│    │ sm2_repetitions                          │                       │
│    │ sm2_easiness                             │                       │
│    │ sm2_interval                             │                       │
│    │ sm2_next_review                          │                       │
│    │ mastery_score                            │                       │
│    │ times_studied                            │                       │
│    │ times_correct                            │                       │
│    │ last_studied_at                          │                       │
│    │ created_at                               │                       │
│    │ updated_at                               │                       │
│    └──────────────────┬───────────────────────┘                       │
│                       │                                               │
│                       │                                               │
│    ┌──────────────────▼───────────────────────┐                       │
│    │        user_card_responses               │                       │
│    ├──────────────────────────────────────────┤                       │
│    │ id (PK)                                  │                       │
│    │ user_card_id (FK)                        │                       │
│    │ session_id (FK)                          │◄──────────┐           │
│    │ question_generated                       │           │           │
│    │ options_generated                        │           │           │
│    │ user_answer                              │           │           │
│    │ correct_answer                           │           │           │
│    │ is_correct                               │           │           │
│    │ response_time_ms                         │           │           │
│    │ ai_explanation                           │           │           │
│    │ quality_rating                           │           │           │
│    │ llm_provider                             │           │           │
│    │ llm_model                                │           │           │
│    │ created_at                               │           │           │
│    └──────────────────────────────────────────┘           │           │
│                                                           │           │
│    ┌──────────────────────────────────────────┐           │           │
│    │          study_sessions                  │           │           │
│    ├──────────────────────────────────────────┤           │           │
│    │ id (PK)                                  │───────────┘           │
│    │ user_id (FK)                             │◄──────────────────────┘
│    │ goal_id (FK)                             │◄──────────┐
│    │ started_at                               │           │
│    │ ended_at                                 │           │
│    │ cards_studied                            │           │
│    │ cards_correct                            │           │
│    │ platform                                 │           │
│    │ created_at                               │           │
│    └──────────────────────────────────────────┘           │
│                                                           │
│    ┌──────────────────────────────────────────┐           │
│    │             goals                        │           │
│    ├──────────────────────────────────────────┤           │
│    │ id (PK)                                  │───────────┘
│    │ user_id (FK)                             │
│    │ tags                                     │
│    │ target_mastery                           │
│    │ deadline                                 │
│    │ is_active                                │
│    │ current_mastery                          │
│    │ cards_total                              │
│    │ cards_mastered                           │
│    │ completed_at                             │
│    │ created_at                               │
│    │ updated_at                               │
│    └──────────────────────────────────────────┘
│
│    ┌──────────────────────────────────────────┐
│    │      user_study_preferences              │
│    ├──────────────────────────────────────────┤
│    │ id (PK)                                  │
│    │ user_id (FK)                             │
│    │ preferred_provider                       │
│    │ preferred_model                          │
│    │ created_at                               │
│    │ updated_at                               │
│    └──────────────────────────────────────────┘
│
│    ┌──────────────────────────────────────────┐
│    │      notification_preferences            │
│    ├──────────────────────────────────────────┤
│    │ id (PK)                                  │
│    │ user_id (FK)                             │
│    │ push_enabled                             │
│    │ reminder_time                            │
│    │ reminder_if_not_studied                  │
│    │ notify_goal_completed                    │
│    │ notify_repo_updated                      │
│    │ notify_deadline_warning                  │
│    │ expo_push_token                          │
│    │ created_at                               │
│    │ updated_at                               │
│    └──────────────────────────────────────────┘
│
│    ┌──────────────────────────────────────────┐
│    │         public_decks                     │
│    ├──────────────────────────────────────────┤
│    │ id (PK)                                  │
│    │ url                                      │
│    │ name                                     │
│    │ description                              │
│    │ author                                   │
│    │ card_count                               │
│    │ tags                                     │
│    │ is_featured                              │
│    │ created_at                               │
│    │ updated_at                               │
│    └──────────────────────────────────────────┘
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Enum Types

```sql
-- Provider LLM supportati
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic');

-- Stato sync repository
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'error');

-- Stato token repository privato (Fase 9)
CREATE TYPE token_status AS ENUM ('valid', 'invalid', 'not_required');

-- Piattaforma client
CREATE TYPE platform AS ENUM ('web', 'mobile');

-- Rating qualità domanda
CREATE TYPE quality_rating AS ENUM ('-2', '-1', '0', '1', '2');
```

---

## 4. Tables

### 4.1 users

Estende la tabella `auth.users` di Supabase con dati profilo.

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_users_email ON users(email);

-- Trigger per updated_at
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 user_api_keys

Chiavi API LLM degli utenti (criptate).

```sql
CREATE TABLE public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider llm_provider NOT NULL,
    encrypted_key TEXT NOT NULL,  -- Criptato con AES-256
    is_valid BOOLEAN DEFAULT TRUE,
    is_preferred BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, provider)
);

-- Indici
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Trigger
CREATE TRIGGER set_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.3 repositories

Repository Git censiti dall'utente.

```sql
CREATE TABLE public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name TEXT NOT NULL,  -- Estratto da URL o README
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    encrypted_access_token TEXT,  -- PAT criptato con AES-256-GCM, solo per repo privati
    token_status token_status DEFAULT 'not_required',  -- Fase 9: stato validità token
    token_error_message TEXT,  -- Fase 9: messaggio errore se token invalido
    format_version INTEGER NOT NULL DEFAULT 1,
    last_commit_sha TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status sync_status DEFAULT 'pending',
    sync_error_message TEXT,
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, url)
);

-- Indici
CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_repositories_sync_status ON repositories(sync_status);
CREATE INDEX idx_repositories_token_status ON repositories(token_status);  -- Fase 9

-- Trigger
CREATE TRIGGER set_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.4 cards

Card importate dai repository.

```sql
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,  -- Path relativo nel repo
    content_hash TEXT NOT NULL,  -- Hash per detect modifiche
    raw_content TEXT NOT NULL,  -- File originale completo (frontmatter + body)
    title TEXT NOT NULL,
    content TEXT NOT NULL,  -- Markdown body senza frontmatter
    tags TEXT[] NOT NULL DEFAULT '{}',
    difficulty INTEGER DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
    language TEXT DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,  -- False se rimossa dal repo
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(repository_id, file_path)
);

-- Indici
CREATE INDEX idx_cards_repository_id ON cards(repository_id);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);
CREATE INDEX idx_cards_is_active ON cards(is_active);
CREATE INDEX idx_cards_content_hash ON cards(content_hash);

-- Trigger
CREATE TRIGGER set_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.5 card_assets

Asset (immagini) scaricati dai repository e salvati in Supabase Storage.

```sql
CREATE TABLE public.card_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    original_path TEXT NOT NULL,        -- Path originale nel markdown (es. /assets/img/diagram.png)
    storage_path TEXT NOT NULL,         -- Path in Supabase Storage (es. user_id/repo_id/hash.png)
    content_hash TEXT NOT NULL,         -- SHA-256 del contenuto per deduplicazione
    mime_type TEXT NOT NULL,            -- es. image/png, image/jpeg
    size_bytes INTEGER,                 -- Dimensione file in bytes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(card_id, original_path)      -- Una card non può avere due mapping per lo stesso path
);

-- Indici
CREATE INDEX idx_card_assets_card_id ON card_assets(card_id);
CREATE INDEX idx_card_assets_content_hash ON card_assets(content_hash);
CREATE INDEX idx_card_assets_storage_path ON card_assets(storage_path);
```

> **Nota Fase 9B:** Gli asset vengono scaricati durante il sync e salvati in Supabase Storage.
> Il `content_hash` permette la deduplicazione: immagini identiche in card diverse usano lo stesso file.
> Il CASCADE DELETE elimina automaticamente gli asset quando la card viene eliminata.

### 4.6 user_cards

Stato di studio di ogni card per ogni utente (SM-2).

```sql
CREATE TABLE public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    
    -- SM-2 Algorithm State
    sm2_repetitions INTEGER DEFAULT 0,  -- Numero di ripetizioni consecutive corrette
    sm2_easiness DECIMAL(4,2) DEFAULT 2.5,  -- Easiness Factor (EF), min 1.3
    sm2_interval INTEGER DEFAULT 1,  -- Intervallo in giorni
    sm2_next_review DATE,  -- Prossima data di review
    
    -- Stats aggregate
    mastery_score DECIMAL(5,2) DEFAULT 0,  -- 0-100%
    times_studied INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    
    last_studied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, card_id)
);

-- Indici
CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_user_cards_card_id ON user_cards(card_id);
CREATE INDEX idx_user_cards_next_review ON user_cards(sm2_next_review);
CREATE INDEX idx_user_cards_mastery ON user_cards(mastery_score);
CREATE INDEX idx_user_cards_user_next_review ON user_cards(user_id, sm2_next_review);

-- Trigger
CREATE TRIGGER set_user_cards_updated_at
    BEFORE UPDATE ON user_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.6 goals

Obiettivi di studio dell'utente.

```sql
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tags TEXT[] NOT NULL,  -- Tag selezionati per l'obiettivo
    target_mastery DECIMAL(5,2) NOT NULL DEFAULT 85,  -- Target %
    deadline DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Progress tracking (aggiornato da study-planner)
    current_mastery DECIMAL(5,2) DEFAULT 0,
    cards_total INTEGER DEFAULT 0,
    cards_mastered INTEGER DEFAULT 0,  -- Card con mastery >= target
    daily_target INTEGER DEFAULT 0,  -- Card/giorno calcolate
    
    completed_at TIMESTAMPTZ,  -- Quando raggiunto il target
    abandoned_at TIMESTAMPTZ,  -- Se abbandonato
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_is_active ON goals(is_active);
CREATE INDEX idx_goals_user_active ON goals(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_goals_tags ON goals USING GIN(tags);

-- Trigger
CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.7 study_sessions

Sessioni di studio completate.

```sql
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,  -- Calcolato da ended_at - started_at
    
    cards_studied INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    
    platform platform NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_goal_id ON study_sessions(goal_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at);
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, started_at);
```

### 4.8 user_card_responses

Storico di ogni singola risposta (audit trail completo).

```sql
CREATE TABLE public.user_card_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_card_id UUID NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    
    -- Domanda generata dall'AI
    question_generated TEXT NOT NULL,
    options_generated JSONB NOT NULL,  -- [{id, text, correct}, ...]
    
    -- Risposta utente
    user_answer TEXT NOT NULL,  -- ID dell'opzione scelta (A, B, C, D)
    correct_answer TEXT NOT NULL,  -- ID della risposta corretta
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,  -- Tempo impiegato per rispondere
    
    -- Feedback AI
    ai_explanation TEXT,  -- Spiegazione breve
    ai_deep_dive TEXT,  -- Approfondimento
    
    -- Feedback utente sulla qualità
    quality_rating quality_rating,
    
    -- Metadata LLM
    llm_provider llm_provider NOT NULL,
    llm_model TEXT NOT NULL,
    llm_tokens_used INTEGER,
    llm_latency_ms INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_user_card_responses_user_card_id ON user_card_responses(user_card_id);
CREATE INDEX idx_user_card_responses_session_id ON user_card_responses(session_id);
CREATE INDEX idx_user_card_responses_created_at ON user_card_responses(created_at);
CREATE INDEX idx_user_card_responses_is_correct ON user_card_responses(is_correct);
CREATE INDEX idx_user_card_responses_quality ON user_card_responses(quality_rating);
```

### 4.9 user_study_preferences

Preferenze di studio dell'utente (provider/modello preferiti).

```sql
CREATE TABLE public.user_study_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferred_provider llm_provider,  -- 'openai' | 'anthropic'
    preferred_model TEXT,  -- es: 'gpt-5.1', 'claude-sonnet-4-5'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_user_study_preferences_user_id ON user_study_preferences(user_id);

-- Trigger
CREATE TRIGGER set_user_study_preferences_updated_at
    BEFORE UPDATE ON user_study_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

> **Nota Fase 5:** Questa tabella memorizza le preferenze di studio dell'utente. Quando l'utente cambia provider o modello durante una sessione di studio, le nuove preferenze vengono salvate automaticamente e caricate alla sessione successiva.

### 4.10 notification_preferences

Preferenze notifiche utente (mobile).

```sql
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    push_enabled BOOLEAN DEFAULT TRUE,
    reminder_time TIME DEFAULT '08:00:00',  -- Orario primo reminder
    reminder_if_not_studied BOOLEAN DEFAULT TRUE,  -- Reminder durante giornata
    max_daily_reminders INTEGER DEFAULT 2,
    
    notify_goal_completed BOOLEAN DEFAULT TRUE,
    notify_repo_updated BOOLEAN DEFAULT TRUE,
    notify_deadline_warning BOOLEAN DEFAULT TRUE,
    deadline_warning_days INTEGER DEFAULT 3,  -- Giorni prima della deadline
    
    expo_push_token TEXT,  -- Token per Expo Push Service
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_push_token ON notification_preferences(expo_push_token);

-- Trigger
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.10 public_decks

Elenco pubblico di deck compatibili (gestito manualmente).

```sql
CREATE TABLE public.public_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    author TEXT,
    card_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_public_decks_is_active ON public_decks(is_active);
CREATE INDEX idx_public_decks_is_featured ON public_decks(is_featured);
CREATE INDEX idx_public_decks_tags ON public_decks USING GIN(tags);

-- Trigger
CREATE TRIGGER set_public_decks_updated_at
    BEFORE UPDATE ON public_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Helper Functions

### 5.1 Updated At Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Calcolo Mastery Score

```sql
CREATE OR REPLACE FUNCTION calculate_mastery_score(
    times_studied INTEGER,
    times_correct INTEGER,
    sm2_easiness DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    IF times_studied = 0 THEN
        RETURN 0;
    END IF;
    
    -- Formula: (correct_ratio * 0.7) + (easiness_normalized * 0.3)
    -- Easiness va da 1.3 a 2.5, normalizziamo a 0-1
    RETURN LEAST(100, (
        (times_correct::DECIMAL / times_studied * 70) +
        ((sm2_easiness - 1.3) / 1.2 * 30)
    ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 5.3 SM-2 Algorithm Update

```sql
CREATE OR REPLACE FUNCTION update_sm2(
    p_user_card_id UUID,
    p_quality INTEGER  -- 0-5 (0-2 = sbagliato, 3-5 = corretto)
)
RETURNS void AS $$
DECLARE
    v_repetitions INTEGER;
    v_easiness DECIMAL;
    v_interval INTEGER;
BEGIN
    SELECT sm2_repetitions, sm2_easiness, sm2_interval
    INTO v_repetitions, v_easiness, v_interval
    FROM user_cards WHERE id = p_user_card_id;
    
    -- Aggiorna Easiness Factor
    v_easiness := GREATEST(1.3, v_easiness + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02)));
    
    IF p_quality >= 3 THEN
        -- Risposta corretta
        IF v_repetitions = 0 THEN
            v_interval := 1;
        ELSIF v_repetitions = 1 THEN
            v_interval := 6;
        ELSE
            v_interval := ROUND(v_interval * v_easiness);
        END IF;
        v_repetitions := v_repetitions + 1;
    ELSE
        -- Risposta sbagliata, reset
        v_repetitions := 0;
        v_interval := 1;
    END IF;
    
    UPDATE user_cards
    SET 
        sm2_repetitions = v_repetitions,
        sm2_easiness = v_easiness,
        sm2_interval = v_interval,
        sm2_next_review = CURRENT_DATE + v_interval,
        times_studied = times_studied + 1,
        times_correct = times_correct + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
        mastery_score = calculate_mastery_score(
            times_studied + 1,
            times_correct + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
            v_easiness
        ),
        last_studied_at = NOW()
    WHERE id = p_user_card_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Row Level Security (RLS)

### 6.1 Enable RLS

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assets ENABLE ROW LEVEL SECURITY;
-- public_decks non ha RLS (è pubblico)
```

### 6.2 Policies

#### users

```sql
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);
```

#### user_api_keys

```sql
CREATE POLICY "Users can manage own API keys"
    ON user_api_keys FOR ALL
    USING (auth.uid() = user_id);
```

#### repositories

```sql
CREATE POLICY "Users can manage own repositories"
    ON repositories FOR ALL
    USING (auth.uid() = user_id);
```

#### cards

```sql
-- Le card sono visibili se l'utente ha il repository
CREATE POLICY "Users can view cards from own repositories"
    ON cards FOR SELECT
    USING (
        repository_id IN (
            SELECT id FROM repositories WHERE user_id = auth.uid()
        )
    );

-- Solo il sistema può inserire/modificare card (via service role)
CREATE POLICY "Service role can manage cards"
    ON cards FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
```

#### card_assets

```sql
-- Gli utenti possono vedere gli asset delle proprie card
CREATE POLICY "Users can view assets of own cards"
    ON card_assets FOR SELECT
    USING (
        card_id IN (
            SELECT c.id FROM cards c
            JOIN repositories r ON c.repository_id = r.id
            WHERE r.user_id = auth.uid()
        )
    );

-- Solo il sistema può gestire gli asset (via service role)
CREATE POLICY "Service role can manage card_assets"
    ON card_assets FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
```

#### user_cards

```sql
CREATE POLICY "Users can manage own user_cards"
    ON user_cards FOR ALL
    USING (auth.uid() = user_id);
```

#### user_card_responses

```sql
CREATE POLICY "Users can view own responses"
    ON user_card_responses FOR SELECT
    USING (
        user_card_id IN (
            SELECT id FROM user_cards WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own responses"
    ON user_card_responses FOR INSERT
    WITH CHECK (
        user_card_id IN (
            SELECT id FROM user_cards WHERE user_id = auth.uid()
        )
    );
```

#### goals

```sql
CREATE POLICY "Users can manage own goals"
    ON goals FOR ALL
    USING (auth.uid() = user_id);
```

#### study_sessions

```sql
CREATE POLICY "Users can manage own study sessions"
    ON study_sessions FOR ALL
    USING (auth.uid() = user_id);
```

#### user_study_preferences

```sql
CREATE POLICY "Users can manage own study preferences"
    ON user_study_preferences FOR ALL
    USING (auth.uid() = user_id);
```

#### notification_preferences

```sql
CREATE POLICY "Users can manage own notification preferences"
    ON notification_preferences FOR ALL
    USING (auth.uid() = user_id);
```

---

## 7. Views

### 7.1 User Dashboard Stats

```sql
CREATE VIEW user_dashboard_stats AS
SELECT 
    u.id AS user_id,
    g.id AS active_goal_id,
    g.tags AS goal_tags,
    g.target_mastery,
    g.deadline,
    g.current_mastery,
    g.cards_total,
    g.cards_mastered,
    g.daily_target,
    (g.deadline - CURRENT_DATE) AS days_remaining,
    COALESCE(today.cards_studied, 0) AS cards_studied_today,
    COALESCE(today.cards_correct, 0) AS cards_correct_today
FROM users u
LEFT JOIN goals g ON g.user_id = u.id AND g.is_active = TRUE
LEFT JOIN LATERAL (
    SELECT 
        SUM(cards_studied) AS cards_studied,
        SUM(cards_correct) AS cards_correct
    FROM study_sessions
    WHERE user_id = u.id
      AND started_at >= CURRENT_DATE
) today ON TRUE;
```

### 7.2 Cards to Study

```sql
CREATE VIEW cards_to_study AS
SELECT 
    uc.user_id,
    c.id AS card_id,
    c.repository_id,
    c.title,
    c.content,
    c.tags,
    c.difficulty,
    c.language,
    uc.sm2_next_review,
    uc.mastery_score,
    uc.times_studied,
    CASE 
        WHEN uc.id IS NULL THEN 1  -- Mai studiata, priorità alta
        WHEN uc.sm2_next_review <= CURRENT_DATE THEN 2  -- Due today
        ELSE 3  -- Futura
    END AS priority
FROM cards c
LEFT JOIN user_cards uc ON uc.card_id = c.id
WHERE c.is_active = TRUE
ORDER BY priority, uc.mastery_score NULLS FIRST;
```

---

## 8. Indexes Summary

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| users | email | BTREE | Lookup by email |
| user_api_keys | user_id | BTREE | Filter by user |
| repositories | user_id | BTREE | Filter by user |
| repositories | sync_status | BTREE | Batch sync jobs |
| repositories | token_status | BTREE | Filter by token validity (Fase 9) |
| cards | repository_id | BTREE | Filter by repo |
| cards | tags | GIN | Filter by tags |
| cards | is_active | BTREE | Filter active cards |
| card_assets | card_id | BTREE | Filter by card |
| card_assets | content_hash | BTREE | Deduplication lookup |
| card_assets | storage_path | BTREE | Storage path lookup |
| user_cards | user_id | BTREE | Filter by user |
| user_cards | card_id | BTREE | Join with cards |
| user_cards | sm2_next_review | BTREE | Due cards query |
| user_cards | (user_id, sm2_next_review) | BTREE | User due cards |
| goals | user_id | BTREE | Filter by user |
| goals | (user_id, is_active) | BTREE (partial) | Active goal lookup |
| goals | tags | GIN | Tag filtering |
| study_sessions | (user_id, started_at) | BTREE | Daily stats |
| user_card_responses | user_card_id | BTREE | Card history |
| user_card_responses | session_id | BTREE | Session details |
| user_card_responses | quality_rating | BTREE | AI quality analytics |
| user_study_preferences | user_id | BTREE | User lookup |
| public_decks | tags | GIN | Browse by tag |

---

## 9. Data Retention

| Table | Retention | Notes |
|-------|-----------|-------|
| user_card_responses | Indefinita | Analytics, ML training |
| study_sessions | Indefinita | Storico utente |
| cards (is_active=false) | 90 giorni | Poi hard delete |
| Tutto il resto | Indefinita | - |

---

## 10. Migration Script

Script iniziale completo per setup database:

```sql
-- File: supabase/migrations/001_initial_schema.sql

-- Enum types
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'error');
CREATE TYPE platform AS ENUM ('web', 'mobile');
CREATE TYPE quality_rating AS ENUM ('-2', '-1', '0', '1', '2');

-- Helper function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables (in order of dependencies)
-- ... [tutte le CREATE TABLE sopra] ...

-- RLS
-- ... [tutti gli ALTER TABLE e CREATE POLICY sopra] ...

-- Views
-- ... [tutte le CREATE VIEW sopra] ...
```

---

*Documento generato durante sessione di brainstorming. Da revisionare e approvare prima dello sviluppo.*
