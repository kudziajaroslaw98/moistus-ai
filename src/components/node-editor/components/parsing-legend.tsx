'use client';

/**
 * ParsingLegend Component
 *
 * A collapsible UI component that displays universal and node-specific syntax
 * patterns for quick input mode.
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
			'flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-zinc-800/50 transition-colors',
		content: 'px-3 py-4 flex flex-col gap-3 max-h-80 overflow-y-auto',
		title: 'text-sm font-medium text-zinc-100',
		toggle: {
			button:
				'text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1',
			shortcut:
				'px-2 py-0.5 bg-zinc-900/75 rounded-sm text-zinc-400 font-medium text-xs',
			icon: 'w-4 h-4 transition-transform duration-200',
		},
	},
	section: {
		container: 'border border-zinc-800 rounded-md bg-zinc-950/40',
		header:
			'flex items-center justify-between px-2.5 py-2 cursor-pointer hover:bg-zinc-900/60 transition-colors',
		title: 'text-xs font-semibold uppercase tracking-wide text-zinc-300',
		content: 'px-2.5 pb-2 flex flex-col gap-2',
		empty: 'text-xs text-zinc-500',
		icon: 'w-3.5 h-3.5 text-zinc-500 transition-transform duration-200',
	},
};

const contentVariants = {
	open: {
		height: 'auto',
		opacity: 1,
		transition: {
			height: { duration: 0.1, ease: 'easeOut' as const },
			opacity: { duration: 0.2, delay: 0.1 },
		},
	},
	closed: {
		height: 0,
		opacity: 0,
		transition: {
			height: { duration: 0.1, ease: 'easeIn' as const },
			opacity: { duration: 0.2 },
		},
	},
};

const chevronVariants = {
	open: { rotate: 180 },
	closed: { rotate: 0 },
};

const categoryOrder = [
	'metadata',
	'formatting',
	'structure',
	'content',
] as const;

// Helper function to group patterns by category
const groupPatternsByCategory = (
	patterns: ParsingPattern[]
): Record<PatternCategory, ParsingPattern[]> => {
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

interface SyntaxSectionProps {
	title: string;
	patterns: ParsingPattern[];
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	onPatternClick: (pattern: string, insertText?: string) => void;
	emptyMessage: string;
}

const SyntaxSection = memo(
	({
		title,
		patterns,
		isCollapsed,
		onToggleCollapse,
		onPatternClick,
		emptyMessage,
	}: SyntaxSectionProps) => {
		const groupedPatterns = useMemo(
			() => groupPatternsByCategory(patterns),
			[patterns]
		);

		if (!patterns || patterns.length === 0) {
			return null;
		}

		return (
			<div className={theme.section.container}>
				<div
					aria-expanded={!isCollapsed}
					className={theme.section.header}
					onClick={onToggleCollapse}
					role='button'
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onToggleCollapse();
						}
					}}
				>
					<span className={theme.section.title}>{title}</span>

					<motion.div
						animate={isCollapsed ? 'closed' : 'open'}
						transition={{ duration: 0.2 }}
						variants={chevronVariants}
					>
						<ChevronDown className={theme.section.icon} />
					</motion.div>
				</div>

				<AnimatePresence initial={false}>
					{!isCollapsed && (
						<motion.div
							animate='open'
							className='overflow-hidden'
							exit='closed'
							initial='closed'
							variants={contentVariants}
						>
							<div className={theme.section.content}>
								{categoryOrder
									.filter((category) => groupedPatterns[category]?.length > 0)
									.map((category) => (
										<PatternCategoryComponent
											category={category}
											key={`${title}-${category}`}
											onPatternClick={onPatternClick}
											patterns={groupedPatterns[category]}
										/>
									))}

								{categoryOrder.every(
									(category) => !groupedPatterns[category]?.length
								) && <p className={theme.section.empty}>{emptyMessage}</p>}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}
);

SyntaxSection.displayName = 'SyntaxSection';

export const ParsingLegend: React.FC<ParsingLegendProps> = memo(
	({
		universalPatterns,
		nodeSpecificPatterns,
		onPatternClick,
		isCollapsed,
		onToggleCollapse,
		isUniversalCollapsed,
		onToggleUniversalCollapse,
		isNodeSpecificCollapsed,
		onToggleNodeSpecificCollapse,
		className,
	}) => {
		const hasAnyPatterns =
			(universalPatterns?.length || 0) > 0 ||
			(nodeSpecificPatterns?.length || 0) > 0;

		if (!hasAnyPatterns) {
			return null;
		}

		return (
			<motion.div
				animate={{ height: 'auto' }}
				className={cn(theme.legend.container, className)}
				data-collapsed={isCollapsed}
				data-testid='parsing-legend'
				initial={{ height: 0 }}
			>
				<div
					aria-controls='parsing-legend-content'
					aria-expanded={!isCollapsed}
					aria-label='Toggle parsing syntax help'
					className={theme.legend.header}
					onClick={onToggleCollapse}
					role='button'
					tabIndex={0}
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
								<SyntaxSection
									emptyMessage='No universal syntax available for this node type.'
									isCollapsed={isUniversalCollapsed}
									onPatternClick={onPatternClick}
									onToggleCollapse={onToggleUniversalCollapse}
									patterns={universalPatterns}
									title='Universal'
								/>

								<SyntaxSection
									emptyMessage='This node type has no parser-specific syntax.'
									isCollapsed={isNodeSpecificCollapsed}
									onPatternClick={onPatternClick}
									onToggleCollapse={onToggleNodeSpecificCollapse}
									patterns={nodeSpecificPatterns}
									title='Node-specific'
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		);
	}
);

ParsingLegend.displayName = 'ParsingLegend';
