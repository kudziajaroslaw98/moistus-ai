'use client';
import { usePermissions } from '@/hooks/collaboration/use-permissions';
import type { NodeEditorOptions } from '@/store/app-state';
import useAppStore from '@/store/mind-map-store';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { PathType } from '@/types/path-types';
import { type Edge, type Node, type ReactFlowInstance } from '@xyflow/react';
import {
	ChevronDown,
	ChevronRight,
	Edit,
	Group,
	LocateFixed,
	Network,
	NotepadTextDashed,
	Pause,
	Play,
	Plus,
	Trash,
	Ungroup,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { EdgeStyleSelector } from './edge-style-selector';
import type { MenuSection } from './types';

interface UseContextMenuConfigProps {
	aiActions: {
		suggestConnections: () => void;
		suggestMerges: () => void;
		suggestCounterpoints?: () => void;
	};
	onClose: () => void;
}

type GroupDetectionNode = {
	type?: string;
	data?: {
		node_type?: string;
		nodeType?: string;
		metadata?:
			| {
					isGroup?: boolean | string;
					groupChildren?: unknown;
			  }
			| null;
	};
};

function isGroupLikeNode(node?: GroupDetectionNode | null): boolean {
	if (!node) return false;

	const groupChildren = node.data?.metadata?.groupChildren;

	return (
		node.type === 'groupNode' ||
		node.data?.node_type === 'groupNode' ||
		node.data?.nodeType === 'groupNode' ||
		node.data?.metadata?.isGroup === true ||
		node.data?.metadata?.isGroup === 'true' ||
		Array.isArray(groupChildren)
	);
}

// ============================================================================
// Builder Functions - Extract menu section logic into focused helpers
// ============================================================================

interface BuildNodeMenuParams {
	clickedNode: AppNode;
	hasChildren: boolean;
	openNodeEditor: (options: NodeEditorOptions) => void;
	toggleNodeCollapse: (nodeId: string) => void;
	ungroupNodes: (groupId: string) => void;
	removeNodesFromGroup: (nodeIds: string[]) => void;
	deleteNodes: (nodes: AppNode[]) => void;
	reactFlowInstance: ReactFlowInstance | null;
	onClose: () => void;
	aiActions: {
		suggestCounterpoints?: () => void;
	};
	canEdit: boolean;
}

function buildNodeMenu(params: BuildNodeMenuParams): MenuSection[] {
	const {
		clickedNode,
		hasChildren,
		openNodeEditor,
		toggleNodeCollapse,
		ungroupNodes,
		removeNodesFromGroup,
		deleteNodes,
		reactFlowInstance,
		onClose,
		aiActions,
		canEdit,
	} = params;

	const clickedNodeData = clickedNode.data;
	const isGroupNode = isGroupLikeNode(clickedNode);

	return [
		{
			id: 'node-actions',
			items: [
				{
					id: 'edit-node',
					icon: <Edit className='h-4 w-4' />,
					label: 'Edit Node',
					onClick: () => {
						openNodeEditor({
							mode: 'edit',
							position: clickedNode.position,
							existingNodeId: clickedNode.id,
						});
						onClose();
					},
					hidden: !canEdit,
				},
				{
					id: 'add-child',
					icon: <Plus className='h-4 w-4' />,
					label: 'Add Child Node',
					onClick: () => {
						if (reactFlowInstance) {
							const parentNodeBounds = {
								x: clickedNode.position.x,
								y: clickedNode.position.y,
								width: 320,
								height: clickedNode.measured?.height || 100,
							};

							const childPosition = {
								x: parentNodeBounds.x,
								y: parentNodeBounds.y + parentNodeBounds.height + 100,
							};

							openNodeEditor({
								mode: 'create',
								position: childPosition,
								parentNode: clickedNode,
							});

							onClose();
						}
					},
					hidden: !canEdit,
				},
				{
					id: 'toggle-collapse',
					icon: clickedNodeData?.isCollapsed ? (
						<ChevronRight className='h-4 w-4' />
					) : (
						<ChevronDown className='h-4 w-4' />
					),
					label: clickedNodeData?.isCollapsed
						? 'Expand Branch'
						: 'Collapse Branch',
					onClick: () => {
						toggleNodeCollapse(clickedNode.id);
						onClose();
					},
					hidden: !hasChildren,
					// Note: Collapse/expand is view-only, available to all roles
				},
				{
					id: 'remove-from-group',
					icon: <Ungroup className='h-4 w-4' />,
					label: 'Remove from Group',
					onClick: () => {
						removeNodesFromGroup([clickedNode.id]);
						onClose();
					},
					hidden: !clickedNode.parentId || !canEdit,
				},
				{
					id: 'ungroup',
					icon: <Ungroup className='h-4 w-4' />,
					label: 'Ungroup',
					onClick: () => {
						ungroupNodes(clickedNode.id);
						onClose();
					},
					hidden: !isGroupNode || !canEdit,
				},
			],
		},
		{
			id: 'node-ai',
			items: [
				{
					id: 'generate-counterpoints',
					icon: <NotepadTextDashed className='h-4 w-4' />,
					label: 'Generate Counterpoints',
					onClick: () => {
						aiActions?.suggestCounterpoints?.();
						onClose();
					},
					hidden: !canEdit,
				},
			],
		},
		{
			id: 'node-destructive',
			items: [
				{
					id: 'delete-node',
					icon: <Trash className='h-4 w-4' />,
					label: 'Delete Node',
					onClick: () => {
						deleteNodes([clickedNode]);
						onClose();
					},
					variant: 'destructive',
					hidden: !canEdit,
				},
			],
		},
	];
}

interface BuildEdgeMenuParams {
	clickedEdge: Edge<Partial<EdgeData>>;
	updateEdge: any;
	deleteEdges: any;
	onClose: () => void;
	canEdit: boolean;
}

function buildEdgeMenu(params: BuildEdgeMenuParams): MenuSection[] {
	const { clickedEdge, updateEdge, deleteEdges, onClose, canEdit } = params;

	return [
		{
			id: 'edge-style',
			items: [
				{
					id: 'edge-style-options',
					icon: <></>,
					label: '',
					onClick: () => {},
					hidden: !canEdit,
					customComponent: (
						<EdgeStyleSelector
							edge={clickedEdge}
							onColorChange={(color: string | undefined) => {
								updateEdge({
									edgeId: clickedEdge.id,
									data: {
										style: {
											stroke: color,
										},
									},
								});
							}}
							onPathTypeChange={(pathType: PathType) => {
								// Update edge type based on path type
								const edgeType =
									pathType === 'waypoint' ? 'waypointEdge' : 'floatingEdge';

								// When switching away from waypoint, clear waypoints
								const shouldClearWaypoints =
									pathType !== 'waypoint' &&
									clickedEdge.data?.metadata?.pathType === 'waypoint';

								updateEdge({
									edgeId: clickedEdge.id,
									data: {
										type: edgeType,
										metadata: {
											...clickedEdge.data?.metadata,
											pathType,
											waypoints: shouldClearWaypoints
												? undefined
												: clickedEdge.data?.metadata?.waypoints,
										},
									},
								});
							}}
						/>
					),
				},
			],
		},
		{
			id: 'edge-animation',
			items: [
				{
					id: 'toggle-animation',
					icon: clickedEdge.animated ? (
						<Pause className='h-4 w-4' />
					) : (
						<Play className='h-4 w-4' />
					),
					label: clickedEdge.animated
						? 'Disable Animation'
						: 'Enable Animation',
					onClick: () => {
						updateEdge({
							edgeId: clickedEdge.id,
							data: {
								animated: !clickedEdge.animated,
							},
						});
					},
					hidden: !canEdit,
				},
			],
		},
		{
			id: 'edge-destructive',
			items: [
				{
					id: 'delete-edge',
					icon: <Trash className='h-4 w-4' />,
					label: 'Delete Edge',
					onClick: () => {
						deleteEdges([clickedEdge]);
						onClose();
					},
					variant: 'destructive',
					hidden: !canEdit,
				},
			],
		},
	];
}

interface BuildPaneMenuParams {
	reactFlowInstance: any;
	x: number;
	y: number;
	openNodeEditor: any;
	aiActions: {
		suggestConnections: () => void;
		suggestMerges: () => void;
		suggestCounterpoints?: () => void;
	};
	loadingStates: any;
	onClose: () => void;
	canEdit: boolean;
}

function buildPaneMenu(params: BuildPaneMenuParams): MenuSection[] {
	const {
		reactFlowInstance,
		x,
		y,
		openNodeEditor,
		aiActions,
		loadingStates,
		onClose,
		canEdit,
	} = params;

	return [
		{
			id: 'pane-add',
			items: [
				{
					id: 'add-node',
					icon: <Plus className='h-4 w-4' />,
					label: 'Add Node Here',
					onClick: () => {
						if (reactFlowInstance && x && y) {
							const position = reactFlowInstance.screenToFlowPosition({
								x,
								y,
							});
							openNodeEditor({
								mode: 'create',
								position,
								parentNode: null,
							});
							onClose();
						}
					},
					hidden: !canEdit,
				},
				{
					id: 'add-reference',
					icon: <LocateFixed className='h-4 w-4' />,
					label: 'Add Reference',
					onClick: () => {
						if (reactFlowInstance && x && y) {
							const position = reactFlowInstance.screenToFlowPosition({
								x,
								y,
							});
							openNodeEditor({
								mode: 'create',
								position,
								parentNode: null,
								suggestedType: 'referenceNode',
							});
							onClose();
						}
					},
					hidden: !canEdit,
				},
			],
		},
		{
			id: 'pane-ai',
			items: [
				{
					id: 'suggest-connections',
					icon: <Network className='h-4 w-4' />,
					label: 'Suggest Connections',
					onClick: aiActions.suggestConnections,
					loading: loadingStates.isSuggestingConnections,
					hidden: !canEdit,
				},
				{
					id: 'suggest-counterpoints',
					icon: <NotepadTextDashed className='h-4 w-4' />,
					label: 'Generate Counterpoints',
					onClick: () => aiActions.suggestCounterpoints?.(),
					loading: loadingStates.isGenerating,
					hidden: !canEdit,
				},
				{
					id: 'suggest-merges',
					icon: <NotepadTextDashed className='h-4 w-4' />,
					label: 'Suggest Merges',
					onClick: aiActions.suggestMerges,
					loading: loadingStates.isSuggestingMerges,
					hidden: !canEdit,
				},
			],
		},
	];
}

interface BuildSelectedNodesMenuParams {
	selectedNodes: Node[];
	createGroupFromSelected: any;
	ungroupNodes: any;
	onClose: () => void;
	canEdit: boolean;
}

function buildSelectedNodesMenu(
	params: BuildSelectedNodesMenuParams
): MenuSection[] {
	const {
		selectedNodes,
		createGroupFromSelected,
		ungroupNodes,
		onClose,
		canEdit,
	} = params;

	if (!selectedNodes || selectedNodes.length === 0) return [];

	const isSingleGroupSelected =
		selectedNodes.length === 1 && isGroupLikeNode(selectedNodes[0]);

	return [
		{
			id: 'selected-actions',
			items: [
				{
					id: 'group-selected',
					icon: <Group className='h-4 w-4' />,
					label: 'Group Selected Nodes',
					onClick: () => {
						createGroupFromSelected();
						onClose();
					},
					hidden: selectedNodes.length <= 1 || !canEdit,
				},
				{
					id: 'ungroup',
					icon: <Ungroup className='h-4 w-4' />,
					label: 'Ungroup',
					onClick: () => {
						ungroupNodes(selectedNodes[0].id);
						onClose();
					},
					hidden: !isSingleGroupSelected || !canEdit,
				},
			],
		},
	];
}

// ============================================================================
// Main Hook - Simplified and focused
// ============================================================================

export function useContextMenuConfig({
	aiActions,
	onClose,
}: UseContextMenuConfigProps) {
	const {
		nodes,
		edges,
		updateEdge,
		deleteNodes,
		deleteEdges,
		loadingStates,
		selectedNodes,
		reactFlowInstance,
		contextMenuState,
		createGroupFromSelected,
		ungroupNodes,
		removeNodesFromGroup,
		toggleNodeCollapse,
		getDirectChildrenCount,
		openNodeEditor,
	} = useAppStore(
		useShallow((state) => ({
			reactFlowInstance: state.reactFlowInstance,
			nodes: state.nodes,
			edges: state.edges,
			updateEdge: state.updateEdge,
			deleteNodes: state.deleteNodes,
			deleteEdges: state.deleteEdges,
			loadingStates: state.loadingStates,
			selectedNodes: state.selectedNodes,
			contextMenuState: state.contextMenuState,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			removeNodesFromGroup: state.removeNodesFromGroup,
			toggleNodeCollapse: state.toggleNodeCollapse,
			getDirectChildrenCount: state.getDirectChildrenCount,
			openNodeEditor: state.openNodeEditor,
		}))
	);

	// Get permissions for feature gating
	const { canEdit } = usePermissions();

	const { x, y, nodeId, edgeId } = contextMenuState;

	const clickedNode = useMemo(
		() => (nodeId ? nodes.find((n) => n.id === nodeId) : null),
		[nodeId, nodes]
	);

	const clickedEdge = useMemo(
		() => (edgeId ? edges.find((edge) => edge.id === edgeId) : null),
		[edgeId, edges]
	);

	// Get the appropriate menu configuration based on context
	const getMenuConfig = useCallback((): MenuSection[] => {
		// Node menu
		if (nodeId && clickedNode) {
			const hasChildren = getDirectChildrenCount(clickedNode.id) > 0;
			const selectedActionsMenu = buildSelectedNodesMenu({
				selectedNodes,
				createGroupFromSelected,
				ungroupNodes,
				onClose,
				canEdit,
			});

			const nodeMenu = buildNodeMenu({
				clickedNode,
				hasChildren,
				openNodeEditor,
				toggleNodeCollapse,
				ungroupNodes,
				removeNodesFromGroup,
				deleteNodes,
				reactFlowInstance,
				onClose,
				aiActions,
				canEdit,
			});

			return [...selectedActionsMenu, ...nodeMenu];
		}

		// Edge menu
		if (edgeId && clickedEdge) {
			return buildEdgeMenu({
				clickedEdge,
				updateEdge,
				deleteEdges,
				onClose,
				canEdit,
			});
		}

		// Selected nodes menu
		if (selectedNodes && selectedNodes.length > 0) {
			return buildSelectedNodesMenu({
				selectedNodes,
				createGroupFromSelected,
				ungroupNodes,
				onClose,
				canEdit,
			});
		}

		// Pane menu (default)
		return buildPaneMenu({
			reactFlowInstance,
			x,
			y,
			openNodeEditor,
			aiActions,
			loadingStates,
			onClose,
			canEdit,
		});
	}, [
		nodeId,
		edgeId,
		selectedNodes,
		clickedNode,
		clickedEdge,
		getDirectChildrenCount,
		openNodeEditor,
		toggleNodeCollapse,
		removeNodesFromGroup,
		deleteNodes,
		reactFlowInstance,
		updateEdge,
		deleteEdges,
		createGroupFromSelected,
		ungroupNodes,
		x,
		y,
		aiActions,
		loadingStates,
		onClose,
		canEdit,
	]);

	return {
		menuConfig: getMenuConfig(),
		clickedNode,
		clickedEdge,
	};
}
