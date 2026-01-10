'use client';

import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

interface TopBarActionsProps {
	onToggleHistory: () => void;
}

export function TopBarActions({ onToggleHistory }: TopBarActionsProps) {
	return (
		<Button
			aria-label='Toggle History Sidebar'
			onClick={onToggleHistory}
			size='icon'
			title='View History'
			variant='secondary'
		>
			<History className='size-4' />
		</Button>
	);
}
