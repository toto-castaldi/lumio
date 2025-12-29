-- Lumio Phase 2: Auth Trigger
-- Automatically creates a user profile when someone signs up via OAuth

-- ============================================
-- HANDLE NEW USER FUNCTION
-- ============================================

-- Function to handle new user signup
-- Extracts profile data from OAuth provider metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        -- Try full_name first (Google), then name as fallback
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER
-- ============================================

-- Trigger that fires after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile from OAuth provider metadata';
-- Note: Cannot add comment on auth.users trigger (permission denied)
