'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import type { ChatContextMode } from '@/store/slices/chat-slice';
import { cn } from '@/utils/cn';
import { Brain, FileText, Layers, MinusCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface ChatContextSelectorProps {
	contextMode: ChatContextMode;
	onContextModeChange: (mode: ChatContextMode) => void;
	nodeCount?: number;
	disabled?: boolean;
}

const CONTEXT_MODE_CONFIG = {
	minimal: {
		icon: MinusCircle,
		label: 'Minimal',
		description: 'Map title & stats only',
		tokens: '~200',
	},
	summary: {
		icon: FileText,
		label: 'Summary',
		description: 'Topics, key nodes, structure',
		tokens: '~2-4k',
	},
	full: {
		icon: Layers,
		label: 'Full',
		description: 'All nodes (priority-ranked)',
		tokens: '~8-16k',
	},
} as const;

export function ChatContextSelector({
	contextMode,
	onContextModeChange,
	nodeCount = 0,
	disabled = false,
}: ChatContextSelectorProps) {
	const shouldReduceMotion = useReducedMotion();

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: 'easeOut' as const };

	const currentConfig = CONTEXT_MODE_CONFIG[contextMode];

	// Warn if map is large and using full mode
	const showLargeMapWarning = nodeCount > 200 && contextMode === 'full';

	return (
		<motion.div
			initial={{ opacity: 0, y: -5 }}
			animate={{ opacity: 1, y: 0 }}
			transition={transition}
			className={cn(
				'flex items-center justify-between gap-3 mx-4 mt-3 px-3 py-2',
				'rounded-lg bg-zinc-800/30 border border-zinc-700/50',
				disabled && 'opacity-50 pointer-events-none'
			)}
		>
			{/* Left: Label and toggle */}
			<div className='flex items-center gap-3'>
				<div className='flex items-center gap-1.5 text-zinc-400'>
					<Brain className='h-3.5 w-3.5' />
					<span className='text-xs'>Context:</span>
				</div>

				<ToggleGroup
					type='single'
					value={contextMode}
					onValueChange={(value) => {
						if (value) onContextModeChange(value as ChatContextMode);
					}}
					size='sm'
					className='bg-zinc-900/50 rounded-md p-0.5'
				>
					{(Object.keys(CONTEXT_MODE_CONFIG) as ChatContextMode[]).map(
						(mode) => {
							const config = CONTEXT_MODE_CONFIG[mode];
							const Icon = config.icon;
							const isActive = contextMode === mode;

							return (
								<Tooltip key={mode}>
									<TooltipTrigger
										render={
											<ToggleGroupItem
												value={mode}
												aria-label={config.label}
												disabled={disabled}
												className={cn(
													'h-6 w-6 p-0 data-[state=on]:bg-primary-500/20 data-[state=on]:text-primary-400',
													'hover:bg-zinc-700/50 hover:text-zinc-200',
													'transition-colors duration-150'
												)}
											>
												<Icon
													className={cn(
														'h-3 w-3',
														isActive ? 'text-primary-400' : 'text-zinc-400'
													)}
												/>
											</ToggleGroupItem>
										}
									/>
									<TooltipContent className='text-xs'>
										<div className='font-medium'>{config.label}</div>
										<div className='text-zinc-400'>{config.description}</div>
										<div className='text-zinc-500'>{config.tokens} tokens</div>
									</TooltipContent>
								</Tooltip>
							);
						}
					)}
				</ToggleGroup>
			</div>

			{/* Right: Mode info */}
			<div className='flex items-center gap-2 text-[10px]'>
				{showLargeMapWarning ? (
					<span className='text-amber-400'>
						{nodeCount} nodes - consider Summary
					</span>
				) : (
					<>
						<span className='text-zinc-500'>{currentConfig.label}</span>
						<span className='text-zinc-600'>•</span>
						<span className='text-zinc-500'>{currentConfig.tokens}</span>
					</>
				)}
			</div>
		</motion.div>
	);
}
