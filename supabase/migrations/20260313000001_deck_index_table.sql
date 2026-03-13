-- Migration: Create deck_index table with fulltext search
-- Phase 41 Plan 01 Task 1
-- Provides: deck_index table with tsvector/GIN, tags GIN index, updated_at trigger

-- Immutable function to build the weighted search vector for deck_index.
-- Required because generated columns need IMMUTABLE expressions, but
-- array_to_string() and to_tsvector(text, text) are only STABLE.
-- This is safe because we always use the 'simple' config (no mutable catalog state)
-- and array_to_string behavior is deterministic for TEXT[].
CREATE OR REPLACE FUNCTION public.deck_index_search_vector(
    p_display_name TEXT,
    p_tags TEXT[],
    p_description TEXT
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT
        setweight(to_tsvector('simple'::regconfig, coalesce(p_display_name, '')), 'A') ||
        setweight(to_tsvector('simple'::regconfig, coalesce(array_to_string(p_tags, ' '), '')), 'B') ||
        setweight(to_tsvector('simple'::regconfig, coalesce(p_description, '')), 'C');
$$;

-- Table: deck_index
-- Stores searchable metadata for each deck (subfolder) in a repository.
-- Populated by docora-webhook when deck.yaml files are detected (Phase 42).
CREATE TABLE public.deck_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    subfolder_path TEXT NOT NULL,  -- always stored WITH trailing '/', e.g. 'italian-vocabulary/'
    display_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    author TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'en',
    search_vector tsvector GENERATED ALWAYS AS (
        public.deck_index_search_vector(display_name, tags, description)
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(repository_id, subfolder_path)
);

-- Index: GIN on search_vector for fulltext search queries
CREATE INDEX idx_deck_index_search_vector ON public.deck_index USING GIN(search_vector);

-- Index: GIN on tags for tag filtering via @> operator
CREATE INDEX idx_deck_index_tags ON public.deck_index USING GIN(tags);

-- Index: B-tree on repository_id for webhook lookup by repository
CREATE INDEX idx_deck_index_repository_id ON public.deck_index(repository_id);

-- Trigger: auto-update updated_at on row modification (reuses existing function)
CREATE TRIGGER set_deck_index_updated_at
    BEFORE UPDATE ON public.deck_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable row-level security
ALTER TABLE public.deck_index ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can search/read the deck index
CREATE POLICY "Authenticated users can view deck index"
    ON public.deck_index
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role has full access (for edge functions / docora-webhook upserts)
CREATE POLICY "Service role has full access to deck index"
    ON public.deck_index
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.deck_index IS
    'Searchable index of all decks across repositories. Populated from deck.yaml files by docora-webhook.';

COMMENT ON COLUMN public.deck_index.subfolder_path IS
    'Path to the deck subfolder within the repository, always stored WITH trailing slash (e.g. ''italian-vocabulary/''). Used with LIKE pattern for card filtering.';

COMMENT ON COLUMN public.deck_index.search_vector IS
    'Auto-generated tsvector for fulltext search. Weighted: A=display_name, B=tags, C=description. Uses ''simple'' config via deck_index_search_vector() for multilingual support (no stemming).';
