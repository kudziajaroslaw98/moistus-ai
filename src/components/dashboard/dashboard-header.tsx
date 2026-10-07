'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSidebar } from '@/components/ui/sidebar';
import { PanelLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface DashboardHeaderProps {
	title: string;
	/** Centered search field; omitted on pages without a map list. */
	search?: ReactNode;
}

/** Dashboard top bar: page label, optional search, notifications. */
export function DashboardHeader({ title, search }: DashboardHeaderProps) {
	const { isMobile, toggleSidebar } = useSidebar();

	return (
		<header className='flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#16171b] px-4 py-3 sm:px-8'>
			<div className='flex items-center gap-2'>
				{isMobile && (
					<button
						aria-label='Open sidebar'
						className='-ml-1 flex size-10 items-center justify-center rounded-lg text-zinc-400 transition-colors duration-200 ease hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
						onClick={toggleSidebar}
						type='button'
					>
						<PanelLeft aria-hidden='true' className='size-4' />
					</button>
				)}

				<span className='text-sm text-zinc-400'>{title}</span>
			</div>

			{search && (
				<div className='order-last w-full sm:order-none sm:w-auto sm:max-w-[440px] sm:flex-[1_1_280px]'>
					{search}
				</div>
			)}

			<NotificationBell className='size-10 rounded-[10px] border-[#1d1f24] bg-[#0e0f12] text-zinc-300' />
		</header>
	);
}
