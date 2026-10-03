'use client';

import type { HistoryReadableChange } from '@/helpers/history/presentation';
import { cn } from '@/utils/cn';
import { ArrowRight } from 'lucide-react';

interface ReadableChangeRowProps {
	change: HistoryReadableChange;
}

const valueChipClass =
	'inline-block max-w-full truncate rounded px-1.5 py-0.5 font-mono text-[12px] leading-4';

/**
 * One property per line: `Width   not set → 400`. Long text values fall back
 * to a stacked before/after so they stay readable.
 */
export function ReadableChangeRow({ change }: ReadableChangeRowProps) {
	const hasValues =
		change.oldValue !== undefined &&
		change.newValue !== undefined &&
		change.kind !== 'route';

	if (change.kind === 'add' || change.kind === 'remove') {
		return (
			<div className='flex items-center gap-2 px-3 py-2 text-[13px] text-white/80'>
				<span
					aria-hidden
					className={cn(
						'h-1.5 w-1.5 shrink-0 rounded-full',
						change.kind === 'add' ? 'bg-emerald-400' : 'bg-rose-400'
					)}
				/>

				{change.summary}
			</div>
		);
	}

	if (!hasValues) {
		return (
			<div className='flex items-center justify-between gap-3 px-3 py-2 text-[13px]'>
				<span className='text-white/60'>{change.label}</span>

				<span className='text-white/50'>updated</span>
			</div>
		);
	}

	const isRemoval = change.verb === 'cleared' || change.verb === 'removed';

	if (change.isLongText) {
		return (
			<div className='flex flex-col gap-1 px-3 py-2 text-[13px]'>
				<span className='text-white/60'>{change.label}</span>

				<p className='line-clamp-2 break-words text-white/40 line-through decoration-white/25'>
					{change.oldValue}
				</p>

				<p
					className={cn(
						'line-clamp-3 break-words',
						isRemoval ? 'text-rose-200/80' : 'text-white/85'
					)}
				>
					{change.newValue}
				</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-[minmax(4.5rem,auto)_1fr] items-center gap-3 px-3 py-2 text-[13px]'>
			<span className='truncate text-white/60'>{change.label}</span>

			<span className='flex min-w-0 items-center gap-1.5'>
				<span className={cn(valueChipClass, 'bg-white/[0.06] text-white/55')}>
					{change.oldValue}
				</span>

				<ArrowRight
					aria-label='changed to'
					className='h-3.5 w-3.5 shrink-0 text-white/35'
				/>

				<span
					className={cn(
						valueChipClass,
						isRemoval
							? 'bg-rose-500/12 text-rose-200'
							: 'bg-primary-500/15 text-primary-200'
					)}
				>
					{change.newValue}
				</span>
			</span>
		</div>
	);
}
