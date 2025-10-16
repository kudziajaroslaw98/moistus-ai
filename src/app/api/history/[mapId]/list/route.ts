import { createClient } from '@/helpers/supabase/server';
import { HistoryDbItem, HistoryItem } from '@/types/history-state';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async (
	req: NextRequest,
	{ params }: { params: Promise<{ mapId: string }> }
) => {
	try {
		const { mapId } = await params;
		console.log(mapId);
		const supabase = await createClient();

		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr) {
			console.error('history/list: auth.getUser error', userErr);
		}
		const user = userData?.user;
		if (!user) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const searchParams = req.nextUrl.searchParams;
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
		const offset = parseInt(searchParams.get('offset') || '0');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const actionName = searchParams.get('actionName');

		// Verify access: owner or active share access
		const { data: map, error: mapErr } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();
		if (mapErr) {
			console.error('history/list: map fetch error', mapErr);
		}
		if (!map)
			return NextResponse.json({ error: 'Map not found' }, { status: 404 });

		const { data: shareRows, error: shareErr } = await supabase
			.from('share_access')
			.select('id')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.eq('status', 'active')
			.limit(1)
			.maybeSingle();
		if (shareErr && shareErr.code !== 'PGRST116') {
			// Log non-empty errors; PGRST116 often indicates 0 rows for maybe-single scenarios
			console.warn('history/list: share fetch warning', shareErr);
		}
		const share =
			Array.isArray(shareRows) && shareRows.length > 0 ? shareRows[0] : null;

		const hasAccess = map.user_id === user.id || !!share;
		if (!hasAccess)
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });

		// Fetch snapshots (metadata only)
		let snapshotQuery = supabase
			.from('map_history_snapshots')
			.select(
				'id, snapshot_index, action_name, node_count, edge_count, is_major, created_at',
				{ count: 'exact' }
			)
			.eq('map_id', mapId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);
		if (startDate) snapshotQuery = snapshotQuery.gte('created_at', startDate);
		if (endDate) snapshotQuery = snapshotQuery.lte('created_at', endDate);
		if (actionName) snapshotQuery = snapshotQuery.eq('action_name', actionName);

		const {
			data: snapshots,
			count: snapshotCount,
			error: snapErr,
		} = await snapshotQuery;
		if (snapErr) {
			console.error('history/list: snapshots error', snapErr);
			return NextResponse.json({ error: snapErr.message }, { status: 500 });
		}

		// Fetch events for those snapshots
		const snapshotIds = snapshots?.map((s) => s.id) || [];
		let events: HistoryDbItem[] = [];
		if (snapshotIds.length > 0) {
			const { data: eventsData, error: evErr } = await supabase
				.from('map_history_events')
				.select(
					'id, snapshot_id, event_index, action_name, operation_type, entity_type, created_at'
				)
				.in('snapshot_id', snapshotIds)
				.order('created_at', { ascending: false });
			if (evErr) {
				console.error('history/list: events error', evErr);
				return NextResponse.json({ error: evErr.message }, { status: 500 });
			}
			events = eventsData || [];
		}

		// Fetch current pointer (snapshot/event) for this map
		const { data: currentPtr } = await supabase
			.from('map_history_current')
			.select('snapshot_id, event_id')
			.eq('map_id', mapId)
			.maybeSingle();

		const items: HistoryItem[] = [
			...(snapshots?.map((s) => ({
				id: s.id,
				type: 'snapshot' as const,
				snapshotIndex: s.snapshot_index,
				actionName: s.action_name,
				nodeCount: s.node_count,
				edgeCount: s.edge_count,
				isMajor: s.is_major,
				timestamp: new Date(s.created_at).getTime(),
			})) || []),
			...(events.map((e) => ({
				id: e.id,
				type: 'event' as const,
				snapshotId: e.snapshot_id,
				eventIndex: e.event_index,
				actionName: e.action_name,
				operationType: e.operation_type,
				entityType: e.entity_type,
				timestamp: new Date(e.created_at).getTime(),
			})) || []),
		].sort((a, b) => b.timestamp - a.timestamp);

		return NextResponse.json({
			items,
			total: snapshotCount || 0,
			hasMore: offset + limit < (snapshotCount || 0),
			snapshots: snapshots?.length || 0,
			events: events?.length || 0,
			currentSnapshotId: currentPtr?.snapshot_id || null,
			currentEventId: currentPtr?.event_id || null,
		});
	} catch (error) {
		console.error('List history error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
