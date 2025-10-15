import { applyDelta } from '@/helpers/history/delta-calculator';
import { createClient } from '@/helpers/supabase/server';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { HistoryDelta } from '@/types/history-state';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ mapId: string }> }
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user)
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

		const { mapId } = await params;
		const body = await req.json().catch(() => ({}));
		const { snapshotId, eventId } = body as {
			snapshotId?: string;
			eventId?: string;
		};
		if (!snapshotId && !eventId) {
			return NextResponse.json(
				{ error: 'Either snapshotId or eventId is required' },
				{ status: 400 }
			);
		}

		// Verify access
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();
		if (!map)
			return NextResponse.json({ error: 'Map not found' }, { status: 404 });

		const { data: share } = await supabase
			.from('share_access')
			.select('id')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.eq('status', 'active')
			.limit(1)
			.single();
		const hasAccess = map.user_id === user.id || !!share;
		if (!hasAccess)
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });

		// Determine target snapshot
		let targetSnapshotId = snapshotId || '';
		if (eventId && !targetSnapshotId) {
			const { data: event } = await supabase
				.from('map_history_events')
				.select('snapshot_id')
				.eq('id', eventId)
				.single();
			if (!event)
				return NextResponse.json({ error: 'Event not found' }, { status: 404 });
			targetSnapshotId = event.snapshot_id;
		}

		// Fetch snapshot full state
		const { data: snapshot } = await supabase
			.from('map_history_snapshots')
			.select('*')
			.eq('id', targetSnapshotId)
			.single();
		if (!snapshot)
			return NextResponse.json(
				{ error: 'Snapshot not found' },
				{ status: 404 }
			);

		let finalNodes: AppNode[] = snapshot.nodes as AppNode[];
		let finalEdges: AppEdge[] = snapshot.edges as AppEdge[];

		if (eventId) {
			const { data: events } = await supabase
				.from('map_history_events')
				.select('*')
				.eq('snapshot_id', targetSnapshotId)
				.order('event_index', { ascending: true });
			for (const ev of events || []) {
				if (ev.id === eventId) break;
				const result = applyDelta(
					{ nodes: finalNodes, edges: finalEdges },
					ev.changes as HistoryDelta // HistoryDelta
				);
				finalNodes = result.nodes;
				finalEdges = result.edges;
			}
		}

		return NextResponse.json({
			nodes: finalNodes,
			edges: finalEdges,
			snapshotIndex: snapshot.snapshot_index,
			message: 'State reverted successfully',
		});
	} catch (error) {
		console.error('Revert history error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
