'use client';

import type { HistoryReadableChange } from '@/helpers/history/presentation';
import { cn } from '@/utils/cn';

interface ReadableChangeRowProps {
	change: HistoryReadableChange;
	subjectLabel: string;
	showSubjectPrefix: boolean;
	isCompact: boolean;
}

export function ReadableChangeRow({
	change,
	subjectLabel,
	showSubjectPrefix,
	isCompact,
}: ReadableChangeRowProps) {
	const showBeforeAfter =
		change.oldValue !== undefined &&
		change.newValue !== undefined &&
		change.kind !== 'route';
	const title = showSubjectPrefix
		? `${subjectLabel}: ${change.summary}`
		: change.summary;

	const isRemoval = change.verb === 'removed';
	const beforeClass = cn(
		'rounded-xs border px-2.5 py-1.5 text-[12px]',
		isRemoval
			? 'border-red-500/20 bg-red-500/[0.08] text-red-200/90'
			: 'border-white/10 bg-zinc-700/25 text-zinc-400/85'
	);
	const afterClass = cn(
		'rounded-xs border px-2.5 py-1.5 text-[12px]',
		isRemoval
			? 'border-red-500/25 bg-red-500/[0.08] text-red-200/90'
			: 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200/90'
	);

	return (
		<div className={cn('', isCompact && 'py-1.5')}>
			<div className='text-[12px] font-medium leading-5 text-white/84'>
				{title}
			</div>

			{showBeforeAfter && (
				<div className='mt-1 flex flex-col gap-1'>
					<div className={afterClass}>
						<span className='text-[10px] uppercase tracking-wide text-emerald-300/70'>
							After
						</span>
						<div className='break-words line-clamp-3'>{change.newValue}</div>
					</div>
					<div className={beforeClass}>
						<span className='text-[10px] uppercase tracking-wide text-zinc-100/70'>
							Before
						</span>
						<div className='break-words line-clamp-3'>{change.oldValue}</div>
					</div>
				</div>
			)}
		</div>
	);
}
