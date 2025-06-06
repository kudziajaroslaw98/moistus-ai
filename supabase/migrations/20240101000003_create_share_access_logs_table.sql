-- Create share_access_logs table for tracking access to shared maps
CREATE TABLE IF NOT EXISTS share_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_token_id UUID NOT NULL REFERENCES share_tokens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    guest_user_id UUID REFERENCES guest_users(id),
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('join', 'leave', 'view', 'edit', 'comment')),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_duration INTEGER, -- in seconds
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either user_id or guest_user_id is set, but not both
    CONSTRAINT check_user_or_guest CHECK (
        (user_id IS NOT NULL AND guest_user_id IS NULL) OR 
        (user_id IS NULL AND guest_user_id IS NOT NULL)
    )
);

-- Create indexes for analytics and performance
CREATE INDEX idx_access_logs_token_id ON share_access_logs(share_token_id);
CREATE INDEX idx_access_logs_created_at ON share_access_logs(created_at);
CREATE INDEX idx_access_logs_access_type ON share_access_logs(access_type);
CREATE INDEX idx_access_logs_user_id ON share_access_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_access_logs_guest_user_id ON share_access_logs(guest_user_id) WHERE guest_user_id IS NOT NULL;

-- Create composite index for common queries
CREATE INDEX idx_access_logs_token_type_created ON share_access_logs(share_token_id, access_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Map owner can view all logs, participants can view their own
CREATE POLICY "Users can view relevant access logs" ON share_access_logs
    FOR SELECT
    USING (
        -- Map owner can see all logs for their maps
        EXISTS (
            SELECT 1 FROM share_tokens st
            JOIN mind_maps m ON st.map_id = m.id
            WHERE st.id = share_access_logs.share_token_id
            AND m.user_id = (SELECT auth.uid())
        )
        -- Or user can see their own logs
        OR user_id = (SELECT auth.uid())
        -- Or guest can see their own logs (via session context)
        OR (guest_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM guest_users gu
            WHERE gu.id = share_access_logs.guest_user_id
            AND gu.session_id = current_setting('app.current_session_id', true)
        ))
    );

-- INSERT: Public for logging access (but validated in application)
CREATE POLICY "Public insert for access logging" ON share_access_logs
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: No one can update logs (immutable)
-- No UPDATE policy means no updates allowed

-- DELETE: Only admins can delete (for GDPR compliance)
CREATE POLICY "Only admins can delete logs" ON share_access_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (SELECT auth.uid())
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Function to anonymize IP address for GDPR compliance
CREATE OR REPLACE FUNCTION anonymize_ip(ip INET)
RETURNS INET AS $$
DECLARE
    ip_text TEXT;
    parts TEXT[];
BEGIN
    IF ip IS NULL THEN
        RETURN NULL;
    END IF;
    
    ip_text := host(ip);
    
    -- Check if IPv6
    IF position(':' in ip_text) > 0 THEN
        -- IPv6: Keep first 3 segments (48 bits)
        parts := string_to_array(ip_text, ':');
        RETURN (array_to_string(parts[1:3], ':') || '::/48')::inet;
    ELSE
        -- IPv4: Zero out last octet
        parts := string_to_array(ip_text, '.');
        parts[4] := '0';
        RETURN array_to_string(parts, '.')::inet;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to log access with automatic IP anonymization
CREATE OR REPLACE FUNCTION log_share_access(
    p_share_token_id UUID,
    p_user_id UUID,
    p_guest_user_id UUID,
    p_access_type TEXT,
    p_ip_address INET,
    p_user_agent TEXT,
    p_referrer TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_anonymized_ip INET;
BEGIN
    -- Anonymize IP address
    v_anonymized_ip := anonymize_ip(p_ip_address);
    
    -- Insert log entry
    INSERT INTO share_access_logs (
        share_token_id,
        user_id,
        guest_user_id,
        access_type,
        ip_address,
        user_agent,
        referrer,
        metadata
    ) VALUES (
        p_share_token_id,
        p_user_id,
        p_guest_user_id,
        p_access_type,
        v_anonymized_ip,
        p_user_agent,
        p_referrer,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    -- Update user count for join/leave events
    IF p_access_type = 'join' THEN
        UPDATE share_tokens
        SET current_users = current_users + 1
        WHERE id = p_share_token_id;
    ELSIF p_access_type = 'leave' THEN
        UPDATE share_tokens
        SET current_users = GREATEST(current_users - 1, 0)
        WHERE id = p_share_token_id;
    END IF;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate session duration on leave
CREATE OR REPLACE FUNCTION calculate_session_duration(
    p_user_id UUID,
    p_guest_user_id UUID,
    p_share_token_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_join_time TIMESTAMP WITH TIME ZONE;
    v_duration INTEGER;
BEGIN
    -- Find the most recent join event
    SELECT created_at INTO v_join_time
    FROM share_access_logs
    WHERE share_token_id = p_share_token_id
    AND access_type = 'join'
    AND (
        (user_id = p_user_id AND p_user_id IS NOT NULL) OR
        (guest_user_id = p_guest_user_id AND p_guest_user_id IS NOT NULL)
    )
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_join_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate duration in seconds
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_join_time))::INTEGER;
    
    RETURN v_duration;
END;
$$ LANGUAGE plpgsql;

-- Create view for access analytics
CREATE OR REPLACE VIEW share_access_analytics AS
SELECT
    st.map_id,
    st.token,
    st.token_type,
    sal.access_type,
    DATE_TRUNC('hour', sal.created_at) as hour,
    COUNT(*) as event_count,
    COUNT(DISTINCT COALESCE(sal.user_id::TEXT, sal.guest_user_id::TEXT)) as unique_users,
    AVG(sal.session_duration) as avg_session_duration
FROM share_access_logs sal
JOIN share_tokens st ON sal.share_token_id = st.id
GROUP BY st.map_id, st.token, st.token_type, sal.access_type, DATE_TRUNC('hour', sal.created_at);

-- Grant permissions on the view
GRANT SELECT ON share_access_analytics TO authenticated;

-- Add comment
COMMENT ON TABLE share_access_logs IS 'Audit log for tracking access to shared mind maps via room codes and share links';
COMMENT ON FUNCTION anonymize_ip IS 'Anonymizes IP addresses for GDPR compliance by masking the last segment';
COMMENT ON FUNCTION log_share_access IS 'Logs share access events with automatic IP anonymization and user count updates';