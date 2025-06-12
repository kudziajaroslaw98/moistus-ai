  (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((user_id = ( SELECT auth.uid() AS uid)) OR (id IN ( SELECT get_user_accessible_map_ids.map_id
   FROM get_user_accessible_map_ids(( SELECT auth.uid() AS uid)) get_user_accessible_map_ids(map_id))))) OR ((( SELECT auth.uid() AS uid) IS NULL) AND (id IN ( SELECT share_tokens.map_id
   FROM share_tokens
  WHERE (((share_tokens.token_type)::text = 'room_code'::text) AND (share_tokens.is_active = true) AND ((share_tokens.expires_at IS NULL) OR (share_tokens.expires_at > now())))))))
