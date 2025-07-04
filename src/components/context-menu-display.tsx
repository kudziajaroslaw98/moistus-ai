'use client';
import useAppStore from '@/store/mind-map-store';
import { EdgeData } from '@/types/edge-data';
import type { PathType } from '@/types/path-types';
import {
	ChevronDown,
	ChevronRight,
	GitPullRequestArrow,
	Group,
	LayoutPanelLeft,
	LayoutPanelTop,
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
import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import ABezierBIcon from './icons/a-bezier-b';
import ASmoothstepBIcon from './icons/a-smoothstep-b';
import AStepBIcon from './icons/a-step-b';
import AStrainghtBIcon from './icons/a-straight-b';
import { Button } from './ui/button';
import { OptionList } from './ui/option-list';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/Tooltip';

const edgePathTypeOptions: PathType[] = [
	'smoothstep',
	'step',
	'straight',
	'bezier',
];
const edgeColorOptions = [
	{ name: 'Default', value: undefined },
	{ name: 'Grey', value: '#888' },
	{ name: 'Teal', value: '#14b8a6' },
	{ name: 'Sky', value: '#38bdf8' },
	{ name: 'Rose', value: '#fb7185' },
];

interface ContextMenuDisplayProps {
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
	// applyLayout: (direction: "TB" | "LR") => void;
	ref?: React.RefObject<HTMLDivElement | null>;
	// setNodeParentAction: (
	//   edgeId: string,
	//   nodeId: string,
	//   parentId: string | null,
	// ) => Promise<void>;
}

export function ContextMenuDisplay({ aiActions }: ContextMenuDisplayProps) {
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
		popoverOpen,
		reactFlowInstance,
		contextMenuState,
		getEdge,
		setContextMenuState,
		setNodeInfo,
		applyLayout,
		createGroupFromSelected,
		ungroupNodes,
		removeNodesFromGroup,
		toggleNodeCollapse,
		getDirectChildrenCount,
	} = useAppStore(
		useShallow((state) => ({
			reactFlowInstance: state.reactFlowInstance,
			nodes: state.nodes,
			edges: state.edges,
			updateEdge: state.updateEdge,
			addNode: state.addNode,
			setNodeInfo: state.setNodeInfo,
			getEdge: state.getEdge,
			deleteNodes: state.deleteNodes,
			deleteEdges: state.deleteEdges,
			loadingStates: state.loadingStates,
			selectedNodes: state.selectedNodes,
			setPopoverOpen: state.setPopoverOpen,
			popoverOpen: state.popoverOpen,
			contextMenuState: state.contextMenuState,
			setContextMenuState: state.setContextMenuState,
			applyLayout: state.applyLayout,
			createGroupFromSelected: state.createGroupFromSelected,
			ungroupNodes: state.ungroupNodes,
			removeNodesFromGroup: state.removeNodesFromGroup,
			toggleNodeCollapse: state.toggleNodeCollapse,
			getDirectChildrenCount: state.getDirectChildrenCount,
		}))
	);

	const { x, y, nodeId, edgeId } = contextMenuState;
	const clickedNode = useMemo(
		() => (nodeId ? nodes.find((n) => n.id === nodeId) : null),
		[nodeId, nodes]
	);
	const clickedEdge = useMemo(
		() => (edgeId ? getEdge(edgeId) : null),
		[edgeId, getEdge]
	);
	const clickedNodeData = clickedNode?.data;

	const edgeColors = useMemo(() => {
		const isCustomColor =
			clickedEdge?.data?.style?.stroke !== undefined &&
			edgeColorOptions.find(
				(c) => c.value === clickedEdge?.data?.style?.stroke
			) === undefined;
		return isCustomColor
			? [
					...edgeColorOptions,
					{ name: 'Custom', value: clickedEdge?.data?.style?.stroke },
				]
			: edgeColorOptions;
	}, [clickedEdge]);

	const handleCloseContextMenu = () => {
		setPopoverOpen({ contextMenu: false });
		setContextMenuState({
			x: 0,
			y: 0,
			nodeId: null,
			edgeId: null,
		});
	};

	const handleActionClick = (action: () => void, disabled?: boolean) => {
		if (disabled) return;
		action();
		handleCloseContextMenu();
	};

	const getItemIcon = (type: PathType) => {
		switch (type) {
			case 'smoothstep':
				return <ASmoothstepBIcon className='size-4 stroke-zinc-200' />;
			case 'step':
				return <AStepBIcon className='size-4 stroke-zinc-200' />;
			case 'straight':
				return <AStrainghtBIcon className='size-4 stroke-zinc-200' />;
			case 'bezier':
				return <ABezierBIcon className='size-4 stroke-zinc-200' />;
			default:
				return <ASmoothstepBIcon className='size-4 stroke-zinc-200' />;
		}
	};

	const handleAddChild = useCallback(
		(parentId?: string, event?: React.MouseEvent<HTMLButtonElement>) => {
			if (!parentId) {
				// get position based on button position and react flow position
				const reactFlowPosition = reactFlowInstance?.screenToFlowPosition({
					x: event?.clientX || 0,
					y: event?.clientY || 0,
				});

				if (!reactFlowPosition) return;

				setNodeInfo({
					position: reactFlowPosition,
				});
				setPopoverOpen({ nodeType: true });
			} else {
				const parentNode = nodes.find((n) => n.id === parentId);

				if (!parentNode) return;

				setNodeInfo(parentNode);
				setPopoverOpen({ nodeType: true });
			}

			setPopoverOpen({ contextMenu: false });

			// addNode({
			//   parentNode,
			//   position,
			// });
		},
		[nodes, addNode]
	);

	const handleDeleteNode = useCallback(
		(nodeId: string) => {
			const node = nodes.find((n) => n.id === nodeId);

			if (!node) return;

			deleteNodes([node]);
		},
		[deleteNodes]
	);

	const handleUpdateEdgeStyle = useCallback(
		(edgeId: string, data: Partial<EdgeData>) => {
			const edge = getEdge(edgeId);

			if (!edge) return;

			updateEdge({ edgeId, data: { ...edge.data, ...data } });
		},
		[updateEdge, getEdge]
	);

	const handleEdgesDelete = useCallback(
		(edgeIds: string[]) => {
			const edgesToDelete = edges.filter((e) => edgeIds.includes(e.id));

			if (edgesToDelete.length === 0) return;

			deleteEdges(edgesToDelete);
		},
		[deleteEdges]
	);

	const nodeMenuItems = nodeId ? (
		<>
			<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
				Node
			</span>

			<Button
				variant='ghost'
				align='left'
				onClick={() => handleAddChild(nodeId)}
				className='gap-2'
			>
				<Plus className='size-4' />

				<span>Add Child</span>
			</Button>

			{/* Collapse/Expand - only show if node has children */}
			{getDirectChildrenCount(nodeId) > 0 && (
				<Button
					variant='ghost'
					align='left'
					onClick={() => toggleNodeCollapse(nodeId)}
					className='gap-2'
				>
					{clickedNodeData?.metadata?.isCollapsed ? (
						<ChevronRight className='size-4' />
					) : (
						<ChevronDown className='size-4' />
					)}

					<span>
						{clickedNodeData?.metadata?.isCollapsed ? 'Expand' : 'Collapse'}{' '}
						Branch
					</span>
				</Button>
			)}

			{/* Remove from Group - only show if node belongs to a group */}
			{clickedNodeData?.metadata?.groupId && (
				<Button
					variant='ghost'
					align='left'
					disabled={loadingStates.isAddingContent}
					onClick={() =>
						handleActionClick(() => {
							removeNodesFromGroup([nodeId]);
						}, loadingStates.isAddingContent)
					}
					className='gap-2'
					title='Remove this node from its current group. The node will become independent while the group remains.'
				>
					<Ungroup className='size-4' />

					<span>Remove from Group</span>
				</Button>
			)}

			<Button
				variant='ghost-destructive'
				align='left'
				onClick={() => handleDeleteNode(nodeId)}
				className='gap-2'
			>
				<Trash className='size-4' />
				Delete Node
			</Button>

			<hr className='my-1 border-zinc-700' />

			<Button
				variant='ghost'
				align='left'
				onClick={() =>
					handleActionClick(
						() => aiActions.summarizeNode(nodeId),
						loadingStates.isStateLoading ||
							loadingStates.isSummarizing ||
							!clickedNodeData?.content
					)
				}
				disabled={
					loadingStates.isStateLoading ||
					loadingStates.isSummarizing ||
					!clickedNodeData?.content
				}
				className='gap-2'
			>
				<ScanText className='size-4' />

				<span>Summarize Node (AI)</span>
			</Button>

			<Button
				variant='ghost'
				align='left'
				disabled={
					loadingStates.isStateLoading || loadingStates.isSummarizingBranch
				}
				onClick={() =>
					handleActionClick(
						() => aiActions.summarizeBranch(nodeId),
						loadingStates.isStateLoading || loadingStates.isSummarizingBranch
					)
				}
				className='gap-2'
			>
				<ScanBarcode className='size-4' />

				<span>Summarize Branch (AI)</span>
			</Button>

			<Button
				variant='ghost'
				align='left'
				disabled={
					loadingStates.isStateLoading ||
					loadingStates.isExtracting ||
					!clickedNodeData?.content
				}
				onClick={() =>
					handleActionClick(
						() => aiActions.extractConcepts(nodeId),
						loadingStates.isStateLoading ||
							loadingStates.isExtracting ||
							!clickedNodeData?.content
					)
				}
				className='gap-2'
			>
				<NotepadTextDashed className='size-4' />

				<span>Extract Concepts (AI)</span>
			</Button>

			<Button
				variant='ghost'
				align='left'
				disabled={
					loadingStates.isStateLoading ||
					loadingStates.isGeneratingContent ||
					!clickedNodeData?.content
				}
				onClick={() =>
					handleActionClick(
						() => aiActions.openContentModal(nodeId),
						loadingStates.isStateLoading ||
							loadingStates.isGeneratingContent ||
							!clickedNodeData?.content
					)
				}
				className='gap-2'
			>
				<Sparkles className='size-4' />

				<span>Generate Content (AI)</span>
			</Button>
		</>
	) : null;

	const paneMenuItems =
		!nodeId && !edgeId ? (
			<>
				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Node
				</span>

				<Button
					variant='ghost'
					align='left'
					disabled={loadingStates.isStateLoading}
					onClick={(e) => handleAddChild(undefined, e)}
					className='gap-2'
					data-position={JSON.stringify({ x, y })}
				>
					<Plus className='size-4' />

					<span>Add Node Here</span>
				</Button>

				<hr className='my-1 border-zinc-800' />

				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					AI
				</span>

				<Button
					variant='ghost'
					align='left'
					disabled={
						loadingStates.isStateLoading ||
						loadingStates.isSuggestingConnections ||
						nodes.length < 2
					}
					onClick={() =>
						handleActionClick(
							aiActions.suggestConnections,
							loadingStates.isStateLoading ||
								loadingStates.isSuggestingConnections ||
								nodes.length < 2
						)
					}
					className='gap-2'
				>
					<Network className='size-4' />

					<span>Suggest Connections (AI)</span>
				</Button>

				<Button
					variant='ghost'
					align='left'
					disabled={
						loadingStates.isStateLoading ||
						loadingStates.isSuggestingMerges ||
						nodes.length < 2
					}
					onClick={() =>
						handleActionClick(
							aiActions.suggestMerges,
							loadingStates.isStateLoading ||
								loadingStates.isSuggestingMerges ||
								nodes.length < 2
						)
					}
					className='gap-2'
				>
					<GitPullRequestArrow className='size-4' />

					<span>Suggest Merges (AI)</span>
				</Button>

				<hr className='my-1 border-zinc-800' />

				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Layout
				</span>

				<Button
					variant='ghost'
					align='left'
					disabled={loadingStates.isStateLoading}
					onClick={() =>
						handleActionClick(
							() => applyLayout('TB'),
							loadingStates.isStateLoading
						)
					}
					className='gap-2'
				>
					<LayoutPanelTop className='size-4' />

					<span>Layout (Top-Bottom)</span>
				</Button>

				<Button
					variant='ghost'
					align='left'
					disabled={loadingStates.isStateLoading}
					onClick={() =>
						handleActionClick(
							() => applyLayout('LR'),
							loadingStates.isStateLoading
						)
					}
					className='gap-2'
				>
					<LayoutPanelLeft className='size-4' />

					<span>Layout (Left-Right)</span>
				</Button>
			</>
		) : null;

	const edgeMenuItems =
		edgeId && clickedEdge ? (
			<>
				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Edge
				</span>

				<Button
					variant='ghost-destructive'
					align='left'
					disabled={loadingStates.isStateLoading}
					onClick={() =>
						handleActionClick(
							() => handleEdgesDelete([edgeId]),
							loadingStates.isStateLoading
						)
					}
					className={'gap-2'}
				>
					<Trash className='size-4' />

					<span>Delete Edge</span>
				</Button>

				<hr className='my-1 border-zinc-800' />

				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Edge Style
				</span>

				<Button
					variant='ghost'
					align='left'
					disabled={loadingStates.isStateLoading}
					onClick={() =>
						handleActionClick(
							() =>
								handleUpdateEdgeStyle(edgeId, {
									animated: !clickedEdge.animated,
								}),
							loadingStates.isStateLoading
						)
					}
					className='gap-2'
				>
					{clickedEdge.animated ? (
						<Pause className='size-4' />
					) : (
						<Play className='size-4' />
					)}

					<span>
						{clickedEdge.animated ? 'Stop Animation' : 'Start Animation'}
					</span>
				</Button>

				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Path Style
				</span>

				<OptionList
					items={edgePathTypeOptions}
					direction='horizontal'
					gap='gap-2'
					className='w-full'
					initialFocusIdx={edgePathTypeOptions.findIndex(
						(type) => clickedEdge.data?.metadata?.pathType === type
					)}
					onItemSelect={(_, idx) => {
						const pathType = edgePathTypeOptions[idx];
						handleActionClick(
							() =>
								handleUpdateEdgeStyle(edgeId, {
									metadata: {
										...(clickedEdge.data?.metadata || {}),
										pathType,
									},
								}),
							loadingStates.isStateLoading
						);
					}}
					renderItem={(pathType, idx, { focused }) => (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={
										clickedEdge.data?.metadata?.pathType === pathType
											? 'secondary'
											: 'ghost'
									}
									size='icon'
									tabIndex={-1}
									aria-label={`${pathType} path`}
								>
									{getItemIcon(pathType)}
								</Button>
							</TooltipTrigger>

							<TooltipContent>{`${pathType.charAt(0).toUpperCase() + pathType.slice(1)} Path`}</TooltipContent>
						</Tooltip>
					)}
				/>

				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Color
				</span>

				<OptionList
					items={edgeColors}
					direction='horizontal'
					initialFocusIdx={edgeColors.findIndex(
						(opt) =>
							(clickedEdge?.data?.style?.stroke === opt.value &&
								opt.value !== undefined) ||
							(clickedEdge?.data?.style?.stroke === undefined &&
								opt.value === undefined)
					)}
					onItemSelect={(_, idx) => {
						const colorOpt = edgeColorOptions[idx];
						handleActionClick(
							() =>
								handleUpdateEdgeStyle(edgeId, {
									style: {
										...clickedEdge.style,
										strokeWidth: clickedEdge.data?.style?.strokeWidth,
										stroke: colorOpt.value,
									},
								}),
							loadingStates.isStateLoading
						);
					}}
					renderItem={(colorOpt, idx, { focused }) => {
						const isSelected =
							(clickedEdge?.data?.style?.stroke === colorOpt.value &&
								colorOpt.value !== undefined) ||
							(clickedEdge?.data?.style?.stroke === undefined &&
								colorOpt.value === undefined);
						return (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={isSelected ? 'secondary' : 'ghost'}
										size='icon'
										tabIndex={-1}
										aria-label={colorOpt.name}
									>
										<span
											className='inline-block h-3 w-3 rounded-full border border-zinc-500'
											style={{
												backgroundColor: colorOpt.value || 'transparent',
											}}
										></span>
									</Button>
								</TooltipTrigger>

								<TooltipContent>{colorOpt.name}</TooltipContent>
							</Tooltip>
						);
					}}
				/>
			</>
		) : null;

	// Create a selected nodes menu item if we have selectedNodes
	const selectedNodesMenuItems =
		!nodeId && !edgeId && selectedNodes && selectedNodes.length > 0 ? (
			<>
				<span className='block w-full rounded-md px-3 py-1.5 text-xs text-zinc-500'>
					Selected Nodes ({selectedNodes.length})
				</span>

				{/* Group Selected Nodes - only show if 2+ nodes selected */}
				{selectedNodes.length >= 2 && (
					<Button
						variant='ghost'
						align='left'
						disabled={loadingStates.isAddingContent}
						onClick={() =>
							handleActionClick(() => {
								createGroupFromSelected();
							}, loadingStates.isAddingContent)
						}
						className='gap-2'
						title='Create a visual group containing the selected nodes. Groups can be moved together and provide visual organization.'
					>
						<Group className='size-4' />

						<span>Group Selected Nodes</span>
					</Button>
				)}

				{/* Ungroup - only show if selected node is a group */}
				{selectedNodes.length === 1 &&
					selectedNodes[0].data.metadata?.isGroup && (
						<Button
							variant='ghost'
							align='left'
							disabled={loadingStates.isAddingContent}
							onClick={() =>
								handleActionClick(() => {
									ungroupNodes(selectedNodes[0].id);
								}, loadingStates.isAddingContent)
							}
							className='gap-2'
							title='Remove the group container while preserving all child nodes. Child nodes will become independent.'
						>
							<Ungroup className='size-4' />

							<span>Ungroup</span>
						</Button>
					)}

				{/* Generate content from selected nodes */}
				{aiActions.generateFromSelectedNodes &&
					!popoverOpen.generateFromNodesModal && (
						<Button
							variant='ghost'
							align='left'
							disabled={loadingStates.isGeneratingContent}
							onClick={() =>
								handleActionClick(() => {
									setPopoverOpen({ generateFromNodesModal: true });
								}, loadingStates.isGeneratingContent)
							}
							className='gap-2'
						>
							<Sparkles className='size-4' />

							<span>Generate content from selected nodes</span>
						</Button>
					)}

				<hr className='my-1 border-zinc-800' />
			</>
		) : null;

	return (
		<div
			className='ring-opacity-5 absolute z-[1000] flex min-w-[250px] flex-col gap-1 rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-2 shadow-lg ring-1 ring-black focus:outline-none'
			style={{ top: y, left: x }}
		>
			<TooltipProvider>
				{selectedNodesMenuItems}

				{nodeId && nodeMenuItems}

				{edgeId && edgeMenuItems}

				{!nodeId && !edgeId && paneMenuItems}
			</TooltipProvider>
		</div>
	);
}
