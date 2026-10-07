'use client';

import { GROUP_DRAG_DWELL_MS } from '@/constants/group';
import useAppStore from '@/store/mind-map-store';
import type { AppNode } from '@/types/app-node';
import { resolveGroupDragIntent } from '@/utils/group/group-utils';
import type { OnNodeDrag } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Drag-to-group membership: hovering a dragged node over a group (or outside
 * its own group) for GROUP_DRAG_DWELL_MS arms the change; dropping commits it.
 * Leaving the target before release cancels. Feedback is exposed through
 * `groupDragIntent` in the store and rendered by GroupNode.
 */
export function useGroupDragMembership({ canEdit }: { canEdit: boolean }) {
	const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const intentKeyRef = useRef<string | null>(null);

	const reset = useCallback(() => {
		if (dwellTimerRef.current) {
			clearTimeout(dwellTimerRef.current);
			dwellTimerRef.current = null;
		}

		intentKeyRef.current = null;

		const state = useAppStore.getState();
		if (state.groupDragIntent) {
			state.setGroupDragIntent(null);
		}
	}, []);

	const onNodeDrag: OnNodeDrag<AppNode> = useCallback(
		(_event, node, draggedNodes) => {
			if (!canEdit) return;

			const state = useAppStore.getState();
			// Only persisted, groupable nodes (skips ghost and comment nodes).
			const storeNodeIds = new Set(state.nodes.map((n) => n.id));
			const isGroupable = (n: AppNode) =>
				storeNodeIds.has(n.id) && n.data.node_type !== 'commentNode';
			const intent = isGroupable(node)
				? resolveGroupDragIntent({
						allNodes: state.nodes,
						draggedNodes: (draggedNodes.length > 0 ? draggedNodes : [node]).filter(
							isGroupable
						),
						primaryNode: node,
					})
				: null;
			const intentKey = intent
				? `${intent.type}:${intent.groupId}:${intent.nodeIds.join(',')}`
				: null;

			// Same intent as last move: let the running dwell timer continue.
			if (intentKey === intentKeyRef.current) return;

			reset();
			if (!intent) return;

			intentKeyRef.current = intentKey;
			state.setGroupDragIntent({ ...intent, armed: false });
			dwellTimerRef.current = setTimeout(() => {
				dwellTimerRef.current = null;
				useAppStore.getState().setGroupDragIntent({ ...intent, armed: true });
			}, GROUP_DRAG_DWELL_MS);
		},
		[canEdit, reset]
	);

	const onNodeDragStop = useCallback(() => {
		const intent = useAppStore.getState().groupDragIntent;
		reset();

		if (!canEdit || !intent?.armed) return;

		const targetGroupId = intent.type === 'add' ? intent.groupId : null;
		void useAppStore
			.getState()
			.setNodesGroup(intent.nodeIds, targetGroupId)
			.catch((error: unknown) => {
				console.error('[groups] Failed to update group membership:', error);
				toast.error(
					intent.type === 'add'
						? 'Failed to add node to group'
						: 'Failed to remove node from group'
				);
			});
	}, [canEdit, reset]);

	// Drop any pending intent if edit access is lost mid-drag or on unmount.
	useEffect(() => {
		if (!canEdit) reset();
		return reset;
	}, [canEdit, reset]);

	return { onNodeDrag, onNodeDragStop };
}
