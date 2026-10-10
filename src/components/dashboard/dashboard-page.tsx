import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

/** Content width every dashboard page shares (the shell supplies sidebar and top bar). */
export function DashboardPage({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8',
				className
			)}
		>
			{children}
		</div>
	);
}

/** Page title with an intro line and, on the right, the page's main button. */
export function PageHeading({
	title,
	intro,
	action,
}: {
	title: string;
	intro?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-4'>
			<div className='min-w-0'>
				<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em] text-white'>
					{title}
				</h1>

				{intro && <p className='mt-2 text-sm text-zinc-400'>{intro}</p>}
			</div>

			{action}
		</div>
	);
}

/** The light-on-dark primary button of the dashboard (New recipe, Submit a version). */
export const PRIMARY_BUTTON_CLASS =
	'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[9px] bg-[#fafafa] px-4 text-sm font-medium text-[#0b0b0d] transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d] disabled:cursor-not-allowed disabled:opacity-50';

/** The quiet bordered button used as a card's single action. */
export const CARD_BUTTON_CLASS =
	'relative z-10 h-8 shrink-0 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-3 text-[13px] text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50';
