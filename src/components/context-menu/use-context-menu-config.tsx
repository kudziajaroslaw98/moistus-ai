'use client';
import useAppStore from '@/store/mind-map-store';
import { PathType } from '@/types/path-types';
import {
	ChevronDown,
	ChevronRight,
	Edit,
	GitPullRequestArrow,
	Group,
	LayoutPanelLeft,
	LayoutPanelTop,
	LocateFixed,
	Network,
	NotepadTextDashed,
	Pause,
	Play,
	Plus,
	ScanBarcode,
	ScanText,
	Sparkles,
	Trash,
	Ungroup,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { EdgeStyleOptions } from './edge-style-options';
import { MenuSection } from './types';

interface UseContextMenuConfigProps {
	aiActions: {
		summarizeNode: (nodeId: string) => void;
		summarizeBranch: (nodeId: string) => void;
		extractConcepts: (nodeId: string) => void;
		openContentModal: (nodeId: string) => void;
		suggestConnections: () => void;
		suggestMerges: () => void;
		generateFromSelectedNodes?: (
			nodeIds: string[],
			prompt: string
		) => Promise<void>;
	};
	onClose: () => void;
}

export function useContextMenuConfig({
	aiActions,
	onClose,
}: UseContextMenuConfigProps) {
	const {
		nodes,
		edges,
		updateEdge,
		addNode,
		deleteNodes,
		deleteEdges,
		loadingStates,
		selectedNodes,
		setPopoverOpen,
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
			addNode: state.addNode,
			deleteNodes: state.deleteNodes,
			deleteEdges: state.deleteEdges,
			loadingStates: state.loadingStates,
			selectedNodes: state.selectedNodes,
			setPopoverOpen: state.setPopoverOpen,
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

	const clickedNodeData = clickedNode?.data;

	// Node menu configuration
	const nodeMenuConfig = useCallback((): MenuSection[] => {
		if (!clickedNode) return [];

		const hasChildren = getDirectChildrenCount(clickedNode.id) > 0;

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

								addNode({
									parentNode: clickedNode,
									content: 'New Child Node',
									nodeType: 'defaultNode',
									position: childPosition,
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
				id: 'node-ai-actions',
				items: [
					{
						id: 'summarize-node',
						icon: <Sparkles className='h-4 w-4' />,
						label: 'Summarize Node',
						onClick: () => aiActions.summarizeNode(clickedNode.id),
						loading: loadingStates.isSummarizingNode,
					},
					{
						id: 'summarize-branch',
						icon: <GitPullRequestArrow className='h-4 w-4' />,
						label: 'Summarize Branch',
						onClick: () => aiActions.summarizeBranch(clickedNode.id),
						loading: loadingStates.isSummarizingBranch,
					},
					{
						id: 'extract-concepts',
						icon: <ScanBarcode className='h-4 w-4' />,
						label: 'Extract Concepts',
						onClick: () => aiActions.extractConcepts(clickedNode.id),
						loading: loadingStates.isExtractingConcepts,
					},
					{
						id: 'generate-content',
						icon: <ScanText className='h-4 w-4' />,
						label: 'Generate Content',
						onClick: () => aiActions.openContentModal(clickedNode.id),
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
	}, [
		clickedNode,
		clickedNodeData,
		reactFlowInstance,
		addNode,
		toggleNodeCollapse,
		removeNodesFromGroup,
		openNodeEditor,
		deleteNodes,
		getDirectChildrenCount,
		aiActions,
		loadingStates,
		onClose,
	]);

	// Edge menu configuration
	const edgeMenuConfig = useCallback((): MenuSection[] => {
		if (!clickedEdge) return [];

		// Create a special section for edge style options
		return [
			{
				id: 'edge-style',
				items: [
					{
						id: 'edge-style-options',
						icon: <></>,
						label: '',
						onClick: () => {},
						// We'll render EdgeStyleOptions as a custom component
						customComponent: (
							<EdgeStyleOptions
								edge={clickedEdge}
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
	}, [clickedEdge?.data, updateEdge, deleteEdges, onClose]);

	// Pane menu configuration
	const paneMenuConfig = useCallback((): MenuSection[] => {
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
								addNode({
									parentNode: null,
									content: 'New Node',
									nodeType: 'defaultNode',
									position,
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
								addNode({
									parentNode: null,
									content: 'Reference',
									nodeType: 'referenceNode',
									position,
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
	}, [
		reactFlowInstance,
		x,
		y,
		addNode,
		aiActions,
		loadingStates,
		applyLayout,
		onClose,
	]);

	// Selected nodes menu configuration
	const selectedNodesMenuConfig = useCallback((): MenuSection[] => {
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
							ungroupNodes([selectedNodes[0].id]);
							onClose();
						},
						hidden: !isSingleGroupSelected,
					},
				],
			},
			{
				id: 'selected-ai',
				items: [
					{
						id: 'generate-from-nodes',
						icon: <Sparkles className='h-4 w-4' />,
						label: 'Generate from Selected Nodes',
						onClick: () => {
							setPopoverOpen({ generateFromNodesModal: true });
							onClose();
						},
						hidden: !aiActions.generateFromSelectedNodes,
					},
				],
			},
		];
	}, [
		selectedNodes,
		createGroupFromSelected,
		ungroupNodes,
		setPopoverOpen,
		aiActions,
		onClose,
	]);

	// Get the appropriate menu configuration based on context
	const getMenuConfig = useCallback((): MenuSection[] => {
		if (nodeId) return nodeMenuConfig();
		if (edgeId) return edgeMenuConfig();
		if (selectedNodes && selectedNodes.length > 0)
			return selectedNodesMenuConfig();
		return paneMenuConfig();
	}, [
		nodeId,
		edgeId,
		selectedNodes,
		nodeMenuConfig,
		edgeMenuConfig,
		selectedNodesMenuConfig,
		paneMenuConfig,
	]);

	return {
		menuConfig: getMenuConfig(),
		clickedNode,
		clickedEdge,
	};
}
