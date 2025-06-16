-- Create collaboration_activities table for tracking all collaborative actions
CREATE TABLE IF NOT EXISTS collaboration_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
        'create_node', 'update_node', 'delete_node', 'move_node',
        'create_edge', 'update_edge', 'delete_edge',
        'create_comment', 'update_comment', 'delete_comment',
        'bulk_move', 'bulk_delete', 'bulk_create',
        'ai_generate', 'ai_suggest', 'ai_merge',
        'map_update', 'map_share', 'map_export'
    )),
    target_type VARCHAR(20) CHECK (target_type IN ('node', 'edge', 'comment', 'map', 'bulk')),
    target_id UUID,
    change_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    change_summary TEXT,
    session_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_activities_map_id ON collaboration_activities(map_id);
CREATE INDEX idx_activities_user_id ON collaboration_activities(user_id);
CREATE INDEX idx_activities_created_at ON collaboration_activities(created_at DESC);
CREATE INDEX idx_activities_action_type ON collaboration_activities(action_type);
CREATE INDEX idx_activities_target ON collaboration_activities(target_type, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_activities_session ON collaboration_activities(session_id) WHERE session_id IS NOT NULL;

-- Create composite indexes for common queries
CREATE INDEX idx_activities_map_created ON collaboration_activities(map_id, created_at DESC);
CREATE INDEX idx_activities_map_user_created ON collaboration_activities(map_id, user_id, created_at DESC);
CREATE INDEX idx_activities_map_action_created ON collaboration_activities(map_id, action_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE collaboration_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can view activities for maps they have access to
CREATE POLICY "Users can view activities for accessible maps" ON collaboration_activities
    FOR SELECT
    USING (
        check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- INSERT: Users can create activities for maps they have access to
CREATE POLICY "Users can create activities for accessible maps" ON collaboration_activities
    FOR INSERT
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- UPDATE: No one can update activities (immutable log)
-- No UPDATE policy means no updates allowed

-- DELETE: Only admins can delete (for GDPR compliance)
CREATE POLICY "Only admins can delete activities" ON collaboration_activities
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (SELECT auth.uid())
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Function to log activity with automatic enrichment
CREATE OR REPLACE FUNCTION log_activity(
    p_map_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_change_data JSONB DEFAULT '{}'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_change_summary TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_user_data JSONB;
BEGIN
    -- Get user profile data
    SELECT json_build_object(
        'display_name', COALESCE(raw_user_meta_data->>'full_name', email),
        'email', email,
        'avatar_url', raw_user_meta_data->>'avatar_url'
    ) INTO v_user_data
    FROM auth.users
    WHERE id = p_user_id;
    
    -- Merge user data into metadata
    p_metadata := p_metadata || json_build_object('user_profile', v_user_data);
    
    -- Insert activity
    INSERT INTO collaboration_activities (
        map_id,
        user_id,
        action_type,
        target_type,
        target_id,
        change_data,
        metadata,
        change_summary,
        session_id
    ) VALUES (
        p_map_id,
        p_user_id,
        p_action_type,
        p_target_type,
        p_target_id,
        p_change_data,
        p_metadata,
        p_change_summary,
        p_session_id
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to batch log activities
CREATE OR REPLACE FUNCTION log_activities_batch(
    p_activities JSONB[]
)
RETURNS UUID[] AS $$
DECLARE
    v_activity JSONB;
    v_activity_ids UUID[] := ARRAY[]::UUID[];
    v_activity_id UUID;
BEGIN
    FOREACH v_activity IN ARRAY p_activities
    LOOP
        v_activity_id := log_activity(
            (v_activity->>'map_id')::UUID,
            (v_activity->>'user_id')::UUID,
            v_activity->>'action_type',
            v_activity->>'target_type',
            (v_activity->>'target_id')::UUID,
            COALESCE(v_activity->'change_data', '{}'::jsonb),
            COALESCE(v_activity->'metadata', '{}'::jsonb),
            v_activity->>'change_summary',
            v_activity->>'session_id'
        );
        v_activity_ids := array_append(v_activity_ids, v_activity_id);
    END LOOP;
    
    RETURN v_activity_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get activity summary for a map
CREATE OR REPLACE FUNCTION get_activity_summary(
    p_map_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    action_type VARCHAR(30),
    action_count BIGINT,
    unique_users BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.action_type,
        COUNT(*) as action_count,
        COUNT(DISTINCT ca.user_id) as unique_users,
        MAX(ca.created_at) as last_activity
    FROM collaboration_activities ca
    WHERE ca.map_id = p_map_id
    AND ca.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY ca.action_type
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity timeline
CREATE OR REPLACE FUNCTION get_user_activity_timeline(
    p_map_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    activity_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    action_type VARCHAR(30),
    target_type VARCHAR(20),
    target_id UUID,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id as activity_id,
        ca.user_id,
        ca.metadata->'user_profile'->>'display_name' as user_name,
        ca.metadata->'user_profile'->>'avatar_url' as user_avatar,
        ca.action_type,
        ca.target_type,
        ca.target_id,
        ca.change_summary,
        ca.created_at
    FROM collaboration_activities ca
    WHERE ca.map_id = p_map_id
    ORDER BY ca.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for grouped activities
CREATE OR REPLACE VIEW activity_groups AS
WITH grouped_activities AS (
    SELECT
        map_id,
        user_id,
        action_type,
        target_type,
        DATE_TRUNC('minute', created_at) as minute_bucket,
        COUNT(*) as action_count,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action,
        ARRAY_AGG(id ORDER BY created_at) as activity_ids,
        ARRAY_AGG(target_id) FILTER (WHERE target_id IS NOT NULL) as target_ids
    FROM collaboration_activities
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY map_id, user_id, action_type, target_type, minute_bucket
    HAVING COUNT(*) > 1
)
SELECT
    map_id,
    user_id,
    action_type,
    target_type,
    minute_bucket,
    action_count,
    first_action,
    last_action,
    activity_ids,
    target_ids,
    CASE 
        WHEN action_count = 2 THEN action_type || ' (2 times)'
        ELSE action_type || ' (' || action_count || ' times)'
    END as summary
FROM grouped_activities;

-- Grant permissions on the view
GRANT SELECT ON activity_groups TO authenticated;

-- Create trigger for real-time activity notifications
CREATE OR REPLACE FUNCTION notify_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify channel about new activity
    PERFORM pg_notify(
        'activity_created',
        json_build_object(
            'activity_id', NEW.id,
            'map_id', NEW.map_id,
            'user_id', NEW.user_id,
            'action_type', NEW.action_type,
            'target_type', NEW.target_type,
            'target_id', NEW.target_id,
            'timestamp', NEW.created_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
CREATE TRIGGER activity_notification_trigger
    AFTER INSERT ON collaboration_activities
    FOR EACH ROW
    EXECUTE FUNCTION notify_activity();

-- Create function to clean up old activities
CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS void AS $$
BEGIN
    -- Archive activities older than 90 days to a separate table
    -- For now, just delete them (in production, you'd want to archive)
    DELETE FROM collaboration_activities
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE collaboration_activities IS 'Tracks all collaborative actions performed on mind maps for activity feeds and analytics';
COMMENT ON FUNCTION log_activity IS 'Logs a single activity with automatic user profile enrichment';
COMMENT ON FUNCTION log_activities_batch IS 'Efficiently logs multiple activities in a single transaction';
COMMENT ON FUNCTION get_activity_summary IS 'Returns aggregated activity statistics for a mind map within a time range';
COMMENT ON FUNCTION get_user_activity_timeline IS 'Returns paginated activity timeline with user information for display in activity feeds';
COMMENT ON VIEW activity_groups IS 'Provides grouped view of rapid consecutive activities for cleaner activity feeds';