-- =============================================================================
-- Migration: unsubscribe_deck RPC
-- Phase 46: Shared Deck Interaction
-- Creates a SECURITY DEFINER function that atomically deletes both
-- card_review_schedule entries and the user_repositories subscription row
-- for a given deck (repository + subfolder).
-- =============================================================================

CREATE OR REPLACE FUNCTION unsubscribe_deck(
  p_repository_id UUID,
  p_subfolder_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Step 1: Delete card_review_schedule entries for cards in this deck's subfolder
  DELETE FROM card_review_schedule crs
  USING cards c
  WHERE crs.card_id = c.id
    AND crs.user_id = v_user_id
    AND c.repository_id = p_repository_id
    AND c.file_path LIKE p_subfolder_path || '%';

  -- Step 2: Delete the subscription row
  DELETE FROM user_repositories
  WHERE user_id = v_user_id
    AND repository_id = p_repository_id
    AND subfolder_path = p_subfolder_path;
END;
$$;

COMMENT ON FUNCTION unsubscribe_deck IS 'Atomically unsubscribes from a deck: deletes card_review_schedule entries for all cards in the subfolder, then removes the user_repositories subscription row. Uses auth.uid() for user identification.';
