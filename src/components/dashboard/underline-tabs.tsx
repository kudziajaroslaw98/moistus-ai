'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const TAB_CLASS =
	'h-11 flex-none rounded-none border-0 px-3 font-normal text-zinc-400 data-[active]:border-0 data-[active]:bg-transparent data-[active]:font-medium data-[active]:text-white data-[active]:shadow-[inset_0_-2px_0_#fafafa] [@media(hover:hover)]:hover:bg-transparent';

/** Mono count after a tab label. */
function TabCount({ children }: { children: ReactNode }) {
	return <span className='font-mono text-xs text-zinc-500'>{children}</span>;
}

/**
 * Row under the page heading: tabs on the left, page controls (sort, view toggle) on
 * the right, one border under both. Controls wrap below the tabs on narrow screens.
 */
export function UnderlineTabsBar({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-center justify-between gap-3 border-b border-[#1d1f24]',
				className
			)}
		>
			{children}
		</div>
	);
}

/**
 * Tab list for a Base UI `Tabs`. It is left-aligned and may shrink below its content,
 * so on a phone the strip scrolls from its first tab (a centered, shrinking list put
 * half of the overflow before the first tab, where nothing can scroll to it).
 */
export function UnderlineTabsList({
	className,
	...props
}: ComponentProps<typeof TabsList>) {
	return (
		<TabsList
			className={cn(
				'h-11 min-w-0 max-w-full justify-start gap-1 overflow-x-auto p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				className
			)}
			{...props}
		/>
	);
}

export function UnderlineTab({
	count,
	children,
	className,
	...props
}: ComponentProps<typeof TabsTrigger> & { count?: number }) {
	return (
		<TabsTrigger className={cn(TAB_CLASS, className)} {...props}>
			{children}

			{count !== undefined && <TabCount>{count}</TabCount>}
		</TabsTrigger>
	);
}

/** The same strip made of links, for pages that are separate routes (Plugins). */
export function UnderlineTabNav({
	label,
	children,
	className,
}: {
	label: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<nav
			aria-label={label}
			className={cn(
				'flex h-11 min-w-0 max-w-full gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
				className
			)}
		>
			{children}
		</nav>
	);
}

export function UnderlineTabLink({
	href,
	active,
	count,
	children,
}: {
	href: string;
	active: boolean;
	count?: number;
	children: ReactNode;
}) {
	return (
		<Link
			aria-current={active ? 'page' : undefined}
			href={href}
			className={cn(
				'inline-flex h-11 flex-none items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500',
				active
					? 'font-medium text-white shadow-[inset_0_-2px_0_#fafafa]'
					: 'text-zinc-400 [@media(hover:hover)]:hover:text-white'
			)}
		>
			{children}

			{count !== undefined && <TabCount>{count}</TabCount>}
		</Link>
	);
}
