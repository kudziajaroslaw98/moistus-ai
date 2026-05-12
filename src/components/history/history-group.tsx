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
				className={cn(
					'flex items-center gap-2 rounded-xl border px-3.5 py-3',
					'transition-all duration-200',
					'hover:border-white/20 hover:bg-white/8',
					group.isExpanded
						? 'border-white/16 bg-[#242424]'
						: 'border-white/12 bg-[#202020]'
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
				<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/7 text-white/72'>
					<Circle className='h-4 w-4' />
				</div>

				{/* Group info */}
				<div className='flex-grow text-left'>
					<div className='flex items-baseline gap-2'>
						<span className='text-sm font-semibold text-white/92'>
							{group.nodeName}
						</span>

						<span className='text-xs text-white/52'>
							{`${group.changeCount} change${group.changeCount > 1 ? 's' : ''}`}
						</span>
					</div>

					<div className='text-[12px] text-white/62'>{timeRange}</div>
				</div>
			</motion.button>

			{/* Grouped items */}
			<AnimatePresence>
				{group.isExpanded && (
					<motion.div
						animate={{ opacity: 1, height: 'auto' }}
						className='ml-4 flex flex-col gap-2 overflow-hidden border-l border-white/8 pl-3'
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
