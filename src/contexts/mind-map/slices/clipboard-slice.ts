import generateUuid from '@/helpers/generate-uuid';
import type { AppNode } from '@/types/app-node';
import type { XYPosition } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, ClipboardSlice } from '../app-state';

export const createClipboardSlice: StateCreator<
	AppState,
	[],
	[],
	ClipboardSlice
> = (set, get) => ({
	// state
	copiedNodes: [],
	copiedEdges: [],

	// actions
	copySelectedNodes: () => {
		const { selectedNodes } = get();
		const { edges } = get();

		const toastId = toast.loading('Copying nodes...');
		if (selectedNodes.length === 0) return;

		// Get the selected node IDs
		const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

		// Find edges that connect only the selected nodes (internal edges)
		const internalEdges = edges.filter(
			(edge) =>
				selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
		);

		set({
			copiedNodes: selectedNodes,
			copiedEdges: internalEdges,
		});

		toast.success('Nodes copied!', { id: toastId });
	},
	pasteNodes: async (position?: XYPosition) => {
		const { copiedNodes, copiedEdges, reactFlowInstance, addNode, addEdge } =
			get();

		if (copiedNodes.length === 0) return;

		// Generate a mapping of old IDs to new IDs
		const idMap = new Map<string, string>();

		// Create new nodes with new IDs
		const newNodes: AppNode[] = copiedNodes.map((node, index) => {
			const newNodeId = generateUuid();
			idMap.set(node.id, newNodeId);

			// Calculate new position if provided
			let newPosition = { ...node.position };

			if (position && reactFlowInstance) {
				const pasteCenter = reactFlowInstance.screenToFlowPosition({
					x: window.innerWidth / 2,
					y: window.innerHeight / 2 - 30,
				});
				newPosition = {
					x: pasteCenter.x + index * 30 + Math.random() * 10 - 5,
					y: pasteCenter.y + index * 30 + Math.random() * 10 - 5,
				};
			}

			return {
				...node,
				id: newNodeId,
				position: newPosition,
				selected: false, // Deselect after paste
			};
		});

		// Create new edges with new IDs and updated source/target
		const newEdges = copiedEdges.map((edge) => {
			const newEdgeId = generateUuid();
			return {
				...edge,
				id: newEdgeId,
				source: idMap.get(edge.source) || edge.source,
				target: idMap.get(edge.target) || edge.target,
			};
		});

		// Add new nodes

		for (const node of newNodes) {
			await addNode({
				parentNode: null, // Will be handled by edges
				content: node.data.content || '',
				nodeType: node.data.node_type || 'defaultNode',
				data: {
					...node.data,
					id: node.id,
				},
				position: node.position,
			});
		}

		// Add new edges

		for (const edge of newEdges) {
			await addEdge(edge.source, edge.target, {
				...edge.data,
				id: edge.id,
			});
		}

		// Select the newly pasted nodes
		set({
			selectedNodes: newNodes,
		});
	},
	duplicateNodes: async (nodeIds: string[]) => {
		const { nodes, edges } = get();

		if (nodeIds.length === 0) return { nodes: [], edges: [] };

		// Find the nodes to duplicate
		const nodesToDuplicate = nodes.filter((node) => nodeIds.includes(node.id));
		const nodeIdSet = new Set(nodeIds);

		// Find internal edges
		const edgesToDuplicate = edges.filter(
			(edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
		);

		// Generate new IDs
		const idMap = new Map<string, string>();
		const newNodes = nodesToDuplicate.map((node) => {
			const newId = generateUuid();
			idMap.set(node.id, newId);

			return {
				...node,
				id: newId,
				position: {
					x: node.position.x + 50, // Offset slightly
					y: node.position.y + 50,
				},
				selected: false,
			};
		});

		const newEdges = edgesToDuplicate.map((edge) => ({
			...edge,
			id: generateUuid(),
			source: idMap.get(edge.source) || edge.source,
			target: idMap.get(edge.target) || edge.target,
		}));

		return { nodes: newNodes, edges: newEdges };
	},
});
