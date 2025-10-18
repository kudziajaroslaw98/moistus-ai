'use client';

import useAppStore from '@/store/mind-map-store';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '../ui/button';
import type { HistoryListHandle } from './history-list';

interface HistoryActionsProps {
	historyListRef: RefObject<HistoryListHandle | null>;
	isPro: boolean;
}

export function HistoryActions({ historyListRef, isPro }: HistoryActionsProps) {
	const createSnapshot = useAppStore((s) => s.createSnapshot);

	const handleExpandAll = () => {
		historyListRef.current?.expandAllGroups();
	};

	const handleCollapseAll = () => {
		historyListRef.current?.collapseAllGroups();
	};

	return (
		<div className='pt-2 py-8 flex items-center justify-between gap-2 flex-wrap'>
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

			<div className='flex items-center gap-1.5'>
				<Button
					className='border-white/10 text-white/60 hover:border-white/20 hover:bg-white/5 hover:text-white/87'
					size='sm'
					title='Expand all groups'
					variant='ghost'
					onClick={handleExpandAll}
				>
					<ChevronsDown className='h-3.5 w-3.5' />
				</Button>

				<Button
					className='border-white/10 text-white/60 hover:border-white/20 hover:bg-white/5 hover:text-white/87'
					size='sm'
					title='Collapse all groups'
					variant='ghost'
					onClick={handleCollapseAll}
				>
					<ChevronsUp className='h-3.5 w-3.5' />
				</Button>
			</div>
		</div>
	);
}
