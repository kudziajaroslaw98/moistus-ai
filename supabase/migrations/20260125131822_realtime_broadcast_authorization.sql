-- Migration: Realtime Broadcast Authorization
-- Purpose: Secure broadcast channels by adding RLS policies to realtime.messages
-- This ensures only users with map access can subscribe to and send broadcasts

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

-- Policy: Allow users to SEND broadcasts only if they can edit the map
-- This controls who can broadcast (INSERT = send broadcasts)
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

COMMENT ON POLICY "map_users_can_receive_broadcasts" ON "realtime"."messages"
  IS 'Allow authenticated users to receive broadcasts on channels they have access to (owner, public map, or share_access)';

COMMENT ON POLICY "editors_can_send_broadcasts" ON "realtime"."messages"
  IS 'Allow authenticated users to send broadcasts only if they are owner or have can_edit=true share_access';
