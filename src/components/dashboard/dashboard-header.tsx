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

/**
 * Dashboard top bar: page label, optional search, notifications. From md up it's a
 * three-column grid with equal side columns, so the search stays centered at the
 * same size whatever the page title; below md the search gets its own row.
 */
export function DashboardHeader({ title, search }: DashboardHeaderProps) {
	const { isMobile, toggleSidebar } = useSidebar();

	return (
		<header className='flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#16171b] px-4 py-3 sm:px-8 md:grid md:grid-cols-[minmax(6rem,1fr)_minmax(0,440px)_minmax(6rem,1fr)]'>
			<div className='flex min-w-0 items-center gap-2 md:col-start-1'>
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

				<span className='truncate text-sm text-zinc-400'>{title}</span>
			</div>

			{search && (
				<div className='order-last w-full md:order-none md:col-start-2'>
					{search}
				</div>
			)}

			<div className='flex justify-end md:col-start-3'>
				<NotificationBell className='size-10 rounded-[10px] border-[#1d1f24] bg-[#0e0f12] text-zinc-300' />
			</div>
		</header>
	);
}
