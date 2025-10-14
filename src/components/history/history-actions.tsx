'use client';

import useAppStore from '@/store/mind-map-store';
import { Button } from '../ui/button';

export function HistoryActions() {
	const createSnapshot = useAppStore((s) => s.createSnapshot);
	const userProfile = useAppStore((s) => s.userProfile);
	const isPro =
		!!(userProfile as any)?.subscription?.plan &&
		(userProfile as any).subscription.plan === 'pro';

	return (
		<div className='mt-2 flex items-center justify-between gap-2'>
			<div className='flex items-center gap-2'>
				{isPro && (
					<Button
						className='border-white/10 text-white/80 hover:border-white/20 hover:bg-white/5'
						size='sm'
						variant='outline'
						onClick={() => createSnapshot('Manual Checkpoint', true)}
					>
						Create Checkpoint
					</Button>
				)}
			</div>
		</div>
	);
}
