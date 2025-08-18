'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { MindMapCard } from '@/components/dashboard/mind-map-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Filter,
	Grid3x3,
	List,
	Plus,
	Search,
	SortAsc,
	Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';

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

// SWR fetcher function
const fetcher = async (url: string) => {
	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response.ok) {
		throw new Error('Failed to fetch data');
	}

	const { data } = await response.json();
	return data;
};

export default function DashboardPage() {
	const router = useRouter();

	// State
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>(
		'updated'
	);
	const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'shared'>('all');
	const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [isCreatingMap, setIsCreatingMap] = useState(false);
	const [newMapTitle, setNewMapTitle] = useState('');
	const [showSidebar, setShowSidebar] = useState(true);

	// Fetch mind maps
	const {
		data: mapsData = { maps: [] },
		error: mapsError,
		isLoading: mapsLoading,
	} = useSWR<{ maps: MindMapData[] }>('/api/maps', fetcher, {
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
		dedupingInterval: 5000,
	});

	// Fetch folders
	const {
		data: foldersData = { folders: [] },
		error: foldersError,
		isLoading: foldersLoading,
	} = useSWR<{ folders: FolderData[] }>('/api/folders', fetcher, {
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
		dedupingInterval: 5000,
		loadingTimeout: 20000,
	});

	// Filter and sort maps
	const filteredMaps = mapsData.maps
		.filter((map) => {
			// Folder filter
			if (currentFolderId && map.folder_id !== currentFolderId) {
				return false;
			}

			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					map.title.toLowerCase().includes(query) ||
					map.description?.toLowerCase().includes(query)
				);
			}

			// Ownership filter
			if (filterBy === 'shared' && !map.team_id) {
				return false;
			} else if (filterBy === 'owned' && map.team_id) {
				return false;
			}

			return true;
		})
		.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.title.localeCompare(b.title);
				case 'created':
					return (
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
				case 'updated':
				default:
					return (
						new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
					);
			}
		});

	// Handlers
	const handleCreateMap = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!newMapTitle.trim() || isCreatingMap) return;

		setIsCreatingMap(true);

		try {
			const response = await fetch('/api/maps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newMapTitle,
					folder_id: currentFolderId,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create new mind map.');
			}

			const data = await response.json();

			// Optimistically update the cache
			mutate(
				'/api/maps',
				{
					maps: [data.map, ...mapsData.maps],
				},
				false
			);

			setNewMapTitle('');
			toast.success('Map created successfully!');
			router.push(`/mind-map/${data.map.id}`);
		} catch (err: unknown) {
			console.error('Error creating map:', err);
			toast.error('Failed to create map');
		} finally {
			setIsCreatingMap(false);
		}
	};

	const handleDeleteMap = async (mapId: string) => {
		if (!confirm('Delete this mind map? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch(`/api/maps/${mapId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete mind map.');
			}

			// Optimistically update the cache
			mutate(
				'/api/maps',
				{ maps: mapsData.maps.filter((map) => map.id !== mapId) },
				false
			);

			toast.success('Map deleted successfully');
		} catch (err: unknown) {
			console.error('Error deleting map:', err);
			toast.error('Failed to delete map');
			mutate('/api/maps');
		}
	};

	const handleDuplicateMap = async (mapId: string) => {
		try {
			const response = await fetch(`/api/maps/${mapId}/duplicate`, {
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error('Failed to duplicate mind map.');
			}

			const data = await response.json();

			// Refresh the maps list
			mutate('/api/maps');

			toast.success('Map duplicated successfully');
		} catch (err: unknown) {
			console.error('Error duplicating map:', err);
			toast.error('Failed to duplicate map');
		}
	};

	const handleBulkDelete = async () => {
		if (selectedMaps.size === 0) return;

		if (
			!confirm(
				`Delete ${selectedMaps.size} selected maps? This action cannot be undone.`
			)
		) {
			return;
		}

		try {
			const response = await fetch('/api/maps/bulk', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mapIds: Array.from(selectedMaps) }),
			});

			if (!response.ok) {
				throw new Error('Failed to delete maps.');
			}

			// Optimistically update the cache
			mutate(
				'/api/maps',
				{ maps: mapsData.maps.filter((map) => !selectedMaps.has(map.id)) },
				false
			);

			setSelectedMaps(new Set());
			toast.success(`${selectedMaps.size} maps deleted successfully`);
		} catch (err: unknown) {
			console.error('Error deleting maps:', err);
			toast.error('Failed to delete maps');
			mutate('/api/maps');
		}
	};

	const handleSelectMap = useCallback((mapId: string, isSelected: boolean) => {
		setSelectedMaps((prev) => {
			const newSet = new Set(prev);

			if (isSelected) {
				newSet.add(mapId);
			} else {
				newSet.delete(mapId);
			}

			return newSet;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedMaps.size === filteredMaps.length) {
			setSelectedMaps(new Set());
		} else {
			setSelectedMaps(new Set(filteredMaps.map((map) => map.id)));
		}
	}, [selectedMaps.size, filteredMaps]);

	// Folder handlers
	const handleFolderCreate = async (parentId: string | null, name: string) => {
		try {
			const response = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, parent_id: parentId }),
			});

			if (!response.ok) {
				throw new Error('Failed to create folder');
			}

			mutate('/api/folders');
			toast.success('Folder created successfully');
		} catch (err) {
			console.error('Error creating folder:', err);
			toast.error('Failed to create folder');
		}
	};

	const handleFolderUpdate = async (
		folderId: string,
		updates: Partial<FolderData>
	) => {
		try {
			const response = await fetch(`/api/folders/${folderId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error('Failed to update folder');
			}

			mutate('/api/folders');
			toast.success('Folder updated successfully');
		} catch (err) {
			console.error('Error updating folder:', err);
			toast.error('Failed to update folder');
		}
	};

	const handleFolderDelete = async (folderId: string) => {
		if (!confirm('Delete this folder? Maps will be moved to root.')) {
			return;
		}

		try {
			const response = await fetch(`/api/folders/${folderId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete folder');
			}

			mutate('/api/folders');
			toast.success('Folder deleted successfully');
		} catch (err) {
			console.error('Error deleting folder:', err);
			toast.error('Failed to delete folder');
		}
	};

	if (mapsLoading && !mapsData.maps.length) {
		return (
			<SidebarProvider>
				<DashboardLayout>
					<div className='flex min-h-screen items-center justify-center text-zinc-400'>
						Loading your maps...
					</div>
				</DashboardLayout>
			</SidebarProvider>
		);
	}

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='flex h-full'>
					{/* Sidebar with Folders */}
					<AnimatePresence>
						{showSidebar && (
							<motion.aside
								initial={{ width: 0, opacity: 0 }}
								animate={{ width: 280, opacity: 1 }}
								exit={{ width: 0, opacity: 0 }}
								transition={{ duration: 0.3 }}
								className='border-r border-zinc-800 bg-zinc-900/50 relative'
							>
								<SidebarTrigger
									className={cn([
										'absolute top-4 -left-6 z-50 group-data-[collapsed="false"]:-left-12',
									])}
								/>

								<DashboardSidebar
									folders={foldersData.folders}
									currentFolderId={currentFolderId}
									onFolderSelect={setCurrentFolderId}
									onFolderCreate={handleFolderCreate}
									onFolderUpdate={handleFolderUpdate}
									onFolderDelete={handleFolderDelete}
								/>
							</motion.aside>
						)}
					</AnimatePresence>

					{/* Main Content */}
					<div className='flex-grow w-full overflow-auto'>
						<div className='p-6 md:p-8'>
							<div className='mx-auto max-w-7xl'>
								{/* Header */}
								<div className='mb-8'>
									<h1 className='text-2xl font-bold text-white mb-2'>
										{currentFolderId
											? foldersData.folders.find(
													(f) => f.id === currentFolderId
												)?.name || 'Folder'
											: 'All Mind Maps'}
									</h1>

									{/* Create New Map Form */}
									<form
										onSubmit={handleCreateMap}
										className='flex gap-3 max-w-md mb-6'
									>
										<Input
											type='text'
											value={newMapTitle}
											onChange={(e) => setNewMapTitle(e.target.value)}
											placeholder='New map title...'
											className='flex-grow bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400'
											disabled={isCreatingMap}
										/>

										<Button
											type='submit'
											disabled={!newMapTitle.trim() || isCreatingMap}
											className='bg-sky-600 hover:bg-sky-700'
										>
											<Plus className='h-4 w-4 mr-2' />

											{isCreatingMap ? 'Creating...' : 'Create'}
										</Button>
									</form>

									{/* Toolbar */}
									<div className='flex items-center justify-between gap-4'>
										{/* Search */}
										<div className='flex-grow max-w-md'>
											<div className='relative'>
												<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400' />

												<Input
													type='text'
													value={searchQuery}
													onChange={(e) => setSearchQuery(e.target.value)}
													placeholder='Search maps...'
													className='pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400'
												/>
											</div>
										</div>

										{/* Actions */}
										<div className='flex items-center gap-2'>
											{/* Bulk Actions */}
											{selectedMaps.size > 0 && (
												<motion.div
													initial={{ opacity: 0, scale: 0.9 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.9 }}
													className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700'
												>
													<span className='text-sm text-zinc-300'>
														{selectedMaps.size} selected
													</span>

													<Button
														onClick={handleBulkDelete}
														variant='ghost'
														size='sm'
														className='text-red-400 hover:text-red-300'
													>
														<Trash2 className='h-4 w-4' />
													</Button>

													<Button
														onClick={() => setSelectedMaps(new Set())}
														variant='ghost'
														size='sm'
													>
														Clear
													</Button>
												</motion.div>
											)}

											{/* Filter */}
											<Select
												value={filterBy}
												onValueChange={setFilterBy as any}
											>
												<SelectTrigger className='w-36 bg-zinc-800/50 border-zinc-700'>
													<Filter className='h-4 w-4 mr-2' />

													<SelectValue />
												</SelectTrigger>

												<SelectContent className='bg-zinc-900 border-zinc-800'>
													<SelectItem value='all'>All Maps</SelectItem>

													<SelectItem value='owned'>My Maps</SelectItem>

													<SelectItem value='shared'>Shared</SelectItem>
												</SelectContent>
											</Select>

											{/* Sort */}
											<Select value={sortBy} onValueChange={setSortBy as any}>
												<SelectTrigger className='w-44 bg-zinc-800/50 border-zinc-700'>
													<SortAsc className='h-4 w-4 mr-2' />

													<SelectValue />
												</SelectTrigger>

												<SelectContent className='bg-zinc-900 border-zinc-800'>
													<SelectItem value='updated'>Last Updated</SelectItem>

													<SelectItem value='created'>Created</SelectItem>

													<SelectItem value='name'>Name</SelectItem>
												</SelectContent>
											</Select>

											{/* View Mode */}
											<div className='flex items-center rounded-lg bg-zinc-800/50 border border-zinc-700 p-1'>
												<Button
													onClick={() => setViewMode('grid')}
													variant='ghost'
													size='sm'
													className={cn(
														'h-7 px-2',
														viewMode === 'grid' && 'bg-zinc-700'
													)}
												>
													<Grid3x3 className='h-4 w-4' />
												</Button>

												<Button
													onClick={() => setViewMode('list')}
													variant='ghost'
													size='sm'
													className={cn(
														'h-7 px-2',
														viewMode === 'list' && 'bg-zinc-700'
													)}
												>
													<List className='h-4 w-4' />
												</Button>
											</div>
										</div>
									</div>
								</div>

								{/* Select All */}
								{filteredMaps.length > 0 && (
									<div className='mb-4'>
										<label className='flex items-center gap-2 text-sm text-zinc-400'>
											<input
												type='checkbox'
												checked={selectedMaps.size === filteredMaps.length}
												onChange={handleSelectAll}
												className='h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-sky-600'
											/>
											Select all ({filteredMaps.length} maps)
										</label>
									</div>
								)}

								{/* Mind Maps Grid/List */}
								{filteredMaps.length === 0 ? (
									<div className='py-20'>
										<div className='text-center max-w-md mx-auto'>
											<div className='border-2 border-dashed border-zinc-600 rounded-lg p-12'>
												<h2 className='text-xl text-white mb-2'>
													{searchQuery ? 'No maps found' : 'No mind maps yet'}
												</h2>

												<p className='text-zinc-400 mb-6'>
													{searchQuery
														? 'Try adjusting your search or filters'
														: 'Create your first mind map to get started'}
												</p>
											</div>
										</div>
									</div>
								) : (
									<div
										className={cn(
											viewMode === 'grid'
												? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
												: 'space-y-2'
										)}
									>
										<AnimatePresence mode='popLayout'>
											{filteredMaps.map((map) => (
												<MindMapCard
													key={map.id}
													map={map}
													selected={selectedMaps.has(map.id)}
													onSelect={handleSelectMap}
													onDelete={handleDeleteMap}
													onDuplicate={handleDuplicateMap}
													viewMode={viewMode}
												/>
											))}
										</AnimatePresence>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</DashboardLayout>
		</SidebarProvider>
	);
}
