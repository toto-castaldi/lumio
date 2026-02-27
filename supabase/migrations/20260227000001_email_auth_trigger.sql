-- Phase 27: Provider-aware auth trigger
-- Replaces the original handle_new_user function (from 20241230000003_auth_trigger.sql)
-- to handle both Google OAuth and email/password signups.
--
-- Google OAuth: uses raw_user_meta_data for display_name and avatar_url (unchanged behavior)
-- Email signup: derives display_name from email prefix (separators -> spaces, title case)
--               and generates avatar_url via ui-avatars.com with Lumio brand color
--
-- The existing on_auth_user_created trigger already references this function name,
-- so we only replace the function body -- no trigger recreation needed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _provider TEXT;
    _display_name TEXT;
    _avatar_url TEXT;
    _email_prefix TEXT;
BEGIN
    -- Detect auth provider from app metadata
    _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

    IF _provider = 'google' THEN
        -- Google OAuth path: extract from provider metadata (preserves existing behavior)
        _display_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        );
        _avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    ELSE
        -- Email signup path: derive display_name from email prefix
        _email_prefix := split_part(COALESCE(NEW.email, ''), '@', 1);

        -- Replace dots, underscores, hyphens with spaces, then title case
        _display_name := initcap(
            replace(
                replace(
                    replace(_email_prefix, '.', ' '),
                    '_', ' '
                ),
                '-', ' '
            )
        );

        -- Generate avatar URL with Lumio brand color (purple #7C3AED)
        _avatar_url := 'https://ui-avatars.com/api/?name='
            || replace(_display_name, ' ', '+')
            || '&background=7C3AED&color=fff&size=128&bold=true';
    END IF;

    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        _display_name,
        _avatar_url
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment to reflect both providers
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup. Google OAuth: uses provider metadata. Email: derives display_name from email prefix (title case) and generates ui-avatars.com avatar with Lumio brand color.';
