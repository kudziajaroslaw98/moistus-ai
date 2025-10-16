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

		// Persist reverted state to database (bulk upsert)
		// Single timestamp for entire batch ensures atomic coordination
		const revertTimestamp = new Date().toISOString();

		// Transform nodes to database schema
		const nodeUpdates = finalNodes.map((node) => ({
			id: node.id,
			map_id: mapId,
			user_id: user.id, // Use current user performing revert
			content: node.data?.content || '',
			position_x: node.position.x,
			position_y: node.position.y,
			width: node.width || null,
			height: node.height || null,
			node_type: node.type || 'defaultNode',
			metadata: node.data?.metadata || {},
			aiData: node.data?.aiData || {},
			parent_id: node.data?.parent_id || null,
			updated_at: revertTimestamp, // Same timestamp for all
			created_at: node.data?.created_at || revertTimestamp, // Preserve original or use revert time
		}));

		// Transform edges to database schema
		const edgeUpdates = finalEdges.map((edge) => ({
			id: edge.id,
			map_id: mapId,
			user_id: user.id,
			source: edge.source,
			target: edge.target,
			label: edge.label || null,
			animated: edge.animated || false,
			style: edge.style || { stroke: '#6c757d', strokeWidth: 2 },
			markerEnd: edge.markerEnd || null,
			metadata: edge.data?.metadata || {},
			aiData: edge.data?.aiData || {},
			updated_at: revertTimestamp,
			created_at: edge.data?.created_at || revertTimestamp,
		}));

		// Bulk upsert (atomic operation) - handles both updates and inserts
		try {
			const [nodesResult, edgesResult] = await Promise.all([
				supabase.from('nodes').upsert(nodeUpdates),
				supabase.from('edges').upsert(edgeUpdates),
			]);

			if (nodesResult.error) {
				console.error('Failed to persist nodes:', nodesResult.error);
				return NextResponse.json(
					{ error: 'Failed to persist nodes to database' },
					{ status: 500 }
				);
			}

			if (edgesResult.error) {
				console.error('Failed to persist edges:', edgesResult.error);
				return NextResponse.json(
					{ error: 'Failed to persist edges to database' },
					{ status: 500 }
				);
			}
		} catch (persistError) {
			console.error('Failed to persist revert:', persistError);
			return NextResponse.json(
				{ error: 'Failed to persist changes to database' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			nodes: finalNodes,
			edges: finalEdges,
			revertTimestamp, // Client can use this for logging/debugging
			snapshotIndex: snapshot.snapshot_index,
			message: 'State reverted and persisted successfully',
		});
	} catch (error) {
		console.error('Revert history error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
