'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
import { memo, useCallback, type KeyboardEvent } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface MindMapCardProps {
	map: DashboardMap;
	selected?: boolean;
	onSelect?: (id: string, isSelected: boolean) => void;
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
					'relative z-10 flex size-8 items-center justify-center rounded-lg border border-[#2a2c33] bg-[#16171b] text-zinc-300',
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

// Reveal-on-hover controls stay visible on touch, while focused or selected.
const revealClass =
	'[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-[popup-open]:opacity-100';

const MindMapCardComponent = ({
	map,
	selected = false,
	onSelect,
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

	// Keys while the card's link is focused: Space selects, Delete removes,
	// Ctrl/Cmd+D duplicates, arrows move between cards.
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (e.target !== e.currentTarget.querySelector('[data-card-link]')) return;

			if (e.key === ' ' && onSelect) {
				e.preventDefault();
				onSelect(map.id, !selected);
			} else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
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
		[map.id, selected, onSelect, onDelete, onDuplicate]
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

	const selectBox = onSelect && (
		<div
			className={cn(
				'relative z-10 flex size-8 items-center justify-center',
				!selected && revealClass
			)}
		>
			<Checkbox
				aria-label={`Select ${map.title}`}
				checked={selected}
				onChange={(checked) => onSelect(map.id, checked)}
				size='sm'
				variant='card'
			/>
		</div>
	);

	if (viewMode === 'list') {
		return (
			<motion.article
				{...entry}
				layout={shouldReduceMotion ? false : 'position'}
				onKeyDown={handleKeyDown}
				className={cn(
					'group/card relative flex items-center gap-4 rounded-xl border bg-[#0e0f12] p-3 pr-4',
					'transition-colors duration-200 ease',
					selected
						? 'border-sky-500/60'
						: 'border-[#1d1f24] [@media(hover:hover)]:hover:border-[#34363e]'
				)}
			>
				{selectBox}

				<div className='min-w-0 grow'>
					<h3 className='truncate text-[15px] font-semibold text-white'>
						<Link
							className='rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-sky-500'
							data-card-link=''
							href={href}
						>
							{map.title}
						</Link>
					</h3>

					<p className='mt-0.5 truncate text-[13px] text-zinc-400'>
						{map.description || meta}
					</p>
				</div>

				<span className='hidden shrink-0 text-xs text-zinc-500 sm:block'>
					{map.description ? meta : null}
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
				'group/card relative overflow-hidden rounded-2xl border bg-[#0e0f12]',
				'transition-[border-color,box-shadow] duration-200 ease',
				selected
					? 'border-sky-500/60 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]'
					: 'border-[#1d1f24] [@media(hover:hover)]:hover:border-[#34363e] [@media(hover:hover)]:hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
			)}
		>
			<div className='px-4 pb-4 pt-3'>
				<div className='-mr-2 flex h-8 items-center justify-between gap-2'>
					{isShared ? <SharedBadge /> : <span />}

					<div className='flex items-center gap-1'>
						{selectBox}

						<CardMenu
							className={revealClass}
							map={map}
							onDelete={onDelete}
							onDuplicate={onDuplicate}
						/>
					</div>
				</div>

				<h3 className='mt-3 truncate text-[15px] font-semibold text-white'>
					<Link
						className='after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-sky-500'
						data-card-link=''
						href={href}
					>
						{map.title}
					</Link>
				</h3>

				<p
					className='mt-1 truncate text-[13px] text-zinc-400'
					title={map.description ?? undefined}
				>
					{map.description || ' '}
				</p>

				<div className='mt-3.5 flex items-center justify-between gap-2 text-xs text-zinc-500'>
					<span className='truncate'>{meta}</span>

					<CollaboratorAvatars map={map} />
				</div>
			</div>
		</motion.article>
	);
};

export const MindMapCard = memo(MindMapCardComponent);
MindMapCard.displayName = 'MindMapCard';
