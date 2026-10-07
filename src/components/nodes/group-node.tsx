'use client';

import { GROUP_DRAG_DWELL_MS } from '@/constants/group';
import { GRID_SIZE, ceilToGrid } from '@/constants/grid';
import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

interface GroupNodeProps extends NodeProps<Node<NodeData>> {
	// Group-specific props can be added here if needed
	showChildCount?: boolean;
}

const GroupNodeComponent = (props: GroupNodeProps) => {
	const { data, selected, id } = props;
	const shouldReduceMotion = useReducedMotion();
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const {
		reactFlowInstance: reactFlow,
		nodes,
		selectedNodes,
		isDraggingNodes,
		loadingStates,
	} = useAppStore(
		useShallow((state) => ({
			reactFlowInstance: state.reactFlowInstance,
			nodes: state.nodes,
			selectedNodes: state.selectedNodes,
			isDraggingNodes: state.isDraggingNodes,
			loadingStates: state.loadingStates,
		}))
	);
	// Narrow selector: only the group targeted by the current drag re-renders.
	const dragIntent = useAppStore((state) =>
		state.groupDragIntent?.groupId === id ? state.groupDragIntent : null
	);
	const isAddTarget = dragIntent?.type === 'add';
	const isRemoveSource = dragIntent?.type === 'remove';
	const isArmed = dragIntent?.armed ?? false;

	const backgroundColor =
		(data.metadata?.backgroundColor as string) || 'rgba(113, 113, 122, 0.1)';
	const borderColor = (data.metadata?.borderColor as string) || '#52525b';
	const label = (data.metadata?.label as string) || 'Group';
	const groupPadding = (data.metadata?.groupPadding as number) || 40;
	const groupChildren = (data.metadata?.groupChildren as string[]) || [];

	// Find child nodes that belong to this group
	const childNodes = useMemo(() => {
		return nodes.filter(
			(node) =>
				groupChildren.includes(node.id) || node.data.metadata?.groupId === id
		);
	}, [nodes, groupChildren, id]);

	// Calculate bounds to encompass all child nodes
	const childBounds = useMemo(() => {
		if (childNodes.length === 0) {
			return null;
		}

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		childNodes.forEach((node) => {
			const nodeWidth = node.measured?.width ?? node.width ?? 320;
			const nodeHeight = node.measured?.height ?? node.height ?? 100;

			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + nodeWidth);
			maxY = Math.max(maxY, node.position.y + nodeHeight);
		});

		// Use same padding as createGroupFromSelected (40px)
		const padding = 40;
		const rawWidth = Math.max(maxX - minX + padding * 2, 320);
		const rawHeight = Math.max(maxY - minY + padding * 2, 100);
		return {
			x: minX - padding,
			y: minY - padding,
			width: ceilToGrid(rawWidth, GRID_SIZE),
			height: ceilToGrid(rawHeight, GRID_SIZE),
		};
	}, [childNodes]);

	// Auto-resize group to encompass all children (only when dragging ends and not saving)
	useEffect(() => {
		if (
			childBounds &&
			reactFlow &&
			!isDraggingNodes &&
			!loadingStates.isSavingNode &&
			childNodes.length > 0
		) {
			const currentNode = reactFlow.getNode(id);

			if (currentNode) {
				// Only update if there's a significant difference to prevent infinite loops
				const positionDiff =
					Math.abs(currentNode.position.x - childBounds.x) +
					Math.abs(currentNode.position.y - childBounds.y);
				const sizeDiff =
					Math.abs((currentNode.measured?.width ?? currentNode.width ?? 320) - childBounds.width) +
					Math.abs((currentNode.measured?.height ?? currentNode.height ?? 100) - childBounds.height);

				// Only update if difference is significant (more than 10px)
				if (positionDiff > 10 || sizeDiff > 10) {
					// Clear any existing timeout to debounce updates
					if (updateTimeoutRef.current) {
						clearTimeout(updateTimeoutRef.current);
					}

					updateTimeoutRef.current = setTimeout(() => {
						if (!isDraggingNodes && !loadingStates.isSavingNode) {
							// Double-check the node still exists and differences are still significant
							const latestNode = reactFlow.getNode(id);

							if (latestNode) {
								const latestPositionDiff =
									Math.abs(latestNode.position.x - childBounds.x) +
									Math.abs(latestNode.position.y - childBounds.y);
								const latestSizeDiff =
									Math.abs((latestNode.measured?.width ?? latestNode.width ?? 320) - childBounds.width) +
									Math.abs((latestNode.measured?.height ?? latestNode.height ?? 100) - childBounds.height);

								if (latestPositionDiff > 10 || latestSizeDiff > 10) {
									reactFlow.setNodes((nodes) =>
										nodes.map((node) =>
											node.id === id
												? {
														...node,
														position: { x: childBounds.x, y: childBounds.y },
														width: childBounds.width,
														height: childBounds.height,
													}
												: node
										)
									);
								}
							}
						}

						updateTimeoutRef.current = null;
					}, 500);
				}
			}
		}
	}, [
		childBounds,
		id,
		reactFlow,
		isDraggingNodes,
		loadingStates.isSavingNode,
		childNodes.length,
	]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, []);

	// Show child count in the label
	const displayLabel =
		childNodes.length > 0 ? `${label} (${childNodes.length})` : label;

	const intentLabel = dragIntent
		? `${isArmed ? 'Release' : 'Hold'} to ${isAddTarget ? 'add to' : 'remove from'} group`
		: null;
	const intentBorderColor = isAddTarget ? '#38bdf8' : '#fb7185';
	const intentBackgroundColor = isAddTarget
		? `rgba(56, 189, 248, ${isArmed ? 0.16 : 0.08})`
		: `rgba(251, 113, 133, ${isArmed ? 0.12 : 0.06})`;

	// Check if any selected nodes belong to this group
	const hasSelectedChildren = useMemo(() => {
		return selectedNodes.some(
			(node) =>
				groupChildren.includes(node.id) || node.data.metadata?.groupId === id
		);
	}, [selectedNodes, groupChildren, id]);

	return (
		<div
			data-group-drag-intent={dragIntent?.type}
			data-group-drag-armed={dragIntent ? isArmed : undefined}
			className={cn(
				'relative rounded-lg border-2 shadow-inner w-full h-full bg-opacity-50 transition-colors duration-200',
				selected && !dragIntent ? 'border-sky-600' : 'border-dashed',
				'pointer-events-auto', // Ensure group can be selected/moved
				dragIntent && isArmed && 'border-solid',
				hasSelectedChildren &&
					!selected &&
					'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-zinc-900'
			)}
			style={{
				padding: `${groupPadding}px`,
				borderColor: dragIntent
					? intentBorderColor
					: selected
						? undefined
						: borderColor,
				backgroundColor: dragIntent ? intentBackgroundColor : backgroundColor,
				zIndex: 0, // Keep groups at base level
			}}
		>
			{/* Animated selection indicator for child nodes */}
			<AnimatePresence>
				{hasSelectedChildren && !selected && (
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						className='absolute inset-0 rounded-lg border-2 border-yellow-400/30 bg-yellow-400/5 pointer-events-none'
						exit={{ opacity: 0, scale: 0.95 }}
						initial={{ opacity: 0, scale: 0.95 }}
						style={{ zIndex: -1 }}
					/>
				)}
			</AnimatePresence>

			{displayLabel && (
				<div
					className={cn(
						'absolute -top-6 left-2 overflow-hidden rounded-t-md px-2 py-0.5 text-xs font-medium shadow-md z-10 pointer-events-none transition-colors duration-200',
						isAddTarget
							? 'bg-sky-700 text-sky-50'
							: isRemoveSource
								? 'bg-rose-700 text-rose-50'
								: selected
									? 'bg-sky-700 text-sky-100'
									: hasSelectedChildren
										? 'bg-yellow-700 text-yellow-100'
										: 'bg-zinc-700 text-zinc-200'
					)}
				>
					{intentLabel ?? displayLabel}

					{!dragIntent && hasSelectedChildren && !selected && (
						<span className='ml-1 text-yellow-300'>●</span>
					)}

					{/* Dwell progress: fills over the hold duration, full once armed */}
					{dragIntent && (
						<motion.span
							aria-hidden
							key={`${dragIntent.type}:${dragIntent.nodeIds.join(',')}`}
							className='absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/80'
							initial={{ scaleX: shouldReduceMotion || isArmed ? 1 : 0 }}
							animate={{
								scaleX: 1,
								opacity: shouldReduceMotion && !isArmed ? 0.4 : 1,
							}}
							transition={{
								scaleX: {
									duration: GROUP_DRAG_DWELL_MS / 1000,
									ease: 'linear',
								},
								opacity: { duration: 0.15 },
							}}
						/>
					)}
				</div>
			)}

			{/* Show hint when the group is empty */}
			<AnimatePresence>
				{childNodes.length === 0 && !dragIntent && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='absolute inset-0 flex items-center justify-center pointer-events-none'
						exit={{ opacity: 0, y: -10 }}
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.2 }}
					>
						<div className='text-sm font-medium px-3 py-2 rounded-md border text-zinc-500 bg-zinc-800/50 border-zinc-700'>
							Empty group – drag a node here and hold
						</div>
					</motion.div>
				)}
			</AnimatePresence>

		</div>
	);
};

const GroupNode = memo(GroupNodeComponent);
GroupNode.displayName = 'GroupNode';
export default GroupNode;
