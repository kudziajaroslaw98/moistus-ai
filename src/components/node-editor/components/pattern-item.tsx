'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { memo, useState } from 'react';
import type { PatternItemProps } from '../types';

const theme = {
	pattern: {
		item: 'flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors',
		syntax: 'font-mono text-xs text-teal-400 font-medium',
		description: 'text-xs text-zinc-500',
		examples: 'text-xs text-zinc-600',
		icon: 'w-3.5 h-3.5 text-zinc-600 flex-shrink-0',
		clicked: 'bg-teal-500/20 ring-1 ring-teal-500/50',
	},
};

export const PatternItem: React.FC<PatternItemProps> = memo(
	({ pattern, onClick, isInteractive = true }) => {
		const [isClicked, setIsClicked] = useState(false);

		const handleClick = () => {
			if (isInteractive) {
				onClick(pattern.pattern, pattern.insertText);

				// Show click feedback
				setIsClicked(true);
				setTimeout(() => setIsClicked(false), 200);
			}
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
				e.preventDefault();
				handleClick();
			}
		};

		// Get first example for inline display
		const firstExample = pattern.examples?.[0];

		return (
			<motion.div
				aria-label={`${pattern.pattern}: ${pattern.description}`}
				role={isInteractive ? 'button' : 'listitem'}
				tabIndex={isInteractive ? 0 : -1}
				whileTap={isInteractive ? { scale: 0.99 } : {}}
				className={cn(
					theme.pattern.item,
					isInteractive && 'cursor-pointer',
					!isInteractive && 'cursor-default hover:bg-transparent',
					isClicked && theme.pattern.clicked
				)}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				<div className='flex items-center gap-1.5 flex-shrink-0'>
					{pattern.icon && <pattern.icon className={theme.pattern.icon} />}
					<code className={theme.pattern.syntax}>{pattern.pattern}</code>
				</div>

				<span className={cn(theme.pattern.description, 'flex-shrink-0')}>
					{pattern.description}
				</span>

				{firstExample && (
					<span
						className={cn(theme.pattern.examples, 'truncate flex-1 min-w-0')}
					>
						{firstExample}
					</span>
				)}
			</motion.div>
		);
	}
);

PatternItem.displayName = 'PatternItem';
