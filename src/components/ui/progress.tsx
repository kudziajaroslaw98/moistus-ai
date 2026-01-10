'use client';

import { Progress as BaseProgress } from '@base-ui/react/progress';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Progress({
	className,
	value,
	...props
}: ComponentProps<typeof BaseProgress.Root>) {
	return (
		<BaseProgress.Root
			data-slot='progress'
			value={value}
			className={cn(
				'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
				className
			)}
			{...props}
		>
			<BaseProgress.Track className='h-full w-full'>
				<BaseProgress.Indicator
					className='bg-primary h-full w-full flex-1 transition-all'
					data-slot='progress-indicator'
					style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
				/>
			</BaseProgress.Track>
		</BaseProgress.Root>
	);
}

export { Progress };
