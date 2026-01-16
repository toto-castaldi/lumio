-- Lumio: Shared Repositories Architecture
--
-- Questa migrazione trasforma l'architettura da "repository per-utente" a "repository condivisi".
--
-- CAMBIAMENTI:
-- 1. Nuova tabella user_repositories (many-to-many utente-repository)
-- 2. Rimozione user_id da repositories (ora condivisi)
-- 3. Constraints UNIQUE su url e docora_repository_id (non più per-utente)
-- 4. Nuove RLS policies basate su user_repositories
--
-- NOTA: Questa migrazione NON preserva i dati esistenti.
-- I repository esistenti verranno persi. Applicare solo in ambiente non-production.

-- ============================================
-- STEP 1: Creare tabella user_repositories
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, repository_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_repositories_user_id
    ON public.user_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_repositories_repository_id
    ON public.user_repositories(repository_id);

-- Commenti
COMMENT ON TABLE public.user_repositories IS
    'Relazione many-to-many tra utenti e repository condivisi';
COMMENT ON COLUMN public.user_repositories.user_id IS
    'Utente che ha aggiunto questo repository alla propria libreria';
COMMENT ON COLUMN public.user_repositories.repository_id IS
    'Repository condiviso';

-- ============================================
-- STEP 2: Pulire dati esistenti (non siamo live)
-- ============================================

-- Eliminare tutti i repository esistenti (cascata elimina cards, assets, ecc.)
TRUNCATE public.repositories CASCADE;

-- ============================================
-- STEP 3: Droppare TUTTE le vecchie policies che dipendono da user_id
-- ============================================

-- Policies su repositories
DROP POLICY IF EXISTS "Users can view own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can insert own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can update own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can delete own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can manage own repositories" ON public.repositories;

-- Policies su cards che dipendono da repositories.user_id
DROP POLICY IF EXISTS "Users can view cards from own repositories" ON public.cards;
DROP POLICY IF EXISTS "Service role can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Service role can update cards" ON public.cards;
DROP POLICY IF EXISTS "Service role can delete cards" ON public.cards;

-- Policies su card_assets che dipendono da repositories.user_id
DROP POLICY IF EXISTS "Users can view assets of own cards" ON public.card_assets;

-- Policies su webhook_chunks che dipendono da repositories.user_id
DROP POLICY IF EXISTS "Users can view own chunks" ON public.webhook_chunks;

-- ============================================
-- STEP 4: Modificare tabella repositories
-- ============================================

-- Rimuovere vecchi constraint
ALTER TABLE public.repositories
    DROP CONSTRAINT IF EXISTS repositories_user_id_url_key;
ALTER TABLE public.repositories
    DROP CONSTRAINT IF EXISTS unique_user_docora_repo;

-- Rimuovere colonna user_id (ora in user_repositories)
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS user_id;

-- Aggiungere constraint UNIQUE su url (globale, non per-utente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'repositories_url_key'
    ) THEN
        ALTER TABLE public.repositories
            ADD CONSTRAINT repositories_url_key UNIQUE (url);
    END IF;
END $$;

-- Aggiungere constraint UNIQUE su docora_repository_id (globale)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'repositories_docora_repository_id_key'
    ) THEN
        ALTER TABLE public.repositories
            ADD CONSTRAINT repositories_docora_repository_id_key UNIQUE (docora_repository_id);
    END IF;
END $$;

-- ============================================
-- STEP 4: Aggiornare RLS Policies per repositories
-- ============================================

-- Rimuovere vecchie policies
DROP POLICY IF EXISTS "Users can manage own repositories" ON public.repositories;
DROP POLICY IF EXISTS "Users can view subscribed repositories" ON public.repositories;
DROP POLICY IF EXISTS "Service role can manage repositories" ON public.repositories;

-- Nuova policy: utenti vedono repository a cui sono iscritti
CREATE POLICY "Users can view subscribed repositories"
    ON public.repositories FOR SELECT
    USING (
        id IN (
            SELECT repository_id
            FROM public.user_repositories
            WHERE user_id = auth.uid()
        )
    );

-- Policy: utenti autenticati possono creare nuovi repository
-- (La creazione del link user_repositories è controllata separatamente)
CREATE POLICY "Authenticated users can insert repositories"
    ON public.repositories FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Service role può gestire tutto (per Edge Functions)
CREATE POLICY "Service role can manage repositories"
    ON public.repositories FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 5: RLS Policies per user_repositories
-- ============================================

ALTER TABLE public.user_repositories ENABLE ROW LEVEL SECURITY;

-- Utenti possono vedere le proprie iscrizioni
CREATE POLICY "Users can view own subscriptions"
    ON public.user_repositories FOR SELECT
    USING (user_id = auth.uid());

-- Utenti possono aggiungere iscrizioni per se stessi
CREATE POLICY "Users can add own subscriptions"
    ON public.user_repositories FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Utenti possono rimuovere le proprie iscrizioni
CREATE POLICY "Users can remove own subscriptions"
    ON public.user_repositories FOR DELETE
    USING (user_id = auth.uid());

-- Service role può gestire tutto
CREATE POLICY "Service role can manage user_repositories"
    ON public.user_repositories FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 6: Aggiornare RLS Policies per cards
-- ============================================

-- Rimuovere vecchie policies
DROP POLICY IF EXISTS "Users can view cards from own repositories" ON public.cards;
DROP POLICY IF EXISTS "Users can view cards from subscribed repositories" ON public.cards;

-- Nuova policy: utenti vedono cards dai repository a cui sono iscritti
CREATE POLICY "Users can view cards from subscribed repositories"
    ON public.cards FOR SELECT
    USING (
        repository_id IN (
            SELECT repository_id
            FROM public.user_repositories
            WHERE user_id = auth.uid()
        )
    );

-- Service role può gestire cards (per webhook)
DROP POLICY IF EXISTS "Service role can manage cards" ON public.cards;
CREATE POLICY "Service role can manage cards"
    ON public.cards FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 7: Aggiornare RLS Policies per card_assets
-- ============================================

-- Rimuovere vecchie policies
DROP POLICY IF EXISTS "Users can view assets of own cards" ON public.card_assets;
DROP POLICY IF EXISTS "Users can view assets from subscribed repositories" ON public.card_assets;

-- Nuova policy: utenti vedono assets dai repository a cui sono iscritti
CREATE POLICY "Users can view assets from subscribed repositories"
    ON public.card_assets FOR SELECT
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

-- Service role può gestire card_assets (per webhook)
DROP POLICY IF EXISTS "Service role can manage card_assets" ON public.card_assets;
CREATE POLICY "Service role can manage card_assets"
    ON public.card_assets FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- STEP 8: Aggiornare webhook_chunks policies
-- ============================================

-- Nuova policy: utenti vedono chunks dai repository a cui sono iscritti
CREATE POLICY "Users can view chunks from subscribed repositories"
    ON public.webhook_chunks FOR SELECT
    USING (
        repository_id IN (
            SELECT repository_id
            FROM public.user_repositories
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 9: Funzioni SECURITY DEFINER per Edge Functions
-- ============================================
-- Le RLS policies non funzionano correttamente con il client Supabase JS in Edge Functions.
-- Usiamo funzioni SECURITY DEFINER per bypassare RLS in modo controllato.

-- Function per inserire un repository
CREATE OR REPLACE FUNCTION insert_repository(
    p_url TEXT,
    p_name TEXT,
    p_is_private BOOLEAN,
    p_docora_repository_id TEXT,
    p_format_version INTEGER,
    p_sync_status TEXT,
    p_sync_error_message TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result repositories;
BEGIN
    INSERT INTO repositories (url, name, is_private, docora_repository_id, format_version, sync_status, sync_error_message)
    VALUES (p_url, p_name, p_is_private, p_docora_repository_id, p_format_version, p_sync_status::sync_status, p_sync_error_message)
    RETURNING * INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

-- Function per inserire link user-repository
CREATE OR REPLACE FUNCTION insert_user_repository(
    p_user_id UUID,
    p_repository_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result user_repositories;
BEGIN
    INSERT INTO user_repositories (user_id, repository_id)
    VALUES (p_user_id, p_repository_id)
    RETURNING * INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

-- Function per verificare se user ha già il repository
CREATE OR REPLACE FUNCTION check_user_repository_exists(
    p_user_id UUID,
    p_repository_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_repositories
        WHERE user_id = p_user_id AND repository_id = p_repository_id
    );
END;
$$;

-- Function per trovare repository by URL
CREATE OR REPLACE FUNCTION find_repository_by_url(p_url TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result repositories;
BEGIN
    SELECT * INTO v_result FROM repositories WHERE url = p_url;
    IF FOUND THEN
        RETURN row_to_json(v_result);
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE public.repositories IS
    'Repository Git condivisi tra utenti. Ogni URL esiste una sola volta nel sistema.';
