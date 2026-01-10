'use client';

import type { HistoryGroup as HistoryGroupType } from '@/helpers/history/grouping-utils';
import { formatTimeRange } from '@/helpers/history/time-utils';
import { cn } from '@/utils/cn';
import { ChevronDown, Circle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HistoryItem } from './history-item';

interface HistoryGroupProps {
	group: HistoryGroupType;
	onToggle: () => void;
}

/**
 * Renders a collapsible group of history items for the same node
 */
export function HistoryGroup({ group, onToggle }: HistoryGroupProps) {
	const timeRange = formatTimeRange(group.startTime, group.endTime);

	return (
		<div className='flex flex-col gap-1'>
			{/* Group header */}
			<motion.button
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 20 }}
				initial={{ opacity: 0, y: -20 }}
				onClick={onToggle}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
				className={cn(
					'flex items-center gap-2 rounded-lg border p-2.5',
					'transition-all duration-200',
					'hover:border-white/20 hover:bg-white/5',
					group.isExpanded
						? 'border-white/10 bg-[#1E1E1E]'
						: 'border-white/[0.04] bg-[#121212]'
				)}
			>
				{/* Chevron icon */}
				<motion.div
					animate={{ rotate: group.isExpanded ? 180 : 0 }}
					className='shrink-0 text-white/60'
					transition={{
						ease: [0.215, 0.61, 0.355, 1],
						duration: 0.2,
					}}
				>
					<ChevronDown className='h-4 w-4' />
				</motion.div>

				{/* Node icon */}
				<div className='shrink-0 text-white/60'>
					<Circle className='h-4 w-4' />
				</div>

				{/* Group info */}
				<div className='flex-grow text-left'>
					<div className='flex items-baseline gap-2'>
						<span className='text-sm font-medium text-white/87'>
							Node: &quot;{group.nodeName}&quot;
						</span>

						<span className='text-xs text-white/38'>
							{`(${group.changeCount} change${group.changeCount > 1 ? 's' : ''})`}
						</span>
					</div>

					<div className='text-xs text-white/60'>{timeRange}</div>
				</div>
			</motion.button>

			{/* Grouped items */}
			<AnimatePresence>
				{group.isExpanded && (
					<motion.div
						animate={{ opacity: 1, height: 'auto' }}
						className='ml-4 flex flex-col gap-1 overflow-hidden border-l border-white/6 pl-3'
						exit={{ opacity: 0, height: 0 }}
						initial={{ opacity: 0, height: 0 }}
						transition={{
							ease: [0.215, 0.61, 0.355, 1],
							duration: 0.3,
						}}
					>
						{group.items.map((item) => (
							<HistoryItem
								isCurrent={item.isCurrent}
								key={item.meta.id}
								meta={item.meta}
								originalIndex={item.originalIndex}
							/>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
