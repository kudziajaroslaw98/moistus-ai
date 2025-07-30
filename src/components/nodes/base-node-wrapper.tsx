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
import CollapseButton from './node-additions/collapse-button';
import CollapsedIndicator from './node-additions/collapsed-indicator';
import CommentButton from './node-additions/comment-button';
import GroupButton from './node-additions/group-button';

// Define the props including the onEditNode callback
interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
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
		| 'Builder'
		| 'Text'
		| 'Reference';
	includePadding?: boolean;
	hideNodeType?: boolean;
	toolbarContent?: ReactNode; // Optional toolbar content
	onDoubleClick?: (event: React.MouseEvent, node: Node<NodeData>) => void; // Optional double-click override
}

const BaseNodeWrapperComponent = ({
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
}: BaseNodeWrapperProps) => {
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
					'relative flex h-full min-h-auto min-w-80 flex-col rounded-sm border-2 border-node-accent bg-zinc-950 shadow-lg shadow-node-accent/25 gap-4 transition-all cursor-move',
					selected && 'border-sky-700',
					includePadding ? 'p-4' : 'p-0',
					nodeClassName,
					activeTool === 'pan' && 'pointer-events-none'
				)}
				style={{ zIndex: belongsToGroup ? 1 : 'auto', height: 'auto' }}
				onDoubleClick={handleDoubleClick}
			>
				<>
					<CollapsedIndicator />

					{/* Top header with node info */}
					<div className='top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2'>
						<CollapseButton />

						<GroupButton />

						{!hideNodeType && (
							<div className='bg-node-accent text-node-text-main rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-2'>
								<span>{nodeIcon}</span>

								<span>{nodeType}</span>
							</div>
						)}

						<CommentButton />
					</div>

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
									'w-12 h-2 rounded-xs border-2 transition-all duration-200',
									'!bg-node-accent border-node-accent opacity-100 shadow-lg',
									'translate-y-[1px]'
								)}
							/>

							{/*
						<Handle
							type='source'
							position={Position.Left}
							className={cn(
								'w-1 h-12 rounded-xs border-2 transition-all duration-200',
								'!bg-node-accent border-node-accent opacity-100 shadow-lg',
								'-translate-x-[1px]'
							)}
						/>

						<Handle
							type='source'
							position={Position.Right}
							className={cn(
								'w-1 h-12 rounded-xs border-2 transition-all duration-200',
								'!bg-node-accent border-node-accent opacity-100 shadow-lg',
								'translate-x-[1px]'
							)}
						/> */}

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
								minWidth={100}
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

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = 'BaseNodeWrapper';
