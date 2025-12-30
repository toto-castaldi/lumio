-- Lumio Phase 3: Repositories and Cards
-- Creates tables for Git repository management and flashcard storage

-- ============================================
-- TABLES
-- ============================================

-- Repositories table (Git repositories containing flashcards)
CREATE TABLE public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    encrypted_access_token TEXT,  -- PAT for private repos (encrypted)
    format_version INTEGER NOT NULL DEFAULT 1,
    last_commit_sha TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status sync_status DEFAULT 'pending',
    sync_error_message TEXT,
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each user can only have one entry per repository URL
    UNIQUE(user_id, url)
);

-- Indexes for repositories
CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_repositories_sync_status ON repositories(sync_status);

-- Trigger for updated_at
CREATE TRIGGER set_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cards table (flashcards imported from repositories)
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,  -- Relative path in repository
    content_hash TEXT NOT NULL,  -- SHA-256 hash for change detection
    raw_content TEXT NOT NULL,  -- Original file content (complete markdown with frontmatter)
    title TEXT NOT NULL,
    content TEXT NOT NULL,  -- Parsed Markdown body (without frontmatter)
    tags TEXT[] NOT NULL DEFAULT '{}',
    difficulty INTEGER DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
    language TEXT DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,  -- False if removed from repo
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each card is uniquely identified by repository + file path
    UNIQUE(repository_id, file_path)
);

-- Indexes for cards
CREATE INDEX idx_cards_repository_id ON cards(repository_id);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);
CREATE INDEX idx_cards_is_active ON cards(is_active);
CREATE INDEX idx_cards_content_hash ON cards(content_hash);

-- Trigger for updated_at
CREATE TRIGGER set_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Repositories: Users can manage their own repositories
CREATE POLICY "Users can view own repositories"
    ON repositories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories"
    ON repositories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories"
    ON repositories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories"
    ON repositories FOR DELETE
    USING (auth.uid() = user_id);

-- Cards: Users can view cards from their own repositories
CREATE POLICY "Users can view cards from own repositories"
    ON cards FOR SELECT
    USING (
        repository_id IN (
            SELECT id FROM repositories WHERE user_id = auth.uid()
        )
    );

-- Cards: Service role can manage all cards (for git-sync edge function)
CREATE POLICY "Service role can insert cards"
    ON cards FOR INSERT
    WITH CHECK (
        (SELECT auth.jwt() ->> 'role') = 'service_role'
        OR repository_id IN (
            SELECT id FROM repositories WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can update cards"
    ON cards FOR UPDATE
    USING (
        (SELECT auth.jwt() ->> 'role') = 'service_role'
        OR repository_id IN (
            SELECT id FROM repositories WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can delete cards"
    ON cards FOR DELETE
    USING (
        (SELECT auth.jwt() ->> 'role') = 'service_role'
        OR repository_id IN (
            SELECT id FROM repositories WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE repositories IS 'Git repositories containing Lumio flashcard decks';
COMMENT ON TABLE cards IS 'Flashcards imported from Git repositories';
COMMENT ON COLUMN repositories.url IS 'Full URL to the Git repository (e.g., https://github.com/user/repo)';
COMMENT ON COLUMN repositories.sync_status IS 'Current sync status: pending, syncing, synced, error';
COMMENT ON COLUMN repositories.card_count IS 'Denormalized count of active cards for dashboard performance';
COMMENT ON COLUMN cards.file_path IS 'Relative path of the markdown file within the repository';
COMMENT ON COLUMN cards.content_hash IS 'SHA-256 hash of raw file content for detecting changes';
COMMENT ON COLUMN cards.raw_content IS 'Original complete file content (frontmatter + body) as fetched from Git';
COMMENT ON COLUMN cards.content IS 'Parsed markdown body without YAML frontmatter, ready for display';
COMMENT ON COLUMN cards.is_active IS 'False if the card file was removed from the repository';
