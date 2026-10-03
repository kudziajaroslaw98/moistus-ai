'use client';

import { History } from 'lucide-react';

interface HistoryEmptyStateProps {
	title?: string;
	description?: string;
}

export function HistoryEmptyState({
	title = 'No changes yet',
	description = 'Edits to this map will show up here.',
}: HistoryEmptyStateProps) {
	return (
		<div className='flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center'>
			<span className='flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/50'>
				<History className='h-4.5 w-4.5' />
			</span>

			<p className='text-sm font-medium text-white/85'>{title}</p>

			<p className='max-w-64 text-[13px] text-white/50'>{description}</p>
		</div>
	);
}
