'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatUpdatedAt } from '@/helpers/dashboard/format-updated-at';
import type { DashboardMap, DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { Copy, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import {
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
} from 'react';
import { MapCover } from './map-cover';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface MindMapCardProps {
	map: DashboardMap;
	onDelete?: (id: string) => void;
	onDuplicate?: (id: string) => void;
	viewMode?: DashboardViewMode;
	/** Position in the list, for the entry stagger. */
	index?: number;
}

function initialsOf(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}

function CollaboratorAvatars({ map }: { map: DashboardMap }) {
	const collaborators = map.collaborators ?? [];
	const total = map.collaboratorCount ?? collaborators.length;
	const visible = collaborators.slice(0, total > 3 ? 2 : 3);
	const hiddenCount = total - visible.length;

	if (visible.length === 0) return null;

	const names = collaborators.map((person) => person.displayName).join(', ');

	return (
		<span
			aria-label={`Shared with ${names}${hiddenCount > 0 ? ` and ${hiddenCount} more` : ''}`}
			className='flex shrink-0'
			role='img'
		>
			{visible.map((person, index) => (
				<Avatar
					key={person.userId}
					className={cn(
						'size-5 border-2 border-[#0e0f12] text-[9px]',
						index > 0 && '-ml-1.5'
					)}
				>
					<AvatarImage alt='' src={person.avatarUrl} />

					<AvatarFallback className='bg-zinc-700 text-[9px] font-semibold text-white'>
						{initialsOf(person.displayName)}
					</AvatarFallback>
				</Avatar>
			))}

			{hiddenCount > 0 && (
				<span className='-ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0e0f12] bg-[#2a2c33] px-1 text-[9px] font-semibold leading-none text-zinc-300'>
					+{hiddenCount}
				</span>
			)}
		</span>
	);
}

const DESCRIPTION_TOGGLE_CLASS =
	'z-10 rounded-sm text-xs leading-5 text-sky-400 transition-colors duration-200 ease hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

/**
 * Clamped description, or a muted "No description available", so every card has
 * the same text block. When the text is cut off, "Show more" sits over the end of
 * the last visible line (fading the text under it) instead of adding a row, so the
 * card keeps its height until someone expands it. The buttons sit above the
 * card's full-card link.
 */
function CardDescription({
	text,
	clampClassName,
	className,
}: {
	text: string | null;
	clampClassName: string;
	className?: string;
}) {
	const ref = useRef<HTMLParagraphElement>(null);
	const [expanded, setExpanded] = useState(false);
	const [isClamped, setIsClamped] = useState(false);
	const description = text?.trim() ?? '';

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const measure = () => {
			if (!expanded) setIsClamped(el.scrollHeight > el.clientHeight + 1);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [description, expanded]);

	if (!description) {
		return (
			<div className={className}>
				<p className='truncate text-[13px] leading-5 text-zinc-600'>
					No description available
				</p>
			</div>
		);
	}

	return (
		<div className={cn('relative', className)}>
			<p
				className={cn('text-[13px] leading-5 text-zinc-400', !expanded && clampClassName)}
				ref={ref}
			>
				{description}
			</p>

			{isClamped && !expanded && (
				<button
					aria-expanded={false}
					onClick={() => setExpanded(true)}
					type='button'
					className={cn(
						DESCRIPTION_TOGGLE_CLASS,
						'absolute bottom-0 right-0 bg-linear-to-r from-transparent to-[#0e0f12] to-35% pl-8'
					)}
				>
					Show more
				</button>
			)}

			{expanded && (
				<button
					aria-expanded
					className={cn(DESCRIPTION_TOGGLE_CLASS, 'relative mt-0.5')}
					onClick={() => setExpanded(false)}
					type='button'
				>
					Show less
				</button>
			)}
		</div>
	);
}

function SharedBadge() {
	return (
		<span className='flex items-center gap-1.5 rounded-full border border-[#2a2c33] bg-[#0e0f12] px-2 py-0.5 text-[11px] text-zinc-300'>
			<Users aria-hidden='true' className='size-3' />
			Shared
		</span>
	);
}

function CardMenu({
	map,
	onDelete,
	onDuplicate,
	className,
}: Pick<MindMapCardProps, 'map' | 'onDelete' | 'onDuplicate'> & {
	className?: string;
}) {
	if (!onDelete && !onDuplicate) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={`More options for ${map.title}`}
				className={cn(
					'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2a2c33] bg-[#16171b] text-zinc-300',
					'transition-[opacity,color,background-color] duration-200 ease hover:bg-[#1c1d22] hover:text-white',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
					className
				)}
			>
				<MoreHorizontal aria-hidden='true' className='size-4' />
			</DropdownMenuTrigger>

			<DropdownMenuContent align='end' className='w-44'>
				{onDuplicate && (
					<DropdownMenuItem onClick={() => onDuplicate(map.id)}>
						<Copy className='mr-2 size-4' />
						Duplicate
					</DropdownMenuItem>
				)}

				{onDelete && (
					<>
						{onDuplicate && <DropdownMenuSeparator />}

						<DropdownMenuItem
							onClick={() => onDelete(map.id)}
							variant='destructive'
						>
							<Trash2 className='mr-2 size-4' />
							Delete
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// Reveal-on-hover controls stay visible on touch and while focused.
//
// The whole card opens the map: the title link's ::after covers the card at z-[1],
// above the cover, description and avatars; only real controls (the card menu, Show
// more / less) sit above it at z-10.
const revealClass =
	'[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-[popup-open]:opacity-100';

const MindMapCardComponent = ({
	map,
	onDelete,
	onDuplicate,
	viewMode = 'grid',
	index = 0,
}: MindMapCardProps) => {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const isShared = map.is_shared || (map.collaboratorCount ?? 0) > 0;
	const nodeCount = map._count?.nodes ?? 0;
	const meta = `${formatUpdatedAt(map.updated_at)} · ${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`;
	const href = `/mind-map/${map.id}`;

	// Keys while the card's link is focused: Delete removes, Ctrl/Cmd+D duplicates,
	// arrows move between cards.
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (e.target !== e.currentTarget.querySelector('[data-card-link]')) return;

			if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
				e.preventDefault();
				e.stopPropagation();
				onDelete(map.id);
			} else if (e.key === 'd' && (e.ctrlKey || e.metaKey) && onDuplicate) {
				e.preventDefault();
				onDuplicate(map.id);
			} else if (e.key.startsWith('Arrow')) {
				const links = Array.from(
					document.querySelectorAll<HTMLElement>('[data-card-link]')
				);
				const current = links.indexOf(e.target as HTMLElement);
				const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
				const next = links[current + step];
				if (next) {
					e.preventDefault();
					next.focus();
				}
			}
		},
		[map.id, onDelete, onDuplicate]
	);

	const entry = {
		initial: shouldReduceMotion ? false : { opacity: 0, y: 8 },
		animate: { opacity: 1, y: 0 },
		exit: shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 },
		transition: {
			duration: 0.25,
			ease: EASE_OUT_QUART,
			delay: Math.min(index, 8) * 0.03,
		},
	} as const;

	if (viewMode === 'list') {
		return (
			<motion.article
				{...entry}
				layout={shouldReduceMotion ? false : 'position'}
				onKeyDown={handleKeyDown}
				className={cn(
					'group/card relative flex items-center gap-4 rounded-xl border bg-[#0e0f12] p-3 pr-4',
					'transition-colors duration-200 ease',
					'border-[#1d1f24] [@media(hover:hover)]:hover:border-[#34363e]'
				)}
			>
				<MapCover
					compact
					className='h-12 w-16 shrink-0 rounded-lg border border-[#1d1f24]'
					seed={map.id}
					title={map.title}
				/>

				<div className='min-w-0 flex-1 basis-0'>
					<h3 className='truncate text-[15px] font-semibold text-white'>
						<Link
							className='rounded-sm after:absolute after:inset-0 after:z-[1] after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-sky-500'
							data-card-link=''
							href={href}
						>
							{map.title}
						</Link>
					</h3>

					<CardDescription
						className='mt-0.5'
						clampClassName='line-clamp-1'
						text={map.description}
					/>
				</div>

				<span className='hidden shrink-0 text-xs text-zinc-500 sm:block'>
					{meta}
				</span>

				{isShared && (
					<span className='hidden shrink-0 md:block'>
						<SharedBadge />
					</span>
				)}

				<CollaboratorAvatars map={map} />

				<CardMenu
					className={revealClass}
					map={map}
					onDelete={onDelete}
					onDuplicate={onDuplicate}
				/>
			</motion.article>
		);
	}

	return (
		<motion.article
			{...entry}
			layout={shouldReduceMotion ? false : 'position'}
			onKeyDown={handleKeyDown}
			className={cn(
				'group/card relative flex flex-col overflow-hidden rounded-2xl border bg-[#0e0f12]',
				'transition-[border-color,box-shadow] duration-200 ease',
				'border-[#1d1f24] [@media(hover:hover)]:hover:border-[#34363e] [@media(hover:hover)]:hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
			)}
		>
			<MapCover
				className='h-[112px] border-b border-[#1d1f24]'
				seed={map.id}
				title={map.title}
			/>

			<div className='absolute inset-x-0 top-0 h-[112px]'>
				{isShared && (
					<span className='absolute left-2.5 top-2.5'>
						<SharedBadge />
					</span>
				)}

				<div className='absolute right-2 top-2 flex items-center gap-1'>
					<CardMenu
						className={revealClass}
						map={map}
						onDelete={onDelete}
						onDuplicate={onDuplicate}
					/>
				</div>
			</div>

			{/* Fixed rows (title, two description lines, a 20px footer) keep every card the
			    same height; the footer sits at the bottom if a neighbour in the row is
			    taller (an expanded description). GridMapSkeleton mirrors these sizes. */}
			<div className='flex flex-1 flex-col px-4 pb-4 pt-3.5'>
				<h3 className='truncate text-[15px] font-semibold leading-[22px] text-white'>
					<Link
						className='after:absolute after:inset-0 after:z-[1] after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-sky-500'
						data-card-link=''
						href={href}
					>
						{map.title}
					</Link>
				</h3>

				<CardDescription
					className='mt-1 min-h-10'
					clampClassName='line-clamp-2'
					text={map.description}
				/>

				<div className='mt-auto pt-3.5'>
					<div className='flex h-5 items-center justify-between gap-2 text-xs text-zinc-500'>
						<span className='truncate'>{meta}</span>

						<CollaboratorAvatars map={map} />
					</div>
				</div>
			</div>
		</motion.article>
	);
};

export const MindMapCard = memo(MindMapCardComponent);
MindMapCard.displayName = 'MindMapCard';
