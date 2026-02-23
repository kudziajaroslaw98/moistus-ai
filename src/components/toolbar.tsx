// components/Toolbar.tsx
import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import { cn } from '@/utils/cn';
import {
	Download,
	Ellipsis,
	Fullscreen,
	Hand,
	LayoutGrid,
	Loader2,
	MessageCircle,
	MessageSquare,
	MousePointer2,
	Play,
	Plus,
	Route,
	Share2,
	Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/shallow';
import { AIActionsPopover } from './ai/ai-actions-popover';
import { ExportDropdown, ExportMenuContent } from './toolbar/export-dropdown';
import { LayoutDropdown, LayoutMenuContent } from './toolbar/layout-dropdown';
import { Button } from './ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';

// Feature flag: Set NEXT_PUBLIC_ENABLE_AI_CHAT=true to enable AI Chat
const ENABLE_AI_CHAT = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true';

interface ToolButton {
	id: Tool | `separator-${number}`;
	icon: React.ReactNode;
	label: string | null;
}

interface ToolbarProps {
	mobileTapMultiSelectEnabled: boolean;
	onMobileTapMultiSelectChange: (enabled: boolean) => void;
}

const mobileCoreToolOrder: Tool[] = ['node', 'magic-wand', 'comments'];
const mobileOverflowToolOrder: Tool[] = [
	'layout',
	'export',
	'present',
	'zoom',
	'chat',
];
const mobileOverflowContentClass =
	'w-56 p-1 data-[side=top]:mb-2 data-[side=bottom]:mt-2';
const mobileOverflowSubContentClass =
	'w-60 p-1 data-[side=left]:mr-1 data-[side=right]:ml-1';
const mobileOverflowItemClass =
	'h-10 rounded-lg px-2.5 text-sm font-medium text-text-primary gap-2.5';

// Cursor modes - displayed as a single dropdown
const cursorTools: {
	id: 'default' | 'pan' | 'connector';
	icon: ReactNode;
	label: string;
}[] = [
	{
		id: 'default',
		icon: <MousePointer2 className='size-4' />,
		label: 'Select',
	},
	{ id: 'pan', icon: <Hand className='size-4' />, label: 'Pan' },
	{ id: 'connector', icon: <Share2 className='size-4' />, label: 'Connect' },
];

const tools: ToolButton[] = [
	{ id: 'node', icon: <Plus className='size-4' />, label: 'Add Node' },
	// { id: 'text', icon: <Type className='size-4' />, label: 'Text' },
	{
		id: 'magic-wand',
		icon: <Sparkles className='size-4' />,
		label: 'AI Suggestions',
	},
	// Conditionally included via getVisibleTools()
	...(ENABLE_AI_CHAT
		? [
				{
					id: 'chat' as const,
					icon: <MessageCircle className='size-4' />,
					label: 'AI Chat',
				},
			]
		: []),
	{ id: 'layout', icon: null, label: 'Auto Layout' }, // Layout dropdown rendered separately
	{ id: 'export', icon: null, label: 'Export' }, // Export dropdown rendered separately
	{ id: 'present', icon: <Play className='size-4' />, label: 'Guided Tour' },
	{ id: 'separator-1', icon: null, label: null },
	{ id: 'zoom', icon: <Fullscreen className='size-4' />, label: 'Zoom' },
	{ id: 'separator-2', icon: null, label: null },
	{
		id: 'comments',
		icon: <MessageSquare className='size-4' />,
		label: 'Comments (C)',
	},
];

export const Toolbar = ({
	mobileTapMultiSelectEnabled,
	onMobileTapMultiSelectChange,
}: ToolbarProps) => {
	const {
		activeTool,
		setActiveTool,
		reactFlowInstance,
		isCommentMode,
		setCommentMode,
		toggleChat,
		isChatOpen,
		startTour,
		enterPathEditMode,
		savedPaths,
		nodes,
		isStreaming,
	} = useAppStore(
		useShallow((state) => ({
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			reactFlowInstance: state.reactFlowInstance,
			isCommentMode: state.isCommentMode,
			setCommentMode: state.setCommentMode,
			toggleChat: state.toggleChat,
			isChatOpen: state.isChatOpen,
			startTour: state.startTour,
			enterPathEditMode: state.enterPathEditMode,
			savedPaths: state.savedPaths,
			nodes: state.nodes,
			isStreaming: state.isStreaming,
		}))
	);
	const isMobile = useIsMobile();

	// State for AI actions popover
	const [isAIPopoverOpen, setIsAIPopoverOpen] = useState(false);

	const handleToggleAIPopover = useCallback(() => {
		setIsAIPopoverOpen((prev) => !prev);
	}, []);

	const handleCloseAIPopover = useCallback(() => {
		setIsAIPopoverOpen(false);
	}, []);

	// Close popover when streaming starts
	useEffect(() => {
		if (isStreaming) {
			setIsAIPopoverOpen(false);
		}
	}, [isStreaming]);

	// Get user permissions for feature gating
	const { canEdit, canComment } = usePermissions();

	// Filter cursor tools based on permissions
	// Non-editors: only Pan (no Select for dragging, no Connect for edges)
	const availableCursorTools = useMemo(() => {
		if (!canEdit) {
			// Only allow Pan mode for viewers/commentators
			return cursorTools.filter((t) => t.id === 'pan');
		}
		return cursorTools;
	}, [canEdit]);

	// Filter tools based on permissions, removing hidden items and cleaning up separators
	const visibleTools = useMemo(() => {
		// First, determine which tools are visible
		const toolVisibility = tools.map((tool) => {
			if (tool.id.startsWith('separator')) {
				return { tool, visible: true, isSeparator: true };
			}
			if (tool.id === 'node' && !canEdit) {
				return { tool, visible: false, isSeparator: false };
			}
			if (tool.id === 'magic-wand' && !canEdit) {
				return { tool, visible: false, isSeparator: false };
			}
			if (tool.id === 'layout' && !canEdit) {
				return { tool, visible: false, isSeparator: false };
			}
			if (tool.id === 'comments' && !canComment) {
				return { tool, visible: false, isSeparator: false };
			}
			return { tool, visible: true, isSeparator: false };
		});

		// Now filter out separators that would be adjacent to other separators or at edges
		const result: ToolButton[] = [];
		let lastWasSeparator = true; // Start as true to avoid leading separator

		for (const item of toolVisibility) {
			if (!item.visible) continue;

			if (item.isSeparator) {
				// Only add separator if last item wasn't a separator
				if (!lastWasSeparator && result.length > 0) {
					result.push(item.tool);
					lastWasSeparator = true;
				}
			} else {
				result.push(item.tool);
				lastWasSeparator = false;
			}
		}

		// Remove trailing separator if exists
		if (
			result.length > 0 &&
			result[result.length - 1].id.startsWith('separator')
		) {
			result.pop();
		}

		return result;
	}, [canEdit, canComment]);

	const visibleActionTools = useMemo(
		() =>
			visibleTools.filter(
				(tool): tool is ToolButton & { id: Tool } =>
					!tool.id.startsWith('separator')
			),
		[visibleTools]
	);

	const getVisibleActionTool = useCallback(
		(toolId: Tool) => visibleActionTools.find((tool) => tool.id === toolId),
		[visibleActionTools]
	);

	const mobileCoreTools = useMemo(
		() =>
			mobileCoreToolOrder
				.map((toolId) => getVisibleActionTool(toolId))
				.filter((tool): tool is ToolButton & { id: Tool } => Boolean(tool)),
		[getVisibleActionTool]
	);

	const mobileOverflowTools = useMemo(
		() =>
			mobileOverflowToolOrder
				.map((toolId) => getVisibleActionTool(toolId))
				.filter((tool): tool is ToolButton & { id: Tool } => Boolean(tool)),
		[getVisibleActionTool]
	);

	const onToolChange = (toolId: Tool | `separator-${number}`) => {
		if (toolId.startsWith('separator')) {
			return;
		}

		if (toolId === 'chat') {
			toggleChat();
			// Don't change the active tool for chat
		} else if (toolId === 'zoom') {
			reactFlowInstance?.zoomTo(1);
		} else if (toolId === 'comments') {
			// Toggle comment mode
			setCommentMode(!isCommentMode);
		} else if (toolId === 'present') {
			// Start guided tour (auto path)
			if (nodes.length > 0) {
				startTour();
			}
		} else if (toolId === 'magic-wand') {
			// AI actions are now handled via popover
			handleToggleAIPopover();
		} else {
			setActiveTool(toolId as Tool);
		}
	};

	const renderAIPopoverButton = (key: string, title: string) => {
		return (
			<div key={key} className='relative'>
				<Button
					className={cn(
						'active:scale-95',
						isAIPopoverOpen &&
							'bg-primary-500 border-primary-500/30 text-text-primary'
					)}
					size='icon'
					title={title}
					variant={isAIPopoverOpen ? 'default' : 'secondary'}
					onClick={handleToggleAIPopover}
				>
					{isStreaming ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<Sparkles className='size-4' />
					)}
				</Button>
				<AnimatePresence>
					{isAIPopoverOpen && (
						<>
							{/* Backdrop for click-outside - portaled to escape transform context */}
							{createPortal(
								<div
									className='fixed inset-0 z-40'
									onClick={handleCloseAIPopover}
									aria-hidden='true'
								/>,
								document.body
							)}
							<div className='absolute bottom-full left-0 mb-2 z-50'>
								<AIActionsPopover scope='map' onClose={handleCloseAIPopover} />
							</div>
						</>
					)}
				</AnimatePresence>
			</div>
		);
	};

	const renderTourMenuContent = () => {
		return (
			<>
				<DropdownMenuItem
					onClick={() => startTour()}
					disabled={nodes.length === 0}
				>
					<Play className='size-4 mr-2' />
					Start Auto Tour
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => enterPathEditMode()}>
					<Route className='size-4 mr-2' />
					Create Custom Path
				</DropdownMenuItem>
				{savedPaths.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<div className='px-2 py-1.5 text-xs text-muted-foreground'>
							Saved Paths
						</div>
						{savedPaths.map((path) => (
							<DropdownMenuItem
								key={path.id}
								onClick={() => startTour({ savedPathId: path.id })}
							>
								<span className='flex-1 truncate'>{path.name}</span>
								<span className='text-xs text-muted-foreground ml-2'>
									{path.nodeIds.length}
								</span>
							</DropdownMenuItem>
						))}
					</>
				)}
			</>
		);
	};

	const renderStandardToolButton = (tool: ToolButton, index: number) => {
		if (tool.id.startsWith('separator')) {
			return null;
		}

		if (tool.id === 'magic-wand') {
			return renderAIPopoverButton(tool.id, tool.label ?? `Tool ${index}`);
		}

		if (tool.id === 'chat') {
			return (
				<Button
					key={tool.id}
					onClick={() => onToolChange(tool.id)}
					size='icon'
					title={tool.label ?? `Tool ${index}`}
					variant='secondary'
					className={cn(
						isChatOpen &&
							'text-text-primary bg-primary-500 border-2 border-primary-500/20',
						'active:scale-95'
					)}
				>
					{tool.icon}
				</Button>
			);
		}

		if (tool.id === 'comments') {
			return (
				<Button
					key={tool.id}
					onClick={() => onToolChange(tool.id)}
					size='icon'
					title={tool.label ?? `Tool ${index}`}
					variant='secondary'
					className={cn(
						isCommentMode &&
							'text-text-primary bg-primary-500 border-2 border-primary-500/20',
						'active:scale-95'
					)}
				>
					{tool.icon}
				</Button>
			);
		}

		return (
			<Button
				className='active:scale-95'
				key={tool.id}
				onClick={() => onToolChange(tool.id)}
				size='icon'
				title={tool.label ?? `Tool ${index}`}
				variant={activeTool === tool.id ? 'default' : 'secondary'}
			>
				{tool.icon}
			</Button>
		);
	};

	const renderDesktopTool = (tool: ToolButton, index: number) => {
		if (tool.id.startsWith('separator')) {
			return (
				<Separator
					className='!h-4 flex bg-overlay'
					key={`${tool.id}${index}`}
					orientation='vertical'
				/>
			);
		}

		if (tool.id === 'layout') {
			return <LayoutDropdown key={tool.id} />;
		}

		if (tool.id === 'export') {
			return <ExportDropdown key={tool.id} />;
		}

		if (tool.id === 'present') {
			return (
				<DropdownMenu key={tool.id}>
					<DropdownMenuTrigger asChild>
						<Button
							className='active:scale-95'
							size='icon'
							title='Guided Tour'
							variant='secondary'
							disabled={nodes.length === 0}
						>
							<Play className='size-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start' className='w-48'>
						{renderTourMenuContent()}
					</DropdownMenuContent>
				</DropdownMenu>
			);
		}

		return renderStandardToolButton(tool, index);
	};

	const renderMobileOverflowTool = (tool: ToolButton & { id: Tool }) => {
		if (tool.id === 'layout') {
			return (
				<DropdownMenuSub key='mobile-overflow-layout'>
					<DropdownMenuSubTrigger
						className={mobileOverflowItemClass}
						openOnHover={false}
					>
						<LayoutGrid className='size-4' />
						Auto Layout
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={mobileOverflowSubContentClass}>
						<LayoutMenuContent />
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			);
		}

		if (tool.id === 'export') {
			return (
				<DropdownMenuSub key='mobile-overflow-export'>
					<DropdownMenuSubTrigger
						className={mobileOverflowItemClass}
						openOnHover={false}
					>
						<Download className='size-4' />
						Export
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={mobileOverflowSubContentClass}>
						<ExportMenuContent showHeader={false} />
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			);
		}

		if (tool.id === 'present') {
			return (
				<DropdownMenuSub key='mobile-overflow-present'>
					<DropdownMenuSubTrigger
						className={mobileOverflowItemClass}
						disabled={nodes.length === 0}
						openOnHover={false}
					>
						<Play className='size-4' />
						Guided Tour
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={mobileOverflowSubContentClass}>
						{renderTourMenuContent()}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			);
		}

		if (tool.id === 'zoom') {
			return (
				<DropdownMenuItem
					key='mobile-overflow-zoom'
					className={mobileOverflowItemClass}
					onClick={() => onToolChange('zoom')}
				>
					<Fullscreen className='size-4' />
					Reset Zoom
				</DropdownMenuItem>
			);
		}

		if (tool.id === 'chat') {
			return (
				<DropdownMenuItem
					key='mobile-overflow-chat'
					className={mobileOverflowItemClass}
					onClick={() => onToolChange('chat')}
				>
					<MessageCircle className='size-4' />
					{isChatOpen ? 'Close AI Chat' : 'Open AI Chat'}
				</DropdownMenuItem>
			);
		}

		return null;
	};

	// Get the current cursor tool for display (using filtered tools)
	const currentCursorTool =
		availableCursorTools.find((t) => t.id === activeTool) ??
		availableCursorTools[0];

	return (
		<motion.div
			animate={{ y: 0, opacity: 1 }}
			initial={{ y: 100, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 100, damping: 15 }}
		>
			<div
				className={cn(
					'flex h-full w-full items-center rounded-xl shadow-2xl shadow-neutral-950 bg-surface border border-elevated p-2',
					isMobile ? 'gap-1.5' : 'gap-2'
				)}
				data-testid='toolbar'
			>
				{/* Cursor Mode Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							className='active:scale-95'
							size='icon'
							title={currentCursorTool.label}
							variant='default'
						>
							{currentCursorTool.icon}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start'>
						<DropdownMenuRadioGroup
							onValueChange={(val) => setActiveTool(val as Tool)}
							value={activeTool}
						>
							{availableCursorTools.map((tool) => (
								<DropdownMenuRadioItem key={tool.id} value={tool.id}>
									<span className='flex items-center gap-2'>
										{tool.icon}
										{tool.label}
									</span>
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
						{isMobile && canEdit && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuCheckboxItem
									checked={mobileTapMultiSelectEnabled}
									data-testid='cursor-toggle-tap-multi-select'
									onCheckedChange={(checked) =>
										onMobileTapMultiSelectChange(checked === true)
									}
								>
									Tap Multi-select
								</DropdownMenuCheckboxItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{!isMobile && (
					<Separator className='!h-4 flex bg-overlay' orientation='vertical' />
				)}

				{!isMobile && visibleTools.map(renderDesktopTool)}

				{isMobile &&
					mobileCoreTools.map((tool, index) =>
						renderStandardToolButton(tool, index)
					)}

				{isMobile && mobileOverflowTools.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className='active:scale-95'
								size='icon'
								title='More Tools'
								variant='secondary'
								data-testid='toolbar-more-button'
							>
								<Ellipsis className='size-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='end'
							alignOffset={0}
							className={mobileOverflowContentClass}
							data-testid='toolbar-more-menu'
						>
							{mobileOverflowTools.map((tool) =>
								renderMobileOverflowTool(tool)
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</motion.div>
	);
};
