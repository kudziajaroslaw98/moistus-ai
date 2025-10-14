'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { memo, useState } from 'react';
import type { PatternItemProps } from '../types';

const theme = {
	pattern: {
		item: 'flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors',
		syntax: 'font-mono text-xs sm:text-sm text-teal-500',
		description: 'text-xs sm:text-sm text-zinc-400',
		examples: 'text-xs text-zinc-500 mt-1',
		icon: 'w-4 h-4 text-zinc-500',
		clicked: 'bg-teal-500/20 ring-1 ring-teal-500/50',
	},
};

export const PatternItem: React.FC<PatternItemProps> = memo(
	({ pattern, onClick, isInteractive = true }) => {
		const [isHovered, setIsHovered] = useState(false);
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

		return (
			<motion.div
				aria-label={`${pattern.pattern}: ${pattern.description}`}
				role={isInteractive ? 'button' : 'listitem'}
				tabIndex={isInteractive ? 0 : -1}
				whileHover={isInteractive ? { scale: 1.01 } : {}}
				whileTap={isInteractive ? { scale: 0.99 } : {}}
				className={cn(
					theme.pattern.item,
					isInteractive && 'cursor-pointer',
					!isInteractive && 'cursor-default hover:bg-transparent',
					isClicked && theme.pattern.clicked
				)}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div className='flex items-center gap-2 flex-shrink-0'>
					{pattern.icon && <pattern.icon className={theme.pattern.icon} />}

					<code className={theme.pattern.syntax}>{pattern.pattern}</code>
				</div>

				<div className='flex-1 min-w-0'>
					<p className={theme.pattern.description}>{pattern.description}</p>

					{pattern.examples && pattern.examples.length > 0 && (
						<p className={theme.pattern.examples}>
							{isHovered
								? pattern.examples.join(', ')
								: pattern.examples.slice(0, 2).join(', ')}

							{!isHovered && pattern.examples.length > 2 && ', ...'}
						</p>
					)}
				</div>

				{isInteractive && isHovered && (
					<motion.span
						animate={{ opacity: 1 }}
						className='text-xs text-zinc-500 hidden sm:block'
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
					>
						Click to insert
					</motion.span>
				)}
			</motion.div>
		);
	}
);

PatternItem.displayName = 'PatternItem';