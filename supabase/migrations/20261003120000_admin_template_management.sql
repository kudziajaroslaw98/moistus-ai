-- Admin template management
-- 1) Lock down user_profiles.role so clients cannot self-promote to admin.
-- 2) Restrict create_template() to service_role.
-- 3) Add is_admin() and grant admins write access to template nodes/edges.
-- 4) Commit previously live-only template read policies for authenticated users.
-- 5) Keep template nodes/edges ownerless (user_id NULL).

-- 1) Role guard -------------------------------------------------------------
-- Table-level UPDATE/INSERT grants make a column REVOKE ineffective, and users
-- may delete + re-insert their own profile row, so guard both paths in a trigger.
-- Requests without a PostgREST JWT role (dashboard SQL, auth hooks) are allowed.
create or replace function public.guard_user_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	v_request_role text := coalesce(auth.role(), '');
begin
	if v_request_role not in ('anon', 'authenticated') then
		return new;
	end if;

	if tg_op = 'INSERT' and coalesce(new.role, 'user') <> 'user' then
		raise exception 'Not allowed to set profile role'
			using errcode = '42501';
	end if;

	if tg_op = 'UPDATE' and new.role is distinct from old.role then
		raise exception 'Not allowed to change profile role'
			using errcode = '42501';
	end if;

	return new;
end;
$$;

drop trigger if exists guard_user_profile_role on public.user_profiles;
create trigger guard_user_profile_role
before insert or update on public.user_profiles
for each row execute function public.guard_user_profile_role();

-- 2) create_template is a system seeding function ----------------------------
revoke execute on function public.create_template(
	text, text, text, text, text, text[], jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_template(
	text, text, text, text, text, text[], jsonb, jsonb
) to service_role;

-- 3) Admin helper + template write policies ---------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.user_profiles up
		where up.user_id = (select auth.uid())
			and up.role = 'admin'
	);
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.admin_can_edit_template_map(map_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select public.is_admin()
		and exists (
			select 1
			from public.mind_maps mm
			where mm.id = map_uuid
				and mm.is_template = true
		);
$$;

revoke execute on function public.admin_can_edit_template_map(uuid) from public, anon;
grant execute on function public.admin_can_edit_template_map(uuid) to authenticated, service_role;

drop policy if exists nodes_delete_policy on public.nodes;
drop policy if exists nodes_insert_policy on public.nodes;
drop policy if exists nodes_update_policy on public.nodes;

create policy nodes_delete_policy
on public.nodes
for delete
to authenticated
using (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = nodes.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

create policy nodes_insert_policy
on public.nodes
for insert
to authenticated
with check (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = nodes.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

create policy nodes_update_policy
on public.nodes
for update
to authenticated
using (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = nodes.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
)
with check (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = nodes.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

drop policy if exists edges_delete_policy on public.edges;
drop policy if exists edges_insert_policy on public.edges;
drop policy if exists edges_update_policy on public.edges;

create policy edges_delete_policy
on public.edges
for delete
to authenticated
using (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = edges.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

create policy edges_insert_policy
on public.edges
for insert
to authenticated
with check (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = edges.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

create policy edges_update_policy
on public.edges
for update
to authenticated
using (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = edges.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
)
with check (
	public.user_owns_map(map_id)
	or exists (
		select 1
		from public.share_access sa
		where sa.map_id = edges.map_id
			and sa.user_id = auth.uid()
			and sa.status = 'active'
			and sa.can_edit = true
	)
	or public.admin_can_edit_template_map(map_id)
);

-- 4) Template read policies for authenticated users (previously live-only drift)
drop policy if exists template_nodes_readable_by_authenticated on public.nodes;
create policy template_nodes_readable_by_authenticated
on public.nodes
for select
to authenticated
using (
	exists (
		select 1
		from public.mind_maps mm
		where mm.id = nodes.map_id
			and mm.is_template = true
	)
);

drop policy if exists template_edges_readable_by_authenticated on public.edges;
create policy template_edges_readable_by_authenticated
on public.edges
for select
to authenticated
using (
	exists (
		select 1
		from public.mind_maps mm
		where mm.id = edges.map_id
			and mm.is_template = true
	)
);

-- 5) Template graph rows stay ownerless --------------------------------------
-- Template nodes/edges must keep user_id NULL. nodes/edges.user_id FKs are
-- ON DELETE CASCADE, so stamping the editing admin's id would delete template
-- content with that admin's account. Covers client writes, RPCs, offline replay,
-- history revert and PartyKit projection in one place.
create or replace function public.null_template_graph_user_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	if new.user_id is not null and exists (
		select 1
		from public.mind_maps mm
		where mm.id = new.map_id
			and mm.is_template = true
	) then
		new.user_id := null;
	end if;

	return new;
end;
$$;

revoke execute on function public.null_template_graph_user_id() from public, anon, authenticated;

drop trigger if exists null_template_node_user_id on public.nodes;
create trigger null_template_node_user_id
before insert or update of user_id, map_id on public.nodes
for each row execute function public.null_template_graph_user_id();

drop trigger if exists null_template_edge_user_id on public.edges;
create trigger null_template_edge_user_id
before insert or update of user_id, map_id on public.edges
for each row execute function public.null_template_graph_user_id();
