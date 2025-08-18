import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import {
	Handle,
	Node,
	NodeProps,
	NodeResizer,
	NodeToolbar,
	Position,
	useConnection,
} from '@xyflow/react';
import { Plus, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from '../ui/avatar-stack';
import { Button } from '../ui/button';
import CollapsedIndicator from './node-additions/collapsed-indicator';

// Define the props including the onEditNode callback
interface BaseInlineWrapperProps extends NodeProps<Node<NodeData>> {
	children: ReactNode; // Content specific to the node type
	nodeClassName?: string; // For overall node styling adjustments
	nodeIcon?: ReactNode;
	nodeType?:
		| 'Resource'
		| 'Annotation'
		| 'Question'
		| 'Tasks'
		| 'Image'
		| 'Code'
		| 'Note'
		| 'Text'
		| 'Reference'
		| (string & {});

	includePadding?: boolean;
	hideNodeType?: boolean;
	toolbarContent?: ReactNode; // Optional toolbar content
	onDoubleClick?: (event: React.MouseEvent, node: Node<NodeData>) => void; // Optional double-click override
}

const BaseInlineWrapperComponent = ({
	id,
	data,
	selected,
	children,
	nodeClassName,
	nodeIcon,
	nodeType,
	includePadding = true,
	hideNodeType = false,
	toolbarContent,
	onDoubleClick,
}: BaseInlineWrapperProps) => {
	const {
		getNode,
		realtimeSelectedNodes,
		isDraggingNodes,

		currentUser,
		selectedNodes,
		activeTool,
		setPopoverOpen,
		setNodeInfo,
		openInlineCreator,
		reactFlowInstance,
	} = useAppStore(
		useShallow((state) => ({
			getNode: state.getNode,
			addNode: state.addNode,
			realtimeSelectedNodes: state.realtimeSelectedNodes,
			currentUser: state.currentUser,
			selectedNodes: state.selectedNodes,
			activeTool: state.activeTool,
			setPopoverOpen: state.setPopoverOpen,
			setNodeInfo: state.setNodeInfo,
			openInlineCreator: state.openInlineCreator,
			isDraggingNodes: state.isDraggingNodes,
			reactFlowInstance: state.reactFlowInstance,
		}))
	);

	const connection = useConnection();
	const isTarget = connection?.toNode?.id === id;

	// Check if this node belongs to a group
	const belongsToGroup = data.metadata?.groupId;
	const handleAddNewNode = useCallback(() => {
		const currentNode = getNode(id);
		if (!currentNode) return;

		const position = {
			x: currentNode.position.x + (currentNode.width || 0) / 2,
			y: currentNode.position.y + (currentNode.height || 0) + 80,
		};

		openInlineCreator({
			position,
			screenPosition: reactFlowInstance?.flowToScreenPosition(position),
			parentNode: currentNode,
			suggestedType: currentNode?.data?.node_type ?? 'defaultNode',
		});
	}, [id, getNode, openInlineCreator, reactFlowInstance]);

	const handleNodeEdit = useCallback(() => {
		const currentNode = getNode(id);
		if (!currentNode) return;

		setNodeInfo(currentNode);
		setPopoverOpen({ nodeEdit: true });
	}, [id, getNode, setNodeInfo, setPopoverOpen]);

	const handleDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			if (onDoubleClick) {
				const currentNode = getNode(id);

				if (currentNode) {
					onDoubleClick(event, currentNode);
				}
			} else {
				handleNodeEdit();
			}
		},
		[onDoubleClick, id, getNode, handleNodeEdit]
	);

	const avatars = useMemo(() => {
		if (!realtimeSelectedNodes) return [];
		return realtimeSelectedNodes.filter(
			(user) => user.selectedNodes?.includes(id) && user.id !== currentUser?.id
		);
	}, [realtimeSelectedNodes]);

	if (!data) {
		return null;
	}

	return (
		<>
			{/* Node Toolbar */}
			{(toolbarContent || selected) && (
				<NodeToolbar position={Position.Top}>
					<motion.div
						className='flex gap-2 bg-zinc-950 border-zinc-500 p-2 rounded-sm'
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ duration: 0.3 }}
					>
						{toolbarContent}

						<Button
							size='sm'
							variant='outline'
							onClick={handleNodeEdit}
							className='h-8 w-8 p-0'
						>
							<Settings className='w-4 h-4' />
						</Button>
					</motion.div>
				</NodeToolbar>
			)}

			<div
				className={cn(
					'relative hover:scale-[1.01] hover:-translate-y-1 flex h-full min-h-auto min-w-80 flex-col rounded-sm gap-4 transition-all cursor-pointer',
					selected && 'border-sky-700',
					includePadding ? 'p-4' : 'p-0',
					nodeClassName,
					activeTool === 'pan' && 'pointer-events-none'
				)}
				style={{ zIndex: belongsToGroup ? 1 : 'auto', height: 'auto' }}
				onDoubleClick={handleDoubleClick}
			>
				<>
					<CollapsedIndicator data={data} />

					<div className='-bottom-10 left-0 flex absolute'>
						<AnimatePresence mode='popLayout'>
							{avatars.length > 0 && (
								<motion.div
									initial={{ opacity: 0, scale: 0.98, y: -10 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.98, y: -10 }}
									transition={{ duration: 0.2 }}
									className='inline-flex h-auto w-full'
								>
									<AvatarStack avatars={avatars} size={'sm'} />
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div onDoubleClick={handleDoubleClick} className='w-full h-full'>
						{children}
					</div>

					{!isDraggingNodes && (
						<>
							{/* Enhanced Connection Handles with Visual Feedback */}
							<Handle
								type='source'
								position={Position.Bottom}
								className={cn(
									'collapse rounded-xs transition-all duration-200',
									'!bg-node-accent border-node-accent opacity-100 shadow-lg',
									'translate-y-[1px]'
								)}
							/>

							{activeTool === 'connector' && (
								<Handle
									type='source'
									position={Position.Top}
									className={cn([
										'w-full h-full z-20 translate-y-1/2 transition-colors',
										connection.inProgress
											? '!bg-transparent'
											: '!bg-sky-500/20 animate-pulse',
									])}
								/>
							)}

							{/* Target Handle */}
							<Handle
								className={cn([
									'w-full translate-y-1/2 absolute top-0 left-0 border-none opacity-0 cursor-move',
									isTarget && '!bg-blue-500/50 animate-pulse',
									connection.inProgress ? 'h-full' : 'h-0',
									activeTool === 'connector' ? 'z-10' : 'z-[21]',
								])}
								position={Position.Top}
								type='target'
								isConnectableStart={false}
							/>

							{/* Add New Node Button - Only visible when selected */}
							<AnimatePresence>
								{selected && selectedNodes.length === 1 && (
									<>
										{/* add connection line to node */}
										<motion.hr
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.8 }}
											transition={{ duration: 0.2 }}
											className='absolute -bottom-16 h-16 w-1 bg-node-accent right-1/2 z-[19] '
										/>

										<motion.div
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.8 }}
											transition={{ duration: 0.2 }}
											className='absolute -bottom-16 right-1/2 z-20 translate-x-[10px]'
										>
											<Button
												onClick={handleAddNewNode}
												className='nodrag nopan rounded-full size-6 p-0 bg-node-accent/90 hover:bg-node-accent border-2 border-node-text-main shadow-lg transition-all duration-200 hover:scale-110'
												title='Add new connected node'
											>
												<Plus className='size-3' />
											</Button>
										</motion.div>
									</>
								)}
							</AnimatePresence>

							<NodeResizer
								color='#0069a8'
								isVisible={selected}
								minWidth={320}
								minHeight={30}
								maxWidth={600}
								handleClassName='!w-3 !h-3 !bg-node-accent border-node-text-secondary'
							/>
						</>
					)}
				</>
			</div>
		</>
	);
};

export const BaseInlineWrapper = memo(BaseInlineWrapperComponent);
BaseInlineWrapper.displayName = 'BaseInlineWrapper';
