'use client';
import { cn } from '@/lib/utils';
import React from 'react';

interface ContextMenuSectionProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
	showDivider?: boolean;
}

export function ContextMenuSection({
	title,
	children,
	className,
	showDivider = true,
}: ContextMenuSectionProps) {
	return (
		<div className={cn('relative', className)}>
			{showDivider && <hr className='my-1 border-zinc-800' />}

			{title && (
				<div className='px-2 py-1 text-xs font-medium text-zinc-400'>
					{title}
				</div>
			)}

			<div className='flex flex-col gap-0.5'>{children}</div>
		</div>
	);
}
