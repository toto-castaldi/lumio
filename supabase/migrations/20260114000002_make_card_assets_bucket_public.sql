-- Migration: Make card-assets bucket public
-- This enables stateless image URL resolution without signed URLs
-- Images are accessible via: {supabaseUrl}/storage/v1/object/public/card-assets/{path}

UPDATE storage.buckets
SET public = true
WHERE id = 'card-assets';
