'use client';

import { TemplateCover } from '@/components/dashboard/template-cover';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { MoreHorizontal, Search, type LucideIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';

// Off-screen cards skip layout and paint; sizes keep the scrollbar stable.
const CARD_VISIBILITY = {
	grid: '[content-visibility:auto] [contain-intrinsic-size:auto_260px]',
	list: '[content-visibility:auto] [contain-intrinsic-size:auto_72px]',
} as const;

// Stretches the title over the whole card so the card is one target.
const TITLE_CLASS =
	'truncate text-left text-[15px] font-semibold text-white after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-sky-500';

/** Grey hue for things that are switched off. */
export const OFF_HUE = 240;

export type CatalogChipTone = 'neutral' | 'green' | 'amber' | 'red';

const CHIP_TONES: Record<CatalogChipTone, string> = {
	neutral: 'border-[#2a2c33] text-zinc-300',
	green: 'border-emerald-500/30 text-emerald-300',
	amber: 'border-amber-400/30 text-amber-300',
	red: 'border-red-500/35 text-red-300',
};

export interface CatalogChip {
	label: string;
	tone?: CatalogChipTone;
}

export function CatalogChipPill({ label, tone = 'neutral' }: CatalogChip) {
	return (
		<span
			className={cn(
				'shrink-0 whitespace-nowrap rounded-full border bg-[#0e0f12] px-2 py-0.5 text-[11px] leading-4',
				CHIP_TONES[tone]
			)}
		>
			{label}
		</span>
	);
}

/** Class for the "…" button of a card menu (put it on a DropdownMenuTrigger). */
export const CARD_MENU_TRIGGER_CLASS =
	'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#2a2c33] bg-[#0e0f12] text-zinc-300 transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1c1d22] [@media(hover:hover)]:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

/** The "…" icon for a card menu trigger. */
export function CardMenuIcon() {
	return <MoreHorizontal aria-hidden='true' className='size-4' />;
}

interface CatalogCardProps {
	/** Cover icon, the one picked when the thing was created. */
	icon: LucideIcon;
	hue: number;
	title: string;
	description: string;
	chips?: CatalogChip[];
	/**
	 * Fixed-height row under the description. Pass it (even as `null`) on every card of
	 * a page that uses one, so the footers line up.
	 */
	detail?: ReactNode;
	/** Left of the footer; keep per-card state ("On in 2 maps") here, not in the button. */
	meta: ReactNode;
	/** The card's one button. Same label on every card of a page. */
	action: ReactNode;
	/** A DropdownMenu with a `CARD_MENU_TRIGGER_CLASS` trigger; shown top right. */
	menu?: ReactNode;
	/** Makes the title a button covering the card. */
	onOpen?: () => void;
	viewMode: DashboardViewMode;
}

/**
 * Card shared by Templates, Recipes, Plugins and Plugin review: icon cover with chips
 * and a menu, title, two description lines, an optional detail row and a footer pinned
 * to the bottom (meta left, one button right), so cards in a row always line up.
 */
export const CatalogCard = memo(function CatalogCard({
	icon,
	hue,
	title,
	description,
	chips = [],
	detail,
	meta,
	action,
	menu,
	onOpen,
	viewMode,
}: CatalogCardProps) {
	const isOff = hue === OFF_HUE;
	const titleNode = onOpen ? (
		<button
			className={cn(
				TITLE_CLASS,
				viewMode === 'list' && 'after:rounded-xl',
				isOff && 'text-zinc-300'
			)}
			onClick={onOpen}
			type='button'
		>
			{title}
		</button>
	) : (
		<span className='truncate text-[15px] font-semibold text-white'>
			{title}
		</span>
	);

	if (viewMode === 'list') {
		return (
			<article
				className={cn(
					'relative flex items-center gap-4 rounded-xl border border-[#1d1f24] bg-[#0e0f12] p-3 pr-4',
					'transition-[border-color] duration-200 ease [@media(hover:hover)]:hover:border-[#34363e]',
					CARD_VISIBILITY.list
				)}
			>
				<TemplateCover
					compact
					className='h-12 w-16 shrink-0 rounded-lg border border-[#1d1f24]'
					hue={hue}
					icon={icon}
				/>

				<div className='min-w-0 flex-1 basis-0'>
					<div className='flex items-center gap-2'>
						<h3 className='min-w-0 truncate'>{titleNode}</h3>

						<span className='hidden shrink-0 gap-1.5 sm:flex'>
							{chips.map((chip) => (
								<CatalogChipPill key={chip.label} {...chip} />
							))}
						</span>
					</div>

					<p className='mt-0.5 truncate text-[13px] text-zinc-400'>
						{description}
					</p>
				</div>

				<span className='hidden max-w-[220px] shrink-0 truncate text-xs text-zinc-500 md:block'>
					{meta}
				</span>

				{menu}

				{action}
			</article>
		);
	}

	return (
		<article
			className={cn(
				'relative flex flex-col overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12]',
				'transition-[border-color,box-shadow] duration-200 ease',
				'[@media(hover:hover)]:hover:border-[#34363e] [@media(hover:hover)]:hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]',
				CARD_VISIBILITY.grid
			)}
		>
			<div className='relative shrink-0'>
				<TemplateCover
					className='h-[112px] border-b border-[#1d1f24]'
					hue={hue}
					icon={icon}
				/>

				{chips.length > 0 && (
					<div className='absolute left-2.5 right-12 top-2.5 flex gap-1.5 overflow-hidden'>
						{chips.map((chip) => (
							<CatalogChipPill key={chip.label} {...chip} />
						))}
					</div>
				)}

				{menu && <div className='absolute right-2.5 top-2.5'>{menu}</div>}
			</div>

			<div className='flex flex-1 flex-col px-4 pb-4 pt-3.5'>
				<h3 className='flex'>{titleNode}</h3>

				<p className='mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-zinc-400'>
					{description}
				</p>

				{detail !== undefined && (
					<div className='mt-2.5 flex h-5 items-center gap-2 overflow-hidden text-xs text-zinc-500'>
						{detail}
					</div>
				)}

				<div className='mt-auto flex items-center justify-between gap-2 pt-3.5'>
					<span className='min-w-0 truncate text-xs text-zinc-500'>{meta}</span>

					{action}
				</div>
			</div>
		</article>
	);
});

/** Placeholder cards with the real grid's sizes, so nothing shifts when data arrives. */
export function CatalogCardSkeleton({
	viewMode,
	count = 8,
}: {
	viewMode: DashboardViewMode;
	count?: number;
}) {
	return (
		<>
			{Array.from({ length: count }).map((_, index) =>
				viewMode === 'grid' ? (
					<div
						className='overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12]'
						key={index}
					>
						<div className='h-[112px] border-b border-[#1d1f24] bg-zinc-900/60' />

						<div className='space-y-2.5 px-4 pb-4 pt-3.5'>
							<Skeleton className='h-4 w-2/3 bg-zinc-700/40' />

							<Skeleton className='h-3 w-4/5 bg-zinc-800/60' />

							<Skeleton className='mt-4 h-3 w-1/3 bg-zinc-800/60' />
						</div>
					</div>
				) : (
					<div
						className='flex items-center gap-4 rounded-xl border border-[#1d1f24] bg-[#0e0f12] p-3 pr-4'
						key={index}
					>
						<Skeleton className='h-12 w-16 shrink-0 rounded-lg bg-zinc-900/60' />

						<div className='grow space-y-2'>
							<Skeleton className='h-4 w-1/3 bg-zinc-700/40' />

							<Skeleton className='h-3 w-1/2 bg-zinc-800/60' />
						</div>
					</div>
				)
			)}
		</>
	);
}

/** Grid or list container for catalog cards. */
export function CatalogGrid({
	viewMode,
	children,
	className,
}: {
	viewMode: DashboardViewMode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				viewMode === 'grid'
					? 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'
					: 'flex flex-col gap-2',
				className
			)}
		>
			{children}
		</div>
	);
}

/** Nothing matched: a short message and a way back to the full list. */
export function CatalogEmptyState({
	title,
	hint,
	actionLabel,
	onAction,
}: {
	title: string;
	hint: string;
	actionLabel: string;
	onAction: () => void;
}) {
	return (
		<div className='flex flex-col items-center py-20 text-center'>
			<span className='flex size-11 items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12]'>
				<Search aria-hidden='true' className='size-4 text-zinc-400' />
			</span>

			<h2 className='mt-4 text-base font-semibold text-white'>{title}</h2>

			<p className='mt-1 text-sm text-zinc-400'>{hint}</p>

			<button
				className='mt-5 h-9 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-4 text-sm text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
				onClick={onAction}
				type='button'
			>
				{actionLabel}
			</button>
		</div>
	);
}
