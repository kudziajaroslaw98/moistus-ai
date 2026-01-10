'use client';

import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({
	className,
	children,
	...props
}: ComponentProps<typeof BaseScrollArea.Root>) {
	return (
		<BaseScrollArea.Root
			className={cn('relative', className)}
			data-slot='scroll-area'
			{...props}
		>
			<BaseScrollArea.Viewport
				className='focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1'
				data-slot='scroll-area-viewport'
			>
				<BaseScrollArea.Content>{children}</BaseScrollArea.Content>
			</BaseScrollArea.Viewport>

			<ScrollBar />

			<BaseScrollArea.Corner />
		</BaseScrollArea.Root>
	);
}

function ScrollBar({
	className,
	orientation = 'vertical',
	...props
}: ComponentProps<typeof BaseScrollArea.Scrollbar>) {
	return (
		<BaseScrollArea.Scrollbar
			data-slot='scroll-area-scrollbar'
			orientation={orientation}
			className={cn(
				'flex touch-none p-px transition-colors select-none',
				orientation === 'vertical' &&
					'h-full w-2.5 border-l border-l-transparent',
				orientation === 'horizontal' &&
					'h-2.5 flex-col border-t border-t-transparent',
				className
			)}
			{...props}
		>
			<BaseScrollArea.Thumb
				className='bg-border relative flex-1 rounded-full'
				data-slot='scroll-area-thumb'
			/>
		</BaseScrollArea.Scrollbar>
	);
}

export { ScrollArea, ScrollBar };
