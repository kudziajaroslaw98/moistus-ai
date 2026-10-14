'use client';

import type { HistoryFocusTarget } from '@/helpers/history/presentation';
import { useIsMobile } from '@/hooks/use-mobile';
import useAppStore from '@/store/mind-map-store';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

export function useHistoryFocusController() {
	const {
		nodes,
		edges,
		centerOnNode,
		reactFlowInstance,
		setSelectedNodes,
		setPopoverOpen,
	} = useAppStore(
		useShallow((state) => ({
			nodes: state.nodes,
			edges: state.edges,
			centerOnNode: state.centerOnNode,
			reactFlowInstance: state.reactFlowInstance,
			setSelectedNodes: state.setSelectedNodes,
			setPopoverOpen: state.setPopoverOpen,
		}))
	);
	const isMobile = useIsMobile();

	const nodeById = useMemo(
		() => new Map(nodes.map((node) => [node.id, node])),
		[nodes]
	);

	const focusTarget = useCallback(
		(target: HistoryFocusTarget) => {
			if (target.type === 'node') {
				const currentNode = nodeById.get(target.nodeId);
				if (currentNode) {
					centerOnNode(target.nodeId);
					return;
				}

				if (target.position && reactFlowInstance) {
					reactFlowInstance.setCenter(
						target.position.x + (target.width || 0) / 2,
						target.position.y + (target.height || 0) / 2,
						{ zoom: 1.2, duration: 800 }
					);
				}
				return;
			}

			const targetNodes = target.nodeIds
				.map((nodeId) => nodeById.get(nodeId))
				.filter((node): node is (typeof nodes)[number] => Boolean(node));

			if (targetNodes.length >= 2 && reactFlowInstance) {
				reactFlowInstance.fitView({
					nodes: targetNodes.map((node) => ({ id: node.id })),
					padding: 0.35,
					duration: 800,
				});
				targetNodes.forEach((node) => {
					reactFlowInstance.updateNode(node.id, { selected: true });
				});
				setSelectedNodes(targetNodes);
				return;
			}

			if (targetNodes.length === 1) {
				centerOnNode(targetNodes[0].id);
			}
		},
		[centerOnNode, nodeById, nodes, reactFlowInstance, setSelectedNodes]
	);

	// On desktop the panel is docked, so the map pans while it stays open. On a phone
	// the panel covers the map: close it first, then pan once it starts sliding out.
	const handleFocusTarget = useCallback(
		(target: HistoryFocusTarget) => {
			if (!isMobile) {
				focusTarget(target);
				return;
			}

			setPopoverOpen({ history: false });
			window.requestAnimationFrame(() => focusTarget(target));
		},
		[focusTarget, isMobile, setPopoverOpen]
	);

	return { nodes, edges, handleFocusTarget };
}
