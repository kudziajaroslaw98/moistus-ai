// components/Toolbar.tsx
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import {
	Fullscreen,
	Hand,
	LayoutGrid,
	MousePointer2,
	Plus,
	Share2,
	Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/shallow';
import { GlassmorphismTheme } from './nodes/themes/glassmorphism-theme';
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
			<div
				className='flex h-full w-full items-center gap-2 p-2 rounded-xl shadow-2xl'
				style={{
					backgroundColor: GlassmorphismTheme.elevation[4], // App bar elevation
					border: `1px solid ${GlassmorphismTheme.borders.default}`,
					backdropFilter: 'blur(8px)',
				}}
			>
				{tools.map((tool, index) => {
					if (tool.id.startsWith('separator')) {
						return (
							<Separator
								className='!h-4 flex'
								key={tool.id + '' + index}
								orientation='vertical'
								style={{
									backgroundColor: GlassmorphismTheme.borders.default,
								}}
							/>
						);
					}

					if (tool.id === 'magic-wand') {
						return (
							<Tooltip key={tool.id}>
								<TooltipTrigger
									className='inline-flex items-center rounded-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none !h-8 !w-8 p-0 justify-center'
									title={tool.label ?? `Tool ${index}`}
									style={{
										backgroundColor:
											activeTool === tool.id
												? 'rgba(20, 184, 166, 0.87)' // Teal accent for active
												: GlassmorphismTheme.elevation[1],
										border: `2px solid ${
											activeTool === tool.id
												? 'rgba(20, 184, 166, 0.3)'
												: GlassmorphismTheme.borders.default
										}`,
										color:
											activeTool === tool.id
												? GlassmorphismTheme.text.high
												: GlassmorphismTheme.text.medium,
									}}
									onClick={() => onToolChange(tool.id)}
									onMouseEnter={(e) => {
										if (activeTool !== tool.id) {
											e.currentTarget.style.backgroundColor =
												GlassmorphismTheme.elevation[2];
										}
									}}
									onMouseLeave={(e) => {
										if (activeTool !== tool.id) {
											e.currentTarget.style.backgroundColor =
												GlassmorphismTheme.elevation[1];
										}
									}}
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
