-- Create guest_users table for temporary users joining via room codes
CREATE TABLE IF NOT EXISTS guest_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(128) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    fingerprint_hash VARCHAR(64),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversion_date TIMESTAMP WITH TIME ZONE,
    converted_user_id UUID REFERENCES auth.users(id),
    session_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure email is valid if provided
    CONSTRAINT check_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    
    -- Ensure display name is not empty
    CONSTRAINT check_display_name CHECK (char_length(trim(display_name)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_guest_users_session_id ON guest_users(session_id);
CREATE INDEX idx_guest_users_email ON guest_users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_users_converted ON guest_users(converted_user_id) WHERE converted_user_id IS NOT NULL;
CREATE INDEX idx_guest_users_last_activity ON guest_users(last_activity);
CREATE INDEX idx_guest_users_fingerprint ON guest_users(fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;

-- Create trigger for updated_at (reuse function from previous migration)
CREATE TRIGGER update_guest_users_updated_at BEFORE UPDATE ON guest_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Public for session validation
CREATE POLICY "Public read for session validation" ON guest_users
    FOR SELECT
    USING (true);

-- INSERT: Public for guest creation
CREATE POLICY "Public insert for guest creation" ON guest_users
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Only the guest session or authenticated users can update
CREATE POLICY "Guests can update own session" ON guest_users
    FOR UPDATE
    USING (
        -- Allow if session_id matches (set via app context)
        session_id = current_setting('app.current_session_id', true)
        -- Or if it's an authenticated user updating their converted guest record
        OR (converted_user_id = (SELECT auth.uid()) AND converted_user_id IS NOT NULL)
        -- Or if it's an authenticated user and no conversion has happened yet
        OR ((SELECT auth.uid()) IS NOT NULL AND converted_user_id IS NULL)
    )
    WITH CHECK (
        session_id = current_setting('app.current_session_id', true)
        OR (converted_user_id = (SELECT auth.uid()) AND converted_user_id IS NOT NULL)
        OR ((SELECT auth.uid()) IS NOT NULL AND converted_user_id IS NULL)
    );

-- DELETE: Only admins can delete (for cleanup)
CREATE POLICY "Only admins can delete guest users" ON guest_users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (SELECT auth.uid())
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Function to clean up old guest sessions
CREATE OR REPLACE FUNCTION cleanup_old_guest_sessions()
RETURNS void AS $$
BEGIN
    -- Delete guest sessions older than 30 days that haven't been converted
    DELETE FROM guest_users
    WHERE last_activity < NOW() - INTERVAL '30 days'
    AND converted_user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- This should be set up separately in Supabase dashboard or via API
-- Example: SELECT cron.schedule('cleanup-guest-sessions', '0 3 * * *', 'SELECT cleanup_old_guest_sessions();');

-- Function to generate avatar URL
CREATE OR REPLACE FUNCTION generate_avatar_url(p_seed TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Using DiceBear API for avatar generation
    RETURN 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || 
           encode(digest(p_seed, 'sha256'), 'hex') || 
           '&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON TABLE guest_users IS 'Stores temporary guest user sessions for users joining via room codes without registration';