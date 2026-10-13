'use client';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import { useTouchFirst } from '@/hooks/use-touch-first';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { Lock, Plus } from 'lucide-react';

interface CreateMapCardProps {
	onClick: () => void;
	viewMode: DashboardViewMode;
	className?: string;
	disabled?: boolean;
	limitInfo?: { current: number; max: number };
}

/** Dashed "New map" tile at the end of the map grid. */
export function CreateMapCard({
	onClick,
	viewMode,
	className,
	disabled = false,
	limitInfo,
}: CreateMapCardProps) {
	const isTouchFirst = useTouchFirst();
	const Icon = disabled ? Lock : Plus;

	const button = (
		<button
			aria-disabled={disabled || undefined}
			onClick={disabled ? undefined : onClick}
			type='button'
			className={cn(
				'group/new flex w-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#2a2c33] text-zinc-400',
				'transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
				viewMode === 'grid'
					? 'min-h-[246px] flex-col gap-3'
					: 'h-[74px] gap-3 rounded-xl',
				disabled
					? 'cursor-not-allowed opacity-60'
					: '[@media(hover:hover)]:hover:border-[#3a3d46] [@media(hover:hover)]:hover:bg-white/[0.015] [@media(hover:hover)]:hover:text-zinc-200',
				className
			)}
		>
			<span
				className={cn(
					'flex items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12] text-white',
					'transition-transform duration-200 ease-out motion-safe:[@media(hover:hover)]:group-hover/new:scale-105',
					viewMode === 'grid' ? 'size-11' : 'size-8'
				)}
			>
				<Icon aria-hidden='true' className='size-4' />
			</span>

			<span className='text-sm font-medium text-white'>
				{disabled ? 'Map limit reached' : 'New map'}
			</span>

			{disabled && limitInfo ? (
				<span className='text-xs text-zinc-500'>
					{`${limitInfo.current}/${limitInfo.max} maps used`}
				</span>
			) : (
				!isTouchFirst && (
					<span className='font-mono text-[11px] text-zinc-500'>Ctrl N</span>
				)
			)}
		</button>
	);

	if (!disabled) return button;

	return (
		<Tooltip>
			<TooltipTrigger render={button} />

			<TooltipContent className='max-w-xs'>
				<p className='font-medium'>Upgrade to create more maps</p>

				{limitInfo && (
					<p className='mt-1 text-xs text-zinc-400'>
						You&apos;ve used all {limitInfo.max} maps in your free plan
					</p>
				)}
			</TooltipContent>
		</Tooltip>
	);
}
