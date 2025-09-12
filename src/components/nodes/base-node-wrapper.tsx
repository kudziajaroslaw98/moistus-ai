import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import {
	Handle,
	Node,
	NodeProps,
	NodeResizer,
	Position,
	useConnection,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, type ReactNode, useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from '../ui/avatar-stack';
import { Button } from '../ui/button';
import CollapseButton from './node-additions/collapse-button';
import CollapsedIndicator from './node-additions/collapsed-indicator';
import CommentButton from './node-additions/comment-button';
import GroupButton from './node-additions/group-button';
import { UniversalMetadataBar } from './shared';

interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
	children: ReactNode;
	nodeClassName?: string;
	nodeIcon?: ReactNode;
	nodeType?: string;
	includePadding?: boolean;
	hideNodeType?: boolean;
	// Semantic accent for user organization
	accentColor?: string;
	// Elevation level for Material Design hierarchy (0-24)
	elevation?: number;
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
	accentColor,
	elevation = 1,
}: BaseNodeWrapperProps) => {
	const {
		addNode,
		getNode,
		isDraggingNodes,
		realtimeSelectedNodes,
		currentUser,
		selectedNodes,
		activeTool,
	} = useAppStore(
		useShallow((state) => ({
			addNode: state.addNode,
			getNode: state.getNode,
			isDraggingNodes: state.isDraggingNodes,
			realtimeSelectedNodes: state.realtimeSelectedNodes,
			currentUser: state.currentUser,
			selectedNodes: state.selectedNodes,
			activeTool: state.activeTool,
		}))
	);

	const nodeRef = useRef();
	const connection = useConnection();
	const isTarget = connection?.toNode?.id === id;

	// User-defined accent color takes precedence
	const userAccentColor = data.metadata?.accentColor as string | undefined;
	const finalAccentColor = userAccentColor || accentColor;

	// Check if this node belongs to a group
	const belongsToGroup = data.metadata?.groupId;
	
	const handleAddNewNode = useCallback(() => {
		const currentNode = getNode(id);
		if (!currentNode) return;
		addNode({
			parentNode: currentNode,
			content: `New node from ${currentNode?.id} node`,
			position: {
				x: currentNode.position.x,
				y: currentNode.position.y + (currentNode?.height ?? 0) + 50,
			},
			nodeType: currentNode?.data?.node_type ?? 'defaultNode',
		});
	}, [id]);

	const avatars = useMemo(() => {
		if (!realtimeSelectedNodes) return [];
		return realtimeSelectedNodes.filter(
			(user) => user.selectedNodes?.includes(id) && user.id !== currentUser?.id
		);
	}, [realtimeSelectedNodes]);

	if (!data) {
		return null;
	}

	// Material Design elevation system for dark themes
	// Base: #121212, then progressively lighter based on elevation
	const getElevationColor = (level: number) => {
		const elevationMap: Record<number, string> = {
			0: '#121212', // Base background
			1: '#1E1E1E', // Cards, default nodes
			2: '#222222', // Raised cards
			4: '#272727', // App bars
			6: '#2C2C2C', // FABs, snackbars
			8: '#2F2F2F', // Navigation drawers
			12: '#333333', // Modals
			16: '#353535', // Sheets
			24: '#383838', // Dialogs
		};
		return elevationMap[level] || elevationMap[1];
	};

	// Dynamic styles following Material Design dark theme principles
	const nodeStyles: React.CSSProperties = {
		backgroundColor: getElevationColor(elevation),
		// No traditional shadows - elevation through color
		boxShadow: selected 
			? `0 0 0 1px rgba(96, 165, 250, 0.5), inset 0 0 0 1px rgba(96, 165, 250, 0.2)`
			: 'none',
		// Subtle border for definition
		border: `1px solid ${selected ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
		// Micro-animation for depth perception
		transform: selected ? 'translateY(-1px)' : 'translateY(0)',
		transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
	};

	// Accent color system - subtle and sophisticated
	const accentStyles: React.CSSProperties = finalAccentColor ? {
		borderTop: `2px solid ${finalAccentColor}`,
		borderTopLeftRadius: '8px',
		borderTopRightRadius: '8px',
	} : {};

	return (
		<div
			className={cn(
				'relative flex h-full min-h-auto min-w-80 flex-col rounded-lg cursor-move',
				includePadding ? 'p-4' : 'p-0',
				nodeClassName
			)}
			style={{
				...nodeStyles,
				...accentStyles,
				zIndex: belongsToGroup ? 1 : 'auto',
				height: 'auto',
				gap: '1rem',
			}}
		>
			{/* Node type indicator - semantic and minimal */}
			{nodeIcon && !hideNodeType && (
				<div className='absolute -top-7 left-0 z-10'>
					<div className='flex items-center gap-1.5 px-2 py-0.5 rounded-t-md'
						style={{ 
							backgroundColor: getElevationColor(4),
							border: '1px solid rgba(255, 255, 255, 0.06)',
							borderBottom: 'none'
						}}>
						<span style={{ opacity: 0.6, display: 'flex' }}>{nodeIcon}</span>
						{nodeType && (
							<span className='text-[10px] font-mono uppercase tracking-wider'
								style={{ color: 'rgba(255, 255, 255, 0.38)' }}>
								{nodeType}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Ambient glow for selected state - very subtle */}
			{selected && (
				<div className='absolute inset-0 rounded-lg pointer-events-none'
					style={{
						background: 'radial-gradient(circle at center, rgba(96, 165, 250, 0.03) 0%, transparent 70%)',
						zIndex: -1,
					}}
				/>
			)}

			<>
				<CollapsedIndicator />

				{/* Top header controls */}
				<div className='top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2'>
					<CollapseButton />
					<GroupButton />
					<CommentButton />
				</div>

				{/* Avatar stack for collaboration */}
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

				{/* Main content with metadata bar integration */}
				<div className={cn(
					'flex flex-col'
				)}>
					{/* Universal Metadata Bar - positioned at the top of content */}
					{/* Only show when node has actual metadata to display */}
					{data.metadata && (
						Object.keys(data.metadata).some(key => 
							data.metadata?.[key] !== undefined && 
							data.metadata?.[key] !== null &&
							data.metadata?.[key] !== ''
						) && (
							<UniversalMetadataBar
								metadata={data.metadata}
								nodeType={data.node_type || 'defaultNode'}
								selected={selected}
								className={cn([
									includePadding ? 'p-0 pb-4' : 'p-4'
								])}
								onMetadataClick={(type, value) => {
									// Handle metadata interactions
									console.log(`Metadata clicked: ${type} = ${value}`);
									// You can add custom handlers here, such as:
									// - Filter by tag
									// - Show all nodes assigned to a user
									// - Show all high priority items
								}}
							/>
						)
					)}
					
					{/* Main node content */}
					{children}
				</div>

				{!isDraggingNodes && (
					<>
						{/* Connection handles - minimal and functional */}
						<Handle
							type='source'
							position={Position.Bottom}
							className={cn(
								'!w-2 !h-2 rounded-full transition-all duration-200',
								'!bg-transparent !border !border-white/20',
								'hover:!bg-white/10 hover:!border-white/40 hover:scale-125'
							)}
							style={{
								bottom: '-4px',
							}}
						/>

						{activeTool === 'connector' && (
							<Handle
								type='source'
								position={Position.Top}
								className={cn([
									'w-full h-full z-20 translate-y-1/2 transition-colors',
									connection.inProgress
										? '!bg-transparent'
										: '!bg-sky-500/10',
								])}
							/>
						)}

						<Handle
							className={cn([
								'w-full translate-y-1/2 absolute top-0 left-0 border-none opacity-0 cursor-move',
								isTarget && '!bg-blue-500/30',
								connection.inProgress ? 'h-full' : 'h-0',
								activeTool === 'connector' ? 'z-10' : 'z-[21]',
							])}
							position={Position.Top}
							type='target'
							isConnectableStart={false}
						/>

						{/* Add New Node Button - follows Material Design FAB principles */}
						<AnimatePresence>
							{selected && selectedNodes.length === 1 && (
								<>
									<motion.div
										initial={{ opacity: 0, scaleY: 0 }}
										animate={{ opacity: 0.3, scaleY: 1 }}
										exit={{ opacity: 0, scaleY: 0 }}
										transition={{ duration: 0.2 }}
										className='absolute -bottom-12 left-1/2 -translate-x-1/2 w-[1px] h-12'
										style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
									/>
									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{ duration: 0.2, type: 'spring', stiffness: 300 }}
										className='absolute -bottom-[60px] left-1/2 -translate-x-1/2 z-20'
									>
										<Button
											onClick={handleAddNewNode}
											className='nodrag nopan rounded-full w-10 h-10 p-0 transition-all duration-200 hover:scale-110'
											style={{
												backgroundColor: getElevationColor(6),
												border: '1px solid rgba(255, 255, 255, 0.1)',
											}}
											title='Add new connected node'
										>
											<Plus className='w-5 h-5' style={{ color: 'rgba(255, 255, 255, 0.87)' }} />
										</Button>
									</motion.div>
								</>
							)}
						</AnimatePresence>

						<NodeResizer
							color='rgba(96, 165, 250, 0.4)'
							isVisible={selected}
							minWidth={100}
							minHeight={30}
							maxWidth={600}
							maxHeight={nodeRef.current?.height ?? 600}
							handleClassName='!w-2 !h-2 !rounded-full'
							handleStyle={{
								backgroundColor: selected ? 'rgba(96, 165, 250, 0.6)' : 'rgba(255, 255, 255, 0.2)',
								border: '1px solid rgba(255, 255, 255, 0.3)',
							}}
						/>
					</>
				)}
			</>
		</div>
	);
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = 'BaseNodeWrapper';