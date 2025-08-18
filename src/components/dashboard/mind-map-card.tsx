'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';
import {
	Archive,
	Copy,
	Folder,
	MoreVertical,
	Share2,
	Trash2,
	Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { memo, useCallback, useState } from 'react';

interface MindMapData {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	folder_id?: string | null;
	team_id?: string | null;
	is_template?: boolean;
	template_category?: string;
	// Additional metadata
	folder?: {
		id: string;
		name: string;
		color: string;
	};
	team?: {
		id: string;
		name: string;
		slug: string;
	};
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
	onMove?: (id: string, folderId: string | null) => void;
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
	onMove,
	onArchive,
	onShare,
	viewMode = 'grid',
}: MindMapCardProps) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isActionsOpen, setIsActionsOpen] = useState(false);

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

	// Generate mesh gradient colors based on hash
	const generateMeshGradient = useCallback((title: string, id: string) => {
		const seed = title + id;
		const hash = generateHash(seed);
		const colors = [];

		for (let i = 0; i < 4; i++) {
			const h = (hash + i * 90) % 360;
			const s = 70 + ((hash + i) % 30);
			const l = 35 + ((hash + i * 2) % 25);
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

	const meshGradient = generateMeshGradient(map.title, map.id);

	const handleSelect = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onSelect?.(map.id, !selected);
		},
		[map.id, selected, onSelect]
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
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.2 }}
				className={cn(
					'group relative flex items-center gap-4 p-4 rounded-lg border transition-all',
					'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700',
					selected && 'border-sky-600 bg-sky-950/20',
					'hover:shadow-lg hover:shadow-zinc-900/50'
				)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				{/* Selection Checkbox */}
				{onSelect && (
					<div className='flex items-center'>
						<input
							type='checkbox'
							checked={selected}
							onChange={handleSelect}
							className={cn(
								'h-4 w-4 rounded border-zinc-600 bg-zinc-800',
								'text-sky-600 focus:ring-sky-600 focus:ring-offset-0',
								'transition-all cursor-pointer'
							)}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				)}

				{/* Thumbnail */}
				<Link href={`/mind-map/${map.id}`} className='flex-shrink-0'>
					<div
						className='w-16 h-16 rounded-md overflow-hidden'
						style={{ background: meshGradient.background }}
					>
						<div className='w-full h-full bg-black/20' />
					</div>
				</Link>

				{/* Content */}
				<Link href={`/mind-map/${map.id}`} className='flex-grow min-w-0'>
					<div className='flex items-start justify-between'>
						<div className='min-w-0 flex-grow'>
							<h3 className='text-white font-medium truncate'>{map.title}</h3>

							<div className='flex items-center gap-4 mt-1 text-xs text-zinc-400'>
								{map.folder && (
									<span className='flex items-center gap-1'>
										<Folder
											className='h-3 w-3'
											style={{ color: map.folder.color }}
										/>

										{map.folder.name}
									</span>
								)}

								{map.team && (
									<span className='flex items-center gap-1'>
										<Users className='h-3 w-3' />

										{map.team.name}
									</span>
								)}

								<span>{formatDate(map.updated_at)}</span>

								{map._count && <span>{map._count.nodes} nodes</span>}
							</div>
						</div>
					</div>
				</Link>

				{/* Actions */}
				<div className='flex items-center gap-2'>
					<DropdownMenu open={isActionsOpen} onOpenChange={setIsActionsOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
								onClick={(e) => e.stopPropagation()}
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

							{onMove && (
								<DropdownMenuItem onClick={() => onMove(map.id, null)}>
									<Folder className='mr-2 h-4 w-4' />
									Move to folder
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
										onClick={() => onDelete(map.id)}
										className='text-red-400 focus:text-red-300'
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

	// Grid view (default)
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.2 }}
			className={cn(
				'group relative',
				selected &&
					'ring-2 ring-sky-600 ring-offset-2 ring-offset-zinc-900 rounded-lg'
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link href={`/mind-map/${map.id}`}>
				<div
					className={cn(
						'relative h-48 w-full rounded-lg overflow-hidden',
						'hover:scale-[1.02] transition-all duration-300 cursor-pointer',
						'shadow-lg hover:shadow-xl hover:shadow-zinc-900/75'
					)}
				>
					{/* Mesh Gradient Background */}
					<div
						className='absolute z-10 inset-0 opacity-80'
						style={{ background: meshGradient.background }}
					/>

					{/* Noise Overlay */}
					<div
						className='absolute z-20 inset-0 opacity-80 backdrop-blur-md'
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E")`,
						}}
					/>

					{/* Selection Checkbox */}
					{onSelect && (
						<AnimatePresence>
							{(isHovered || selected) && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									className='absolute top-3 left-3 z-30'
									onClick={handleSelect}
								>
									<input
										type='checkbox'
										checked={selected}
										onChange={() => {}}
										className={cn(
											'h-5 w-5 rounded border-2 border-white/30 bg-black/30',
											'text-sky-600 focus:ring-sky-600 focus:ring-offset-0',
											'transition-all cursor-pointer backdrop-blur-sm',
											'checked:bg-sky-600 checked:border-sky-600'
										)}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					)}

					{/* Metadata Badges */}
					<div className='absolute top-3 right-3 z-30 flex items-center gap-2'>
						{map.folder && (
							<motion.div
								initial={{ opacity: 0, x: 10 }}
								animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
								className='px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm'
							>
								<Folder
									className='h-3 w-3'
									style={{ color: map.folder.color }}
								/>
							</motion.div>
						)}

						{map.team && (
							<motion.div
								initial={{ opacity: 0, x: 10 }}
								animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
								className='px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm'
							>
								<Users className='h-3 w-3 text-white' />
							</motion.div>
						)}

						{map.is_template && (
							<div className='px-2 py-1 rounded-full bg-purple-600/80 backdrop-blur-sm text-white text-xs font-medium'>
								Template
							</div>
						)}
					</div>

					{/* Title Area */}
					<div className='absolute z-30 rounded-lg h-full flex flex-col justify-end items-start bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent'>
						<h3 className='text-white font-semibold text-sm truncate mb-1 w-full'>
							{map.title}
						</h3>

						<div className='flex items-center justify-between w-full'>
							<p className='text-white/70 text-xs'>
								{formatDate(map.updated_at)}
							</p>

							{map._count && (
								<p className='text-white/70 text-xs'>
									{map._count.nodes} nodes
								</p>
							)}
						</div>
					</div>
				</div>
			</Link>

			{/* Action Buttons */}
			<AnimatePresence>
				{isHovered && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className='absolute top-3 right-3 z-40 flex gap-1'
					>
						{onShare && (
							<Button
								onClick={(e) => {
									e.preventDefault();
									onShare(map.id);
								}}
								variant='ghost'
								size='icon'
								className='h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white/80 hover:text-white border border-white/20'
							>
								<Share2 className='h-4 w-4' />
							</Button>
						)}

						{onDelete && (
							<Button
								onClick={(e) => {
									e.preventDefault();
									onDelete(map.id);
								}}
								variant='ghost'
								size='icon'
								className='h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-red-500/80 text-white/80 hover:text-white border border-white/20 hover:border-red-400/50'
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

export const MindMapCard = memo(MindMapCardComponent);
MindMapCard.displayName = 'MindMapCard';
