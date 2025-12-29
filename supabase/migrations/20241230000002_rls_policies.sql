-- Lumio Phase 2: Row Level Security Policies
-- Enables RLS and creates policies for user data isolation

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (needed for trigger)
CREATE POLICY "Users can insert own profile"
    ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- USER API KEYS POLICIES
-- ============================================

-- Users can manage (SELECT, INSERT, UPDATE, DELETE) their own API keys
CREATE POLICY "Users can manage own API keys"
    ON user_api_keys
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view own profile" ON users IS 'Ensures users can only read their own profile data';
COMMENT ON POLICY "Users can update own profile" ON users IS 'Ensures users can only modify their own profile';
COMMENT ON POLICY "Users can insert own profile" ON users IS 'Allows profile creation during signup';
COMMENT ON POLICY "Users can manage own API keys" ON user_api_keys IS 'Full CRUD access to own API keys only';
