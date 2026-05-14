import { verifyHistoryReadAccess } from '@/helpers/history/server/history-access';
import { resolveCurrentSnapshotId } from '@/helpers/history/server/history-current-scope';
import {
	buildHistoryListItems,
	buildProfileMap,
	collectHistoryUserIds,
	type HistorySnapshotListRow,
	type UserProfileRow,
} from '@/helpers/history/server/history-list-response';
import { createClient } from '@/helpers/supabase/server';
import { HistoryDbItem } from '@/types/history-state';
import { NextRequest, NextResponse } from 'next/server';

export const GET = async (
	req: NextRequest,
	{ params }: { params: Promise<{ mapId: string }> }
) => {
	try {
		const { mapId } = await params;
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

		const access = await verifyHistoryReadAccess(supabase, mapId, user.id);
		if (!access.ok) {
			return NextResponse.json(
				{ error: access.error || 'Access denied' },
				{ status: access.status }
			);
		}

		const [{ data: currentPtr }, { data: latestSnapshot, error: latestErr }] =
			await Promise.all([
				supabase
					.from('map_history_current')
					.select('snapshot_id, event_id')
					.eq('map_id', mapId)
					.maybeSingle(),
				supabase
					.from('map_history_snapshots')
					.select('id, snapshot_index')
					.eq('map_id', mapId)
					.order('snapshot_index', { ascending: false })
					.limit(1)
					.maybeSingle(),
			]);

		if (latestErr && latestErr.code !== 'PGRST116') {
			console.error('history/list: latest snapshot error', latestErr);
			return NextResponse.json({ error: latestErr.message }, { status: 500 });
		}

		const currentSnapshotId = resolveCurrentSnapshotId(
			currentPtr,
			latestSnapshot
		);

		if (!currentSnapshotId) {
			return NextResponse.json({
				items: [],
				total: 0,
				hasMore: false,
				snapshots: 0,
				events: 0,
				nextOffset: 0,
				currentSnapshotId: null,
				currentEventId: null,
			});
		}

		const { data: currentSnapshot, error: snapErr } = await supabase
			.from('map_history_snapshots')
			.select(
				'id, snapshot_index, action_name, node_count, edge_count, is_major, created_at, user_id'
			)
			.eq('map_id', mapId)
			.eq('id', currentSnapshotId)
			.maybeSingle();

		if (snapErr && snapErr.code !== 'PGRST116') {
			console.error('history/list: current snapshot error', snapErr);
			return NextResponse.json({ error: snapErr.message }, { status: 500 });
		}

		let eventQuery = supabase
			.from('map_history_events')
			.select(
				'id, snapshot_id, event_index, action_name, operation_type, entity_type, changes, created_at, user_id',
				{ count: 'exact' }
			)
			.eq('map_id', mapId)
			.eq('snapshot_id', currentSnapshotId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (startDate) eventQuery = eventQuery.gte('created_at', startDate);
		if (endDate) eventQuery = eventQuery.lte('created_at', endDate);
		if (actionName) eventQuery = eventQuery.eq('action_name', actionName);

		const {
			data: eventRows,
			count: eventCount,
			error: eventsError,
		} = await eventQuery;

		if (eventsError) {
			console.error('history/list: events error', eventsError);
			return NextResponse.json({ error: eventsError.message }, { status: 500 });
		}

		const events = (eventRows || []) as HistoryDbItem[];
		const snapshots =
			offset === 0 && currentSnapshot
				? ([currentSnapshot] as HistorySnapshotListRow[])
				: [];
		const userIds = collectHistoryUserIds(snapshots, events);
		let profileMap = buildProfileMap([]);

		if (userIds.length > 0) {
			const { data: profiles, error: profilesErr } = await supabase
				.from('user_profiles')
				.select('user_id, display_name, avatar_url')
				.in('user_id', userIds);

			if (profilesErr) {
				console.warn('history/list: profile fetch warning', profilesErr);
			}

			profileMap = buildProfileMap((profiles ?? []) as UserProfileRow[]);
		}

		const items = buildHistoryListItems({
			snapshots,
			events,
			profileMap,
		});

		const visibleEventCount = eventCount || 0;
		const nextOffset = offset + events.length;

		return NextResponse.json({
			items,
			total: visibleEventCount + (currentSnapshot ? 1 : 0),
			hasMore: nextOffset < visibleEventCount,
			snapshots: snapshots.length,
			events: events.length,
			nextOffset,
			currentSnapshotId,
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
