-- Migration: Create share_access_with_profiles view
-- Description: Aggregates share_access with user_profiles and share_tokens for efficient querying

BEGIN;

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.share_access_with_profiles CASCADE;

-- Create the view with flattened user_profiles columns and share_tokens data
CREATE VIEW public.share_access_with_profiles AS
SELECT
    sa.id,
    sa.created_at,
    sa.updated_at,
    sa.user_id,
    sa.share_token_id,
    sa.last_access,
    sa.max_sessions,
    sa.status,
    sa.map_id,
    -- Flattened user_profiles columns
    COALESCE(up.user_id, sa.user_id) AS profile_user_id,
    up.full_name,
    up.display_name,
    up.avatar_url,
    COALESCE(up.is_anonymous, true) AS is_anonymous,
    up.email,
    up.bio,
    up.location,
    up.company,
    up.job_title,
    -- Share token information
    st.token AS share_token,
    st.token_type,
    st.max_users AS token_max_users,
    st.expires_at AS token_expires_at,
    st.is_active AS token_is_active,
    st.created_by AS token_created_by,
    st.current_users AS token_current_users,
    -- Permissions from share_tokens (flattened from JSONB)
    st.permissions->>'role' AS role,
    COALESCE((st.permissions->>'can_view')::boolean, false) AS can_view,
    COALESCE((st.permissions->>'can_edit')::boolean, false) AS can_edit,
    COALESCE((st.permissions->>'can_comment')::boolean, false) AS can_comment
FROM
    public.share_access sa
LEFT JOIN
    public.user_profiles up ON sa.user_id = up.user_id
LEFT JOIN
    public.share_tokens st ON sa.share_token_id = st.id;

-- Grant permissions
GRANT SELECT ON public.share_access_with_profiles TO authenticated;
GRANT SELECT ON public.share_access_with_profiles TO anon;

-- Create indexes if they don't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_share_access_map_id ON public.share_access(map_id);
CREATE INDEX IF NOT EXISTS idx_share_access_user_id ON public.share_access(user_id);
CREATE INDEX IF NOT EXISTS idx_share_access_status ON public.share_access(status);
CREATE INDEX IF NOT EXISTS idx_share_access_map_status ON public.share_access(map_id, status);
CREATE INDEX IF NOT EXISTS idx_share_access_share_token_id ON public.share_access(share_token_id);

-- Ensure user_profiles has proper index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Ensure share_tokens has proper indexes
CREATE INDEX IF NOT EXISTS idx_share_tokens_id ON public.share_tokens(id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_is_active ON public.share_tokens(is_active);

-- Add RLS policies to the view
ALTER VIEW public.share_access_with_profiles SET (security_invoker = on);

-- Policy: Users can see share access for maps they own
CREATE POLICY "Users can view share access for their owned maps"
ON public.share_access
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.mind_maps AS mm
        WHERE mm.id = share_access.map_id
        AND mm.user_id = (select auth.uid())
    )
);

-- Policy: Users can see their own share access
CREATE POLICY "Users can view their own share access"
ON public.share_access
FOR SELECT
USING (
    user_id = (select auth.uid())
);

-- Add comment for documentation
COMMENT ON VIEW public.share_access_with_profiles IS 'Aggregated view of share_access with user_profiles and share_tokens data for efficient querying. Includes flattened user profile fields and permission details from share tokens.';

-- Add column comments for clarity
COMMENT ON COLUMN public.share_access_with_profiles.profile_user_id IS 'User ID from user_profiles table (fallback to share_access.user_id if profile missing)';
COMMENT ON COLUMN public.share_access_with_profiles.role IS 'User role from share_tokens permissions (e.g., viewer, editor, admin)';
COMMENT ON COLUMN public.share_access_with_profiles.can_view IS 'View permission from share_tokens';
COMMENT ON COLUMN public.share_access_with_profiles.can_edit IS 'Edit permission from share_tokens';
COMMENT ON COLUMN public.share_access_with_profiles.can_comment IS 'Comment permission from share_tokens';
COMMENT ON COLUMN public.share_access_with_profiles.share_token IS 'The actual share token (e.g., ABC-123)';
COMMENT ON COLUMN public.share_access_with_profiles.token_*
