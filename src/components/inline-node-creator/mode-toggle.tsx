'use client';

import { cn } from '@/utils/cn';
import { Sparkles, List } from 'lucide-react';
import { motion } from 'motion/react';
import type { ModeToggleProps } from './types';

const theme = {
	container: 'flex items-center gap-1 p-1 bg-zinc-900 rounded-md',
	button: 'relative px-3 py-1.5 text-xs font-medium transition-colors rounded',
	inactive: 'text-zinc-500 hover:text-zinc-300',
	active: 'text-zinc-100',
	indicator: 'absolute inset-0 bg-zinc-800 rounded',
	icon: 'w-3 h-3',
};

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
	return (
		<div className="px-4 pb-3 border-t border-zinc-800">
			<div className="flex items-center justify-between">
				<span className="text-xs text-zinc-500">Input Mode</span>

				<div className={theme.container}>
					<button
						type="button"
						onClick={() => onToggle('quick')}
						className={cn(
							theme.button,
							mode === 'quick' ? theme.active : theme.inactive
						)}
					>
						{mode === 'quick' && (
							<motion.div
								layoutId="mode-indicator"
								className={theme.indicator}
								transition={{
									type: 'spring',
									bounce: 0.2,
									duration: 0.6,
								}}
							/>
						)}

						<span className="relative z-10 flex items-center gap-1.5">
							<Sparkles className={theme.icon} />
							Quick
						</span>
					</button>

					<button
						type="button"
						onClick={() => onToggle('structured')}
						className={cn(
							theme.button,
							mode === 'structured' ? theme.active : theme.inactive
						)}
					>
						{mode === 'structured' && (
							<motion.div
								layoutId="mode-indicator"
								className={theme.indicator}
								transition={{
									type: 'spring',
									bounce: 0.2,
									duration: 0.6,
								}}
							/>
						)}

						<span className="relative z-10 flex items-center gap-1.5">
							<List className={theme.icon} />
							Form
						</span>
					</button>
				</div>
			</div>

			<p className="text-xs text-zinc-600 mt-2">
				{mode === 'quick'
					? 'Type naturally with smart parsing'
					: 'Fill in structured fields'}
			</p>
		</div>
	);
};
