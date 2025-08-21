'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarItem } from '@/components/ui/sidebar-item';
import {
	MenuInfoItem,
	MenuItem,
	MenuSeparator,
	SidebarDropdownMenu,
} from '@/components/ui/sidebar-menu';
import { SidebarSection } from '@/components/ui/sidebar-section';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Archive,
	ChevronDown,
	ChevronRight,
	Copy,
	Edit3,
	Folder,
	FolderOpen,
	FolderPlus,
	Info,
	MoreHorizontal,
	Move,
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
				{isEditing ? (
					<div
						className='flex items-center gap-2 px-3 py-2'
						style={{ paddingLeft: `${level * 16 + 12}px` }}
					>
						<div
							className='flex-shrink-0'
							style={{ color: folder.color || '#6B7280' }}
						>
							<Folder className='h-4 w-4' />
						</div>

						<Input
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							onBlur={handleEditSave}
							onKeyDown={handleKeyDown}
							className='h-7 px-2 py-0 text-sm bg-zinc-800 border-zinc-700'
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				) : (
					<SidebarItem
						icon={
							<div className='relative'>
								{/* Expand/Collapse Button */}
								{hasChildren && (
									<button
										onClick={handleToggle}
										className='absolute -left-6 top-0 p-0.5 hover:bg-zinc-700 rounded transition-colors'
									>
										{isExpanded ? (
											<ChevronDown className='h-3 w-3' />
										) : (
											<ChevronRight className='h-3 w-3' />
										)}
									</button>
								)}

								{/* Folder Icon */}
								<div style={{ color: folder.color || '#6B7280' }}>
									{isExpanded ? (
										<FolderOpen className='h-4 w-4' />
									) : (
										<Folder className='h-4 w-4' />
									)}
								</div>
							</div>
						}
						label={folder.name}
						isActive={isActive}
						onClick={handleSelect}
						level={level}
						badge={
							folder.map_count !== undefined && folder.map_count > 0 ? (
								<span className='text-xs text-zinc-500'>
									{folder.map_count}
								</span>
							) : undefined
						}
						actions={
							<div className='flex items-center gap-1'>
								{/* Quick Edit Button */}
								<Button
									size='sm'
									variant='ghost'
									className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
									onClick={(e) => {
										e.stopPropagation();
										handleEditStart(e);
									}}
								>
									<Edit3 className='h-3 w-3' />
								</Button>

								{/* New Subfolder Button */}
								<Button
									size='sm'
									variant='ghost'
									className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
									onClick={(e) => {
										e.stopPropagation();
										onCreate?.(folder.id, 'New Folder');
									}}
								>
									<FolderPlus className='h-3 w-3' />
								</Button>

								{/* More Actions Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											size='sm'
											variant='ghost'
											className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
											onClick={(e) => e.stopPropagation()}
										>
											<MoreHorizontal className='h-3 w-3' />
										</Button>
									</DropdownMenuTrigger>

									<SidebarDropdownMenu>
										<MenuItem
											icon={<Edit3 />}
											label='Rename folder'
											shortcut='F2'
											onClick={handleEditStart}
										/>

										<MenuItem
											icon={<FolderPlus />}
											label='New subfolder'
											shortcut='⌘N'
											onClick={() => onCreate?.(folder.id, 'New Folder')}
										/>

										<MenuItem
											icon={<Copy />}
											label='Duplicate folder'
											onClick={() => {
												/* TODO: Implement duplicate */
											}}
										/>

										<MenuSeparator />

										<MenuItem
											icon={<Move />}
											label='Move to...'
											onClick={() => {
												/* TODO: Implement move */
											}}
										/>

										<MenuItem
											icon={<Archive />}
											label='Archive folder'
											onClick={() => {
												/* TODO: Implement archive */
											}}
										/>

										<MenuSeparator />

										<MenuInfoItem>
											<Info className='h-4 w-4' />

											<div className='flex flex-col'>
												<span className='text-xs'>
													{folder.map_count || 0} maps
												</span>

												<span className='text-xs'>Created recently</span>
											</div>
										</MenuInfoItem>

										<MenuSeparator />

										<MenuItem
											icon={<Trash2 />}
											label='Delete folder'
											shortcut='Del'
											variant='danger'
											onClick={() => onDelete?.(folder.id)}
										/>
									</SidebarDropdownMenu>
								</DropdownMenu>
							</div>
						}
					/>
				)}

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
				<div className='p-2.5 border-b border-zinc-800'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400' />

						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder='Search folders...'
							className='pl-9 text-sm'
						/>
					</div>
				</div>

				{/* Folder Tree */}
				<div className='flex-grow overflow-y-auto'>
					{/* Navigation Section */}
					<SidebarSection showDivider={true} className='h-16 px-2 py-4'>
						<SidebarItem
							icon={<Folder className='h-4 w-4' />}
							label='All Maps'
							isActive={currentFolderId === null}
							onClick={() => onFolderSelect?.(null)}
						/>
					</SidebarSection>

					{/* Folders Section */}
					<SidebarSection
						title='Folders'
						actions={
							!isCreatingFolder ? (
								<Button
									onClick={() => setIsCreatingFolder(true)}
									variant='ghost'
									size='sm'
									className='h-6 w-6 p-0 opacity-60 hover:opacity-100'
								>
									<Plus className='h-3 w-3' />
								</Button>
							) : undefined
						}
						showDivider={false}
						className='p-2'
					>
						{/* Filtered Folders */}
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
						{isCreatingFolder && (
							<div className='flex items-center gap-2 px-3 py-2'>
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
									className='h-7 px-2 py-0 text-sm bg-zinc-800 border-zinc-700'
									autoFocus
								/>
							</div>
						)}

						{/* Empty State */}
						{filteredFolders.length === 0 && !isCreatingFolder && (
							<div className='text-center py-8 text-zinc-500'>
								<div className='mb-2'>
									<Folder className='h-8 w-8 mx-auto opacity-50' />
								</div>

								<p className='text-sm mb-2'>No folders yet</p>

								<Button
									onClick={() => setIsCreatingFolder(true)}
									variant='ghost'
									size='sm'
									className='text-zinc-400 hover:text-white'
								>
									<Plus className='h-3 w-3 mr-1' />
									Create your first folder
								</Button>
							</div>
						)}
					</SidebarSection>
				</div>
			</div>
		);
	}
);

DashboardSidebar.displayName = 'DashboardSidebar';
