import useAppStore from '@/store/mind-map-store';
import { type NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import {
	Handle,
	type Node,
	type NodeProps,
	NodeResizer,
	Position,
	useConnection,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	type CSSProperties,
	type ReactNode,
	memo,
	useCallback,
	useMemo,
	useRef,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from '../ui/avatar-stack';
import { Button } from '../ui/button';
import CollapseButton from './node-additions/collapse-button';
import CollapsedIndicator from './node-additions/collapsed-indicator';
import CommentButton from './node-additions/comment-button';
import GroupButton from './node-additions/group-button';
import { UniversalMetadataBar } from './shared/universal-metadata-bar';
import {
	GlassmorphismTheme,
	getElevationColor,
} from './themes/glassmorphism-theme';

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

	const nodeRef = useRef<HTMLDivElement | null>(null);
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

	// Use centralized theme system
	const theme = GlassmorphismTheme;

	// Dynamic styles using centralized theme system
	const nodeStyles: CSSProperties = {
		backgroundColor: getElevationColor(elevation),
		// Proper focus states with double border technique for accessibility
		boxShadow: selected ? theme.effects.selectedShadow : 'none',
		// Subtle border with proper hover states
		border: `1px solid ${selected ? theme.borders.selected : theme.borders.default}`,
		// Micro-animation for depth perception
		transform: selected
			? theme.effects.selectedTransform
			: theme.effects.defaultTransform,
		transition: theme.effects.transition,
		// Ensure proper focus handling
		outline: 'none',
	};

	// Accent color system - subtle and sophisticated
	const accentStyles: CSSProperties = finalAccentColor
		? {
				borderTop: `2px solid ${finalAccentColor}`,
				borderTopLeftRadius: '8px',
				borderTopRightRadius: '8px',
			}
		: {};

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
					<div
						className='flex items-center gap-1.5 px-2 py-0.5 rounded-t-md'
						style={{
							backgroundColor: getElevationColor(4),
							border: '1px solid rgba(255, 255, 255, 0.06)',
							borderBottom: 'none',
						}}
					>
						<span style={{ opacity: 0.6, display: 'flex' }}>{nodeIcon}</span>

						{nodeType && (
							<span
								className='text-[10px] font-mono uppercase tracking-wider'
								style={{ color: 'rgba(255, 255, 255, 0.38)' }}
							>
								{nodeType}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Ambient glow for selected state - very subtle */}
			{selected && (
				<div
					className='absolute inset-0 rounded-lg pointer-events-none'
					style={{
						background: theme.effects.ambientGlow,
						zIndex: -1,
					}}
				/>
			)}

			<>
				<CollapsedIndicator data={data} />

				{/* Top header controls */}
				<div className='top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2'>
					<CollapseButton data={data} />

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
				<div className={cn('flex flex-col')}>
					{/* Universal Metadata Bar - positioned at the top of content */}
					{/* Only show when node has actual metadata to display */}
					{data.metadata &&
						Object.keys(data.metadata).some(
							(key) =>
								data.metadata?.[key] !== undefined &&
								data.metadata?.[key] !== null &&
								data.metadata?.[key] !== ''
						) && (
							<UniversalMetadataBar
								metadata={data.metadata}
								nodeType={data.node_type || 'defaultNode'}
								selected={selected}
								className={cn([includePadding ? 'p-0 pb-4' : 'p-4'])}
								onMetadataClick={(type, value) => {
									// Handle metadata interactions
									console.log(`Metadata clicked: ${type} = ${value}`);
									// You can add custom handlers here, such as:
									// - Filter by tag
									// - Show all nodes assigned to a user
									// - Show all high priority items
								}}
							/>
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
								'!bg-transparent !border',
								'hover:scale-125'
							)}
							style={{
								bottom: theme.node.handle.bottom,
								border: `1px solid ${theme.borders.default}`,
								backgroundColor: theme.node.handle.background,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor =
									theme.node.handle.hoverBackground;
								e.currentTarget.style.border = `1px solid ${theme.borders.hover}`;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor =
									theme.node.handle.background;
								e.currentTarget.style.border = `1px solid ${theme.borders.default}`;
							}}
						/>

						{activeTool === 'connector' && (
							<Handle
								type='source'
								position={Position.Top}
								className={cn([
									'w-full h-full z-20 translate-y-1/2 transition-colors',
									connection.inProgress ? '!bg-transparent' : '!bg-sky-500/10',
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
										style={{ backgroundColor: theme.borders.hover }}
									/>

									<motion.div
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										transition={{
											duration: 0.2,
											type: 'spring',
											stiffness: 300,
										}}
										className='absolute -bottom-[60px] left-1/2 -translate-x-1/2 z-20'
									>
										<Button
											onClick={handleAddNewNode}
											className='nodrag nopan rounded-full w-10 h-10 p-0 transition-all duration-200 hover:scale-110'
											style={{
												backgroundColor: getElevationColor(6),
												border: `1px solid ${theme.borders.hover}`,
											}}
											title='Add new connected node'
										>
											<Plus
												className='w-5 h-5'
												style={{ color: theme.text.high }}
											/>
										</Button>
									</motion.div>
								</>
							)}
						</AnimatePresence>

						<NodeResizer
							color={theme.node.resizer.color}
							isVisible={selected}
							minWidth={280}
							minHeight={80}
							maxWidth={800}
							maxHeight={nodeRef.current?.scrollHeight ?? 600}
							handleClassName='!w-2 !h-2 !rounded-full'
							handleStyle={{
								backgroundColor: selected
									? theme.node.resizer.selectedBackground
									: theme.borders.default,
								border: theme.node.resizer.border,
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
