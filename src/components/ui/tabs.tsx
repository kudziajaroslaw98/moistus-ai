'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Tabs({
	className,
	...props
}: ComponentProps<typeof BaseTabs.Root>) {
	return (
		<BaseTabs.Root
			className={cn('flex flex-col gap-2', className)}
			data-slot='tabs'
			{...props}
		/>
	);
}

function TabsList({
	className,
	...props
}: ComponentProps<typeof BaseTabs.List>) {
	return (
		<BaseTabs.List
			data-slot='tabs-list'
			className={cn(
				' text-muted-foreground inline-flex h-9 w-fit items-center justify-center p-[3px]',
				className
			)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: ComponentProps<typeof BaseTabs.Tab>) {
	return (
		<BaseTabs.Tab
			data-slot='tabs-trigger'
			className={cn(
				"data-[selected]:bg-background dark:data-[selected]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[selected]:border-border-subtle dark:bg-surface/30 dark:hover:bg-surface duration-200 cursor-pointer ease-out dark:data-[selected]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[selected]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: ComponentProps<typeof BaseTabs.Panel>) {
	return (
		<BaseTabs.Panel
			className={cn('flex-1 outline-none', className)}
			data-slot='tabs-content'
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
