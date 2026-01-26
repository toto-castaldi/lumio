-- Lumio Milestone 12: Pre-generazione Domande in Batch
--
-- Questa migrazione aggiunge il supporto per domande pre-generate:
-- 1. card_questions - domande generate in batch per ogni card
-- 2. question_votes - voti utenti sulle domande
-- 3. platform_config - nuove chiavi per batch generation
-- 4. pg_cron job - trigger automatico per generazione batch
--
-- BENEFICI:
-- - UX veloce: domande già pronte, nessuna attesa LLM
-- - Bias risposta eliminato: shuffle opzioni al momento della visualizzazione
-- - Efficienza API: domande generate una volta, riutilizzate
-- - Qualità: sistema di voti per filtrare domande scadenti

-- ============================================
-- STEP 1: Tabella card_questions
-- ============================================

CREATE TABLE IF NOT EXISTS public.card_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,

    -- Domanda e opzioni (ordine originale)
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,  -- [{label: "A", text: "..."}, {label: "B", text: "..."}, ...]
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL,  -- Spiegazione pre-generata

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
    deactivation_reason TEXT CHECK (deactivation_reason IS NULL OR deactivation_reason IN ('vote_threshold', 'manual', 'card_updated')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commenti
COMMENT ON TABLE public.card_questions IS 'Domande pre-generate per le card, create in batch';
COMMENT ON COLUMN public.card_questions.options IS 'Array di opzioni [{label: "A", text: "..."}, ...]';
COMMENT ON COLUMN public.card_questions.correct_answer IS 'Label della risposta corretta (A, B, C, D)';
COMMENT ON COLUMN public.card_questions.explanation IS 'Spiegazione pre-generata del concetto';
COMMENT ON COLUMN public.card_questions.vote_score IS 'Punteggio calcolato: upvotes - downvotes';
COMMENT ON COLUMN public.card_questions.is_active IS 'False se disattivata per voti negativi o manualmente';
COMMENT ON COLUMN public.card_questions.deactivation_reason IS 'Motivo disattivazione: vote_threshold, manual, card_updated';

-- Indici
CREATE INDEX IF NOT EXISTS idx_card_questions_card_id
    ON public.card_questions(card_id);

CREATE INDEX IF NOT EXISTS idx_card_questions_card_active
    ON public.card_questions(card_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_card_questions_vote_score
    ON public.card_questions(vote_score DESC);

CREATE INDEX IF NOT EXISTS idx_card_questions_generated_at
    ON public.card_questions(generated_at DESC);

-- Trigger per updated_at
CREATE TRIGGER set_card_questions_updated_at
    BEFORE UPDATE ON public.card_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Tabella question_votes
-- ============================================

CREATE TABLE IF NOT EXISTS public.question_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.card_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_value INTEGER NOT NULL CHECK (vote_value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ogni utente può votare una sola volta per domanda
    UNIQUE(question_id, user_id)
);

-- Commenti
COMMENT ON TABLE public.question_votes IS 'Voti degli utenti sulle domande pre-generate';
COMMENT ON COLUMN public.question_votes.vote_value IS '1 = like, -1 = dislike';

-- Indici
CREATE INDEX IF NOT EXISTS idx_question_votes_question_id
    ON public.question_votes(question_id);

CREATE INDEX IF NOT EXISTS idx_question_votes_user_id
    ON public.question_votes(user_id);

-- ============================================
-- STEP 3: Trigger per aggiornare conteggi voti
-- ============================================

-- Funzione per aggiornare upvotes/downvotes in card_questions
CREATE OR REPLACE FUNCTION update_question_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_value = 1 THEN
            UPDATE public.card_questions
            SET upvotes = upvotes + 1
            WHERE id = NEW.question_id;
        ELSE
            UPDATE public.card_questions
            SET downvotes = downvotes + 1
            WHERE id = NEW.question_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Aggiorna solo se il voto è cambiato
        IF OLD.vote_value != NEW.vote_value THEN
            IF OLD.vote_value = 1 THEN
                -- Era un like, diventa dislike
                UPDATE public.card_questions
                SET upvotes = upvotes - 1, downvotes = downvotes + 1
                WHERE id = NEW.question_id;
            ELSE
                -- Era un dislike, diventa like
                UPDATE public.card_questions
                SET upvotes = upvotes + 1, downvotes = downvotes - 1
                WHERE id = NEW.question_id;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_value = 1 THEN
            UPDATE public.card_questions
            SET upvotes = upvotes - 1
            WHERE id = OLD.question_id;
        ELSE
            UPDATE public.card_questions
            SET downvotes = downvotes - 1
            WHERE id = OLD.question_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sui voti
CREATE TRIGGER on_question_vote_change
    AFTER INSERT OR UPDATE OR DELETE ON public.question_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_question_vote_counts();

-- ============================================
-- STEP 4: Trigger per disattivazione automatica
-- ============================================

-- Funzione per disattivare domande con voti troppo negativi
CREATE OR REPLACE FUNCTION check_question_vote_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold INTEGER;
BEGIN
    -- Ottieni soglia da platform_config (default -3)
    SELECT COALESCE((value)::INTEGER, -3)
    INTO v_threshold
    FROM public.platform_config
    WHERE key = 'vote_deactivation_threshold';

    -- Se non configurato, usa default
    IF v_threshold IS NULL THEN
        v_threshold := -3;
    END IF;

    -- Disattiva se sotto soglia
    IF NEW.vote_score <= v_threshold AND NEW.is_active = TRUE THEN
        NEW.is_active := FALSE;
        NEW.deactivated_at := NOW();
        NEW.deactivation_reason := 'vote_threshold';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per controllo soglia
CREATE TRIGGER on_card_questions_vote_score_change
    BEFORE UPDATE OF upvotes, downvotes ON public.card_questions
    FOR EACH ROW
    EXECUTE FUNCTION check_question_vote_threshold();

-- ============================================
-- STEP 5: RLS Policies per card_questions
-- ============================================

ALTER TABLE public.card_questions ENABLE ROW LEVEL SECURITY;

-- Utenti possono vedere domande delle card dei repository a cui sono iscritti
CREATE POLICY "Users can view questions from subscribed repositories"
    ON public.card_questions FOR SELECT
    USING (
        card_id IN (
            SELECT c.id
            FROM public.cards c
            WHERE c.repository_id IN (
                SELECT repository_id
                FROM public.user_repositories
                WHERE user_id = auth.uid()
            )
        )
    );

-- Service role può gestire tutto (per batch generation)
CREATE POLICY "Service role can manage card_questions"
    ON public.card_questions FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 6: RLS Policies per question_votes
-- ============================================

ALTER TABLE public.question_votes ENABLE ROW LEVEL SECURITY;

-- Utenti possono vedere i propri voti
CREATE POLICY "Users can view own votes"
    ON public.question_votes FOR SELECT
    USING (user_id = auth.uid());

-- Utenti possono inserire voti per domande accessibili
CREATE POLICY "Users can insert votes for accessible questions"
    ON public.question_votes FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND question_id IN (
            SELECT cq.id
            FROM public.card_questions cq
            JOIN public.cards c ON c.id = cq.card_id
            WHERE c.repository_id IN (
                SELECT repository_id
                FROM public.user_repositories
                WHERE user_id = auth.uid()
            )
        )
    );

-- Utenti possono aggiornare i propri voti
CREATE POLICY "Users can update own votes"
    ON public.question_votes FOR UPDATE
    USING (user_id = auth.uid());

-- Utenti possono eliminare i propri voti
CREATE POLICY "Users can delete own votes"
    ON public.question_votes FOR DELETE
    USING (user_id = auth.uid());

-- Service role può gestire tutto
CREATE POLICY "Service role can manage question_votes"
    ON public.question_votes FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 7: Nuove chiavi platform_config
-- ============================================

INSERT INTO public.platform_config (key, value)
VALUES
    ('questions_per_card', '4'),
    ('question_min_threshold', '1'),
    ('vote_deactivation_threshold', '-3'),
    ('batch_retry_on_json_error', '3'),
    ('batch_cards_per_run', '50')
ON CONFLICT (key) DO NOTHING;

-- Commenti
COMMENT ON COLUMN public.platform_config.key IS 'Chiave configurazione. Nuove chiavi per batch: questions_per_card, question_min_threshold, vote_deactivation_threshold, batch_retry_on_json_error, batch_cards_per_run';

-- ============================================
-- STEP 8: RPC Function per batch generation
-- ============================================

-- Funzione per ottenere cards che necessitano domande
CREATE OR REPLACE FUNCTION get_cards_needing_questions(
    p_target_count INTEGER DEFAULT 4,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    card_id UUID,
    content TEXT,
    raw_content TEXT,
    repository_id UUID,
    current_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS card_id,
        c.content,
        c.raw_content,
        c.repository_id,
        COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) AS current_count
    FROM public.cards c
    LEFT JOIN public.card_questions cq ON cq.card_id = c.id
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.content, c.raw_content, c.repository_id
    HAVING COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) < p_target_count
    ORDER BY COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) ASC, c.updated_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_cards_needing_questions IS 'Ritorna cards con meno domande del target per batch generation';

-- Funzione per inserire domanda (usata dal batch generator)
CREATE OR REPLACE FUNCTION insert_card_question(
    p_card_id UUID,
    p_question_text TEXT,
    p_options JSONB,
    p_correct_answer TEXT,
    p_explanation TEXT,
    p_llm_provider TEXT,
    p_llm_model TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.card_questions (
        card_id,
        question_text,
        options,
        correct_answer,
        explanation,
        llm_provider,
        llm_model
    )
    VALUES (
        p_card_id,
        p_question_text,
        p_options,
        p_correct_answer,
        p_explanation,
        p_llm_provider::llm_provider,
        p_llm_model
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION insert_card_question IS 'Inserisce una domanda pre-generata per una card';

-- Funzione per ottenere domanda random per card (con shuffle)
CREATE OR REPLACE FUNCTION get_random_question_for_card(p_card_id UUID)
RETURNS TABLE (
    question_id UUID,
    question_text TEXT,
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    vote_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cq.id AS question_id,
        cq.question_text,
        cq.options,
        cq.correct_answer,
        cq.explanation,
        cq.vote_score
    FROM public.card_questions cq
    WHERE cq.card_id = p_card_id
      AND cq.is_active = TRUE
    ORDER BY cq.vote_score DESC, RANDOM()
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_random_question_for_card IS 'Ritorna una domanda random attiva per la card, preferendo quelle con vote_score alto';

-- Funzione per registrare/aggiornare voto
CREATE OR REPLACE FUNCTION upsert_question_vote(
    p_question_id UUID,
    p_user_id UUID,
    p_vote_value INTEGER
)
RETURNS TABLE (
    vote_id UUID,
    current_vote_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vote_id UUID;
    v_score INTEGER;
BEGIN
    -- Upsert del voto
    INSERT INTO public.question_votes (question_id, user_id, vote_value)
    VALUES (p_question_id, p_user_id, p_vote_value)
    ON CONFLICT (question_id, user_id)
    DO UPDATE SET vote_value = EXCLUDED.vote_value
    RETURNING id INTO v_vote_id;

    -- Ottieni score aggiornato
    SELECT cq.vote_score INTO v_score
    FROM public.card_questions cq
    WHERE cq.id = p_question_id;

    RETURN QUERY SELECT v_vote_id, v_score;
END;
$$;

COMMENT ON FUNCTION upsert_question_vote IS 'Inserisce o aggiorna voto utente su una domanda';

-- Funzione per ottenere cards studiabili (con almeno 1 domanda attiva)
CREATE OR REPLACE FUNCTION get_study_cards_with_questions(p_user_id UUID)
RETURNS TABLE (
    card_id UUID,
    repository_id UUID,
    file_path TEXT,
    title TEXT,
    content TEXT,
    raw_content TEXT,
    tags TEXT[],
    difficulty INTEGER,
    question_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS card_id,
        c.repository_id,
        c.file_path,
        c.title,
        c.content,
        c.raw_content,
        c.tags,
        c.difficulty,
        COUNT(cq.id) AS question_count
    FROM public.cards c
    JOIN public.user_repositories ur ON ur.repository_id = c.repository_id
    LEFT JOIN public.card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
    WHERE ur.user_id = p_user_id
      AND c.is_active = TRUE
    GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content, c.raw_content, c.tags, c.difficulty
    HAVING COUNT(cq.id) > 0
    ORDER BY c.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_study_cards_with_questions IS 'Ritorna cards studiabili (con almeno 1 domanda) per un utente';

-- ============================================
-- STEP 9: pg_cron e pg_net per batch scheduling
-- ============================================

-- Abilita estensioni se non già abilitate
-- NOTA: pg_cron e pg_net devono essere abilitati dal dashboard Supabase
-- In produzione, abilitare manualmente:
-- - Dashboard > Database > Extensions > pg_cron
-- - Dashboard > Database > Extensions > pg_net

-- Job pg_cron per generazione batch (da abilitare manualmente in produzione)
-- Il job chiama l'Edge Function question-generator ogni 30 minuti
--
-- Da eseguire dopo aver abilitato pg_cron e pg_net:
--
-- SELECT cron.schedule(
--     'generate-questions-batch',
--     '0,30 * * * *',  -- Ogni 30 minuti (0 e 30)
--     $$
--     SELECT net.http_post(
--         url := current_setting('app.settings.supabase_url') || '/functions/v1/question-generator',
--         headers := jsonb_build_object(
--             'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--             'Content-Type', 'application/json'
--         ),
--         body := '{"action": "generate_batch"}'::jsonb
--     );
--     $$
-- );
--
-- Per rimuovere il job:
-- SELECT cron.unschedule('generate-questions-batch');
--
-- Per verificare i job schedulati:
-- SELECT * FROM cron.job;

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE public.card_questions IS 'Domande pre-generate per studio. Milestone 12: Pre-generazione Domande in Batch';
