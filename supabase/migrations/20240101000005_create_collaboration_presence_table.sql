-- Create collaboration_presence table for real-time user presence tracking
CREATE TABLE IF NOT EXISTS collaboration_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'idle', 'away', 'offline')) DEFAULT 'active',
    cursor_x FLOAT,
    cursor_y FLOAT,
    viewport_x FLOAT,
    viewport_y FLOAT,
    zoom_level FLOAT CHECK (zoom_level IS NULL OR (zoom_level >= 0.1 AND zoom_level <= 5)),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(128),
    user_color VARCHAR(7) CHECK (user_color IS NULL OR user_color ~* '^#[0-9A-Fa-f]{6}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One presence record per user per map
    UNIQUE(user_id, map_id)
);

-- Create indexes for real-time queries
CREATE INDEX idx_presence_map_id ON collaboration_presence(map_id) WHERE status != 'offline';
CREATE INDEX idx_presence_user_id ON collaboration_presence(user_id);
CREATE INDEX idx_presence_last_activity ON collaboration_presence(last_activity);
CREATE INDEX idx_presence_status ON collaboration_presence(status) WHERE status != 'offline';

-- Create composite index for active presence queries
CREATE INDEX idx_presence_map_active ON collaboration_presence(map_id, status, last_activity DESC) 
    WHERE status IN ('active', 'idle');

-- Create trigger for updated_at (reuse function from previous migration)
CREATE TRIGGER update_collaboration_presence_updated_at BEFORE UPDATE ON collaboration_presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE collaboration_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can see presence for maps they have access to
CREATE POLICY "Users can view presence for accessible maps" ON collaboration_presence
    FOR SELECT
    USING (
        -- User can see their own presence
        user_id = (SELECT auth.uid())
        -- Or user has access to the map
        OR check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- INSERT: Users can create their own presence
CREATE POLICY "Users can create own presence" ON collaboration_presence
    FOR INSERT
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- UPDATE: Users can update their own presence
CREATE POLICY "Users can update own presence" ON collaboration_presence
    FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Users can delete their own presence
CREATE POLICY "Users can delete own presence" ON collaboration_presence
    FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Function to automatically transition presence status based on activity
CREATE OR REPLACE FUNCTION update_presence_status()
RETURNS void AS $$
BEGIN
    -- Set to idle if no activity for 5 minutes
    UPDATE collaboration_presence
    SET status = 'idle'
    WHERE status = 'active'
    AND last_activity < NOW() - INTERVAL '5 minutes';
    
    -- Set to away if no activity for 15 minutes
    UPDATE collaboration_presence
    SET status = 'away'
    WHERE status IN ('active', 'idle')
    AND last_activity < NOW() - INTERVAL '15 minutes';
    
    -- Set to offline if no activity for 30 minutes
    UPDATE collaboration_presence
    SET status = 'offline'
    WHERE status != 'offline'
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale presence records
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    -- Delete offline presence records older than 1 hour
    DELETE FROM collaboration_presence
    WHERE status = 'offline'
    AND last_activity < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users for a map
CREATE OR REPLACE FUNCTION get_active_map_users(p_map_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_avatar TEXT,
    status VARCHAR(20),
    cursor_x FLOAT,
    cursor_y FLOAT,
    viewport_x FLOAT,
    viewport_y FLOAT,
    zoom_level FLOAT,
    user_color VARCHAR(7),
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.user_id,
        COALESCE(au.raw_user_meta_data->>'full_name', au.email) as user_name,
        au.email as user_email,
        au.raw_user_meta_data->>'avatar_url' as user_avatar,
        cp.status,
        cp.cursor_x,
        cp.cursor_y,
        cp.viewport_x,
        cp.viewport_y,
        cp.zoom_level,
        cp.user_color,
        cp.last_activity
    FROM collaboration_presence cp
    JOIN auth.users au ON cp.user_id = au.id
    WHERE cp.map_id = p_map_id
    AND cp.status != 'offline'
    ORDER BY cp.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign a unique color to a user for a session
CREATE OR REPLACE FUNCTION assign_user_color(p_map_id UUID, p_user_id UUID)
RETURNS VARCHAR(7) AS $$
DECLARE
    v_colors TEXT[] := ARRAY['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#FD79A8', '#A29BFE'];
    v_used_colors TEXT[];
    v_available_color TEXT;
    v_user_index INTEGER;
BEGIN
    -- Get colors currently in use for this map
    SELECT ARRAY_AGG(user_color) INTO v_used_colors
    FROM collaboration_presence
    WHERE map_id = p_map_id
    AND status != 'offline'
    AND user_color IS NOT NULL
    AND user_id != p_user_id;
    
    -- Find first available color
    FOREACH v_available_color IN ARRAY v_colors
    LOOP
        IF v_available_color != ALL(COALESCE(v_used_colors, ARRAY[]::TEXT[])) THEN
            RETURN v_available_color;
        END IF;
    END LOOP;
    
    -- If all colors are taken, generate one based on user ID
    v_user_index := (hashtext(p_user_id::TEXT) % 360)::INTEGER;
    RETURN '#' || to_hex((v_user_index * 1000000 + 6710886) % 16777216);
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to update presence status (requires pg_cron extension)
-- This should be set up separately in Supabase dashboard or via API
-- Example: SELECT cron.schedule('update-presence-status', '*/1 * * * *', 'SELECT update_presence_status();');
-- Example: SELECT cron.schedule('cleanup-stale-presence', '*/10 * * * *', 'SELECT cleanup_stale_presence();');

-- Create trigger function for real-time presence updates
CREATE OR REPLACE FUNCTION handle_presence_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify channel about presence update
    PERFORM pg_notify(
        'presence_update',
        json_build_object(
            'map_id', NEW.map_id,
            'user_id', NEW.user_id,
            'status', NEW.status,
            'cursor_x', NEW.cursor_x,
            'cursor_y', NEW.cursor_y,
            'action', TG_OP
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time updates
CREATE TRIGGER presence_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON collaboration_presence
    FOR EACH ROW
    EXECUTE FUNCTION handle_presence_update();

-- Add comments
COMMENT ON TABLE collaboration_presence IS 'Tracks real-time presence of users collaborating on mind maps';
COMMENT ON FUNCTION update_presence_status IS 'Automatically transitions user status based on inactivity thresholds';
COMMENT ON FUNCTION cleanup_stale_presence IS 'Removes old offline presence records to keep table size manageable';
COMMENT ON FUNCTION get_active_map_users IS 'Returns all active users currently viewing or editing a specific mind map';
COMMENT ON FUNCTION assign_user_color IS 'Assigns a unique color to a user for visual distinction in collaborative sessions';