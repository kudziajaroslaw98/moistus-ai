-- Migration: Add Collaboration Tables
-- Version: 001
-- Date: December 2024
-- Description: Add tables for real-time collaboration features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mind map sharing table
CREATE TABLE mind_map_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_comment BOOLEAN DEFAULT TRUE,
    can_view BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
    shared_by UUID REFERENCES auth.users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(map_id, user_id)
);

-- User presence tracking table
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'away', 'offline')),
    cursor_x FLOAT,
    cursor_y FLOAT,
    viewport_x FLOAT,
    viewport_y FLOAT,
    zoom_level FLOAT DEFAULT 1.0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(255),
    user_color VARCHAR(7), -- Hex color for user identification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, map_id)
);

-- Activity tracking table
CREATE TABLE mind_map_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create_node', 'update_node', 'delete_node', 'move_node',
        'create_edge', 'update_edge', 'delete_edge',
        'create_comment', 'update_comment', 'delete_comment',
        'bulk_move', 'bulk_delete', 'bulk_create',
        'ai_generate', 'ai_suggest', 'ai_merge',
        'map_update', 'map_share', 'map_export'
    )),
    target_type VARCHAR(50), -- 'node', 'edge', 'comment', 'map', 'bulk'
    target_id UUID,
    change_data JSONB, -- Before/after data, diff information
    metadata JSONB, -- Additional context like batch info, AI prompts, etc.
    change_summary TEXT, -- Human-readable description
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node selections tracking
CREATE TABLE node_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    selection_type VARCHAR(20) DEFAULT 'selected' CHECK (selection_type IN ('selected', 'editing', 'hovering')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, node_id)
);

-- Collaboration sessions tracking
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    participant_count INTEGER DEFAULT 0,
    total_activities INTEGER DEFAULT 0,
    session_data JSONB, -- Summary statistics, peak users, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mind_map_shares_map_id ON mind_map_shares(map_id);
CREATE INDEX idx_mind_map_shares_user_id ON mind_map_shares(user_id);
CREATE INDEX idx_mind_map_shares_shared_by ON mind_map_shares(shared_by);
CREATE INDEX idx_mind_map_shares_role ON mind_map_shares(role);
CREATE INDEX idx_mind_map_shares_expires_at ON mind_map_shares(expires_at);

CREATE INDEX idx_user_presence_map_id ON user_presence(map_id);
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_activity ON user_presence(last_activity);

CREATE INDEX idx_activities_map_id ON mind_map_activities(map_id);
CREATE INDEX idx_activities_user_id ON mind_map_activities(user_id);
CREATE INDEX idx_activities_action_type ON mind_map_activities(action_type);
CREATE INDEX idx_activities_created_at ON mind_map_activities(created_at);
CREATE INDEX idx_activities_target ON mind_map_activities(target_type, target_id);

CREATE INDEX idx_node_selections_map_id ON node_selections(map_id);
CREATE INDEX idx_node_selections_user_id ON node_selections(user_id);
CREATE INDEX idx_node_selections_node_id ON node_selections(node_id);

CREATE INDEX idx_collaboration_sessions_map_id ON collaboration_sessions(map_id);
CREATE INDEX idx_collaboration_sessions_started_at ON collaboration_sessions(started_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE mind_map_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Mind map shares policies
CREATE POLICY "Users can view shares for maps they own or are shared with" ON mind_map_shares
    FOR SELECT USING (
        user_id = auth.uid() 
        OR map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Map owners can create shares" ON mind_map_shares
    FOR INSERT WITH CHECK (
        map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Map owners can update shares" ON mind_map_shares
    FOR UPDATE USING (
        map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Map owners can delete shares" ON mind_map_shares
    FOR DELETE USING (
        map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
    );

-- User presence policies
CREATE POLICY "Users can view presence for maps they have access to" ON user_presence
    FOR SELECT USING (
        map_id IN (
            SELECT id FROM mind_maps 
            WHERE user_id = auth.uid() 
            OR id IN (
                SELECT map_id FROM mind_map_shares 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert their own presence" ON user_presence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence" ON user_presence
    FOR DELETE USING (auth.uid() = user_id);

-- Activity policies
CREATE POLICY "Users can view activities for maps they have access to" ON mind_map_activities
    FOR SELECT USING (
        map_id IN (
            SELECT id FROM mind_maps 
            WHERE user_id = auth.uid() 
            OR id IN (
                SELECT map_id FROM mind_map_shares 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert activities for maps they have access to" ON mind_map_activities
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        map_id IN (
            SELECT id FROM mind_maps 
            WHERE user_id = auth.uid() 
            OR id IN (
                SELECT map_id FROM mind_map_shares 
                WHERE user_id = auth.uid() AND can_edit = true
            )
        )
    );

-- Node selections policies
CREATE POLICY "Users can view selections for maps they have access to" ON node_selections
    FOR SELECT USING (
        map_id IN (
            SELECT id FROM mind_maps 
            WHERE user_id = auth.uid() 
            OR id IN (
                SELECT map_id FROM mind_map_shares 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage their own selections" ON node_selections
    FOR ALL USING (auth.uid() = user_id);

-- Collaboration sessions policies
CREATE POLICY "Users can view sessions for maps they have access to" ON collaboration_sessions
    FOR SELECT USING (
        map_id IN (
            SELECT id FROM mind_maps 
            WHERE user_id = auth.uid() 
            OR id IN (
                SELECT map_id FROM mind_map_shares 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Map owners can manage collaboration sessions" ON collaboration_sessions
    FOR ALL USING (
        map_id IN (
            SELECT id FROM mind_maps WHERE user_id = auth.uid()
        )
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
CREATE TRIGGER update_user_presence_updated_at 
    BEFORE UPDATE ON user_presence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_map_shares_updated_at 
    BEFORE UPDATE ON mind_map_shares 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_selections_updated_at 
    BEFORE UPDATE ON node_selections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old presence data
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    -- Remove presence records older than 1 hour with offline status
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_activity < NOW() - INTERVAL '1 hour';
    
    -- Update stale presence records to offline
    UPDATE user_presence 
    SET status = 'offline' 
    WHERE status != 'offline' 
    AND last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old activities
CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS void AS $$
BEGIN
    -- Keep only activities from the last 30 days for performance
    DELETE FROM mind_map_activities 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old selections
CREATE OR REPLACE FUNCTION cleanup_old_selections()
RETURNS void AS $$
BEGIN
    -- Remove selections older than 1 hour
    DELETE FROM node_selections 
    WHERE updated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON mind_map_shares TO authenticated;
GRANT ALL ON user_presence TO authenticated;
GRANT ALL ON mind_map_activities TO authenticated;
GRANT ALL ON node_selections TO authenticated;
GRANT ALL ON collaboration_sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE mind_map_shares IS 'Manages sharing permissions for mind maps between users';
COMMENT ON TABLE user_presence IS 'Tracks real-time user presence and cursor positions in mind maps';
COMMENT ON TABLE mind_map_activities IS 'Logs all user activities and changes for collaboration tracking';
COMMENT ON TABLE node_selections IS 'Tracks which nodes users have selected for collaboration coordination';
COMMENT ON TABLE collaboration_sessions IS 'Tracks collaboration sessions for analytics and insights';

COMMENT ON COLUMN mind_map_shares.role IS 'User role for the shared map: owner, editor, commenter, viewer';
COMMENT ON COLUMN mind_map_shares.can_edit IS 'Whether user can edit nodes and structure of the map';
COMMENT ON COLUMN mind_map_shares.can_comment IS 'Whether user can add comments to the map';
COMMENT ON COLUMN mind_map_shares.expires_at IS 'Optional expiration date for the share';
COMMENT ON COLUMN user_presence.status IS 'User activity status: active, idle, away, offline';
COMMENT ON COLUMN user_presence.user_color IS 'Hex color code assigned to user for visual identification';
COMMENT ON COLUMN mind_map_activities.change_data IS 'JSON containing before/after state and diff information';
COMMENT ON COLUMN mind_map_activities.metadata IS 'Additional context like session info, AI parameters, etc.';