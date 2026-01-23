'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';
import { Archive, Copy, MoreVertical, Share2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { memo, useCallback, useMemo, useState } from 'react';

interface MindMapData {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	is_template?: boolean;
	template_category?: string;
	// Additional metadata
	_count?: {
		nodes: number;
		edges: number;
	};
}

interface MindMapCardProps {
	map: MindMapData;
	selected?: boolean;
	onSelect?: (id: string, isSelected: boolean) => void;
	onDelete?: (id: string) => void;
	onDuplicate?: (id: string) => void;
	onArchive?: (id: string) => void;
	onShare?: (id: string) => void;
	viewMode?: 'grid' | 'list' | 'compact';
}

const MindMapCardComponent = ({
	map,
	selected = false,
	onSelect,
	onDelete,
	onDuplicate,
	onArchive,
	onShare,
	viewMode = 'grid',
}: MindMapCardProps) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isActionsOpen, setIsActionsOpen] = useState(false);
	const [isFocused, setIsFocused] = useState(false);

	// Generate hash from title + id for consistent gradient
	const generateHash = (str: string) => {
		let hash = 0;

		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}

		return Math.abs(hash);
	};

	// Generate mesh gradient colors based on hash - memoized for performance
	const generateMeshGradient = useCallback((title: string, id: string) => {
		const seed = title + id;
		const hash = generateHash(seed);
		const colors = [];

		for (let i = 0; i < 4; i++) {
			const h = (hash + i * 90) % 360;
			// Reduced saturation and increased lightness for better readability
			const s = 45 + ((hash + i) % 25); // Reduced from 70 to 45
			const l = 25 + ((hash + i * 2) % 20); // Reduced from 35 to 25
			colors.push(`hsl(${h}, ${s}%, ${l}%)`);
		}

		return {
			background: `
        radial-gradient(at 40% 20%, ${colors[0]} 0px, transparent 50%),
        radial-gradient(at 80% 0%, ${colors[1]} 0px, transparent 50%),
        radial-gradient(at 0% 50%, ${colors[2]} 0px, transparent 50%),
        radial-gradient(at 80% 100%, ${colors[3]} 0px, transparent 50%)
      `,
			colors,
		};
	}, []);

	// Memoize gradient to prevent recalculation on every render
	const meshGradient = useMemo(
		() => generateMeshGradient(map.title, map.id),
		[map.title, map.id, generateMeshGradient]
	);

	const handleSelect = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onSelect?.(map.id, !selected);
		},
		[map.id, selected, onSelect]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'Enter':
					e.preventDefault();
					// Navigate to mind map
					window.location.href = `/mind-map/${map.id}`;
					break;
				case ' ': // Space key
					e.preventDefault();

					// Toggle selection
					if (onSelect) {
						onSelect(map.id, !selected);
					}

					break;
				case 'Delete':
				case 'Backspace':
					e.preventDefault();

					// Delete map
					if (
						onDelete &&
						confirm(`Delete "${map.title}"? This action cannot be undone.`)
					) {
						onDelete(map.id);
					}

					break;
				case 'd':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();

						// Duplicate map
						if (onDuplicate) {
							onDuplicate(map.id);
						}
					}

					break;
				case 'ArrowUp':
				case 'ArrowDown':
				case 'ArrowLeft':
				case 'ArrowRight':
					e.preventDefault();
					// Navigate between cards
					const currentElement = e.currentTarget as HTMLElement;
					const parent = currentElement.parentElement;
					if (!parent) return;

					const cards = Array.from(parent.children) as HTMLElement[];
					const currentIndex = cards.indexOf(currentElement);

					let nextIndex = currentIndex;

					if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
						nextIndex = Math.min(currentIndex + 1, cards.length - 1);
					} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
						nextIndex = Math.max(currentIndex - 1, 0);
					}

					if (nextIndex !== currentIndex) {
						cards[nextIndex]?.focus();
					}

					break;
			}
		},
		[map.id, map.title, selected, onSelect, onDelete, onDuplicate]
	);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return `${Math.floor(diffInHours)} hours ago`;
		} else if (diffInHours < 168) {
			// 7 days
			return `${Math.floor(diffInHours / 24)} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	};

	if (viewMode === 'list') {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				initial={{ opacity: 0, y: 10 }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				transition={{ duration: 0.2 }}
				className={cn(
					'group relative flex items-center gap-4 p-4 rounded-lg border transition-all',
					'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700',
					selected && 'border-sky-600 bg-sky-950/20',
					'hover:shadow-lg hover:shadow-zinc-900/50'
				)}
			>
				{/* Selection Checkbox */}
				{onSelect && (
					<div className='flex items-center'>
						<Checkbox
							checked={selected}
							className='touch-manipulation'
							onChange={(checked) => onSelect?.(map.id, checked)}
							size='sm'
							variant='default'
						/>
					</div>
				)}

				{/* Thumbnail */}
				<Link className='shrink-0' href={`/mind-map/${map.id}`}>
					<div
						className='w-16 h-16 rounded-md overflow-hidden'
						style={{ background: meshGradient.background }}
					>
						<div className='w-full h-full bg-black/20' />
					</div>
				</Link>

				{/* Content */}
				<Link className='grow min-w-0' href={`/mind-map/${map.id}`}>
					<div className='flex items-start justify-between'>
						<div className='min-w-0 grow'>
							<h3 className='text-white font-medium truncate'>{map.title}</h3>

							{/* Description */}
							{map.description && (
								<p
									className='text-zinc-400 text-xs leading-relaxed line-clamp-1 mt-0.5'
									title={map.description}
								>
									{map.description}
								</p>
							)}

							<div className='flex items-center gap-4 mt-1 text-xs text-zinc-400'>
								<span>{formatDate(map.updated_at)}</span>

								{map._count && <span>{map._count.nodes} nodes</span>}
							</div>
						</div>
					</div>
				</Link>

				{/* Actions */}
				<div className='flex items-center gap-2'>
					<DropdownMenu onOpenChange={setIsActionsOpen} open={isActionsOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
								onClick={(e) => e.stopPropagation()}
								size='icon'
								variant='ghost'
							>
								<MoreVertical className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							align='end'
							className='w-48 bg-zinc-900 border-zinc-800'
						>
							{onShare && (
								<DropdownMenuItem onClick={() => onShare(map.id)}>
									<Share2 className='mr-2 h-4 w-4' />
									Share
								</DropdownMenuItem>
							)}

							{onDuplicate && (
								<DropdownMenuItem onClick={() => onDuplicate(map.id)}>
									<Copy className='mr-2 h-4 w-4' />
									Duplicate
								</DropdownMenuItem>
							)}

							{onArchive && (
								<DropdownMenuItem onClick={() => onArchive(map.id)}>
									<Archive className='mr-2 h-4 w-4' />
									Archive
								</DropdownMenuItem>
							)}

							{onDelete && (
								<>
									<DropdownMenuSeparator className='bg-zinc-800' />

									<DropdownMenuItem
										className='text-red-400 focus:text-red-300'
										onClick={() => onDelete(map.id)}
									>
										<Trash2 className='mr-2 h-4 w-4' />
										Delete
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</motion.div>
		);
	}

	// Grid view (default) with enhanced mobile touch interactions and keyboard support
	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			aria-label={`Mind map: ${map.title}. Press Enter to open, Space to select, Delete to remove.`}
			exit={{ opacity: 0, scale: 0.95 }}
			initial={{ opacity: 0, scale: 0.95 }}
			onMouseLeave={() => setIsHovered(false)}
			onTouchStart={() => setIsHovered(true)}
			transition={{ duration: 0.2 }}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setIsHovered(true)}
			role='button'
			tabIndex={0}
			className={cn(
				'group/mind-card relative touch-manipulation focus:outline-none',
				'focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded-lg',
				selected &&
					'ring-2 ring-sky-600 ring-offset-2 ring-offset-zinc-900 rounded-lg',
				(isFocused || isHovered) && 'z-10'
			)}
			onBlur={() => {
				setIsFocused(false);
				setIsHovered(false);
			}}
			onFocus={() => {
				setIsFocused(true);
				setIsHovered(true);
			}}
			onTouchEnd={() => {
				setTimeout(() => setIsHovered(false), 2000);
			}}
		>
			<Link href={`/mind-map/${map.id}`}>
				<div
					className={cn(
						'relative h-56 sm:h-52 md:h-56 w-full rounded-lg overflow-hidden',
						'group-hover/mind-card:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer',
						'shadow-lg group-hover/mind-card:shadow-xl group-hover/mind-card:shadow-zinc-900/75',
						// Enhanced touch feedback
						'touch-manipulation select-none'
					)}
				>
					{/* Mesh Gradient Background */}
					<div
						className='absolute z-10 inset-0 opacity-40'
						style={{ background: meshGradient.background }}
					/>

					{/* Enhanced Background Overlay for Better Text Contrast */}
					<div className='absolute z-20 inset-0 bg-linear-to-t from-black/60 via-black/20 to-black/10' />

					{/* Subtle Noise Overlay */}
					<div
						className='absolute z-21 inset-0 opacity-30'
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E")`,
						}}
					/>

					{/* Enhanced Selection Checkbox with Better Touch Target */}

					{/* Metadata Badges */}
					<div className='absolute top-3 right-3 z-30 flex items-center gap-2'>
						{map.is_template && (
							<div className='px-2 py-1 rounded-full bg-purple-600/80 backdrop-blur-sm text-white text-xs font-medium'>
								Template
							</div>
						)}
					</div>

					{/* Enhanced Title Area with Better Hierarchy */}
					<div className='absolute z-30 rounded-lg h-full flex flex-col justify-end items-start bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/90 via-black/60 to-transparent'>
						{/* Primary Title */}
						<h3 className='font-semibold text-base text-white truncate mb-1 w-full drop-shadow-sm'>
							{map.title}
						</h3>

						{/* Description */}
						{map.description && (
							<p
								className='text-white/60 text-xs leading-relaxed line-clamp-2 mb-2 w-full'
								title={map.description}
							>
								{map.description}
							</p>
						)}

						{/* Metadata Row */}
						<div className='flex items-center justify-between w-full'>
							<div className='flex items-center gap-3'>
								<p className='text-white/80 text-xs font-medium'>
									{formatDate(map.updated_at)}
								</p>

								{map._count && (
									<div className='flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm'>
										<div className='w-1.5 h-1.5 rounded-full bg-white/60' />

										<p className='text-white/80 text-xs font-medium'>
											{map._count.nodes} nodes
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</Link>

			{/* Subtle Action Button */}
			{onSelect && (
				<AnimatePresence>
					{(isHovered || selected) && (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className='absolute top-2 left-2 z-30'
							exit={{ opacity: 0, scale: 0.8 }}
							initial={{ opacity: 0, scale: 0.8 }}
							onClick={handleSelect}
						>
							{/* Larger touch target with padding */}
							<div className='p-2 -m-2 min-size-11 min-h-11 flex items-center justify-center'>
								<Checkbox
									checked={selected}
									className='touch-manipulation'
									onChange={(checked) => onSelect?.(map.id, checked)}
									size='md'
									variant='card'
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			)}

			<div className='absolute top-2.5 right-2.5 z-40'>
				<DropdownMenu>
					<AnimatePresence>
						{(isHovered || selected) && (
							<DropdownMenuTrigger asChild>
								<Button
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									initial={{ opacity: 0, scale: 0.8 }}
									onClick={(e) => e.preventDefault()}
									size='icon'
									variant='ghost'
									className={cn(
										// Much smaller and more subtle
										'bg-black/10  hover:bg-black/30 active:bg-black/50',
										'text-white/50 hover:text-white border-0',
										'touch-manipulation rounded-full',
										isHovered ? 'opacity-80' : 'opacity-20'
									)}
								>
									<MoreVertical className='h-3 w-3' />
								</Button>
							</DropdownMenuTrigger>
						)}
					</AnimatePresence>

					<DropdownMenuContent
						align='end'
						className='w-48 bg-zinc-900 border-zinc-800'
					>
						{onShare && (
							<DropdownMenuItem onClick={() => onShare(map.id)}>
								<Share2 className='mr-2 h-4 w-4' />
								Share
							</DropdownMenuItem>
						)}

						{onDuplicate && (
							<DropdownMenuItem onClick={() => onDuplicate(map.id)}>
								<Copy className='mr-2 h-4 w-4' />
								Duplicate
							</DropdownMenuItem>
						)}

						{onArchive && (
							<DropdownMenuItem onClick={() => onArchive(map.id)}>
								<Archive className='mr-2 h-4 w-4' />
								Archive
							</DropdownMenuItem>
						)}

						{onDelete && (
							<>
								<DropdownMenuSeparator className='bg-zinc-800' />

								<DropdownMenuItem
									className='text-red-400 focus:text-red-300'
									onClick={() => onDelete(map.id)}
								>
									<Trash2 className='mr-2 h-4 w-4' />
									Delete
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</motion.div>
	);
};

export const MindMapCard = memo(MindMapCardComponent);
MindMapCard.displayName = 'MindMapCard';
