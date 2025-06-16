-- Create mind_map_shares table for direct user-to-user sharing
CREATE TABLE IF NOT EXISTS mind_map_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_comment BOOLEAN NOT NULL DEFAULT true,
    can_view BOOLEAN NOT NULL DEFAULT true,
    shared_by UUID NOT NULL REFERENCES auth.users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate shares for the same user and map
    UNIQUE(map_id, user_id),
    
    -- Ensure permissions align with role
    CONSTRAINT check_role_permissions CHECK (
        (role = 'owner' AND can_edit = true AND can_comment = true AND can_view = true) OR
        (role = 'editor' AND can_edit = true AND can_comment = true AND can_view = true) OR
        (role = 'commenter' AND can_edit = false AND can_comment = true AND can_view = true) OR
        (role = 'viewer' AND can_edit = false AND can_view = true)
    ),
    
    -- Ensure user doesn't share with themselves
    CONSTRAINT check_not_self_share CHECK (user_id != shared_by)
);

-- Create indexes for performance
CREATE INDEX idx_map_shares_map_id ON mind_map_shares(map_id);
CREATE INDEX idx_map_shares_user_id ON mind_map_shares(user_id);
CREATE INDEX idx_map_shares_shared_by ON mind_map_shares(shared_by);
CREATE INDEX idx_map_shares_expires_at ON mind_map_shares(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_map_shares_role ON mind_map_shares(role);

-- Create composite index for permission checks
CREATE INDEX idx_map_shares_user_map_active ON mind_map_shares(user_id, map_id) 
    WHERE expires_at IS NULL OR expires_at > NOW();

-- Create trigger for updated_at (reuse function from previous migration)
CREATE TRIGGER update_mind_map_shares_updated_at BEFORE UPDATE ON mind_map_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mind_map_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can see shares they created, received, or for maps they own
CREATE POLICY "Users can view relevant shares" ON mind_map_shares
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid()) -- User is the recipient
        OR shared_by = (SELECT auth.uid()) -- User created the share
        OR EXISTS ( -- User owns the map
            SELECT 1 FROM mind_maps
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
    );

-- INSERT: Map owners and users with share permission can create shares
CREATE POLICY "Authorized users can create shares" ON mind_map_shares
    FOR INSERT
    WITH CHECK (
        -- User owns the map
        EXISTS (
            SELECT 1 FROM mind_maps
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
        -- Or user has permission to share (editor role or explicit share permission)
        OR EXISTS (
            SELECT 1 FROM mind_map_shares
            WHERE map_id = mind_map_shares.map_id
            AND user_id = (SELECT auth.uid())
            AND role IN ('owner', 'editor')
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- UPDATE: Only map owner or share creator can update
CREATE POLICY "Authorized users can update shares" ON mind_map_shares
    FOR UPDATE
    USING (
        shared_by = (SELECT auth.uid()) -- User created the share
        OR EXISTS ( -- User owns the map
            SELECT 1 FROM mind_maps
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        shared_by = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM mind_maps
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
    );

-- DELETE: Only map owner or share creator can delete
CREATE POLICY "Authorized users can delete shares" ON mind_map_shares
    FOR DELETE
    USING (
        shared_by = (SELECT auth.uid()) -- User created the share
        OR EXISTS ( -- User owns the map
            SELECT 1 FROM mind_maps
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
    );

-- Function to check user's effective permissions on a map
CREATE OR REPLACE FUNCTION check_user_map_permission(
    p_user_id UUID,
    p_map_id UUID,
    p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_can_edit BOOLEAN;
    v_can_comment BOOLEAN;
    v_can_view BOOLEAN;
BEGIN
    -- Check if user owns the map
    IF EXISTS (SELECT 1 FROM mind_maps WHERE id = p_map_id AND user_id = p_user_id) THEN
        RETURN true;
    END IF;
    
    -- Check direct shares
    SELECT role, can_edit, can_comment, can_view
    INTO v_role, v_can_edit, v_can_comment, v_can_view
    FROM mind_map_shares
    WHERE map_id = p_map_id 
        AND user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
        CASE role 
            WHEN 'owner' THEN 1 
            WHEN 'editor' THEN 2 
            WHEN 'commenter' THEN 3 
            WHEN 'viewer' THEN 4 
        END
    LIMIT 1;
    
    IF FOUND THEN
        CASE p_action
            WHEN 'view' THEN RETURN v_can_view;
            WHEN 'comment' THEN RETURN v_can_comment;
            WHEN 'edit' THEN RETURN v_can_edit;
            WHEN 'share' THEN RETURN v_role IN ('owner', 'editor');
            WHEN 'delete' THEN RETURN v_role = 'owner';
            ELSE RETURN false;
        END CASE;
    END IF;
    
    -- Check token-based access (for logged-in users using room codes)
    IF EXISTS (
        SELECT 1 FROM share_access_logs sal
        JOIN share_tokens st ON sal.share_token_id = st.id
        WHERE st.map_id = p_map_id
            AND sal.user_id = p_user_id
            AND sal.access_type = 'join'
            AND st.is_active = true
            AND (st.expires_at IS NULL OR st.expires_at > NOW())
            AND sal.created_at > NOW() - INTERVAL '24 hours' -- Recent access
    ) THEN
        SELECT 
            CASE p_action
                WHEN 'view' THEN (st.permissions->>'can_view')::boolean
                WHEN 'comment' THEN (st.permissions->>'can_comment')::boolean
                WHEN 'edit' THEN (st.permissions->>'can_edit')::boolean
                ELSE false
            END INTO v_can_view
        FROM share_access_logs sal
        JOIN share_tokens st ON sal.share_token_id = st.id
        WHERE st.map_id = p_map_id
            AND sal.user_id = p_user_id
            AND sal.access_type = 'join'
            AND st.is_active = true
            AND (st.expires_at IS NULL OR st.expires_at > NOW())
        ORDER BY sal.created_at DESC
        LIMIT 1;
        
        RETURN COALESCE(v_can_view, false);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync permissions with role changes
CREATE OR REPLACE FUNCTION sync_share_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update permissions based on role
    CASE NEW.role
        WHEN 'owner' THEN
            NEW.can_edit := true;
            NEW.can_comment := true;
            NEW.can_view := true;
        WHEN 'editor' THEN
            NEW.can_edit := true;
            NEW.can_comment := true;
            NEW.can_view := true;
        WHEN 'commenter' THEN
            NEW.can_edit := false;
            NEW.can_comment := true;
            NEW.can_view := true;
        WHEN 'viewer' THEN
            NEW.can_edit := false;
            NEW.can_comment := false;
            NEW.can_view := true;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync permissions on role change
CREATE TRIGGER sync_share_permissions_trigger
    BEFORE INSERT OR UPDATE OF role ON mind_map_shares
    FOR EACH ROW
    EXECUTE FUNCTION sync_share_permissions();

-- Create view for user's accessible maps
CREATE OR REPLACE VIEW user_accessible_maps AS
SELECT DISTINCT
    m.id,
    m.title,
    m.description,
    m.user_id as owner_id,
    CASE 
        WHEN m.user_id = (SELECT auth.uid()) THEN 'owner'
        ELSE COALESCE(ms.role, 'viewer')
    END as user_role,
    COALESCE(ms.can_edit, m.user_id = (SELECT auth.uid())) as can_edit,
    COALESCE(ms.can_comment, true) as can_comment,
    COALESCE(ms.can_view, true) as can_view,
    m.created_at,
    m.updated_at,
    ms.shared_at,
    ms.shared_by
FROM mind_maps m
LEFT JOIN mind_map_shares ms ON m.id = ms.map_id 
    AND ms.user_id = (SELECT auth.uid())
    AND (ms.expires_at IS NULL OR ms.expires_at > NOW())
WHERE 
    m.user_id = (SELECT auth.uid()) -- User owns the map
    OR ms.user_id = (SELECT auth.uid()); -- User has been shared the map

-- Grant permissions on the view
GRANT SELECT ON user_accessible_maps TO authenticated;

-- Add comments
COMMENT ON TABLE mind_map_shares IS 'Stores direct user-to-user sharing relationships for mind maps';
COMMENT ON FUNCTION check_user_map_permission IS 'Checks if a user has permission to perform a specific action on a mind map';
COMMENT ON FUNCTION sync_share_permissions IS 'Automatically syncs permission flags with the assigned role';
COMMENT ON VIEW user_accessible_maps IS 'Provides a unified view of all maps accessible to the current user';