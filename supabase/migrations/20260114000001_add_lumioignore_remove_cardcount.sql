-- Lumio: Add lumioignore support, remove card_count
--
-- Changes:
-- 1. Add lumioignore_content column to store .lumioignore file content
-- 2. Drop card_count column (now calculated dynamically by Deck class)
-- 3. Drop increment/decrement_card_count RPC functions

-- ============================================
-- ADD LUMIOIGNORE CONTENT COLUMN
-- ============================================

ALTER TABLE public.repositories
    ADD COLUMN IF NOT EXISTS lumioignore_content TEXT;

COMMENT ON COLUMN public.repositories.lumioignore_content IS
    'Content of .lumioignore file for filtering cards. NULL if no .lumioignore exists.';

-- ============================================
-- DROP CARD_COUNT COLUMN
-- ============================================

-- card_count is now calculated dynamically by the Deck class
-- which filters cards based on .lumioignore patterns
ALTER TABLE public.repositories
    DROP COLUMN IF EXISTS card_count;

-- ============================================
-- DROP RPC FUNCTIONS
-- ============================================

-- These functions are no longer needed since card_count is calculated dynamically
DROP FUNCTION IF EXISTS public.increment_card_count(UUID);
DROP FUNCTION IF EXISTS public.decrement_card_count(UUID);
