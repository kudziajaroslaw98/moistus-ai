'use client';
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
	LayoutPanelLeft,
	LayoutPanelTop,
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

// ============================================================================
// Builder Functions - Extract menu section logic into focused helpers
// ============================================================================

interface BuildNodeMenuParams {
	clickedNode: AppNode;
	hasChildren: boolean;
	openNodeEditor: (options: NodeEditorOptions) => void;
	toggleNodeCollapse: (nodeId: string) => void;
	removeNodesFromGroup: (nodeIds: string[]) => void;
	deleteNodes: (nodes: AppNode[]) => void;
	reactFlowInstance: ReactFlowInstance | null;
	onClose: () => void;
	aiActions: {
		suggestCounterpoints?: () => void;
	};
}

function buildNodeMenu(params: BuildNodeMenuParams): MenuSection[] {
	const {
		clickedNode,
		hasChildren,
		openNodeEditor,
		toggleNodeCollapse,
		removeNodesFromGroup,
		deleteNodes,
		reactFlowInstance,
		onClose,
		aiActions,
	} = params;

	const clickedNodeData = clickedNode.data;

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
								width: clickedNode.measured?.width || 200,
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
				},
				{
					id: 'remove-from-group',
					icon: <Ungroup className='h-4 w-4' />,
					label: 'Remove from Group',
					onClick: () => {
						removeNodesFromGroup([clickedNode.id]);
						onClose();
					},
					hidden: !clickedNode.parentId,
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
}

function buildEdgeMenu(params: BuildEdgeMenuParams): MenuSection[] {
	const { clickedEdge, updateEdge, deleteEdges, onClose } = params;

	return [
		{
			id: 'edge-style',
			items: [
				{
					id: 'edge-style-options',
					icon: <></>,
					label: '',
					onClick: () => {},
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
								updateEdge({
									edgeId: clickedEdge.id,
									data: {
										metadata: {
											pathType,
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
	applyLayout: any;
	onClose: () => void;
}

function buildPaneMenu(params: BuildPaneMenuParams): MenuSection[] {
	const {
		reactFlowInstance,
		x,
		y,
		openNodeEditor,
		aiActions,
		loadingStates,
		applyLayout,
		onClose,
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
				},
				{
					id: 'suggest-counterpoints',
					icon: <NotepadTextDashed className='h-4 w-4' />,
					label: 'Generate Counterpoints',
					onClick: () => aiActions.suggestCounterpoints?.(),
					loading: loadingStates.isGenerating,
				},
				{
					id: 'suggest-merges',
					icon: <NotepadTextDashed className='h-4 w-4' />,
					label: 'Suggest Merges',
					onClick: aiActions.suggestMerges,
					loading: loadingStates.isSuggestingMerges,
				},
			],
		},
		{
			id: 'pane-layout',
			items: [
				{
					id: 'layout-tb',
					icon: <LayoutPanelTop className='h-4 w-4' />,
					label: 'Layout Top-Bottom',
					onClick: () => {
						applyLayout('TB');
						onClose();
					},
				},
				{
					id: 'layout-lr',
					icon: <LayoutPanelLeft className='h-4 w-4' />,
					label: 'Layout Left-Right',
					onClick: () => {
						applyLayout('LR');
						onClose();
					},
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
}

function buildSelectedNodesMenu(
	params: BuildSelectedNodesMenuParams
): MenuSection[] {
	const { selectedNodes, createGroupFromSelected, ungroupNodes, onClose } =
		params;

	if (!selectedNodes || selectedNodes.length === 0) return [];

	const isSingleGroupSelected =
		selectedNodes.length === 1 &&
		selectedNodes[0].data.nodeType === 'groupNode';

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
					hidden: selectedNodes.length <= 1,
				},
				{
					id: 'ungroup',
					icon: <Ungroup className='h-4 w-4' />,
					label: 'Ungroup',
					onClick: () => {
						ungroupNodes(selectedNodes[0].id);
						onClose();
					},
					hidden: !isSingleGroupSelected,
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
		applyLayout,
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
			applyLayout: state.applyLayout,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			removeNodesFromGroup: state.removeNodesFromGroup,
			toggleNodeCollapse: state.toggleNodeCollapse,
			getDirectChildrenCount: state.getDirectChildrenCount,
			openNodeEditor: state.openNodeEditor,
		}))
	);

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
			return buildNodeMenu({
				clickedNode,
				hasChildren,
				openNodeEditor,
				toggleNodeCollapse,
				removeNodesFromGroup,
				deleteNodes,
				reactFlowInstance,
				onClose,
				aiActions,
			});
		}

		// Edge menu
		if (edgeId && clickedEdge) {
			return buildEdgeMenu({
				clickedEdge,
				updateEdge,
				deleteEdges,
				onClose,
			});
		}

		// Selected nodes menu
		if (selectedNodes && selectedNodes.length > 0) {
			return buildSelectedNodesMenu({
				selectedNodes,
				createGroupFromSelected,
				ungroupNodes,
				onClose,
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
			applyLayout,
			onClose,
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
		applyLayout,
		onClose,
	]);

	return {
		menuConfig: getMenuConfig(),
		clickedNode,
		clickedEdge,
	};
}
