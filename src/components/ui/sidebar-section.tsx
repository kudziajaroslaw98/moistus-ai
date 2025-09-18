'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SidebarSectionProps {
	title?: string;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
	showDivider?: boolean;
}

export const SidebarSection = ({
	title,
	children,
	actions,
	className,
	showDivider = true,
}: SidebarSectionProps) => {
	return (
		<>
			<div className={cn('space-y-1', className)}>
				{/* Section Header */}
				{title && (
					<div className='flex items-center justify-between px-3 py-2'>
						<h3 className='text-xs font-semibold text-zinc-300 uppercase tracking-wide'>
							{title}
						</h3>

						{actions && (
							<div className='flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity'>
								{actions}
							</div>
						)}
					</div>
				)}

				{/* Section Content */}
				<div className='flex flex-col gap-1'>{children}</div>

				{/* Optional Divider */}
			</div>

			{showDivider && <div className='border-t border-zinc-800' />}
		</>
	);
};
