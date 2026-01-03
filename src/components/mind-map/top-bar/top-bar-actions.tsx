'use client';

import { Button } from '@/components/ui/button';
import { History, Redo, Undo } from 'lucide-react';

interface TopBarActionsProps {
	canUndo: boolean;
	canRedo: boolean;
	onToggleHistory: () => void;
}

export function TopBarActions({
	canUndo,
	canRedo,
	onToggleHistory,
}: TopBarActionsProps) {
	return (
		<div className='flex gap-2'>
			{/* TODO: Uncomment redo/undo when optimized history implemented */}
			<Button
				// onClick={handleUndo}
				disabled={!canUndo}
				size='icon'
				title='Undo (Ctrl+Z)'
				variant='secondary'
			>
				<Undo className='size-4' />
			</Button>

			{/* TODO: Uncomment redo/undo when optimized history implemented */}
			<Button
				// onClick={handleRedo}
				disabled={!canRedo}
				size='icon'
				title='Redo (Ctrl+Y)'
				variant='secondary'
			>
				<Redo className='size-4' />
			</Button>

			<Button
				aria-label='Toggle History Sidebar'
				onClick={onToggleHistory}
				size='icon'
				title='Toggle History Sidebar'
				variant='secondary'
			>
				<History className='size-4' />
			</Button>
		</div>
	);
}
