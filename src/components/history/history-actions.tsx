'use client';

import useAppStore from '@/store/mind-map-store';
import { Button } from '../ui/button';

interface HistoryActionsProps {
	isPro: boolean;
}

export function HistoryActions({ isPro }: HistoryActionsProps) {
	const createSnapshot = useAppStore((s) => s.createSnapshot);

	return (
		<div className=''>
			<div className='flex items-center gap-2'>
				{isPro && (
					<Button
						className='border-white/10 text-white/80 hover:border-white/20 hover:bg-white/5'
						onClick={() => createSnapshot('Manual Checkpoint', true)}
						size='sm'
						variant='outline'
					>
						Create Checkpoint
					</Button>
				)}
			</div>
		</div>
	);
}
