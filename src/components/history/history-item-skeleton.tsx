'use client';

export function HistoryItemSkeleton() {
	return (
		<div className='flex animate-pulse items-start gap-3 px-2.5 py-2'>
			<span className='h-7 w-7 shrink-0 rounded-full bg-white/[0.06]' />

			<span className='flex flex-1 flex-col gap-1.5 pt-0.5'>
				<span className='h-3.5 w-2/5 rounded bg-white/[0.07]' />

				<span className='h-3 w-3/5 rounded bg-white/[0.05]' />
			</span>

			<span className='mt-0.5 h-3 w-10 rounded bg-white/[0.05]' />
		</div>
	);
}
