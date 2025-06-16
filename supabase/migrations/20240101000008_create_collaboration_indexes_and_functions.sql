-- Additional indexes and helper functions for collaboration and sharing features

-- ============================================================================
-- ADDITIONAL COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding active room codes by map
CREATE INDEX idx_share_tokens_map_active ON share_tokens(map_id, is_active, expires_at)
    WHERE token_type = 'room_code' AND is_active = true;

-- Index for guest user activity tracking
CREATE INDEX idx_guest_users_activity ON guest_users(last_activity, converted_user_id)
    WHERE converted_user_id IS NULL;

-- Index for efficient permission lookups
CREATE INDEX idx_map_shares_permission_check ON mind_map_shares(user_id, map_id, role)
    WHERE expires_at IS NULL OR expires_at > NOW();

-- Index for finding recent activities by user
CREATE INDEX idx_activities_user_recent ON collaboration_activities(user_id, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '7 days';

-- Index for presence queries by map
CREATE INDEX idx_presence_active_by_map ON collaboration_presence(map_id, status, user_id)
    WHERE status IN ('active', 'idle');

-- ============================================================================
-- HELPER FUNCTIONS FOR ROOM CODE OPERATIONS
-- ============================================================================

-- Function to get room code statistics
CREATE OR REPLACE FUNCTION get_room_code_stats(p_map_id UUID)
RETURNS TABLE (
    total_codes_created INTEGER,
    active_codes INTEGER,
    total_joins INTEGER,
    unique_users INTEGER,
    guest_users INTEGER,
    converted_guests INTEGER,
    avg_session_duration INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    WITH code_stats AS (
        SELECT 
            COUNT(*) as total_codes,
            COUNT(*) FILTER (WHERE is_active AND (expires_at IS NULL OR expires_at > NOW())) as active_codes
        FROM share_tokens
        WHERE map_id = p_map_id AND token_type = 'room_code'
    ),
    access_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE sal.access_type = 'join') as total_joins,
            COUNT(DISTINCT COALESCE(sal.user_id, sal.guest_user_id)) as unique_users,
            COUNT(DISTINCT sal.guest_user_id) as guest_users,
            COUNT(DISTINCT gu.id) FILTER (WHERE gu.converted_user_id IS NOT NULL) as converted_guests,
            AVG(sal.session_duration) * INTERVAL '1 second' as avg_duration
        FROM share_access_logs sal
        JOIN share_tokens st ON sal.share_token_id = st.id
        LEFT JOIN guest_users gu ON sal.guest_user_id = gu.id
        WHERE st.map_id = p_map_id
    )
    SELECT 
        cs.total_codes::INTEGER,
        cs.active_codes::INTEGER,
        COALESCE(as_.total_joins, 0)::INTEGER,
        COALESCE(as_.unique_users, 0)::INTEGER,
        COALESCE(as_.guest_users, 0)::INTEGER,
        COALESCE(as_.converted_guests, 0)::INTEGER,
        COALESCE(as_.avg_duration, INTERVAL '0 seconds')
    FROM code_stats cs
    CROSS JOIN access_stats as_;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and format room code
CREATE OR REPLACE FUNCTION validate_room_code(p_code TEXT)
RETURNS TEXT AS $$
DECLARE
    v_formatted TEXT;
BEGIN
    -- Remove any spaces and convert to uppercase
    v_formatted := UPPER(REPLACE(p_code, ' ', ''));
    
    -- Check if it matches the pattern XXX-XXX
    IF v_formatted !~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN
        -- Try to add dash if missing
        IF v_formatted ~ '^[A-Z0-9]{6}$' THEN
            v_formatted := SUBSTR(v_formatted, 1, 3) || '-' || SUBSTR(v_formatted, 4, 3);
        ELSE
            RETURN NULL; -- Invalid format
        END IF;
    END IF;
    
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- ============================================================================

-- View for map sharing overview
CREATE OR REPLACE VIEW map_sharing_overview AS
SELECT 
    m.id as map_id,
    m.title as map_title,
    m.user_id as owner_id,
    COUNT(DISTINCT ms.user_id) as direct_shares,
    COUNT(DISTINCT st.id) FILTER (WHERE st.token_type = 'room_code') as room_codes_created,
    COUNT(DISTINCT st.id) FILTER (WHERE st.is_active AND (st.expires_at IS NULL OR st.expires_at > NOW())) as active_room_codes,
    COUNT(DISTINCT sal.user_id) FILTER (WHERE sal.user_id IS NOT NULL) as registered_visitors,
    COUNT(DISTINCT sal.guest_user_id) FILTER (WHERE sal.guest_user_id IS NOT NULL) as guest_visitors,
    MAX(sal.created_at) as last_access
FROM mind_maps m
LEFT JOIN mind_map_shares ms ON m.id = ms.map_id
LEFT JOIN share_tokens st ON m.id = st.map_id
LEFT JOIN share_access_logs sal ON st.id = sal.share_token_id
GROUP BY m.id, m.title, m.user_id;

-- Grant permissions
GRANT SELECT ON map_sharing_overview TO authenticated;

-- View for user collaboration summary
CREATE OR REPLACE VIEW user_collaboration_summary AS
WITH user_stats AS (
    SELECT 
        u.id as user_id,
        u.email as user_email,
        u.raw_user_meta_data->>'full_name' as user_name,
        COUNT(DISTINCT m.id) as owned_maps,
        COUNT(DISTINCT ms.map_id) as shared_maps,
        COUNT(DISTINCT ca.id) as total_activities,
        COUNT(DISTINCT cp.map_id) FILTER (WHERE cp.status != 'offline') as active_sessions
    FROM auth.users u
    LEFT JOIN mind_maps m ON u.id = m.user_id
    LEFT JOIN mind_map_shares ms ON u.id = ms.user_id
    LEFT JOIN collaboration_activities ca ON u.id = ca.user_id AND ca.created_at > NOW() - INTERVAL '30 days'
    LEFT JOIN collaboration_presence cp ON u.id = cp.user_id
    GROUP BY u.id, u.email, u.raw_user_meta_data
)
SELECT * FROM user_stats;

-- Grant permissions
GRANT SELECT ON user_collaboration_summary TO authenticated;

-- ============================================================================
-- FUNCTIONS FOR GUEST USER OPERATIONS
-- ============================================================================

-- Function to get guest user statistics
CREATE OR REPLACE FUNCTION get_guest_conversion_funnel(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_guests BIGINT,
    active_guests BIGINT,
    converted_guests BIGINT,
    conversion_rate NUMERIC,
    avg_time_to_conversion INTERVAL,
    most_common_entry_maps TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH guest_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE last_activity > NOW() - INTERVAL '7 days') as active,
            COUNT(*) FILTER (WHERE converted_user_id IS NOT NULL) as converted,
            AVG(CASE 
                WHEN converted_user_id IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (conversion_date - first_seen))
                ELSE NULL 
            END) as avg_conversion_seconds
        FROM guest_users
        WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    ),
    entry_maps AS (
        SELECT 
            st.map_id,
            m.title,
            COUNT(DISTINCT gu.id) as guest_count
        FROM guest_users gu
        JOIN share_access_logs sal ON gu.id = sal.guest_user_id
        JOIN share_tokens st ON sal.share_token_id = st.id
        JOIN mind_maps m ON st.map_id = m.id
        WHERE sal.access_type = 'join'
        AND gu.created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY st.map_id, m.title
        ORDER BY guest_count DESC
        LIMIT 5
    )
    SELECT 
        gs.total,
        gs.active,
        gs.converted,
        CASE 
            WHEN gs.total > 0 
            THEN ROUND((gs.converted::NUMERIC / gs.total) * 100, 2)
            ELSE 0 
        END as conversion_rate,
        CASE 
            WHEN gs.avg_conversion_seconds IS NOT NULL
            THEN (gs.avg_conversion_seconds || ' seconds')::INTERVAL
            ELSE NULL
        END as avg_time_to_conversion,
        ARRAY_AGG(em.title ORDER BY em.guest_count DESC) as most_common_entry_maps
    FROM guest_stats gs
    CROSS JOIN entry_maps em
    GROUP BY gs.total, gs.active, gs.converted, gs.avg_conversion_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- ============================================================================

-- Function to perform all cleanup operations
CREATE OR REPLACE FUNCTION perform_collaboration_cleanup()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
    v_deleted_count INTEGER;
BEGIN
    -- Clean up expired tokens
    DELETE FROM share_tokens
    WHERE expires_at < NOW() AND is_active = true;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('expired_tokens', v_deleted_count);
    
    -- Clean up old guest sessions
    PERFORM cleanup_old_guest_sessions();
    
    -- Clean up stale presence
    PERFORM cleanup_stale_presence();
    
    -- Clean up stale selections
    PERFORM cleanup_stale_selections();
    
    -- Update presence statuses
    PERFORM update_presence_status();
    
    -- Clean up old activities
    DELETE FROM collaboration_activities
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('old_activities', v_deleted_count);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get collaboration metrics for a time period
CREATE OR REPLACE FUNCTION get_collaboration_metrics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Active users
    SELECT 
        'active_users'::TEXT,
        COUNT(DISTINCT user_id)::NUMERIC,
        'users'::TEXT
    FROM collaboration_activities
    WHERE created_at BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    -- Total activities
    SELECT 
        'total_activities'::TEXT,
        COUNT(*)::NUMERIC,
        'activities'::TEXT
    FROM collaboration_activities
    WHERE created_at BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    -- Room codes created
    SELECT 
        'room_codes_created'::TEXT,
        COUNT(*)::NUMERIC,
        'codes'::TEXT
    FROM share_tokens
    WHERE token_type = 'room_code'
    AND created_at BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    -- Guest sessions
    SELECT 
        'guest_sessions'::TEXT,
        COUNT(*)::NUMERIC,
        'sessions'::TEXT
    FROM guest_users
    WHERE created_at BETWEEN p_start_date AND p_end_date
    
    UNION ALL
    
    -- Average concurrent users
    SELECT 
        'avg_concurrent_users'::TEXT,
        ROUND(AVG(user_count), 2)::NUMERIC,
        'users'::TEXT
    FROM (
        SELECT 
            DATE_TRUNC('hour', last_activity) as hour,
            COUNT(DISTINCT user_id) as user_count
        FROM collaboration_presence
        WHERE last_activity BETWEEN p_start_date AND p_end_date
        AND status IN ('active', 'idle')
        GROUP BY DATE_TRUNC('hour', last_activity)
    ) hourly_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOBS SETUP (to be configured in Supabase dashboard)
-- ============================================================================

-- Note: These cron jobs should be set up in the Supabase dashboard or via API
-- They are documented here for reference

-- Every minute: Update presence status
-- SELECT cron.schedule('update-presence-status', '* * * * *', 'SELECT update_presence_status();');

-- Every 10 minutes: Clean up stale data
-- SELECT cron.schedule('cleanup-stale-data', '*/10 * * * *', 'SELECT perform_collaboration_cleanup();');

-- Daily at 3 AM: Generate analytics
-- SELECT cron.schedule('generate-analytics', '0 3 * * *', 'SELECT generate_daily_analytics();');

-- Add comments
COMMENT ON FUNCTION get_room_code_stats IS 'Returns comprehensive statistics about room code usage for a mind map';
COMMENT ON FUNCTION validate_room_code IS 'Validates and formats a room code input, returning NULL if invalid';
COMMENT ON VIEW map_sharing_overview IS 'Provides a high-level overview of sharing activity for all mind maps';
COMMENT ON VIEW user_collaboration_summary IS 'Summarizes collaboration statistics for each user';
COMMENT ON FUNCTION get_guest_conversion_funnel IS 'Analyzes guest user conversion metrics over a specified time period';
COMMENT ON FUNCTION perform_collaboration_cleanup IS 'Performs all cleanup operations for collaboration data';
COMMENT ON FUNCTION get_collaboration_metrics IS 'Returns key collaboration metrics for a specified time period';