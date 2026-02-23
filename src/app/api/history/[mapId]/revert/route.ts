import { applyDelta } from '@/helpers/history/delta-calculator';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { createClient } from '@/helpers/supabase/server';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { HistoryDelta } from '@/types/history-state';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const revertBodySchema = z
	.object({
		snapshotId: z.string().uuid().optional(),
		eventId: z.string().uuid().optional(),
	})
	.refine((data) => data.snapshotId || data.eventId, {
		message: 'Either snapshotId or eventId is required',
	});

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function toStringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function toTextOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.toLowerCase() === 'null') return null;
	return value;
}

function toNumberOrNull(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}
	return null;
}

function canonicalizeNode(node: AppNode): AppNode | null {
	if (!node || typeof node !== 'object' || typeof node.id !== 'string') {
		return null;
	}

	const nodeRecord = node as unknown as Record<string, unknown>;
	const nodeData = toRecord(nodeRecord.data) ?? {};
	const position = toRecord(nodeRecord.position) ?? {};
	const measured = toRecord(nodeRecord.measured) ?? {};
	const parentNode = toRecord(nodeRecord.parentNode);

	const positionX =
		toNumberOrNull(position.x) ?? toNumberOrNull(nodeData.position_x) ?? 0;
	const positionY =
		toNumberOrNull(position.y) ?? toNumberOrNull(nodeData.position_y) ?? 0;
	const width =
		toNumberOrNull(nodeRecord.width) ??
		toNumberOrNull(measured.width) ??
		toNumberOrNull(nodeData.width);
	const height =
		toNumberOrNull(nodeRecord.height) ??
		toNumberOrNull(measured.height) ??
		toNumberOrNull(nodeData.height);
	const parentId =
		toStringOrNull(nodeRecord.parentId) ??
		toStringOrNull(nodeRecord.parentNode) ??
		toStringOrNull(parentNode?.id) ??
		toStringOrNull(nodeData.parent_id);
	const nodeType =
		toStringOrNull(nodeRecord.type) ??
		toStringOrNull(nodeData.node_type) ??
		'defaultNode';

	const normalizedData: Record<string, unknown> = {
		...nodeData,
		id: node.id,
		content: toStringOrNull(nodeData.content) ?? '',
		position_x: positionX,
		position_y: positionY,
		width: width ?? null,
		height: height ?? null,
		node_type: nodeType,
		parent_id: parentId ?? null,
		metadata: toRecord(nodeData.metadata) ?? {},
		aiData: toRecord(nodeData.aiData) ?? {},
	};

	const normalizedNode: Record<string, unknown> = {
		...nodeRecord,
		id: node.id,
		type: nodeType,
		position: { x: positionX, y: positionY },
		parentId: parentId ?? undefined,
		data: normalizedData,
	};

	if (typeof width === 'number') normalizedNode.width = width;
	else delete normalizedNode.width;

	if (typeof height === 'number') normalizedNode.height = height;
	else delete normalizedNode.height;

	return normalizedNode as unknown as AppNode;
}

function inferEdgeTypeFromData(edgeData: Record<string, unknown>): string {
	const aiData = toRecord(edgeData.aiData);
	if (aiData?.isSuggested === true || aiData?.isSuggested === 'true') {
		return 'suggestedConnection';
	}

	const metadata = toRecord(edgeData.metadata);
	if (metadata?.pathType === 'waypoint') {
		return 'waypointEdge';
	}

	return 'floatingEdge';
}

function canonicalizeEdge(edge: AppEdge): AppEdge | null {
	if (!edge || typeof edge !== 'object' || typeof edge.id !== 'string') {
		return null;
	}

	const edgeRecord = edge as unknown as Record<string, unknown>;
	const edgeData = toRecord(edgeRecord.data) ?? {};
	const source =
		toStringOrNull(edgeRecord.source) ?? toStringOrNull(edgeData.source);
	const target =
		toStringOrNull(edgeRecord.target) ?? toStringOrNull(edgeData.target);

	if (!source || !target) return null;

	const animated =
		toBooleanOrNull(edgeRecord.animated) ??
		toBooleanOrNull(edgeData.animated) ??
		false;
	const style = toRecord(edgeRecord.style) ?? toRecord(edgeData.style) ?? null;
	const markerEnd =
		toTextOrNull(edgeRecord.markerEnd) ?? toTextOrNull(edgeData.markerEnd);
	const markerStart =
		toTextOrNull(edgeRecord.markerStart) ?? toTextOrNull(edgeData.markerStart);
	const label = toStringOrNull(edgeRecord.label) ?? toStringOrNull(edgeData.label);
	const metadata = toRecord(edgeData.metadata) ?? {};
	const aiData = toRecord(edgeData.aiData) ?? {};
	const edgeType =
		toStringOrNull(edgeRecord.type) ??
		toStringOrNull(edgeData.type) ??
		inferEdgeTypeFromData(edgeData);

	const normalizedData: Record<string, unknown> = {
		...edgeData,
		id: edge.id,
		source,
		target,
		label: label ?? null,
		animated,
		style,
		markerEnd: markerEnd ?? null,
		markerStart: markerStart ?? null,
		metadata,
		aiData,
	};

	return {
		...(edge as unknown as Record<string, unknown>),
		id: edge.id,
		source,
		target,
		type: edgeType,
		label: label ?? undefined,
		animated,
		style,
		markerEnd: markerEnd ?? null,
		markerStart: markerStart ?? null,
		data: normalizedData as any,
	} as AppEdge;
}

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
		const parsed = revertBodySchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message || 'Invalid request body' },
				{ status: 400 }
			);
		}
		const { snapshotId, eventId } = parsed.data;

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
			.select('id, can_edit')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.eq('status', 'active')
			.limit(1)
			.maybeSingle();
		const hasAccess = map.user_id === user.id || share?.can_edit === true;
		if (!hasAccess)
			return NextResponse.json(
				{ error: 'Access denied: edit permission required' },
				{ status: 403 }
			);

		// Use service-role client for revert persistence after explicit authorization.
		const adminClient = createServiceRoleClient();

		// Determine target snapshot
		let targetSnapshotId = snapshotId || '';
		if (eventId && !targetSnapshotId) {
			const { data: event } = await adminClient
				.from('map_history_events')
				.select('snapshot_id')
				.eq('id', eventId)
				.eq('map_id', mapId)
				.single();
			if (!event)
				return NextResponse.json({ error: 'Event not found' }, { status: 404 });
			targetSnapshotId = event.snapshot_id;
		}

		// Fetch snapshot full state
		const { data: snapshot } = await adminClient
			.from('map_history_snapshots')
			.select('*')
			.eq('id', targetSnapshotId)
			.eq('map_id', mapId)
			.single();
		if (!snapshot)
			return NextResponse.json(
				{ error: 'Snapshot not found' },
				{ status: 404 }
			);

		let finalNodes: AppNode[] = Array.isArray(snapshot.nodes)
			? (snapshot.nodes as AppNode[])
			: [];
		let finalEdges: AppEdge[] = Array.isArray(snapshot.edges)
			? (snapshot.edges as AppEdge[])
			: [];

		if (eventId) {
			const { data: events } = await adminClient
				.from('map_history_events')
				.select('*')
				.eq('snapshot_id', targetSnapshotId)
				.eq('map_id', mapId)
				.order('event_index', { ascending: true });
			for (const ev of events || []) {
				const result = applyDelta(
					{ nodes: finalNodes, edges: finalEdges },
					ev.changes as HistoryDelta // HistoryDelta
				);
				finalNodes = result.nodes;
				finalEdges = result.edges;
				if (ev.id === eventId) break;
			}
		}

		// Canonicalize state so persistence reads from stable top-level fields while
		// preserving values that may only exist in nested data.* payloads.
		finalNodes = finalNodes
			.map((node) => canonicalizeNode(node))
			.filter((node): node is AppNode => node !== null);
		finalEdges = finalEdges
			.map((edge) => canonicalizeEdge(edge))
			.filter((edge): edge is AppEdge => edge !== null);

		// Guard against corrupted/inconsistent history deltas that can produce
		// edges referencing nodes absent from the reverted node set.
		const finalNodeIdSetFromState = new Set(finalNodes.map((node) => node.id));
		const invalidStateEdges = finalEdges.filter(
			(edge) =>
				!finalNodeIdSetFromState.has(edge.source) ||
				!finalNodeIdSetFromState.has(edge.target)
		);
		if (invalidStateEdges.length > 0) {
			console.warn('[history/revert] Dropping invalid edges from reverted state', {
				mapId,
				snapshotId: targetSnapshotId,
				eventId: eventId ?? null,
				droppedEdgeIds: invalidStateEdges
					.map((edge) => edge?.id)
					.filter((id): id is string => typeof id === 'string'),
			});
			finalEdges = finalEdges.filter(
				(edge) =>
					finalNodeIdSetFromState.has(edge.source) &&
					finalNodeIdSetFromState.has(edge.target)
			);
		}

		// Persist reverted state to database using differential upserts/deletes
		// to avoid emitting unnecessary realtime updates for unchanged rows.
		const revertTimestamp = new Date().toISOString();

		// 1) Load current DB state for comparison
		const [
			{ data: dbNodes, error: nodesLoadError },
			{ data: dbEdges, error: edgesLoadError },
			] = await Promise.all([
				adminClient
					.from('nodes')
					.select(
						'id, user_id, content, position_x, position_y, width, height, node_type, metadata, aiData, parent_id, created_at, updated_at'
					)
					.eq('map_id', mapId),
				adminClient
					.from('edges')
					.select(
						'id, user_id, source, target, label, type, animated, style, markerEnd, markerStart, metadata, aiData, created_at, updated_at'
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
			const toNodeRow = (node: AppNode) => {
				const nodeRecord = node as unknown as Record<string, unknown>;
				const nodeData = toRecord(nodeRecord.data) ?? {};
				const position = toRecord(nodeRecord.position) ?? {};
				const measured = toRecord(nodeRecord.measured) ?? {};
				const parentNode = toRecord(nodeRecord.parentNode);

				const positionX =
					toNumberOrNull(position.x) ?? toNumberOrNull(nodeData.position_x) ?? 0;
				const positionY =
					toNumberOrNull(position.y) ?? toNumberOrNull(nodeData.position_y) ?? 0;
				const width =
					toNumberOrNull(nodeRecord.width) ??
					toNumberOrNull(measured.width) ??
					toNumberOrNull(nodeData.width);
				const height =
					toNumberOrNull(nodeRecord.height) ??
					toNumberOrNull(measured.height) ??
					toNumberOrNull(nodeData.height);
				const parentId =
					toStringOrNull(nodeRecord.parentId) ??
					toStringOrNull(nodeRecord.parentNode) ??
					toStringOrNull(parentNode?.id) ??
					toStringOrNull(nodeData.parent_id);
				const nodeType =
					toStringOrNull(nodeRecord.type) ??
					toStringOrNull(nodeData.node_type) ??
					'defaultNode';

				return {
					id: node.id,
					map_id: mapId,
					user_id: toStringOrNull(nodeData.user_id),
					content: toStringOrNull(nodeData.content) ?? '',
					position_x: positionX,
					position_y: positionY,
					width: width ?? null,
					height: height ?? null,
					node_type: nodeType,
					metadata: toRecord(nodeData.metadata) ?? {},
					aiData: toRecord(nodeData.aiData) ?? {},
					parent_id: parentId ?? null,
					created_at: toStringOrNull(nodeData.created_at),
				};
			};

			const toEdgeRow = (edge: AppEdge) => {
				const edgeRecord = edge as unknown as Record<string, unknown>;
				const edgeData = toRecord(edgeRecord.data) ?? {};
				const source =
					toStringOrNull(edgeRecord.source) ?? toStringOrNull(edgeData.source);
				const target =
					toStringOrNull(edgeRecord.target) ?? toStringOrNull(edgeData.target);
				const edgeType =
					toStringOrNull(edgeRecord.type) ??
					toStringOrNull(edgeData.type) ??
					inferEdgeTypeFromData(edgeData);

				return {
					id: edge.id,
					map_id: mapId,
					user_id: toStringOrNull(edgeData.user_id),
					source,
					target,
					label:
						toStringOrNull(edgeRecord.label) ??
						toStringOrNull(edgeData.label) ??
						null,
					type: edgeType,
					animated:
						toBooleanOrNull(edgeRecord.animated) ??
						toBooleanOrNull(edgeData.animated) ??
						false,
					style: toRecord(edgeRecord.style) ?? toRecord(edgeData.style) ?? null,
					markerEnd:
						toTextOrNull(edgeRecord.markerEnd) ??
						toTextOrNull(edgeData.markerEnd),
					markerStart:
						toTextOrNull(edgeRecord.markerStart) ??
						toTextOrNull(edgeData.markerStart),
					metadata: toRecord(edgeData.metadata) ?? {},
					aiData: toRecord(edgeData.aiData) ?? {},
					created_at: toStringOrNull(edgeData.created_at),
				};
			};

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
						user_id: row.user_id || user.id,
						created_at: row.created_at || new Date().toISOString(),
						updated_at: revertTimestamp,
					};
				}
				const comparableExisting = {
					content: existing.content || '',
					position_x: existing.position_x,
					position_y: existing.position_y,
					width: existing.width ?? null,
					height: existing.height ?? null,
					node_type: existing.node_type || 'defaultNode',
					metadata: existing.metadata ?? {},
					aiData: existing.aiData ?? {},
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
					user_id: existing.user_id ?? row.user_id ?? user.id,
					created_at: existing.created_at,
					updated_at: revertTimestamp,
				};
			})
			.filter(Boolean) as any[];

			// 3) Compute diffs for edges
			const finalEdgeRows = finalEdges.map(toEdgeRow);
			const invalidFinalEdgeRows = finalEdgeRows.filter(
				(row) =>
					typeof row.source !== 'string' ||
					row.source.length === 0 ||
					typeof row.target !== 'string' ||
					row.target.length === 0
			);
			if (invalidFinalEdgeRows.length > 0) {
				console.warn(
					'[history/revert] Dropping reverted edges with invalid source/target',
					{
						mapId,
						snapshotId: targetSnapshotId,
						eventId: eventId ?? null,
						droppedEdgeIds: invalidFinalEdgeRows.map((row) => row.id),
					}
				);
			}
			const validFinalEdgeRows = finalEdgeRows.filter(
				(row): row is typeof row & { source: string; target: string } =>
					typeof row.source === 'string' &&
					row.source.length > 0 &&
					typeof row.target === 'string' &&
					row.target.length > 0
			);
			const validFinalEdgeIdSet = new Set(validFinalEdgeRows.map((row) => row.id));
			finalEdges = finalEdges.filter((edge) => validFinalEdgeIdSet.has(edge.id));
			const finalEdgeIdSet = new Set(validFinalEdgeRows.map((r) => r.id));

		const edgesToDelete = (dbEdges || [])
			.filter((e: any) => !finalEdgeIdSet.has(e.id))
			.map((e: any) => e.id);

			let edgesToUpsert = validFinalEdgeRows
				.map((row) => {
					const existing = dbEdgeMap.get(row.id);
					if (!existing) {
						return {
							...row,
						user_id: row.user_id || user.id,
						created_at: row.created_at || new Date().toISOString(),
						updated_at: revertTimestamp,
					};
				}
					const comparableExisting = {
						source: existing.source,
						target: existing.target,
						label: existing.label || null,
						type: existing.type || inferEdgeTypeFromData(existing),
						animated: toBooleanOrNull(existing.animated) ?? false,
						style: toRecord(existing.style) ?? null,
						markerEnd: existing.markerEnd ?? null,
						markerStart: existing.markerStart ?? null,
						metadata: existing.metadata || {},
						aiData: existing.aiData || {},
					};
					const comparableRow = {
						source: row.source,
						target: row.target,
						label: row.label,
						type: row.type,
						animated: row.animated ?? false,
						style: row.style ?? null,
						markerEnd: row.markerEnd ?? null,
						markerStart: row.markerStart ?? null,
						metadata: row.metadata,
						aiData: row.aiData,
					};
				if (isEqual(comparableExisting, comparableRow)) return null; // unchanged
				return {
					...row,
					user_id: existing.user_id ?? row.user_id ?? user.id,
					created_at: existing.created_at,
					updated_at: revertTimestamp,
				};
			})
			.filter(Boolean) as any[];

		// 4) Apply deletes first (edges, then nodes), then upserts (nodes, then edges)
		try {
			if (edgesToDelete.length > 0) {
				const { error } = await adminClient
					.from('edges')
					.delete()
					.in('id', edgesToDelete)
					.eq('map_id', mapId);
				if (error) throw error;
			}

			if (nodesToDelete.length > 0) {
				const { error } = await adminClient
					.from('nodes')
					.delete()
					.in('id', nodesToDelete)
					.eq('map_id', mapId);
				if (error) throw error;
			}

			if (nodesToUpsert.length > 0) {
				const { error } = await adminClient.from('nodes').upsert(nodesToUpsert);
				if (error) throw error;
			}

			if (edgesToUpsert.length > 0) {
				const referencedNodeIds = Array.from(
					new Set(
						edgesToUpsert
							.flatMap((edge) => [edge.source, edge.target])
							.filter((id): id is string => typeof id === 'string')
					)
				);
				if (referencedNodeIds.length > 0) {
					const { data: presentNodes, error: presentNodesError } = await adminClient
						.from('nodes')
						.select('id')
						.eq('map_id', mapId)
						.in('id', referencedNodeIds);
					if (presentNodesError) throw presentNodesError;

					const presentNodeIdSet = new Set(
						(presentNodes || [])
							.map((node: any) => node?.id)
							.filter((id: unknown): id is string => typeof id === 'string')
					);
					const invalidEdgeRows = edgesToUpsert.filter(
						(edge) =>
							!presentNodeIdSet.has(edge.source) ||
							!presentNodeIdSet.has(edge.target)
					);
					if (invalidEdgeRows.length > 0) {
						console.warn(
							'[history/revert] Skipping edges with missing source/target nodes during persist',
							{
								mapId,
								snapshotId: targetSnapshotId,
								eventId: eventId ?? null,
								droppedEdgeIds: invalidEdgeRows.map((edge) => edge.id),
							}
						);
						const droppedEdgeIdSet = new Set(
							invalidEdgeRows.map((edge) => edge.id)
						);
						finalEdges = finalEdges.filter(
							(edge) => !droppedEdgeIdSet.has(edge.id)
						);
					}
					edgesToUpsert = edgesToUpsert.filter(
						(edge) =>
							presentNodeIdSet.has(edge.source) &&
							presentNodeIdSet.has(edge.target)
					);
				}

				const { error } = await adminClient.from('edges').upsert(edgesToUpsert);
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
			await adminClient.from('map_history_current').upsert(
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
