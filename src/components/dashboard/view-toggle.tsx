'use client';

import type { DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { LayoutGrid, List } from 'lucide-react';

const MODES = [
	['grid', 'Grid view', LayoutGrid],
	['list', 'List view', List],
] as const;

/** Grid / list switch shared by every dashboard page with cards. */
export function ViewToggle({
	value,
	onChange,
	className,
}: {
	value: DashboardViewMode;
	onChange: (mode: DashboardViewMode) => void;
	className?: string;
}) {
	return (
		<div
			aria-label='View mode'
			className={cn(
				'flex rounded-[9px] border border-[#1d1f24] bg-[#0e0f12] p-0.5',
				className
			)}
			role='group'
		>
			{MODES.map(([mode, label, Icon]) => (
				<button
					aria-label={label}
					aria-pressed={value === mode}
					key={mode}
					onClick={() => onChange(mode)}
					type='button'
					className={cn(
						'flex h-[30px] w-8 items-center justify-center rounded-[7px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
						value === mode
							? 'bg-[#1c1d22] text-white'
							: 'text-zinc-500 hover:text-white'
					)}
				>
					<Icon aria-hidden='true' className='size-3.5' />
				</button>
			))}
		</div>
	);
}
