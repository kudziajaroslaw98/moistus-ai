'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps, NodeResizer } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

interface GroupNodeProps extends NodeProps<Node<NodeData>> {
	// Group-specific props can be added here if needed
	showChildCount?: boolean;
}

const GroupNodeComponent = (props: GroupNodeProps) => {
	const { data, selected, id } = props;
	const [isDragOver, setIsDragOver] = useState(false);
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const {
		reactFlowInstance: reactFlow,
		nodes,
		addNodesToGroup,
		selectedNodes,
		isDraggingNodes,
		loadingStates,
	} = useAppStore(
		useShallow((state) => ({
			reactFlowInstance: state.reactFlowInstance,
			nodes: state.nodes,
			addNodesToGroup: state.addNodesToGroup,
			selectedNodes: state.selectedNodes,
			isDraggingNodes: state.isDraggingNodes,
			loadingStates: state.loadingStates,
		}))
	);

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
			const nodeWidth = node.width || 320;
			const nodeHeight = node.height || 100;

			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + nodeWidth);
			maxY = Math.max(maxY, node.position.y + nodeHeight);
		});

		// Use same padding as createGroupFromSelected (40px)
		const padding = 40;
		return {
			x: minX - padding,
			y: minY - padding,
			width: Math.max(maxX - minX + padding * 2, 320),
			height: Math.max(maxY - minY + padding * 2, 100),
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
					Math.abs((currentNode.width || 320) - childBounds.width) +
					Math.abs((currentNode.height || 100) - childBounds.height);

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
									Math.abs((latestNode.width || 320) - childBounds.width) +
									Math.abs((latestNode.height || 100) - childBounds.height);

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

	const handleDoubleClick = useCallback(() => {
		console.log('Group node double-clicked, potential edit action');
	}, []);

	// Handle drag and drop for adding nodes to group
	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);

			try {
				const dragData = e.dataTransfer.getData('application/reactflow');

				if (dragData) {
					const { nodeId } = JSON.parse(dragData);

					if (nodeId && nodeId !== id) {
						addNodesToGroup(id, [nodeId]);
					}
				}
			} catch (error) {
				console.error('Error handling drop:', error);
			}
		},
		[id, addNodesToGroup]
	);

	// Show child count in the label
	const displayLabel =
		childNodes.length > 0 ? `${label} (${childNodes.length})` : label;

	// Check if any selected nodes belong to this group
	const hasSelectedChildren = useMemo(() => {
		return selectedNodes.some(
			(node) =>
				groupChildren.includes(node.id) || node.data.metadata?.groupId === id
		);
	}, [selectedNodes, groupChildren, id]);

	return (
		<div
			className={cn(
				'relative rounded-lg border-2 shadow-inner w-full h-full bg-opacity-50 transition-all duration-200',
				selected ? 'border-sky-600' : 'border-dashed',
				'pointer-events-auto', // Ensure group can be selected/moved
				isDragOver && 'border-solid border-sky-400 bg-sky-900/20',
				hasSelectedChildren &&
					!selected &&
					'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-zinc-900'
			)}
			style={{
				padding: `${groupPadding}px`,
				borderColor: selected
					? undefined
					: isDragOver
						? '#38bdf8'
						: borderColor,
				backgroundColor: isDragOver
					? 'rgba(56, 189, 248, 0.1)'
					: backgroundColor,
				zIndex: 0, // Keep groups at base level
			}}
			onDoubleClick={handleDoubleClick}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Animated selection indicator for child nodes */}
			<AnimatePresence>
				{hasSelectedChildren && !selected && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className='absolute inset-0 rounded-lg border-2 border-yellow-400/30 bg-yellow-400/5 pointer-events-none'
						style={{ zIndex: -1 }}
					/>
				)}
			</AnimatePresence>

			{displayLabel && (
				<motion.div
					className={cn(
						'absolute -top-6 left-2 rounded-t-md px-2 py-0.5 text-xs font-medium shadow-md z-10 pointer-events-none transition-colors duration-200',
						selected
							? 'bg-sky-700 text-sky-100'
							: hasSelectedChildren
								? 'bg-yellow-700 text-yellow-100'
								: 'bg-zinc-700 text-zinc-200'
					)}
					animate={{
						scale: isDragOver ? 1.05 : 1,
					}}
					transition={{ duration: 0.2 }}
				>
					{displayLabel}

					{hasSelectedChildren && !selected && (
						<span className='ml-1 text-yellow-300'>●</span>
					)}
				</motion.div>
			)}

			{/* Show group info when empty or during drag */}
			<AnimatePresence>
				{(childNodes.length === 0 || isDragOver) && (
					<motion.div
						className='absolute inset-0 flex items-center justify-center pointer-events-none'
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<motion.div
							className={cn(
								'text-sm font-medium px-3 py-2 rounded-md border transition-all duration-200',
								isDragOver
									? 'text-sky-300 bg-sky-900/50 border-sky-600'
									: 'text-zinc-500 bg-zinc-800/50 border-zinc-700'
							)}
							animate={{
								scale: isDragOver ? 1.05 : 1,
								borderColor: isDragOver ? '#0ea5e9' : '#374151',
							}}
							transition={{ duration: 0.2 }}
						>
							{isDragOver
								? 'Drop node here to add to group'
								: 'Empty Group - Drop nodes here'}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Resizer should still work */}
			<NodeResizer
				color='#0069a8'
				isVisible={selected}
				minWidth={150}
				minHeight={100}
				handleStyle={{
					width: 8,
					height: 8,
					borderRadius: 2,
					backgroundColor: '#0069a8',
					border: '1px solid #ffffff',
					zIndex: 10,
				}}
			/>
		</div>
	);
};

const GroupNode = memo(GroupNodeComponent);
GroupNode.displayName = 'GroupNode';
export default GroupNode;
