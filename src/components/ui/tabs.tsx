'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: ComponentProps<typeof BaseTabs.Root>) {
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
				'inline-flex h-9 w-fit items-center justify-center p-[3px] text-muted-foreground',
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
				'inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-text-secondary',
				'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-elevated/60 [@media(hover:hover)]:hover:text-text-primary',
				'data-[active]:border-border-default data-[active]:bg-elevated data-[active]:text-text-primary',
				'focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
				"disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
