'use client';

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SideSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	subtitle?: ReactNode;
	icon?: LucideIcon;
	hue?: number;
	/** Pinned under the scrolling body (buttons, a reason field). */
	footer?: ReactNode;
	width?: 'md' | 'lg';
	children: ReactNode;
}

const WIDTHS = {
	md: 'sm:max-w-[640px]',
	lg: 'sm:max-w-[760px]',
} as const;

/**
 * Right-hand sheet for details of a card (versions, a submission, a report): the
 * page behind stays a card grid instead of splitting into list and detail panes.
 */
export function SideSheet({
	open,
	onOpenChange,
	title,
	subtitle,
	icon: Icon,
	hue = 214,
	footer,
	width = 'md',
	children,
}: SideSheetProps) {
	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className={cn(
					'w-full gap-0 border-l border-[#1d1f24] bg-[#0e0f12] p-0',
					WIDTHS[width]
				)}
			>
				<div className='flex items-center gap-3.5 border-b border-[#1d1f24] py-5 pl-6 pr-14'>
					{Icon && (
						<span
							className='flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#1d1f24] bg-[#0b0c0f]'
							style={{ color: `hsl(${hue} 80% 68%)` }}
						>
							<Icon aria-hidden='true' className='size-[22px]' />
						</span>
					)}

					<div className='min-w-0 flex-1'>
						<SheetTitle className='truncate text-lg font-semibold text-white'>
							{title}
						</SheetTitle>

						{subtitle && (
							<SheetDescription className='mt-0.5 truncate text-xs text-zinc-500'>
								{subtitle}
							</SheetDescription>
						)}
					</div>
				</div>

				<div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5'>
					{children}
				</div>

				{footer && (
					<div className='flex flex-col gap-2.5 border-t border-[#1d1f24] px-6 py-4'>
						{footer}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
