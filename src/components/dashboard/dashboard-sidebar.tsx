'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import {
	ChevronDown,
	ChevronRight,
	Folder,
	FolderOpen,
	FolderPlus,
	MoreVertical,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';

interface FolderData {
	id: string;
	name: string;
	color: string;
	icon?: string;
	parent_id: string | null;
	position: number;
	map_count?: number;
	children?: FolderData[];
}

interface DashboardSidebarProps {
	folders: FolderData[];
	currentFolderId?: string | null;
	onFolderSelect?: (folderId: string | null) => void;
	onFolderCreate?: (parentId: string | null, name: string) => void;
	onFolderUpdate?: (folderId: string, updates: Partial<FolderData>) => void;
	onFolderDelete?: (folderId: string) => void;
	className?: string;
}

const FolderTreeItem = memo(
	({
		folder,
		level = 0,
		currentFolderId,
		onSelect,
		onCreate,
		onUpdate,
		onDelete,
	}: {
		folder: FolderData;
		level?: number;
		currentFolderId?: string | null;
		onSelect?: (folderId: string) => void;
		onCreate?: (parentId: string | null, name: string) => void;
		onUpdate?: (folderId: string, updates: Partial<FolderData>) => void;
		onDelete?: (folderId: string) => void;
	}) => {
		const [isExpanded, setIsExpanded] = useState(false);
		const [isEditing, setIsEditing] = useState(false);
		const [editValue, setEditValue] = useState(folder.name);
		const hasChildren = folder.children && folder.children.length > 0;
		const isActive = currentFolderId === folder.id;

		const handleToggle = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				setIsExpanded(!isExpanded);
			},
			[isExpanded]
		);

		const handleSelect = useCallback(() => {
			onSelect?.(folder.id);
		}, [folder.id, onSelect]);

		const handleEditStart = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				setIsEditing(true);
				setEditValue(folder.name);
			},
			[folder.name]
		);

		const handleEditSave = useCallback(() => {
			if (editValue.trim() && editValue !== folder.name) {
				onUpdate?.(folder.id, { name: editValue.trim() });
			}

			setIsEditing(false);
		}, [editValue, folder.id, folder.name, onUpdate]);

		const handleEditCancel = useCallback(() => {
			setEditValue(folder.name);
			setIsEditing(false);
		}, [folder.name]);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === 'Enter') {
					handleEditSave();
				} else if (e.key === 'Escape') {
					handleEditCancel();
				}
			},
			[handleEditSave, handleEditCancel]
		);

		return (
			<div>
				<motion.div
					className={cn(
						'group relative flex items-center gap-1 rounded-lg px-2 py-1.5',
						'hover:bg-zinc-800/50 transition-all cursor-pointer',
						isActive && 'bg-zinc-800 text-white',
						!isActive && 'text-zinc-400 hover:text-white'
					)}
					style={{ paddingLeft: `${level * 16 + 8}px` }}
					onClick={handleSelect}
					whileTap={{ scale: 0.98 }}
				>
					{/* Expand/Collapse Button */}
					{hasChildren && (
						<button
							onClick={handleToggle}
							className='p-0.5 hover:bg-zinc-700 rounded transition-colors'
						>
							{isExpanded ? (
								<ChevronDown className='h-3 w-3' />
							) : (
								<ChevronRight className='h-3 w-3' />
							)}
						</button>
					)}

					{/* Folder Icon */}
					<div
						className='flex-shrink-0'
						style={{ color: folder.color || '#6B7280' }}
					>
						{isExpanded ? (
							<FolderOpen className='h-4 w-4' />
						) : (
							<Folder className='h-4 w-4' />
						)}
					</div>

					{/* Folder Name */}
					{isEditing ? (
						<Input
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={handleEditSave}
							onKeyDown={handleKeyDown}
							className='h-6 px-1 py-0 text-sm bg-zinc-800 border-zinc-700'
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					) : (
						<span className='flex-grow text-sm truncate'>{folder.name}</span>
					)}

					{/* Map Count */}
					{folder.map_count !== undefined &&
						folder.map_count > 0 &&
						!isEditing && (
							<span className='text-xs text-zinc-500'>{folder.map_count}</span>
						)}

					{/* Action Menu */}
					<AnimatePresence>
						{!isEditing && (
							<motion.div className='absolute right-2 group-hover:opacity-100 opacity-0'>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant='ghost'
											size='icon'
											className='h-6 w-6'
											onClick={(e) => e.stopPropagation()}
										>
											<MoreVertical className='h-3 w-3' />
										</Button>
									</DropdownMenuTrigger>

									<DropdownMenuContent
										align='end'
										className='w-40 bg-zinc-900 border-zinc-800'
									>
										<DropdownMenuItem onClick={handleEditStart}>
											Rename
										</DropdownMenuItem>

										<DropdownMenuItem
											onClick={() => onCreate?.(folder.id, 'New Folder')}
										>
											<FolderPlus className='mr-2 h-3 w-3' />
											New subfolder
										</DropdownMenuItem>

										<DropdownMenuSeparator className='bg-zinc-800' />

										<DropdownMenuItem
											onClick={() => onDelete?.(folder.id)}
											className='text-red-400 focus:text-red-300'
										>
											<Trash2 className='mr-2 h-3 w-3' />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				{/* Children */}
				<AnimatePresence>
					{isExpanded && hasChildren && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.2 }}
							className='overflow-hidden'
						>
							{folder.children!.map((child) => (
								<FolderTreeItem
									key={child.id}
									folder={child}
									level={level + 1}
									currentFolderId={currentFolderId}
									onSelect={onSelect}
									onCreate={onCreate}
									onUpdate={onUpdate}
									onDelete={onDelete}
								/>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}
);

FolderTreeItem.displayName = 'FolderTreeItem';

export const DashboardSidebar = memo(
	({
		folders,
		currentFolderId,
		onFolderSelect,
		onFolderCreate,
		onFolderUpdate,
		onFolderDelete,
		className,
	}: DashboardSidebarProps) => {
		const [searchQuery, setSearchQuery] = useState('');
		const [isCreatingFolder, setIsCreatingFolder] = useState(false);
		const [newFolderName, setNewFolderName] = useState('');

		const handleCreateFolder = useCallback(() => {
			if (newFolderName.trim()) {
				onFolderCreate?.(null, newFolderName.trim());
				setNewFolderName('');
				setIsCreatingFolder(false);
			}
		}, [newFolderName, onFolderCreate]);

		const handleCancelCreate = useCallback(() => {
			setNewFolderName('');
			setIsCreatingFolder(false);
		}, []);

		const filteredFolders = folders.filter((folder) =>
			folder.name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		console.log(`filtered folders`, filteredFolders);

		return (
			<div className={cn('flex flex-col h-full', className)}>
				{/* Search */}
				<div className='p-3 border-b border-zinc-800'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400' />

						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder='Search folders...'
							className='pl-9 h-9 bg-zinc-800/50 border-zinc-700 text-sm'
						/>
					</div>
				</div>

				{/* Folder Tree */}
				<div className='flex-grow overflow-y-auto p-3'>
					<div className='space-y-1'>
						{/* All Maps */}
						<motion.div
							className={cn(
								'flex items-center gap-2 rounded-lg px-2 py-1.5',
								'hover:bg-zinc-800/50 transition-all cursor-pointer',
								currentFolderId === null && 'bg-zinc-800 text-white',
								currentFolderId !== null && 'text-zinc-400 hover:text-white'
							)}
							onClick={() => onFolderSelect?.(null)}
							whileTap={{ scale: 0.98 }}
						>
							<Folder className='h-4 w-4' />

							<span className='text-sm font-medium'>All Maps</span>
						</motion.div>

						{/* Divider */}
						<div className='my-2 border-t border-zinc-800' />

						{/* Folders */}
						{filteredFolders.map((folder) => (
							<FolderTreeItem
								key={folder.id}
								folder={folder}
								currentFolderId={currentFolderId}
								onSelect={onFolderSelect}
								onCreate={onFolderCreate}
								onUpdate={onFolderUpdate}
								onDelete={onFolderDelete}
							/>
						))}

						{/* New Folder Input */}
						{isCreatingFolder ? (
							<div className='flex items-center gap-2 px-2 py-1.5'>
								<Folder className='h-4 w-4 text-zinc-400' />

								<Input
									value={newFolderName}
									onChange={(e) => setNewFolderName(e.target.value)}
									onBlur={handleCreateFolder}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleCreateFolder();
										if (e.key === 'Escape') handleCancelCreate();
									}}
									placeholder='Folder name...'
									className='h-6 px-1 py-0 text-sm bg-zinc-800 border-zinc-700'
									autoFocus
								/>
							</div>
						) : (
							<Button
								onClick={() => setIsCreatingFolder(true)}
								variant='ghost'
								size='sm'
								className='w-full justify-start gap-2 text-zinc-400 hover:text-white'
							>
								<Plus className='h-4 w-4' />
								New Folder
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	}
);

DashboardSidebar.displayName = 'DashboardSidebar';
