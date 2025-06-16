-- Create share_tokens table for room codes and share links
CREATE TABLE IF NOT EXISTS share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    token VARCHAR(7) NOT NULL UNIQUE, -- 7 chars to include dash (XXX-XXX)
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('room_code', 'direct_link')),
    share_link_hash VARCHAR(64),
    permissions JSONB NOT NULL DEFAULT '{"role": "viewer", "can_edit": false, "can_comment": true, "can_view": true}'::jsonb,
    max_users INTEGER DEFAULT 50 CHECK (max_users > 0 AND max_users <= 100),
    current_users INTEGER DEFAULT 0 CHECK (current_users >= 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure current_users doesn't exceed max_users
    CONSTRAINT check_user_count CHECK (current_users <= max_users)
);

-- Create indexes for performance
CREATE INDEX idx_share_tokens_map_id ON share_tokens(map_id);
CREATE INDEX idx_share_tokens_token ON share_tokens(token) WHERE is_active = true;
CREATE INDEX idx_share_tokens_expires_at ON share_tokens(expires_at) WHERE is_active = true AND expires_at IS NOT NULL;
CREATE INDEX idx_share_tokens_created_by ON share_tokens(created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_share_tokens_updated_at BEFORE UPDATE ON share_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Can view if you created it or if it's active and not expired
CREATE POLICY "Users can view active tokens" ON share_tokens
    FOR SELECT
    USING (
        (SELECT auth.uid()) = created_by 
        OR (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
    );

-- INSERT: Can create if you own the map
CREATE POLICY "Map owners can create tokens" ON share_tokens
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mind_maps 
            WHERE id = map_id AND user_id = (SELECT auth.uid())
        )
    );

-- UPDATE: Only creator can update
CREATE POLICY "Token creators can update" ON share_tokens
    FOR UPDATE
    USING ((SELECT auth.uid()) = created_by)
    WITH CHECK ((SELECT auth.uid()) = created_by);

-- DELETE: Only creator can delete
CREATE POLICY "Token creators can delete" ON share_tokens
    FOR DELETE
    USING ((SELECT auth.uid()) = created_by);

-- Function to generate room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate 6 character code
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Format as XXX-XXX for readability
    RETURN substr(result, 1, 3) || '-' || substr(result, 4, 3);
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique room code with retry logic
CREATE OR REPLACE FUNCTION generate_unique_room_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    attempts INTEGER := 0;
BEGIN
    LOOP
        new_code := generate_room_code();
        attempts := attempts + 1;
        
        -- Check if code exists
        IF NOT EXISTS (SELECT 1 FROM share_tokens WHERE token = new_code) THEN
            RETURN new_code;
        END IF;
        
        -- Prevent infinite loop
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Could not generate unique room code';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE share_tokens IS 'Stores room codes and share links for mind map sharing';