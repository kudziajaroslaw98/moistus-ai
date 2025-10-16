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

		// Persist reverted state to database using differential upserts/deletes
		// to avoid emitting unnecessary realtime updates for unchanged rows.
		const revertTimestamp = new Date().toISOString();

		// 1) Load current DB state for comparison
		const [
			{ data: dbNodes, error: nodesLoadError },
			{ data: dbEdges, error: edgesLoadError },
		] = await Promise.all([
			supabase
				.from('nodes')
				.select(
					'id, content, position_x, position_y, width, height, node_type, metadata, aiData, parent_id, created_at, updated_at'
				)
				.eq('map_id', mapId),
			supabase
				.from('edges')
				.select(
					'id, source, target, label, animated, style, markerEnd, metadata, aiData, created_at, updated_at'
				)
				.eq('map_id', mapId),
		]);

		if (nodesLoadError || edgesLoadError) {
			console.error('Failed to load current DB state before revert', {
				nodesLoadError,
				edgesLoadError,
			});
			return NextResponse.json(
				{ error: 'Failed to load current state for comparison' },
				{ status: 500 }
			);
		}

		const dbNodeMap = new Map((dbNodes || []).map((n: any) => [n.id, n]));
		const dbEdgeMap = new Map((dbEdges || []).map((e: any) => [e.id, e]));

		// Helpers to transform final state nodes/edges into DB rows
		const toNodeRow = (node: AppNode) => ({
			id: node.id,
			map_id: mapId,
			user_id: user.id,
			content: node.data?.content || '',
			position_x: node.position.x,
			position_y: node.position.y,
			width: node.width || null,
			height: node.height || null,
			node_type: node.type || 'defaultNode',
			metadata: node.data?.metadata || {},
			aiData: node.data?.aiData || {},
			parent_id: (node as any).parentId ?? node.data?.parent_id ?? null,
		});

		const toEdgeRow = (edge: AppEdge) => ({
			id: edge.id,
			map_id: mapId,
			user_id: user.id,
			source: edge.source,
			target: edge.target,
			label: edge.label || null,
			animated: (edge as any).animated ?? false,
			style: edge.style || { stroke: '#6c757d', strokeWidth: 2 },
			markerEnd: (edge as any).markerEnd ?? null,
			metadata: edge.data?.metadata || {},
			aiData: edge.data?.aiData || {},
		});

		const isEqual = (a: any, b: any) => {
			// Compare primitive fields and JSON-like objects deterministically
			return JSON.stringify(a) === JSON.stringify(b);
		};

		// 2) Compute diffs for nodes
		const finalNodeRows = finalNodes.map(toNodeRow);
		const finalNodeIdSet = new Set(finalNodeRows.map((r) => r.id));

		const nodesToDelete = (dbNodes || [])
			.filter((n: any) => !finalNodeIdSet.has(n.id))
			.map((n: any) => n.id);

		const nodesToUpsert = finalNodeRows
			.map((row) => {
				const existing = dbNodeMap.get(row.id);
				if (!existing) {
					return {
						...row,
						created_at: (row as any).created_at || new Date().toISOString(),
						updated_at: revertTimestamp,
					};
				}
				const comparableExisting = {
					content: existing.content || '',
					position_x: existing.position_x,
					position_y: existing.position_y,
					width: existing.width || null,
					height: existing.height || null,
					node_type: existing.node_type || 'defaultNode',
					metadata: existing.metadata || {},
					aiData: existing.aiData || {},
					parent_id: existing.parent_id ?? null,
				};
				const comparableRow = {
					content: row.content,
					position_x: row.position_x,
					position_y: row.position_y,
					width: row.width,
					height: row.height,
					node_type: row.node_type,
					metadata: row.metadata,
					aiData: row.aiData,
					parent_id: row.parent_id,
				};
				if (isEqual(comparableExisting, comparableRow)) return null; // unchanged
				return {
					...row,
					created_at: existing.created_at,
					updated_at: revertTimestamp,
				};
			})
			.filter(Boolean) as any[];

		// 3) Compute diffs for edges
		const finalEdgeRows = finalEdges.map(toEdgeRow);
		const finalEdgeIdSet = new Set(finalEdgeRows.map((r) => r.id));

		const edgesToDelete = (dbEdges || [])
			.filter((e: any) => !finalEdgeIdSet.has(e.id))
			.map((e: any) => e.id);

		const edgesToUpsert = finalEdgeRows
			.map((row) => {
				const existing = dbEdgeMap.get(row.id);
				if (!existing) {
					return {
						...row,
						created_at: (row as any).created_at || new Date().toISOString(),
						updated_at: revertTimestamp,
					};
				}
				const comparableExisting = {
					source: existing.source,
					target: existing.target,
					label: existing.label || null,
					animated: existing.animated ?? false,
					style: existing.style || { stroke: '#6c757d', strokeWidth: 2 },
					markerEnd: existing.markerEnd ?? null,
					metadata: existing.metadata || {},
					aiData: existing.aiData || {},
				};
				const comparableRow = {
					source: row.source,
					target: row.target,
					label: row.label,
					animated: row.animated ?? false,
					style: row.style || { stroke: '#6c757d', strokeWidth: 2 },
					markerEnd: row.markerEnd ?? null,
					metadata: row.metadata,
					aiData: row.aiData,
				};
				if (isEqual(comparableExisting, comparableRow)) return null; // unchanged
				return {
					...row,
					created_at: existing.created_at,
					updated_at: revertTimestamp,
				};
			})
			.filter(Boolean) as any[];

		// 4) Apply deletes first (edges, then nodes), then upserts (nodes, then edges)
		try {
			if (edgesToDelete.length > 0) {
				const { error } = await supabase
					.from('edges')
					.delete()
					.in('id', edgesToDelete)
					.eq('map_id', mapId);
				if (error) throw error;
			}

			if (nodesToDelete.length > 0) {
				const { error } = await supabase
					.from('nodes')
					.delete()
					.in('id', nodesToDelete)
					.eq('map_id', mapId);
				if (error) throw error;
			}

			if (nodesToUpsert.length > 0) {
				const { error } = await supabase.from('nodes').upsert(nodesToUpsert);
				if (error) throw error;
			}

			if (edgesToUpsert.length > 0) {
				const { error } = await supabase.from('edges').upsert(edgesToUpsert);
				if (error) throw error;
			}
		} catch (persistError) {
			console.error('Failed to persist revert (diff):', persistError);
			return NextResponse.json(
				{ error: 'Failed to persist changes to database' },
				{ status: 500 }
			);
		}

		// 5) Update the canonical current pointer (snapshot/event) for this map
		try {
			await supabase.from('map_history_current').upsert(
				{
					map_id: mapId,
					snapshot_id: targetSnapshotId,
					event_id: eventId ?? null,
					updated_by: user.id,
					updated_at: revertTimestamp,
				},
				{ onConflict: 'map_id' }
			);
		} catch (pointerError) {
			console.error(
				'Failed to upsert map_history_current pointer:',
				pointerError
			);
			// Non-fatal: continue returning the reverted state
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
