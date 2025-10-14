import { useNodeDimensions } from '@/hooks/use-node-dimensions';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { getNodeConstraints } from '@/utils/node-dimension-utils';
import {
	Handle,
	NodeResizer,
	Position,
	useConnection,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	type CSSProperties,
	memo,
	useCallback,
	useMemo,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from '../ui/avatar-stack';
import { Button } from '../ui/button';
import CollapseButton from './node-additions/collapse-button';
import CollapsedIndicator from './node-additions/collapsed-indicator';
import GroupButton from './node-additions/group-button';
import { type BaseNodeWrapperProps } from './core/types';
import { UniversalMetadataBar } from './shared/universal-metadata-bar';
import {
	GlassmorphismTheme,
	getElevationColor,
} from './themes/glassmorphism-theme';

const BaseNodeWrapperComponent = ({
	id,
	data,
	selected,
	children,
	nodeClassName,
	nodeIcon,
	nodeType = 'defaultNode',
	includePadding = true,
	hideNodeType = false,
	accentColor,
	elevation = 1,
	metadataColorOverrides,
}: BaseNodeWrapperProps) => {
	const {
		openNodeEditor,
		getNode,
		isDraggingNodes,
		realtimeSelectedNodes,
		currentUser,
		selectedNodes,
		activeTool,
	} = useAppStore(
		useShallow((state) => ({
			openNodeEditor: state.openNodeEditor,
			getNode: state.getNode,
			isDraggingNodes: state.isDraggingNodes,
			realtimeSelectedNodes: state.realtimeSelectedNodes,
			currentUser: state.currentUser,
			selectedNodes: state.selectedNodes,
			activeTool: state.activeTool,
		}))
	);

	const connection = useConnection();
	const isTarget = connection?.toNode?.id === id;

	// Get node-specific constraints
	const actualNodeType = data?.node_type || 'defaultNode';
	const constraints = getNodeConstraints(actualNodeType);

	// Use controlled dimensions hook
	const {
		dimensions,
		isResizing,
		handleResizeStart,
		handleResize,
		handleResizeEnd,
		shouldResize,
		nodeRef,
	} = useNodeDimensions(id, {
		minWidth: constraints.minWidth,
		minHeight: constraints.minHeight,
		maxWidth: constraints.maxWidth,
		maxHeight: constraints.maxHeight, // undefined = unlimited
		autoHeight: true,
		debounceMs: 100,
	});

	// User-defined accent color takes precedence
	const userAccentColor = data.metadata?.accentColor as string | undefined;
	const finalAccentColor = userAccentColor || accentColor;

	// Check if this node belongs to a group
	const belongsToGroup = data.metadata?.groupId;

	const handleAddNewNode = useCallback(() => {
		const currentNode = getNode(id);
		if (!currentNode) return;
		const position = {
			x: currentNode.position.x,
			y: currentNode.position.y + (currentNode?.height ?? 0) + 50,
		};
		openNodeEditor({
			mode: 'create',
			position,
			parentNode: currentNode,
		});
	}, [id, getNode, openNodeEditor]);

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
			ref={nodeRef}
			className={cn(
				'relative flex h-auto min-w-80 flex-col rounded-lg cursor-move',
				includePadding ? 'p-4' : 'p-0',
				nodeClassName
			)}
			style={{
				...nodeStyles,
				...accentStyles,
				zIndex: belongsToGroup ? 1 : 'auto',
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
				</div>

				{/* Avatar stack for collaboration */}
				<div className='-bottom-10 left-0 flex absolute'>
					<AnimatePresence mode='popLayout'>
						{avatars.length > 0 && (
							<motion.div
								animate={{ opacity: 1, scale: 1, y: 0 }}
								className='inline-flex h-auto w-full'
								exit={{ opacity: 0, scale: 0.98, y: -10 }}
								initial={{ opacity: 0, scale: 0.98, y: -10 }}
								transition={{ duration: 0.2 }}
							>
								<AvatarStack avatars={avatars} size={'sm'} />
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Main content with metadata bar integration */}
				<div className={cn('flex flex-col h-full')}>
					{/* Universal Metadata Bar - positioned at the top of content */}
					{/* Only show when node has actual metadata to display */}
					{data.metadata &&
						Object.values(data.metadata).some(
							(value) =>
								value !== undefined &&
								value !== null &&
								value !== ''
						) && (
							<UniversalMetadataBar
								className={cn([includePadding ? 'p-0 pb-4' : 'p-4'])}
								colorOverrides={metadataColorOverrides}
								metadata={data.metadata}
								nodeType={data.node_type || 'defaultNode'}
								selected={selected}
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
							position={Position.Bottom}
							type='source'
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
								position={Position.Top}
								type='source'
								className={cn([
									'w-full h-full z-20 translate-y-1/2 transition-colors',
									connection.inProgress ? '!bg-transparent' : '!bg-sky-500/10',
								])}
							/>
						)}

						<Handle
							isConnectableStart={false}
							position={Position.Top}
							type='target'
							className={cn([
								'w-full translate-y-1/2 absolute top-0 left-0 border-none opacity-0 cursor-move',
								isTarget && '!bg-blue-500/30',
								connection.inProgress ? 'h-full' : 'h-0',
								activeTool === 'connector' ? 'z-10' : 'z-[21]',
							])}
						/>

						{/* Add New Node Button - follows Material Design FAB principles */}
						<AnimatePresence>
							{selected && selectedNodes.length === 1 && (
								<>
									<motion.div
										animate={{ opacity: 0.3, scaleY: 1 }}
										className='absolute -bottom-12 left-1/2 -translate-x-1/2 w-[1px] h-12'
										exit={{ opacity: 0, scaleY: 0 }}
										initial={{ opacity: 0, scaleY: 0 }}
										style={{ backgroundColor: theme.borders.hover }}
										transition={{ duration: 0.2 }}
									/>

									<motion.div
										animate={{ opacity: 1, scale: 1 }}
										className='absolute -bottom-[60px] left-1/2 -translate-x-1/2 z-20'
										exit={{ opacity: 0, scale: 0.8 }}
										initial={{ opacity: 0, scale: 0.8 }}
										transition={{
											duration: 0.2,
											type: 'spring',
											stiffness: 300,
										}}
									>
										<Button
											className='nodrag nopan rounded-full w-10 h-10 p-0 transition-all duration-200 hover:scale-110'
											title='Add new connected node'
											style={{
												backgroundColor: getElevationColor(6),
												border: `1px solid ${theme.borders.hover}`,
											}}
											onClick={handleAddNewNode}
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
							handleClassName='!w-2 !h-2 !rounded-full'
							isVisible={selected}
							maxHeight={constraints.maxHeight ?? Number.MAX_SAFE_INTEGER}
							maxWidth={constraints.maxWidth}
							minHeight={constraints.minHeight}
							minWidth={constraints.minWidth}
							shouldResize={shouldResize}
							handleStyle={{
								backgroundColor: selected
									? theme.node.resizer.selectedBackground
									: theme.borders.default,
								border: theme.node.resizer.border,
							}}
							onResize={handleResize}
							onResizeEnd={handleResizeEnd}
							onResizeStart={handleResizeStart}
						/>
					</>
				)}
			</>
		</div>
	);
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = 'BaseNodeWrapper';
