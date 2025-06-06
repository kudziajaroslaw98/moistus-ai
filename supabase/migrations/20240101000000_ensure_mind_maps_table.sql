-- Ensure mind_maps table exists (this might already exist, so we use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure title is not empty
    CONSTRAINT check_title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_created_at ON mind_maps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_maps_updated_at ON mind_maps(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_maps_last_accessed ON mind_maps(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_maps_public ON mind_maps(is_public) WHERE is_public = true;

-- Create composite index for user's maps listing
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_updated ON mind_maps(user_id, updated_at DESC);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mind_maps_updated_at') THEN
        CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can view public maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can view shared maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can create own maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can update own maps" ON mind_maps;
DROP POLICY IF EXISTS "Users can delete own maps" ON mind_maps;

-- RLS Policies
-- SELECT: Users can view their own maps, public maps, or maps shared with them
CREATE POLICY "Users can view own maps" ON mind_maps
    FOR SELECT
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view public maps" ON mind_maps
    FOR SELECT
    USING (is_public = true);

-- Note: This policy will work after mind_map_shares table is created
CREATE POLICY "Users can view shared maps" ON mind_maps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM mind_map_shares
            WHERE map_id = mind_maps.id
            AND user_id = (SELECT auth.uid())
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- INSERT: Users can create their own maps
CREATE POLICY "Users can create own maps" ON mind_maps
    FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Users can update their own maps
CREATE POLICY "Users can update own maps" ON mind_maps
    FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Users can delete their own maps
CREATE POLICY "Users can delete own maps" ON mind_maps
    FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Create or replace function to update last_accessed_at
CREATE OR REPLACE FUNCTION update_map_last_accessed(p_map_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE mind_maps
    SET last_accessed_at = NOW()
    WHERE id = p_map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to update node and edge counts
CREATE OR REPLACE FUNCTION update_map_counts(p_map_id UUID)
RETURNS void AS $$
DECLARE
    v_node_count INTEGER;
    v_edge_count INTEGER;
BEGIN
    -- Count nodes (assuming nodes table exists or will exist)
    SELECT COUNT(*) INTO v_node_count
    FROM nodes
    WHERE map_id = p_map_id;
    
    -- Count edges (assuming edges table exists or will exist)
    SELECT COUNT(*) INTO v_edge_count
    FROM edges
    WHERE map_id = p_map_id;
    
    -- Update counts
    UPDATE mind_maps
    SET 
        node_count = COALESCE(v_node_count, 0),
        edge_count = COALESCE(v_edge_count, 0)
    WHERE id = p_map_id;
    
EXCEPTION
    WHEN undefined_table THEN
        -- Tables don't exist yet, skip update
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE mind_maps IS 'Stores mind map metadata and ownership information';
COMMENT ON FUNCTION update_map_last_accessed IS 'Updates the last accessed timestamp for a mind map';
COMMENT ON FUNCTION update_map_counts IS 'Updates the node and edge counts for a mind map';