create or replace function public.create_history_checkpoint_and_prune(
	p_map_id uuid,
	p_user_id uuid,
	p_action_name text default 'Manual Checkpoint',
	p_is_major boolean default true
)
returns table (
	snapshot_id uuid,
	snapshot_index integer,
	node_count integer,
	edge_count integer,
	pruned_snapshot_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_map_owner uuid;
	v_snapshot_id uuid;
	v_snapshot_index integer;
	v_nodes jsonb;
	v_edges jsonb;
	v_node_count integer;
	v_edge_count integer;
	v_old_snapshot_ids uuid[];
begin
	select mind_maps.user_id
	into v_map_owner
	from public.mind_maps
	where mind_maps.id = p_map_id
	for update;

	if v_map_owner is null then
		raise exception 'Map not found'
			using errcode = 'P0002';
	end if;

	if v_map_owner <> p_user_id then
		raise exception 'Access denied'
			using errcode = '42501';
	end if;

	select
		coalesce(array_agg(map_history_snapshots.id), array[]::uuid[]),
		coalesce(max(map_history_snapshots.snapshot_index), -1) + 1
	into v_old_snapshot_ids, v_snapshot_index
	from public.map_history_snapshots
	where map_history_snapshots.map_id = p_map_id;

	select
		coalesce(
			jsonb_agg(
				jsonb_strip_nulls(
					jsonb_build_object(
						'id', nodes.id,
						'position', jsonb_build_object(
							'x', coalesce(nodes.position_x, 0),
							'y', coalesce(nodes.position_y, 0)
						),
						'type', coalesce(nodes.node_type, 'defaultNode'),
						'parentNode', nodes.parent_id,
						'parentId', nodes.parent_id,
						'width', nodes.width,
						'height', nodes.height,
						'data', jsonb_build_object(
							'id', nodes.id,
							'map_id', nodes.map_id,
							'user_id', nodes.user_id,
							'content', coalesce(nodes.content, ''),
							'position_x', coalesce(nodes.position_x, 0),
							'position_y', coalesce(nodes.position_y, 0),
							'width', nodes.width,
							'height', nodes.height,
							'node_type', coalesce(nodes.node_type, 'defaultNode'),
							'metadata', coalesce(nodes.metadata, '{}'::jsonb),
							'aiData', coalesce(nodes."aiData", '{}'::jsonb),
							'parent_id', nodes.parent_id,
							'created_at', nodes.created_at,
							'updated_at', nodes.updated_at
						)
					)
				)
				order by nodes.created_at, nodes.id
			),
			'[]'::jsonb
		),
		count(*)::integer
	into v_nodes, v_node_count
	from public.nodes
	where nodes.map_id = p_map_id;

	select
		coalesce(
			jsonb_agg(
				jsonb_strip_nulls(
					jsonb_build_object(
						'id', edges.id,
						'source', edges.source,
						'target', edges.target,
						'type', coalesce(edges.type, 'floatingEdge'),
						'label', edges.label,
						'animated', coalesce(edges.animated, false),
						'style', edges.style,
						'markerEnd', edges."markerEnd",
						'markerStart', edges."markerStart",
						'data', jsonb_build_object(
							'id', edges.id,
							'map_id', edges.map_id,
							'user_id', edges.user_id,
							'source', edges.source,
							'target', edges.target,
							'label', edges.label,
							'type', edges.type,
							'animated', coalesce(edges.animated, false),
							'style', edges.style,
							'markerEnd', edges."markerEnd",
							'markerStart', edges."markerStart",
							'metadata',
								coalesce(edges.metadata, '{}'::jsonb)
								|| jsonb_build_object(
									'pathType',
									coalesce(edges.metadata ->> 'pathType', 'waypoint')
								),
							'aiData', coalesce(edges."aiData", '{}'::jsonb),
							'created_at', edges.created_at,
							'updated_at', edges.updated_at
						)
					)
				)
				order by edges.created_at, edges.id
			),
			'[]'::jsonb
		),
		count(*)::integer
	into v_edges, v_edge_count
	from public.edges
	where edges.map_id = p_map_id;

	insert into public.map_history_snapshots (
		map_id,
		user_id,
		snapshot_index,
		action_name,
		nodes,
		edges,
		node_count,
		edge_count,
		is_major
	)
	values (
		p_map_id,
		p_user_id,
		v_snapshot_index,
		coalesce(nullif(trim(p_action_name), ''), 'Manual Checkpoint'),
		v_nodes,
		v_edges,
		v_node_count,
		v_edge_count,
		p_is_major
	)
	returning id into v_snapshot_id;

	insert into public.map_history_current (
		map_id,
		snapshot_id,
		event_id,
		updated_by,
		updated_at
	)
	values (
		p_map_id,
		v_snapshot_id,
		null,
		p_user_id,
		now()
	)
	on conflict (map_id)
	do update set
		snapshot_id = excluded.snapshot_id,
		event_id = null,
		updated_by = excluded.updated_by,
		updated_at = excluded.updated_at;

	if cardinality(v_old_snapshot_ids) > 0 then
		delete from public.map_history_events
		where map_history_events.map_id = p_map_id
			and map_history_events.snapshot_id = any(v_old_snapshot_ids);

		delete from public.map_history_snapshots
		where map_history_snapshots.map_id = p_map_id
			and map_history_snapshots.id = any(v_old_snapshot_ids);
	end if;

	return query
	select
		v_snapshot_id,
		v_snapshot_index,
		v_node_count,
		v_edge_count,
		cardinality(v_old_snapshot_ids)::integer;
end;
$$;

revoke all on function public.create_history_checkpoint_and_prune(
	uuid,
	uuid,
	text,
	boolean
) from public;

grant execute on function public.create_history_checkpoint_and_prune(
	uuid,
	uuid,
	text,
	boolean
) to service_role;
