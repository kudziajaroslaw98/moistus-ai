'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface HistoryRevertConfirmProps {
	/** Entries rolled back by restoring to this point. */
	undoneCount: number;
	isReverting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * Inline confirmation for restoring the map. Revert restores the whole map
 * to this entry, so the copy names how many newer changes are undone.
 */
export function HistoryRevertConfirm({
	undoneCount,
	isReverting,
	onCancel,
	onConfirm,
}: HistoryRevertConfirmProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		cancelRef.current?.focus();
	}, []);

	const detail =
		undoneCount > 0
			? `${undoneCount} newer change${undoneCount === 1 ? '' : 's'} will be undone.`
			: 'The map will move to this saved state.';

	return (
		<div
			aria-label='Confirm restore'
			className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2.5'
			role='group'
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.stopPropagation();
					onCancel();
				}
			}}
		>
			<div className='min-w-0 text-[13px] leading-5'>
				<p className='font-medium text-amber-200'>Restore map to this point?</p>

				<p className='text-amber-100/60'>{detail}</p>
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				<button
					className='h-8 rounded-md border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white/85 transition-colors duration-200 ease hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
					disabled={isReverting}
					onClick={onCancel}
					ref={cancelRef}
					type='button'
				>
					Cancel
				</button>

				<button
					className='inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-400 px-3 text-[13px] font-medium text-zinc-950 transition-colors duration-200 ease hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:opacity-60'
					disabled={isReverting}
					onClick={onConfirm}
					type='button'
				>
					{isReverting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}

					{isReverting ? 'Restoring…' : 'Restore'}
				</button>
			</div>
		</div>
	);
}
