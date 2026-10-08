'use client';

import { cn } from '@/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
	{ id: 'library', label: 'Library', href: '/dashboard/plugins' },
	{ id: 'mine', label: 'My plugins', href: '/dashboard/plugins/mine' },
	{ id: 'build', label: 'Build a plugin', href: '/dashboard/plugins/build' },
] as const;

type PluginsTab = (typeof TABS)[number]['id'];

/** The deepest tab whose href starts the path (Library is the parent of the others). */
function tabForPath(pathname: string): PluginsTab {
	const match = [...TABS]
		.reverse()
		.find(
			(tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
		);
	return match?.id ?? 'library';
}

/** Library / My plugins / Build a plugin, under the dashboard Plugins title. */
export function PluginsPageTabs() {
	const current = tabForPath(usePathname());

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

/**
 * Plugins title and tabs around the current tab. The plugins layout renders it, so it
 * stays in place while the tab content changes. The guide is wider for its contents list.
 */
export function PluginsPageFrame({ children }: { children: ReactNode }) {
	const isGuide = tabForPath(usePathname()) === 'build';

	return (
		<div className='p-6 md:p-8'>
			<div
				className={cn(
					'mx-auto flex flex-col',
					isGuide ? 'max-w-5xl' : 'max-w-3xl'
				)}
			>
				<div className='flex flex-col gap-4'>
					<h1 className='text-3xl font-bold tracking-tight text-white'>
						Plugins
					</h1>

					<PluginsPageTabs />
				</div>

				{children}
			</div>
		</div>
	);
}
