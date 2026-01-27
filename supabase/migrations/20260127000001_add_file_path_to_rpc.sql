-- Lumio Milestone 13: Rispettare .lumioignore nel Backend
--
-- Questa migrazione aggiunge file_path alla RPC get_cards_needing_questions
-- per permettere il filtraggio .lumioignore lato backend

-- ============================================
-- STEP 1: Drop e ricrea get_cards_needing_questions
-- ============================================

-- Drop della funzione esistente (necessario per cambiare il return type)
DROP FUNCTION IF EXISTS get_cards_needing_questions(INTEGER, INTEGER);

CREATE FUNCTION get_cards_needing_questions(
    p_target_count INTEGER DEFAULT 4,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    card_id UUID,
    content TEXT,
    raw_content TEXT,
    file_path TEXT,
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
        c.file_path,
        c.repository_id,
        COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) AS current_count
    FROM public.cards c
    LEFT JOIN public.card_questions cq ON cq.card_id = c.id
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.content, c.raw_content, c.file_path, c.repository_id
    HAVING COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) < p_target_count
    ORDER BY COUNT(cq.id) FILTER (WHERE cq.is_active = TRUE) ASC, c.updated_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_cards_needing_questions IS 'Ritorna cards con meno domande del target per batch generation. Include file_path per filtro .lumioignore.';

-- ============================================
-- DONE
-- ============================================
