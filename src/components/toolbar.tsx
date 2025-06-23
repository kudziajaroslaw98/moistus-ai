// components/Toolbar.tsx
import useAppStore from '@/store/mind-map-store';
import type { Tool } from '@/types/tool';
import { motion } from 'framer-motion';
import {
	Hand,
	LayoutGrid,
	MousePointer2,
	Plus,
	Share2,
	Type,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

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
	{ id: 'separator-1', icon: null, label: null },
	{ id: 'layout', icon: <LayoutGrid size={20} />, label: 'Auto-Layout' },
];

export const Toolbar = () => {
	const { activeTool, setActiveTool, applyLayout } = useAppStore(
		useShallow((state) => ({
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			applyLayout: state.applyLayout,
		}))
	);

	const onToolChange = (toolId: Tool | `separator-${number}`) => {
		if (toolId.startsWith('separator')) {
			return;
		}

		if (toolId === 'layout') {
			applyLayout('LR');
			setActiveTool('default');
		} else {
			setActiveTool(toolId as Tool);
		}
	};

	return (
		<motion.div
			initial={{ y: 100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ type: 'spring', stiffness: 100, damping: 15 }}
		>
			<div className='flex h-full w-full items-center gap-2 p-2 bg-gray-950 border border-gray-900 rounded-md shadow-2xl'>
				{tools.map((tool, index) =>
					tool.id.startsWith('separator') ? (
						<Separator
							key={tool.id + '' + index}
							orientation='vertical'
							className='!bg-zinc-700 !h-4  flex'
						/>
					) : (
						<Button
							key={tool.id}
							onClick={() => onToolChange(tool.id)}
							variant={activeTool === tool.id ? 'default' : 'secondary'}
							title={tool.label ?? `Tool ${index}`}
							size={'icon-md'}
						>
							{tool.icon}
						</Button>
					)
				)}
			</div>
		</motion.div>
	);
};
