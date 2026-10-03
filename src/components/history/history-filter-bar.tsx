'use client';

import { cn } from '@/utils/cn';
import type { HistoryFilter } from './model/history-timeline';

const FILTERS: Array<{ value: HistoryFilter; label: string }> = [
	{ value: 'all', label: 'All' },
	{ value: 'edits', label: 'Edits' },
	{ value: 'added', label: 'Added' },
	{ value: 'removed', label: 'Removed' },
	{ value: 'links', label: 'Links' },
];

interface HistoryFilterBarProps {
	value: HistoryFilter;
	counts: Record<HistoryFilter, number>;
	onChange: (filter: HistoryFilter) => void;
}

export function HistoryFilterBar({
	value,
	counts,
	onChange,
}: HistoryFilterBarProps) {
	// "Removed" is rare; only offer it when there is something to show.
	const filters = FILTERS.filter(
		(filter) =>
			filter.value !== 'removed' || counts.removed > 0 || value === 'removed'
	);

	return (
		<div
			aria-label='Filter history'
			className='flex gap-1.5 overflow-x-auto [scrollbar-width:none]'
			role='toolbar'
		>
			{filters.map((filter) => {
				const isActive = filter.value === value;
				return (
					<button
						aria-pressed={isActive}
						key={filter.value}
						onClick={() => onChange(filter.value)}
						type='button'
						className={cn(
							'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
							isActive
								? 'border-white/20 bg-white/[0.1] text-white'
								: 'border-white/[0.08] text-white/65 hover:border-white/15 hover:text-white/90'
						)}
					>
						{filter.label}

						<span
							className={cn(
								'tabular-nums text-[12px]',
								isActive ? 'text-white/60' : 'text-white/40'
							)}
						>
							{counts[filter.value]}
						</span>
					</button>
				);
			})}
		</div>
	);
}
