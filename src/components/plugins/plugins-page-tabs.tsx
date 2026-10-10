'use client';

import {
	DashboardPage,
	PageHeading,
} from '@/components/dashboard/dashboard-page';
import {
	UnderlineTabLink,
	UnderlineTabNav,
	UnderlineTabsBar,
} from '@/components/dashboard/underline-tabs';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const TABS = [
	{
		id: 'library',
		label: 'Library',
		href: '/dashboard/plugins',
		intro:
			'New kinds of nodes for your maps. Turn a plugin on for a map and everyone who can edit it can add those nodes.',
	},
	{
		id: 'mine',
		label: 'My plugins',
		href: '/dashboard/plugins/mine',
		intro:
			'Plugins you submitted to the library. Shiko reviews every version before map owners can turn it on.',
	},
	{
		id: 'build',
		label: 'Build a plugin',
		href: '/dashboard/plugins/build',
		intro:
			'A plugin adds a new kind of node. List its fields in manifest.json, draw it in plugin.js, try it on your own maps, then submit it to the library.',
	},
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
		<UnderlineTabNav label='Plugins'>
			{TABS.map((tab) => (
				<UnderlineTabLink
					active={tab.id === current}
					href={tab.href}
					key={tab.id}
				>
					{tab.label}
				</UnderlineTabLink>
			))}
		</UnderlineTabNav>
	);
}

interface PluginsSlots {
	/** Right of the title (the page's main button). */
	heading: HTMLElement | null;
	/** Right of the tabs (view toggle). */
	controls: HTMLElement | null;
}

const PluginsSlotsContext = createContext<PluginsSlots>({
	heading: null,
	controls: null,
});

/**
 * Puts a tab's own buttons into the frame's title row or tab row, which the layout
 * renders once and keeps while the tab content changes.
 */
export function PluginsSlot({
	slot,
	children,
}: {
	slot: keyof PluginsSlots;
	children: ReactNode;
}) {
	const element = useContext(PluginsSlotsContext)[slot];
	return element ? createPortal(children, element) : null;
}

/**
 * Plugins title and tabs around the current tab, in the dashboard page width. The
 * plugins layout renders it, so it stays in place while the tab content changes.
 */
export function PluginsPageFrame({ children }: { children: ReactNode }) {
	const current = tabForPath(usePathname());
	const intro = TABS.find((tab) => tab.id === current)?.intro;
	const [heading, setHeading] = useState<HTMLElement | null>(null);
	const [controls, setControls] = useState<HTMLElement | null>(null);

	return (
		<PluginsSlotsContext.Provider value={{ heading, controls }}>
			<DashboardPage>
				<PageHeading
					action={<div className='contents' ref={setHeading} />}
					intro={intro}
					title='Plugins'
				/>

				<UnderlineTabsBar className='mt-9'>
					<PluginsPageTabs />

					<div className='mb-1.5 flex items-center gap-2' ref={setControls} />
				</UnderlineTabsBar>

				{children}
			</DashboardPage>
		</PluginsSlotsContext.Provider>
	);
}
