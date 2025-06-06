-- Migration: Add sharing tables for room codes and guest access
-- Version: 002
-- Description: Creates tables and functions for mind map sharing with room codes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Share tokens table for room codes and direct links
CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    token VARCHAR(6) UNIQUE NOT NULL, -- Room code (6 digits)
    token_type VARCHAR(20) DEFAULT 'room_code' CHECK (token_type IN ('room_code', 'direct_link')),
    share_link_hash VARCHAR(64) UNIQUE, -- For direct links
    permissions JSONB NOT NULL DEFAULT '{"role": "viewer", "can_edit": false, "can_comment": true, "can_view": true}',
    max_users INTEGER DEFAULT 50,
    current_users INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_permissions CHECK (
        permissions ? 'role' AND 
        permissions->>'role' IN ('owner', 'editor', 'commenter', 'viewer')
    )
);

-- Guest user sessions for non-registered users
CREATE TABLE guest_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    fingerprint_hash VARCHAR(64), -- Browser fingerprint for identification
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversion_date TIMESTAMP WITH TIME ZONE, -- When converted to registered user
    converted_user_id UUID REFERENCES auth.users(id),
    session_data JSONB DEFAULT '{}', -- Additional session metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Share access logs for analytics and tracking
CREATE TABLE share_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token_id UUID REFERENCES share_tokens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_user_id UUID REFERENCES guest_users(id) ON DELETE SET NULL,
    access_type VARCHAR(20) DEFAULT 'join' CHECK (access_type IN ('join', 'leave', 'view', 'edit', 'comment')),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_duration INTEGER, -- Duration in seconds for leave events
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_or_guest_required CHECK (
        (user_id IS NOT NULL AND guest_user_id IS NULL) OR
        (user_id IS NULL AND guest_user_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_share_tokens_map_id ON share_tokens(map_id);
CREATE INDEX idx_share_tokens_token ON share_tokens(token) WHERE is_active = true;
CREATE INDEX idx_share_tokens_hash ON share_tokens(share_link_hash) WHERE is_active = true;
CREATE INDEX idx_share_tokens_expires ON share_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_share_tokens_created_by ON share_tokens(created_by);
CREATE INDEX idx_share_tokens_active ON share_tokens(is_active, created_at);

CREATE INDEX idx_guest_users_session_id ON guest_users(session_id);
CREATE INDEX idx_guest_users_fingerprint ON guest_users(fingerprint_hash);
CREATE INDEX idx_guest_users_last_activity ON guest_users(last_activity);
CREATE INDEX idx_guest_users_converted ON guest_users(converted_user_id) WHERE converted_user_id IS NOT NULL;

CREATE INDEX idx_share_access_logs_token_id ON share_access_logs(share_token_id);
CREATE INDEX idx_share_access_logs_user_id ON share_access_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_share_access_logs_guest_id ON share_access_logs(guest_user_id) WHERE guest_user_id IS NOT NULL;
CREATE INDEX idx_share_access_logs_created_at ON share_access_logs(created_at);
CREATE INDEX idx_share_access_logs_access_type ON share_access_logs(access_type);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- Share tokens policies
CREATE POLICY "Map owners can manage share tokens" ON share_tokens
    FOR ALL USING (
        created_by = (select auth.uid())
        OR map_id IN (
            SELECT id FROM mind_maps WHERE user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can view active share tokens for accessible maps" ON share_tokens
    FOR SELECT USING (
        is_active = true AND (
            map_id IN (
                SELECT id FROM mind_maps WHERE user_id = (select auth.uid())
            )
            OR map_id IN (
                SELECT map_id FROM mind_map_shares WHERE user_id = (select auth.uid())
            )
        )
    );

-- Guest users policies
CREATE POLICY "Users can view their own guest session" ON guest_users
    FOR SELECT USING (session_id = current_setting('app.guest_session_id', true));

CREATE POLICY "Users can update their own guest session" ON guest_users
    FOR UPDATE USING (session_id = current_setting('app.guest_session_id', true));

CREATE POLICY "Guest users can insert their own session" ON guest_users
    FOR INSERT WITH CHECK (session_id = current_setting('app.guest_session_id', true));

CREATE POLICY "Map owners can view guest users for their maps" ON guest_users
    FOR SELECT USING (
        id IN (
            SELECT DISTINCT guest_user_id FROM share_access_logs sal
            JOIN share_tokens st ON sal.share_token_id = st.id
            WHERE st.map_id IN (
                SELECT id FROM mind_maps WHERE user_id = (select auth.uid())
            )
        )
    );

-- Share access logs policies
CREATE POLICY "Users can view access logs for their shared maps" ON share_access_logs
    FOR SELECT USING (
        share_token_id IN (
            SELECT id FROM share_tokens st
            WHERE st.map_id IN (
                SELECT id FROM mind_maps WHERE user_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "Users can log their own access" ON share_access_logs
    FOR INSERT WITH CHECK (
        (user_id = (select auth.uid()) AND guest_user_id IS NULL) OR
        (user_id IS NULL AND guest_user_id IN (
            SELECT id FROM guest_users 
            WHERE session_id = current_setting('app.guest_session_id', true)
        ))
    );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_share_tokens_updated_at
    BEFORE UPDATE ON share_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_users_updated_at
    BEFORE UPDATE ON guest_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS varchar(6) AS $$
DECLARE
    chars char(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar chars
    result varchar(6) := '';
    i integer;
    attempts integer := 0;
    max_attempts integer := 100;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM share_tokens WHERE token = result AND is_active = true) THEN
            RETURN result;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique room code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to validate share access
CREATE OR REPLACE FUNCTION validate_share_access(
    token_param varchar(6),
    user_id_param uuid DEFAULT NULL,
    guest_session_id_param varchar(255) DEFAULT NULL
)
RETURNS TABLE (
    share_token_id uuid,
    map_id uuid,
    permissions jsonb,
    is_valid boolean,
    error_message text
) AS $$
DECLARE
    share_record share_tokens%ROWTYPE;
BEGIN
    -- Get share token
    SELECT * INTO share_record
    FROM share_tokens
    WHERE token = token_param
    AND is_active = true;

    -- Check if token exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::uuid, NULL::uuid, NULL::jsonb, 
            false, 'Invalid or expired room code'::text;
        RETURN;
    END IF;

    -- Check if token is expired
    IF share_record.expires_at IS NOT NULL AND share_record.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            share_record.id, share_record.map_id, share_record.permissions,
            false, 'Room code has expired'::text;
        RETURN;
    END IF;

    -- Check user limit
    IF share_record.current_users >= share_record.max_users THEN
        RETURN QUERY SELECT 
            share_record.id, share_record.map_id, share_record.permissions,
            false, 'Room is full'::text;
        RETURN;
    END IF;

    -- Valid access
    RETURN QUERY SELECT 
        share_record.id, share_record.map_id, share_record.permissions,
        true, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
    -- Deactivate expired share tokens
    UPDATE share_tokens
    SET is_active = false, updated_at = NOW()
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = true;

    -- Clean up old guest users (inactive for more than 7 days)
    DELETE FROM guest_users
    WHERE last_activity < NOW() - INTERVAL '7 days'
    AND converted_user_id IS NULL;

    -- Clean up old access logs (older than 90 days)
    DELETE FROM share_access_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update current user count for share tokens
CREATE OR REPLACE FUNCTION update_share_token_user_count()
RETURNS void AS $$
BEGIN
    UPDATE share_tokens st
    SET current_users = (
        SELECT COUNT(DISTINCT COALESCE(up.user_id::text, gu.session_id))
        FROM user_presence up
        LEFT JOIN guest_users gu ON up.user_id IS NULL
        JOIN share_access_logs sal ON (
            sal.user_id = up.user_id OR sal.guest_user_id = gu.id
        )
        WHERE sal.share_token_id = st.id
        AND up.map_id = st.map_id
        AND up.status IN ('active', 'idle')
        AND up.last_activity > NOW() - INTERVAL '5 minutes'
    )
    WHERE st.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON share_tokens TO authenticated;
GRANT ALL ON guest_users TO authenticated;
GRANT ALL ON share_access_logs TO authenticated;
GRANT EXECUTE ON FUNCTION generate_room_code() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_share_access(varchar, uuid, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION update_share_token_user_count() TO authenticated;

-- Grant permissions for anonymous users (guest access)
GRANT SELECT ON share_tokens TO anon;
GRANT INSERT, SELECT, UPDATE ON guest_users TO anon;
GRANT INSERT ON share_access_logs TO anon;
GRANT EXECUTE ON FUNCTION validate_share_access(varchar, uuid, varchar) TO anon;

-- Comments for documentation
COMMENT ON TABLE share_tokens IS 'Manages room codes and direct share links for mind maps';
COMMENT ON TABLE guest_users IS 'Tracks temporary guest user sessions for shared map access';
COMMENT ON TABLE share_access_logs IS 'Logs all sharing access events for analytics and auditing';