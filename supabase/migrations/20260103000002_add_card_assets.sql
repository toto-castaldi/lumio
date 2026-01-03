-- Migration: Add card_assets table for storing images from repositories
-- This enables unified image handling for both public and private repositories

-- =============================================================================
-- TABLE: card_assets
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    original_path TEXT NOT NULL,        -- Original path in markdown (e.g., /assets/img/diagram.png)
    storage_path TEXT NOT NULL,         -- Path in Supabase Storage (e.g., user_id/repo_id/hash.png)
    content_hash TEXT NOT NULL,         -- SHA-256 of image content for deduplication
    mime_type TEXT NOT NULL,            -- e.g., image/png, image/jpeg
    size_bytes INTEGER,                 -- File size in bytes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(card_id, original_path)      -- A card cannot have two mappings for the same path
);

COMMENT ON TABLE public.card_assets IS 'Stores images/assets downloaded from repositories and saved to Supabase Storage';
COMMENT ON COLUMN public.card_assets.original_path IS 'Original path as referenced in markdown content';
COMMENT ON COLUMN public.card_assets.storage_path IS 'Path in Supabase Storage bucket card-assets';
COMMENT ON COLUMN public.card_assets.content_hash IS 'SHA-256 hash of file content for deduplication';

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_card_assets_card_id ON public.card_assets(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assets_content_hash ON public.card_assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_card_assets_storage_path ON public.card_assets(storage_path);

-- =============================================================================
-- RLS POLICIES for card_assets
-- =============================================================================

ALTER TABLE public.card_assets ENABLE ROW LEVEL SECURITY;

-- Users can view assets of their own cards
CREATE POLICY "Users can view assets of own cards"
ON public.card_assets FOR SELECT
USING (
    card_id IN (
        SELECT c.id FROM public.cards c
        JOIN public.repositories r ON c.repository_id = r.id
        WHERE r.user_id = auth.uid()
    )
);

-- Service role can manage all assets (used by Edge Functions)
CREATE POLICY "Service role can manage card_assets"
ON public.card_assets FOR ALL
USING (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
);

-- =============================================================================
-- STORAGE BUCKET: card-assets
-- =============================================================================

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'card-assets',
    'card-assets',
    false,  -- Private bucket, requires authentication
    10485760, -- 10MB max per image
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- RLS POLICIES for Storage
-- =============================================================================

-- Policy: Users can view assets in their folder (user_id is first folder segment)
-- Note: We check if the first folder matches the user's ID
CREATE POLICY "Users can view own assets in card-assets"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'card-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role can manage all assets
CREATE POLICY "Service role can manage card-assets"
ON storage.objects FOR ALL
USING (
    bucket_id = 'card-assets' AND
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
);
