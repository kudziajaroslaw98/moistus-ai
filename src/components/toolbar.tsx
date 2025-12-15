// components/Toolbar.tsx
import { usePermissions } from '@/hooks/collaboration/use-permissions';
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import { cn } from '@/utils/cn';
import {
	Fullscreen,
	Hand,
	MessageSquare,
	MousePointer2,
	Plus,
	Share2,
	Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from './ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Separator } from './ui/separator';

interface ToolButton {
	id: Tool | `separator-${number}`;
	icon: React.ReactNode;
	label: string | null;
}

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
	{ id: 'separator-1', icon: null, label: null },
	{ id: 'zoom', icon: <Fullscreen className='size-4' />, label: 'Zoom' },
	// { id: 'chat', icon: <MessageSquare className='size-4' />, label: 'AI Chat' },
	{ id: 'separator-2', icon: null, label: null },
	{
		id: 'comments',
		icon: <MessageSquare className='size-4' />,
		label: 'Comments (C)',
	},
];

export const Toolbar = () => {
	const {
		aiFeature,
		setAiFeature,
		activeTool,
		setState,
		setActiveTool,
		setPopoverOpen,
		generateConnectionSuggestions,
		generateMergeSuggestions,
		reactFlowInstance,
		isCommentMode,
		setCommentMode,
	} = useAppStore(
		useShallow((state) => ({
			activeTool: state.activeTool,
			setState: state.setState,
			setActiveTool: state.setActiveTool,
			setPopoverOpen: state.setPopoverOpen,
			setAiFeature: state.setAiFeature,
			aiFeature: state.aiFeature,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
			reactFlowInstance: state.reactFlowInstance,
			isCommentMode: state.isCommentMode,
			setCommentMode: state.setCommentMode,
		}))
	);

	// Get user permissions for feature gating
	const { canEdit, canComment } = usePermissions();

	// Filter cursor tools based on permissions
	// Non-editors: only Pan (no Select for dragging, no Connect for edges)
	const availableCursorTools = useMemo(() => {
		if (!canEdit) {
			// Only allow Pan mode for viewers/commenters
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
		if (result.length > 0 && result[result.length - 1].id.startsWith('separator')) {
			result.pop();
		}

		return result;
	}, [canEdit, canComment]);

	const onToolChange = (toolId: Tool | `separator-${number}`) => {
		if (toolId.startsWith('separator')) {
			return;
		}

		if (toolId === 'chat') {
			setPopoverOpen({ aiChat: true });
			// Don't change the active tool for chat
		} else if (toolId === 'zoom') {
			reactFlowInstance?.zoomTo(1);
		} else if (toolId === 'comments') {
			// Toggle comment mode
			setCommentMode(!isCommentMode);
		} else if (toolId === 'magic-wand') {
			switch (aiFeature) {
				case 'suggest-connections':
					generateConnectionSuggestions();
					break;
				case 'suggest-merges':
					generateMergeSuggestions();
					break;
				default:
					setActiveTool(toolId as Tool);
					break;
			}
		} else {
			setActiveTool(toolId as Tool);
		}
	};

	const handleAiFeatureSelect = (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		if (feature === 'suggest-nodes') {
			setAiFeature('suggest-nodes');
		} else if (feature === 'suggest-connections') {
			setState({ streamingAPI: '/api/ai/suggest-connections' });
			setAiFeature('suggest-connections');
		} else if (feature === 'suggest-merges') {
			setState({ streamingAPI: '/api/ai/suggest-merges' });
			setAiFeature('suggest-merges');
		}
	};

	// Combined handler: select feature AND trigger action immediately
	const handleAiFeatureSelectAndTrigger = (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		handleAiFeatureSelect(feature);

		// Trigger action immediately
		if (feature === 'suggest-nodes') {
			setActiveTool('magic-wand');
		} else if (feature === 'suggest-connections') {
			generateConnectionSuggestions();
		} else if (feature === 'suggest-merges') {
			generateMergeSuggestions();
		}
		// Note: DropdownMenu closes automatically on selection
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
			<div className='flex h-full w-full items-center gap-2 p-2 rounded-xl shadow-2xl shadow-neutral-950 bg-surface border border-elevated'>
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
					<DropdownMenuContent align='start' side='top'>
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
					</DropdownMenuContent>
				</DropdownMenu>

				<Separator
					className='!h-4 flex bg-overlay'
					orientation='vertical'
				/>

				{visibleTools.map((tool, index) => {
					if (tool.id.startsWith('separator')) {
						return (
							<Separator
								className='!h-4 flex bg-overlay'
								key={tool.id + '' + index}
								orientation='vertical'
							/>
						);
					}

					// AI Suggestions dropdown
					if (tool.id === 'magic-wand') {
						return (
							<DropdownMenu key={tool.id}>
								<DropdownMenuTrigger asChild>
									<Button
										className={cn(
											'active:scale-95',
											activeTool === tool.id &&
												'bg-teal-500 border-teal-500/30 text-text-primary'
										)}
										size='icon'
										title={tool.label ?? `Tool ${index}`}
										variant={
											activeTool === tool.id ? 'default' : 'secondary'
										}
									>
										{tool.icon}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start' side='top'>
									<DropdownMenuRadioGroup
										onValueChange={(val) =>
											handleAiFeatureSelectAndTrigger(
												val as
													| 'suggest-nodes'
													| 'suggest-connections'
													| 'suggest-merges'
											)
										}
										value={aiFeature}
									>
										<DropdownMenuRadioItem value='suggest-nodes'>
											Suggest Nodes
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value='suggest-connections'>
											Suggest Connections
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem value='suggest-merges'>
											Suggest Merges
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						);
					}

					// Comments button has special styling
					if (tool.id === 'comments') {
						return (
							<Button
								key={tool.id}
								onClick={() => onToolChange(tool.id)}
								size={'icon'}
								title={tool.label ?? `Tool ${index}`}
								variant={'secondary'}
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
							size={'icon'}
							title={tool.label ?? `Tool ${index}`}
							variant={
								activeTool === tool.id && tool.id !== 'chat'
									? 'default'
									: 'secondary'
							}
						>
							{tool.icon}
						</Button>
					);
				})}
			</div>
		</motion.div>
	);
};
