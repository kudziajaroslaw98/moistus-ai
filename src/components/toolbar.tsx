// components/Toolbar.tsx
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import { motion } from 'framer-motion';
import {
	Hand,
	LayoutGrid,
	MessageSquare,
	MousePointer2,
	Plus,
	Share2,
	Sparkles,
	Type,
} from 'lucide-react';
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
	{ id: 'default', icon: <MousePointer2 size={20} />, label: 'Select' },
	{ id: 'pan', icon: <Hand size={20} />, label: 'Pan' },
	{ id: 'connector', icon: <Share2 size={20} />, label: 'Connect' },
	{ id: 'separator-0', icon: null, label: null },
	{ id: 'node', icon: <Plus size={20} />, label: 'Add Node' },
	{ id: 'text', icon: <Type size={20} />, label: 'Text' },
	{ id: 'magic-wand', icon: <Sparkles size={20} />, label: 'AI Suggestions' },
	{ id: 'separator-1', icon: null, label: null },
	{ id: 'chat', icon: <MessageSquare size={20} />, label: 'AI Chat' },
	{ id: 'layout', icon: <LayoutGrid size={20} />, label: 'Auto-Layout' },
];

export const Toolbar = () => {
	const {
		aiFeature,
		setAiFeature,
		activeTool,
		setActiveTool,
		applyLayout,
		setPopoverOpen,
		generateConnectionSuggestions,
		generateMergeSuggestions,
	} = useAppStore(
		useShallow((state) => ({
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			applyLayout: state.applyLayout,
			setPopoverOpen: state.setPopoverOpen,
			setAiFeature: state.setAiFeature,
			aiFeature: state.aiFeature,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
		}))
	);

	const onToolChange = (toolId: Tool | `separator-${number}`) => {
		if (toolId.startsWith('separator')) {
			return;
		}

		if (toolId === 'layout') {
			applyLayout('LR');
			setActiveTool('default');
		} else if (toolId === 'chat') {
			setPopoverOpen({ aiChat: true });
			// Don't change the active tool for chat
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
			generateConnectionSuggestions();
			setAiFeature('suggest-connections');
		} else if (feature === 'suggest-merges') {
			setAiFeature('suggest-merges');
			generateMergeSuggestions();
		}
	};

	return (
		<motion.div
			initial={{ y: 100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ type: 'spring', stiffness: 100, damping: 15 }}
		>
			<div className='flex h-full w-full items-center gap-2 p-2 bg-gray-950 border border-gray-900 rounded-md shadow-2xl'>
				{tools.map((tool, index) => {
					if (tool.id.startsWith('separator')) {
						return (
							<Separator
								key={tool.id + '' + index}
								orientation='vertical'
								className='!bg-zinc-700 !h-4  flex'
							/>
						);
					}

					if (tool.id === 'magic-wand') {
						return (
							<Tooltip key={tool.id}>
								<TooltipTrigger asChild>
									<Button
										onClick={() => onToolChange(tool.id)}
										variant={activeTool === tool.id ? 'default' : 'secondary'}
										title={tool.label ?? `Tool ${index}`}
										size={'icon-md'}
									>
										{tool.icon}
									</Button>
								</TooltipTrigger>

								<TooltipContent className='p-4'>
									<RadioGroup
										onValueChange={handleAiFeatureSelect}
										value={aiFeature}
									>
										<div className='flex items-center gap-2'>
											<RadioGroupItem
												value='suggest-nodes'
												id='suggest-nodes'
											/>

											<Label htmlFor='suggest-nodes'>Suggest Nodes</Label>
										</div>

										<div className='flex items-center gap-2'>
											<RadioGroupItem
												value='suggest-connections'
												id='suggest-connections'
											/>

											<Label htmlFor='suggest-connections'>
												Suggest Connections
											</Label>
										</div>

										<div className='flex items-center gap-2'>
											<RadioGroupItem
												value='suggest-merges'
												id='suggest-merges'
											/>

											<Label htmlFor='suggest-merges'>Suggest Merges</Label>
										</div>
									</RadioGroup>
								</TooltipContent>
							</Tooltip>
						);
					}

					return (
						<Button
							key={tool.id}
							onClick={() => onToolChange(tool.id)}
							variant={
								activeTool === tool.id &&
								tool.id !== 'chat' &&
								tool.id !== 'layout'
									? 'default'
									: 'secondary'
							}
							title={tool.label ?? `Tool ${index}`}
							size={'icon-md'}
						>
							{tool.icon}
						</Button>
					);
				})}
			</div>
		</motion.div>
	);
};
