// components/Toolbar.tsx
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import { cn } from '@/utils/cn';
import {
	Fullscreen,
	Hand,
	LayoutGrid,
	MessageSquare,
	MousePointer2,
	Plus,
	Share2,
	Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/shallow';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/Tooltip';

interface ToolButton {
	id: Tool | `separator-${number}`;
	icon: React.ReactNode;
	label: string | null;
}

const tools: ToolButton[] = [
	{
		id: 'default',
		icon: <MousePointer2 className='size-4' />,
		label: 'Select',
	},
	{ id: 'pan', icon: <Hand className='size-4' />, label: 'Pan' },
	{ id: 'connector', icon: <Share2 className='size-4' />, label: 'Connect' },
	{ id: 'separator-0', icon: null, label: null },
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
	{
		id: 'layout',
		icon: <LayoutGrid className='size-4' />,
		label: 'Auto-Layout',
	},
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
		applyLayout,
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
			applyLayout: state.applyLayout,
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

	const onToolChange = (toolId: Tool | `separator-${number}`) => {
		if (toolId.startsWith('separator')) {
			return;
		}

		if (toolId === 'layout') {
			applyLayout('LR'); // Always use left-to-right for now
			setActiveTool('default');
		} else if (toolId === 'chat') {
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

	return (
		<motion.div
			animate={{ y: 0, opacity: 1 }}
			initial={{ y: 100, opacity: 0 }}
			transition={{ type: 'spring', stiffness: 100, damping: 15 }}
		>
			<div className='flex h-full w-full items-center gap-2 p-2 rounded-xl shadow-2xl bg-elevation-4 border border-border-default'>
				{tools.map((tool, index) => {
					if (tool.id.startsWith('separator')) {
						return (
							<Separator
								className='!h-4 flex bg-border-default'
								key={tool.id + '' + index}
								orientation='vertical'
							/>
						);
					}

					if (tool.id === 'magic-wand') {
						return (
							<Tooltip key={tool.id}>
								<TooltipTrigger
									className={cn(
										activeTool !== tool.id && 'bg-bg-base hover:bg-bg-elevated',
										activeTool === tool.id
											? 'bg-teal-500 border-teal-500/30 text-text-primary'
											: 'bg-bg-base border-border-default text-text-secondary',
										'inline-flex items-center rounded-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none !h-8 !w-8 p-0 justify-center'
									)}
									title={tool.label ?? `Tool ${index}`}
									onClick={() => onToolChange(tool.id)}
								>
									{tool.icon}
								</TooltipTrigger>

								<TooltipContent className='p-4'>
									<RadioGroup
										value={aiFeature}
										onValueChange={handleAiFeatureSelect}
									>
										<div className='flex items-center gap-2'>
											<RadioGroupItem
												id='suggest-nodes'
												value='suggest-nodes'
											/>

											<Label htmlFor='suggest-nodes'>Suggest Nodes</Label>
										</div>

										<div className='flex items-center gap-2'>
											<RadioGroupItem
												id='suggest-connections'
												value='suggest-connections'
											/>

											<Label htmlFor='suggest-connections'>
												Suggest Connections
											</Label>
										</div>

										<div className='flex items-center gap-2'>
											<RadioGroupItem
												id='suggest-merges'
												value='suggest-merges'
											/>

											<Label htmlFor='suggest-merges'>Suggest Merges</Label>
										</div>
									</RadioGroup>
								</TooltipContent>
							</Tooltip>
						);
					}

					// Comments button has special styling
					if (tool.id === 'comments') {
						return (
							<Button
								key={tool.id}
								size={'icon'}
								title={tool.label ?? `Tool ${index}`}
								variant={'secondary'}
								onClick={() => onToolChange(tool.id)}
								className={cn(
									isCommentMode &&
										'text-text-primary bg-primary-500 border-2 border-primary-500/20'
								)}
							>
								{tool.icon}
							</Button>
						);
					}

					return (
						<Button
							key={tool.id}
							size={'icon'}
							title={tool.label ?? `Tool ${index}`}
							variant={
								activeTool === tool.id &&
								tool.id !== 'chat' &&
								tool.id !== 'layout'
									? 'default'
									: 'secondary'
							}
							onClick={() => onToolChange(tool.id)}
						>
							{tool.icon}
						</Button>
					);
				})}
			</div>
		</motion.div>
	);
};
