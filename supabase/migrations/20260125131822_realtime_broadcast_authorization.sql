-- Migration: Realtime Broadcast Authorization
-- Purpose: Secure broadcast channels by adding RLS policies to realtime.messages
-- This ensures only users with map access can subscribe to and send broadcasts
--
-- REQUIREMENTS:
-- - Supabase Realtime v2.25.0+ (supports private channels)
-- - The realtime.messages table must exist (created automatically by Supabase)
--
-- HOW TO VERIFY THIS MIGRATION WORKS:
-- 1. Run: supabase db push (to apply locally) or push to production
-- 2. Subscribe to a private channel with config: { private: true }
-- 3. If subscription fails with CHANNEL_ERROR, check Supabase Realtime version

-- =====================================================
-- ENABLE RLS ON REALTIME.MESSAGES (if not already enabled)
-- =====================================================
-- Note: This may fail if the table doesn't exist yet (Supabase creates it on first use)
-- In that case, the policies will be created but won't take effect until RLS is enabled
DO $$
BEGIN
    -- Check if the realtime schema and messages table exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) THEN
        EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    ELSE
        RAISE NOTICE 'realtime.messages table does not exist yet. RLS policies will be created but RLS cannot be enabled. The table will be created when Realtime is first used.';
    END IF;
END $$;

-- =====================================================
-- RLS POLICIES FOR BROADCAST CHANNEL AUTHORIZATION
-- =====================================================
-- Channel naming convention: "mind-map:{mapId}:{channel_type}"
-- Examples: "mind-map:abc123:sync", "mind-map:abc123:cursor", "mind-map:abc123:presence"
--
-- How it works:
-- 1. When a client subscribes with config: { private: true }, Realtime server
--    attempts an INSERT into realtime.messages with the topic (channel name)
-- 2. RLS policies on realtime.messages determine if user can join
-- 3. realtime.topic() returns the channel name for policy evaluation

-- Policy: Allow users to RECEIVE broadcasts if they have map access
-- This controls who can subscribe (SELECT = receive broadcasts)
-- Note: Using DO block to handle case where table doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) THEN
        -- Drop existing policy if it exists (for idempotency)
        DROP POLICY IF EXISTS "map_users_can_receive_broadcasts" ON "realtime"."messages";

        CREATE POLICY "map_users_can_receive_broadcasts"
        ON "realtime"."messages"
        FOR SELECT
        TO authenticated
        USING (
          -- Only apply to our map channels (topic starts with 'mind-map:')
          (realtime.topic() LIKE 'mind-map:%') AND (
            -- 1. User is the map OWNER (mind_maps.user_id)
            EXISTS (
              SELECT 1 FROM public.mind_maps mm
              WHERE mm.id = split_part(realtime.topic(), ':', 2)::uuid
              AND mm.user_id = auth.uid()
            )
            -- 2. OR map is PUBLIC (anyone can view)
            OR EXISTS (
              SELECT 1 FROM public.mind_maps mm
              WHERE mm.id = split_part(realtime.topic(), ':', 2)::uuid
              AND mm.is_public = true
            )
            -- 3. OR user has active SHARE_ACCESS (direct invite or room code join)
            OR EXISTS (
              SELECT 1 FROM public.share_access sa
              WHERE sa.map_id = split_part(realtime.topic(), ':', 2)::uuid
              AND sa.user_id = auth.uid()
              AND sa.status = 'active'
            )
          )
        );
    END IF;
END $$;

-- Policy: Allow users to SEND broadcasts only if they can edit the map
-- This controls who can broadcast (INSERT = send broadcasts)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) THEN
        -- Drop existing policy if it exists (for idempotency)
        DROP POLICY IF EXISTS "editors_can_send_broadcasts" ON "realtime"."messages";

        CREATE POLICY "editors_can_send_broadcasts"
        ON "realtime"."messages"
        FOR INSERT
        TO authenticated
        WITH CHECK (
          -- Only apply to our map channels
          (realtime.topic() LIKE 'mind-map:%') AND (
            -- 1. User is the map OWNER (full edit rights)
            EXISTS (
              SELECT 1 FROM public.mind_maps mm
              WHERE mm.id = split_part(realtime.topic(), ':', 2)::uuid
              AND mm.user_id = auth.uid()
            )
            -- 2. OR user has SHARE_ACCESS with can_edit=true
            OR EXISTS (
              SELECT 1 FROM public.share_access sa
              WHERE sa.map_id = split_part(realtime.topic(), ':', 2)::uuid
              AND sa.user_id = auth.uid()
              AND sa.status = 'active'
              AND sa.can_edit = true
            )
          )
        );
    END IF;
END $$;

-- =====================================================
-- ACCESS SUMMARY
-- =====================================================
-- | User Type                      | Receive | Send |
-- |--------------------------------|---------|------|
-- | Map owner (mind_maps.user_id)  |    Y    |  Y   |
-- | Public map viewer (is_public)  |    Y    |  N   |
-- | Shared user with can_edit=true |    Y    |  Y   |
-- | Shared user with can_edit=false|    Y    |  N   |
-- | Random user (no access)        |    N    |  N   |
-- | Unauthenticated user           |    N    |  N   |
-- =====================================================

-- Add comments to policies (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'realtime' AND table_name = 'messages'
    ) THEN
        COMMENT ON POLICY "map_users_can_receive_broadcasts" ON "realtime"."messages"
          IS 'Allow authenticated users to receive broadcasts on channels they have access to (owner, public map, or share_access)';

        COMMENT ON POLICY "editors_can_send_broadcasts" ON "realtime"."messages"
          IS 'Allow authenticated users to send broadcasts only if they are owner or have can_edit=true share_access';
    END IF;
END $$;
