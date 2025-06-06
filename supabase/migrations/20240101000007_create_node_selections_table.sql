-- Create node_selections table for tracking real-time node selections and edit locks
CREATE TABLE IF NOT EXISTS node_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    node_id UUID NOT NULL,
    selection_type VARCHAR(20) NOT NULL CHECK (selection_type IN ('selected', 'editing', 'hovering')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One selection per user per node
    UNIQUE(user_id, node_id),
    
    -- Ensure only one user can be editing a node at a time
    CONSTRAINT unique_node_editor EXCLUDE USING btree (node_id WITH =) WHERE (selection_type = 'editing')
);

-- Create indexes for performance
CREATE INDEX idx_node_selections_map_id ON node_selections(map_id);
CREATE INDEX idx_node_selections_node_id ON node_selections(node_id);
CREATE INDEX idx_node_selections_user_id ON node_selections(user_id);
CREATE INDEX idx_node_selections_type ON node_selections(selection_type);
CREATE INDEX idx_node_selections_started_at ON node_selections(started_at);

-- Create composite indexes for common queries
CREATE INDEX idx_node_selections_map_node ON node_selections(map_id, node_id);
CREATE INDEX idx_node_selections_map_type ON node_selections(map_id, selection_type);
CREATE INDEX idx_node_selections_node_editing ON node_selections(node_id) WHERE selection_type = 'editing';

-- Create trigger for updated_at (reuse function from previous migration)
CREATE TRIGGER update_node_selections_updated_at BEFORE UPDATE ON node_selections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE node_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can see selections for maps they have access to
CREATE POLICY "Users can view selections for accessible maps" ON node_selections
    FOR SELECT
    USING (
        check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- INSERT: Users can create their own selections for accessible maps
CREATE POLICY "Users can create own selections" ON node_selections
    FOR INSERT
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND check_user_map_permission((SELECT auth.uid()), map_id, 'view')
    );

-- UPDATE: Users can update their own selections
CREATE POLICY "Users can update own selections" ON node_selections
    FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Users can delete their own selections
CREATE POLICY "Users can delete own selections" ON node_selections
    FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Function to request node edit lock
CREATE OR REPLACE FUNCTION request_node_edit_lock(
    p_map_id UUID,
    p_node_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_current_editor UUID;
    v_current_editor_name TEXT;
    v_result JSONB;
BEGIN
    -- Check if user has edit permission
    IF NOT check_user_map_permission(p_user_id, p_map_id, 'edit') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No edit permission'
        );
    END IF;
    
    -- Check if node is currently being edited
    SELECT ns.user_id, au.raw_user_meta_data->>'full_name'
    INTO v_current_editor, v_current_editor_name
    FROM node_selections ns
    LEFT JOIN auth.users au ON ns.user_id = au.id
    WHERE ns.node_id = p_node_id
    AND ns.selection_type = 'editing';
    
    IF v_current_editor IS NOT NULL AND v_current_editor != p_user_id THEN
        -- Someone else is editing
        RETURN json_build_object(
            'success', false,
            'error', 'Node is being edited',
            'current_editor', v_current_editor,
            'editor_name', COALESCE(v_current_editor_name, 'Another user')
        );
    END IF;
    
    -- Try to acquire edit lock
    INSERT INTO node_selections (user_id, map_id, node_id, selection_type)
    VALUES (p_user_id, p_map_id, p_node_id, 'editing')
    ON CONFLICT (user_id, node_id) 
    DO UPDATE SET 
        selection_type = 'editing',
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'lock_acquired', true
    );
    
EXCEPTION
    WHEN unique_violation THEN
        -- Race condition: someone else just started editing
        RETURN json_build_object(
            'success', false,
            'error', 'Node is being edited',
            'race_condition', true
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unexpected error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release node edit lock
CREATE OR REPLACE FUNCTION release_node_edit_lock(
    p_node_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Delete the edit lock if user owns it
    DELETE FROM node_selections
    WHERE node_id = p_node_id
    AND user_id = p_user_id
    AND selection_type = 'editing';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get node selection state
CREATE OR REPLACE FUNCTION get_node_selection_state(p_node_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    user_color VARCHAR(7),
    selection_type VARCHAR(20),
    duration_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.user_id,
        COALESCE(au.raw_user_meta_data->>'full_name', au.email) as user_name,
        au.raw_user_meta_data->>'avatar_url' as user_avatar,
        cp.user_color,
        ns.selection_type,
        EXTRACT(EPOCH FROM (NOW() - ns.started_at))::INTEGER as duration_seconds
    FROM node_selections ns
    JOIN auth.users au ON ns.user_id = au.id
    LEFT JOIN collaboration_presence cp ON ns.user_id = cp.user_id AND ns.map_id = cp.map_id
    WHERE ns.node_id = p_node_id
    ORDER BY 
        CASE ns.selection_type 
            WHEN 'editing' THEN 1 
            WHEN 'selected' THEN 2 
            WHEN 'hovering' THEN 3 
        END,
        ns.started_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale selections
CREATE OR REPLACE FUNCTION cleanup_stale_selections()
RETURNS void AS $$
BEGIN
    -- Remove hovering selections older than 30 seconds
    DELETE FROM node_selections
    WHERE selection_type = 'hovering'
    AND updated_at < NOW() - INTERVAL '30 seconds';
    
    -- Remove selected selections older than 5 minutes
    DELETE FROM node_selections
    WHERE selection_type = 'selected'
    AND updated_at < NOW() - INTERVAL '5 minutes';
    
    -- Remove editing locks older than 30 minutes (failsafe)
    DELETE FROM node_selections
    WHERE selection_type = 'editing'
    AND updated_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for real-time selection updates
CREATE OR REPLACE FUNCTION notify_selection_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify channel about selection change
    PERFORM pg_notify(
        'selection_change',
        json_build_object(
            'action', TG_OP,
            'node_id', COALESCE(NEW.node_id, OLD.node_id),
            'user_id', COALESCE(NEW.user_id, OLD.user_id),
            'selection_type', COALESCE(NEW.selection_type, OLD.selection_type),
            'map_id', COALESCE(NEW.map_id, OLD.map_id)
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
CREATE TRIGGER selection_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON node_selections
    FOR EACH ROW
    EXECUTE FUNCTION notify_selection_change();

-- Create view for collaborative node states
CREATE OR REPLACE VIEW collaborative_node_states AS
SELECT 
    ns.map_id,
    ns.node_id,
    BOOL_OR(ns.selection_type = 'editing') as is_being_edited,
    COUNT(DISTINCT ns.user_id) as selection_count,
    ARRAY_AGG(DISTINCT ns.user_id) FILTER (WHERE ns.selection_type = 'selected') as selected_by,
    ARRAY_AGG(DISTINCT ns.user_id) FILTER (WHERE ns.selection_type = 'editing') as edited_by,
    MAX(CASE WHEN ns.selection_type = 'editing' THEN ns.user_id END) as current_editor
FROM node_selections ns
GROUP BY ns.map_id, ns.node_id;

-- Grant permissions on the view
GRANT SELECT ON collaborative_node_states TO authenticated;

-- Add comments
COMMENT ON TABLE node_selections IS 'Tracks real-time node selections and edit locks for collaborative editing';
COMMENT ON FUNCTION request_node_edit_lock IS 'Attempts to acquire an exclusive edit lock on a node, preventing conflicts';
COMMENT ON FUNCTION release_node_edit_lock IS 'Releases an edit lock on a node, allowing others to edit';
COMMENT ON FUNCTION get_node_selection_state IS 'Returns all users currently interacting with a specific node';
COMMENT ON FUNCTION cleanup_stale_selections IS 'Removes old selection records to prevent table bloat';
COMMENT ON VIEW collaborative_node_states IS 'Provides aggregated view of node selection states for efficient querying';