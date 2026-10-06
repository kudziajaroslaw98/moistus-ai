'use client';

import { cn } from '@/utils/cn';
import Link from 'next/link';

const TABS = [
	{ id: 'library', label: 'Library', href: '/dashboard/plugins' },
	{ id: 'mine', label: 'My plugins', href: '/dashboard/plugins/mine' },
	{ id: 'build', label: 'Build a plugin', href: '/dashboard/plugins/build' },
] as const;

/** Library / My plugins / Build a plugin, under the dashboard Plugins title. */
export function PluginsPageTabs({
	current,
}: {
	current: (typeof TABS)[number]['id'];
}) {
	return (
		<nav aria-label='Plugins' className='flex gap-1 border-b border-zinc-800'>
			{TABS.map((tab) => (
				<Link
					aria-current={tab.id === current ? 'page' : undefined}
					href={tab.href}
					key={tab.id}
					className={cn(
						'-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
						tab.id === current
							? 'border-primary-500 text-white'
							: 'border-transparent text-zinc-400 hover:text-zinc-100'
					)}
				>
					{tab.label}
				</Link>
			))}
		</nav>
	);
}
