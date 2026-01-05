-- Platform configuration table for centralized AI settings
-- Part of Phase 10: Centralize AI API Keys

CREATE TABLE public.platform_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_platform_config_updated_at
    BEFORE UPDATE ON platform_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: SELECT for authenticated users, no UPDATE/INSERT for regular users
-- (Admin modifies via Supabase Studio)
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform config"
    ON platform_config FOR SELECT TO authenticated USING (true);

-- Default values
INSERT INTO platform_config (key, value) VALUES
    ('llm_provider', '"anthropic"'),
    ('llm_model', '"claude-3-5-haiku-latest"'),
    ('system_prompt', '"Sei un assistente educativo esperto. Il tuo compito è aiutare gli studenti a verificare la loro comprensione dei concetti attraverso quiz interattivi. Genera domande chiare e pertinenti basate sul contenuto fornito. Valuta le risposte in modo costruttivo, fornendo feedback utile per l''apprendimento."');
