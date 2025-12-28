import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useMeasure } from '@/hooks/use-measure';
import { useNodeDimensions } from '@/hooks/use-node-dimensions';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { getNodeConstraints } from '@/utils/node-dimension-utils';
import { Handle, NodeResizer, Position, useConnection } from '@xyflow/react';
import { Plus, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type CSSProperties, memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { AvatarStack } from '../ui/avatar-stack';
import { Button } from '../ui/button';
import { type BaseNodeWrapperProps } from './core/types';
import CollapseButton from './node-additions/collapse-button';
import CollapsedIndicator from './node-additions/collapsed-indicator';
import GroupButton from './node-additions/group-button';
import { UniversalMetadataBar } from './shared/universal-metadata-bar';
import {
	GlassmorphismTheme,
	getElevationColor,
} from './themes/glassmorphism-theme';

const BaseNodeWrapperComponent = ({
	id,
	data,
	children,
	nodeClassName,
	contentClassName,
	nodeIcon,
	nodeType = 'defaultNode',
	includePadding = true,
	hideNodeType = false,
	hideAddButton = false,
	hideSuggestionsButton = false,
	hideResizeFrame = false,
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
		ghostNodes,
		isStreaming,
		generateSuggestions,
	} = useAppStore(
		useShallow((state) => ({
			openNodeEditor: state.openNodeEditor,
			getNode: state.getNode,
			isDraggingNodes: state.isDraggingNodes,
			realtimeSelectedNodes: state.realtimeSelectedNodes,
			currentUser: state.currentUser,
			selectedNodes: state.selectedNodes,
			activeTool: state.activeTool,
			ghostNodes: state.ghostNodes,
			isStreaming: state.isStreaming,
			generateSuggestions: state.generateSuggestions,
		}))
	);

	const connection = useConnection();
	const isTarget = connection?.toNode?.id === id;
	const { canEdit } = usePermissions();

	// Derive selection state from Zustand to avoid triggering history saves
	const isSelected = useMemo(() => {
		return selectedNodes.some((node) => node.id === id);
	}, [selectedNodes, id]);

	// Get node-specific constraints
	const actualNodeType = data?.node_type || 'defaultNode';
	const constraints = getNodeConstraints(actualNodeType);

	// Measure content dimensions to prevent shrinking below content
	const [contentRef, contentBounds] = useMeasure<HTMLDivElement>();

	// Use controlled dimensions hook
	const {
		dimensions,
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
		contentWidth: contentBounds.width,
		contentHeight: contentBounds.height,
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

	const handleGenerateSuggestions = useCallback(() => {
		// Call generateSuggestions directly from the store
		generateSuggestions({
			sourceNodeId: id,
			trigger: 'magic-wand',
		});
	}, [id, generateSuggestions]);

	// Check if this node already has ghost node suggestions
	const hasGhostSuggestions = useMemo(() => {
		return ghostNodes.some(
			(ghost) => ghost.data.metadata?.context?.sourceNodeId === id
		);
	}, [ghostNodes, id]);

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
	// Use explicit width/height (not minWidth/minHeight) to enable visual grid snapping
	// during resize - the snapped dimensions from state will be applied immediately
	const nodeStyles: CSSProperties = {
		backgroundColor: getElevationColor(elevation),
		// Proper focus states with double border technique for accessibility
		border: `1px solid ${isSelected ? theme.borders.selected : theme.borders.default}`,
		// Explicit dimensions for grid-snapped resizing
		minWidth: dimensions.width,
		minHeight: dimensions.height,
	};

	// Accent color system - subtle and sophisticated
	const accentStyles: CSSProperties = finalAccentColor
		? {
				border: `2px 0 0 0 solid ${finalAccentColor}`,
				borderTopLeftRadius: '8px',
				borderTopRightRadius: '8px',
			}
		: {};

	return (
		<motion.div ref={nodeRef} transition={{ type: 'spring', duration: 0.2 }}>
			<motion.div
				className={cn(
					'flex-col rounded-lg cursor-move gap-4',
					'bg-elevation-1 bg-[url("/images/groovepaper.png")] bg-repeat bg-blend-color-burn',
					includePadding ? 'p-4' : 'p-0',
					nodeClassName
				)}
				style={{
					...nodeStyles,
					...accentStyles,
				}}
			>
				<CollapsedIndicator data={data} />

				{/* Top header controls */}
				<div className='top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2'>
					<CollapseButton data={data} />

					<GroupButton />
				</div>

				{/* Avatar stack for collaboration */}
				<div className='-bottom-10 left-0 flex absolute'>
					<AnimatePresence key={`${data.id}-avatars`} mode='popLayout'>
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
				{/* Note: NO h-full here - contentRef must size to children for accurate measurement */}
				<div
					ref={contentRef}
					className={cn('flex flex-col h-auto relative z-[1]', contentClassName)}
				>
					{data.metadata &&
						Object.values(data.metadata).some(
							(value) => value !== undefined && value !== null && value !== ''
						) && (
							<UniversalMetadataBar
								className={cn([includePadding ? 'p-0 pb-4' : 'p-4'])}
								colorOverrides={metadataColorOverrides}
								metadata={data.metadata}
								nodeType={data.node_type || 'defaultNode'}
								selected={isSelected}
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

				{!isDraggingNodes && !hideResizeFrame && (
					<div key={`${data.id}-handles`}>
						{/* Connection handles - minimal and functional */}
						<Handle
							position={Position.Bottom}
							type='source'
							className={cn(
								'!w-2 !h-2 rounded-full transition-all duration-200',
								'!bg-transparent !border',
								'hover:scale-125'
							)}
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
							style={{
								bottom: theme.node.handle.bottom,
								border: `1px solid ${theme.borders.default}`,
								backgroundColor: theme.node.handle.background,
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
						<AnimatePresence key={`${data.id}-add`}>
							{!hideAddButton &&
								canEdit &&
								isSelected &&
								selectedNodes.length === 1 && (
									<div key={`${data.id}-add-handles`}>
										<motion.div
											animate={{ opacity: 0.3, scaleY: 1 }}
											className='absolute -bottom-12 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-overlay'
											exit={{ opacity: 0, scaleY: 0 }}
											initial={{ opacity: 0, scaleY: 0 }}
											transition={{ duration: 0.2 }}
										/>

										<motion.div
											animate={{ opacity: 1, scale: 1, filter: 'blur(0)' }}
											className='absolute -bottom-[60px] left-1/2 -translate-x-1/2 z-20'
											exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
											initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
											transition={{
												duration: 0.3,
												type: 'spring',
											}}
										>
											<Button
												className='nodrag nopan rounded-full w-10 h-10 p-0 transition-all duration-200 hover:scale-110 bg-elevated border border-border-default'
												data-testid='node-add-button'
												onClick={handleAddNewNode}
												title='Add new connected node'
											>
												<Plus className='w-5 h-5 text-text-primary' />
											</Button>
										</motion.div>
									</div>
								)}

							{!hideSuggestionsButton &&
								canEdit &&
								isSelected &&
								selectedNodes.length === 1 && (
									<>
										<motion.div
											animate={{ opacity: 0.3, scaleX: 1 }}
											className='absolute -right-16 -z-10 top-1/2 -translate-y-1/2 w-20 h-[1px] bg-overlay'
											exit={{ opacity: 0, scaleX: 0 }}
											initial={{ opacity: 0, scaleX: 0 }}
											transition={{ duration: 0.2 }}
										/>

										<motion.div
											animate={{ opacity: 1, scale: 1, filter: 'blur(0)' }}
											className='absolute -right-[200px] top-1/2 -translate-y-1/2 z-20'
											exit={{ opacity: 0, scale: 0.8 }}
											initial={{
												opacity: 0,
												scale: 0.8,
											}}
											transition={{
												duration: 0.3,
												type: 'spring',
											}}
										>
											<Button
												className='nodrag nopan rounded-full w-fit py-2 px-4 flex gap-2 transition-all duration-200 hover:scale-110 border border-border-default bg-elevated'
												data-testid='node-suggest-button'
												onClick={handleGenerateSuggestions}
												title='Suggest Nodes'
											>
												<Sparkles className='size-4 text-text-primary' />
												Suggest Nodes
											</Button>
										</motion.div>
									</>
								)}
						</AnimatePresence>

						{!hideResizeFrame && (
							<NodeResizer
								color={theme.node.resizer.color}
								handleClassName='!w-2 !h-2 !rounded-full'
								isVisible={isSelected && canEdit}
								maxHeight={constraints.maxHeight ?? Number.MAX_SAFE_INTEGER}
								maxWidth={constraints.maxWidth}
								minHeight={constraints.minHeight}
								minWidth={constraints.minWidth}
								onResize={handleResize}
								onResizeEnd={handleResizeEnd}
								onResizeStart={handleResizeStart}
								shouldResize={shouldResize}
								// Match node border radius for proper alignment
								lineStyle={{
									borderRadius: '8px', // Matches rounded-lg
									borderWidth: '1px',
								}}
								handleStyle={{
									backgroundColor: isSelected
										? theme.node.resizer.selectedBackground
										: theme.borders.default,
									border: theme.node.resizer.border,
								}}
							/>
						)}
					</div>
				)}
			</motion.div>
		</motion.div>
	);
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = 'BaseNodeWrapper';
