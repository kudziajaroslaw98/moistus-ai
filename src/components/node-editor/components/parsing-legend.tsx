'use client';

/**
 * ParsingLegend Component
 *
 * A collapsible UI component that displays available syntax patterns for the inline node creator's quick input mode.
 * Provides users with clear documentation of parsing syntax specific to each node type.
 *
 * Features:
 * - Collapsible/expandable with smooth animations
 * - Grouped patterns by category (metadata, formatting, structure, content)
 * - Click-to-insert functionality
 * - Keyboard navigation support (Ctrl/Cmd + / to toggle)
 * - Fully accessible with ARIA labels and screen reader support
 * - Responsive design with mobile optimizations
 * - Persists collapsed state in localStorage
 *
 * @example
 * ```tsx
 * <ParsingLegend
 *   patterns={nodeCommand.parsingPatterns}
 *   onPatternClick={handlePatternInsert}
 *   isCollapsed={legendCollapsed}
 *   onToggleCollapse={() => setLegendCollapsed(!legendCollapsed)}
 * />
 * ```
 */

import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useMemo } from 'react';
import type {
	ParsingLegendProps,
	ParsingPattern,
	PatternCategory,
} from '../types';
import { PatternCategory as PatternCategoryComponent } from './pattern-category';

const theme = {
	legend: {
		container: 'bg-zinc-900/50 border border-zinc-800 rounded-md',
		header:
			'flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors',
		content:
			'p-3 pt-0 space-y-3 max-h-48 overflow-y-auto sm:max-h-none sm:overflow-visible',
		title: 'text-sm font-medium text-zinc-100',
		toggle: {
			button:
				'text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1',
			shortcut: 'px-2 py-1 bg-zinc-900/75 rounded-sm text-zinc-400 font-medium',
			icon: 'w-4 h-4 transition-transform duration-200',
		},
	},
};

const contentVariants = {
	open: {
		height: 'auto',
		opacity: 1,
		transition: {
			height: { duration: 0.3, ease: 'easeOut' as const },
			opacity: { duration: 0.2, delay: 0.1 },
		},
	},
	closed: {
		height: 0,
		opacity: 0,
		transition: {
			height: { duration: 0.3, ease: 'easeIn' as const },
			opacity: { duration: 0.2 },
		},
	},
};

const chevronVariants = {
	open: { rotate: 180 },
	closed: { rotate: 0 },
};

// Helper function to group patterns by category
const groupPatternsByCategory = (
	patterns: ParsingPattern[]
): Record<PatternCategory, ParsingPattern[]> => {
	// Safety check: handle undefined or null patterns
	if (!patterns || !Array.isArray(patterns)) {
		return {} as Record<PatternCategory, ParsingPattern[]>;
	}

	return patterns.reduce(
		(acc, pattern) => {
			if (!acc[pattern.category]) {
				acc[pattern.category] = [];
			}

			acc[pattern.category].push(pattern);
			return acc;
		},
		{} as Record<PatternCategory, ParsingPattern[]>
	);
};

export const ParsingLegend: React.FC<ParsingLegendProps> = memo(
	({ patterns, onPatternClick, isCollapsed, onToggleCollapse, className }) => {
		const groupedPatterns = useMemo(
			() => groupPatternsByCategory(patterns),
			[patterns]
		);

		// Don't render if no patterns
		if (!patterns || patterns.length === 0) {
			return null;
		}

		return (
			<motion.div
				animate={{ height: 'auto' }}
				className={cn(theme.legend.container, className)}
				initial={false}
			>
				{/* Header */}
				<div
					aria-controls='parsing-legend-content'
					aria-expanded={!isCollapsed}
					aria-label='Toggle parsing syntax help'
					className={theme.legend.header}
					role='button'
					tabIndex={0}
					onClick={onToggleCollapse}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onToggleCollapse();
						}
					}}
				>
					<span className={theme.legend.title}>Syntax Help</span>

					<div className={theme.legend.toggle.button}>
						<kbd
							aria-label='Keyboard shortcut'
							className={theme.legend.toggle.shortcut}
						>
							Ctrl + /
						</kbd>

						<motion.div
							animate={isCollapsed ? 'closed' : 'open'}
							transition={{ duration: 0.2 }}
							variants={chevronVariants}
						>
							<ChevronDown className={theme.legend.toggle.icon} />
						</motion.div>
					</div>
				</div>

				{/* Content */}
				<AnimatePresence initial={false}>
					{!isCollapsed && (
						<motion.div
							animate='open'
							className='overflow-hidden'
							exit='closed'
							id='parsing-legend-content'
							initial='closed'
							variants={contentVariants}
						>
							<div
								aria-label='Parsing syntax patterns'
								className={theme.legend.content}
								role='region'
							>
								{/* Display patterns by category */}
								{(['metadata', 'formatting', 'structure', 'content'] as const)
									.filter((category) => groupedPatterns[category]?.length > 0)
									.map((category) => (
										<PatternCategoryComponent
											category={category}
											key={category}
											patterns={groupedPatterns[category]}
											onPatternClick={onPatternClick}
										/>
									))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		);
	}
);

ParsingLegend.displayName = 'ParsingLegend';