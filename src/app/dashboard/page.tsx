'use client';

import { CreateMapCard } from '@/components/dashboard/create-map-card';
import { CreateMapDialog } from '@/components/dashboard/create-map-dialog';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { MindMapCard } from '@/components/dashboard/mind-map-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
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
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/react/shallow';

interface MindMapData {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	team_id?: string | null;
	is_template?: boolean;
	template_category?: string;
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

function DashboardContent() {
	const router = useRouter();
	const { open: sidebarOpen } = useSidebar();
	const sidebarCollapsed = !sidebarOpen;

	// Trial state
	const { isTrialing, getTrialDaysRemaining } = useAppStore(
		useShallow((state) => ({
			isTrialing: state.isTrialing,
			getTrialDaysRemaining: state.getTrialDaysRemaining,
		}))
	);

	const trialDays = getTrialDaysRemaining?.() ?? null;

	// State
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>(
		'updated'
	);
	const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'shared'>('all');
	const [selectedMaps, setSelectedMaps] = useState<Set<string>>(new Set());
	const [isCreatingMap, setIsCreatingMap] = useState(false);
	const [newMapTitle, setNewMapTitle] = useState('');
	const [showCreateDialog, setShowCreateDialog] = useState(false);

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


	// Filter and sort maps
	const filteredMaps = mapsData.maps
		.filter((map) => {
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
	const handleCreateMap = async (title: string) => {
		if (!title.trim() || isCreatingMap) return;

		setIsCreatingMap(true);

		try {
			const response = await fetch('/api/maps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create new mind map.');
			}

			const { data } = await response.json();

			// Optimistically update the cache
			mutate(
				'/api/maps',
				{
					maps: [data.map, ...mapsData.maps],
				},
				false
			);

			console.log(data.map.id);

			toast.success('Map created successfully!');
			router.push(`/mind-map/${data.map?.id}`);
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
			console.log('before');
			const response = await fetch(`/api/maps/${mapId}`, {
				method: 'DELETE',
			});
			console.log('response', response);

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

	const handleSelectAll = useCallback(
		(checked?: boolean) => {
			if (typeof checked === 'boolean') {
				if (checked) {
					setSelectedMaps(new Set(filteredMaps.map((map) => map.id)));
				} else {
					setSelectedMaps(new Set());
				}
			} else {
				// Legacy behavior for direct calls
				if (selectedMaps.size === filteredMaps.length) {
					setSelectedMaps(new Set());
				} else {
					setSelectedMaps(new Set(filteredMaps.map((map) => map.id)));
				}
			}
		},
		[selectedMaps.size, filteredMaps]
	);


	// Keyboard navigation and shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Global keyboard shortcuts
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case 'n':
						e.preventDefault();
						// Open create map dialog
						setShowCreateDialog(true);
						break;
					case 'f':
						e.preventDefault();
						// Focus on search input
						document
							.querySelector<HTMLInputElement>(
								'input[placeholder="Search maps..."]'
							)
							?.focus();
						break;
					case 'a':
						if (filteredMaps.length > 0) {
							e.preventDefault();
							// Select all maps
							handleSelectAll();
						}

						break;
					case '1':
						e.preventDefault();
						// Switch to grid view
						setViewMode('grid');
						break;
					case '2':
						e.preventDefault();
						// Switch to list view
						setViewMode('list');
						break;
				}
			} else {
				switch (e.key) {
					case 'Escape':
						// Clear selection or search
						if (selectedMaps.size > 0) {
							setSelectedMaps(new Set());
						} else if (searchQuery) {
							setSearchQuery('');
						} else if (filterBy !== 'all') {
							setFilterBy('all');
						}

						break;
					case 'Delete':
					case 'Backspace':
						if (
							selectedMaps.size > 0 &&
							document.activeElement?.tagName !== 'INPUT'
						) {
							e.preventDefault();
							// Bulk delete selected maps
							handleBulkDelete();
						}

						break;
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [
		selectedMaps,
		searchQuery,
		filterBy,
		filteredMaps.length,
		handleSelectAll,
		handleBulkDelete,
	]);

	if (mapsLoading && !mapsData.maps.length) {
		return (
			<DashboardLayout>
				<div className='flex min-h-screen items-center justify-center text-zinc-400'>
					Loading your maps...
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className='flex h-full'>
				{/* Main Content */}
				<div className='flex-grow w-full overflow-auto'>
					<div className='p-6 md:p-8'>
						<div className='mx-auto max-w-7xl'>
							{/* Trial Badge */}
							{isTrialing?.() && trialDays !== null && (
								<div className='mb-4 rounded-lg bg-purple-500/10 border border-purple-500/20 p-4'>
									<p className='text-sm font-medium text-purple-600'>
										✨ Trial Active: {trialDays} days remaining
									</p>
									<p className='text-xs text-muted-foreground mt-1'>
										Enjoying Pro features? Your trial ends soon.
									</p>
								</div>
							)}

							{/* Header */}
							<div className='mb-10'>
								<div className='flex items-center justify-between mb-8'>
									<h1 className='text-3xl font-bold text-white tracking-tight'>
										Mind Maps
									</h1>

									{/* Keyboard Shortcuts Help */}
									<div className='text-xs text-zinc-400 space-y-1 hidden lg:block'>
										<div className='flex gap-6'>
											<span>
												<kbd className='px-2 py-1 mr-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs shadow-sm'>
													Ctrl+N
												</kbd>{' '}

												<span className='text-zinc-500'>New map</span>
											</span>

											<span>
												<kbd className='px-2 py-1 mr-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs shadow-sm'>
													Ctrl+F
												</kbd>{' '}

												<span className='text-zinc-500'>Search</span>
											</span>

											<span>
												<kbd className='px-2 py-1 mr-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs shadow-sm'>
													Ctrl+A
												</kbd>{' '}

												<span className='text-zinc-500'>Select all</span>
											</span>

											<span>
												<kbd className='px-2 py-1 mr-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs shadow-sm'>
													Ctrl+1/2
												</kbd>{' '}

												<span className='text-zinc-500'>View mode</span>
											</span>
										</div>
									</div>
								</div>

								{/* Enhanced Toolbar with Better Mobile Layout */}
								<div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 p-2 rounded-xl bg-zinc-950 border border-zinc-800/50 shadow-lg'>
									{/* Search */}
									<div className='flex-grow max-w-full sm:max-w-md'>
										<SearchInput
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder='Search maps...'
											className='touch-manipulation'
										/>
									</div>

									{/* Actions */}
									<div className='flex items-center gap-2 flex-wrap sm:flex-nowrap'>
										{/* Filter */}
										<Select value={filterBy} onValueChange={setFilterBy as any}>
											<SelectTrigger className='w-36 bg-zinc-800/30 backdrop-blur-sm border-zinc-700/50 hover:border-zinc-600/50 transition-colors duration-200'>
												<Filter className='h-4 w-4 mr-2' />

												<SelectValue />
											</SelectTrigger>

											<SelectContent className='bg-zinc-900/95 backdrop-blur-sm border-zinc-800/50 shadow-xl'>
												<SelectItem value='all'>All Maps</SelectItem>

												<SelectItem value='owned'>My Maps</SelectItem>

												<SelectItem value='shared'>Shared</SelectItem>
											</SelectContent>
										</Select>

										{/* Sort */}
										<Select value={sortBy} onValueChange={setSortBy as any}>
											<SelectTrigger className='w-44 bg-zinc-800/30 backdrop-blur-sm border-zinc-700/50 hover:border-zinc-600/50 transition-colors duration-200'>
												<SortAsc className='h-4 w-4 mr-2' />

												<SelectValue />
											</SelectTrigger>

											<SelectContent className='bg-zinc-900/95 backdrop-blur-sm border-zinc-800/50 shadow-xl'>
												<SelectItem value='updated'>Last Updated</SelectItem>

												<SelectItem value='created'>Created</SelectItem>

												<SelectItem value='name'>Name</SelectItem>
											</SelectContent>
										</Select>

										{/* Enhanced View Mode with Touch-Friendly Buttons */}
										<div className='flex items-center rounded-lg bg-zinc-800/30 backdrop-blur-sm border border-zinc-700/50 p-1 shadow-sm'>
											<Button
												onClick={() => setViewMode('grid')}
												variant='ghost'
												size='sm'
												className={cn(
													'h-10 px-3 sm:h-7 sm:px-2 min-w-[44px] sm:min-w-0 touch-manipulation',
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
													'h-10 px-3 sm:h-7 sm:px-2 min-w-[44px] sm:min-w-0 touch-manipulation',
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
								<div className='mb-4 flex gap-2 h-9'>
									<label className='flex items-center gap-3 text-sm text-zinc-400 cursor-pointer'>
										<Checkbox
											checked={selectedMaps.size === filteredMaps.length}
											onChange={handleSelectAll}
											size='sm'
											variant='default'
										/>

										Select all ({filteredMaps.length} maps)
									</label>

									{selectedMaps.size > 0 && (
										<motion.div
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.9 }}
											className='h-9 flex items-center gap-2 px-3 rounded-lg'
										>
											<span className='text-sm text-zinc-300'>
												{selectedMaps.size} selected
											</span>

											<Button
												onClick={handleBulkDelete}
												variant='secondary'
												size='icon'
												className='text-red-400 hover:text-red-300'
											>
												<Trash2 className='size-4' />
											</Button>

											<Button
												onClick={() => setSelectedMaps(new Set())}
												variant='secondary'
												size='sm'
											>
												Clear
											</Button>
										</motion.div>
									)}
								</div>
							)}

							{/* Mind Maps Grid/List */}
							<div
								className={cn(
									viewMode === 'grid'
										? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
										: 'space-y-2'
								)}
							>
								{/* Create New Map Card - Always first */}
								<CreateMapCard
									onClick={() => setShowCreateDialog(true)}
									viewMode={viewMode}
								/>

								{/* Existing Mind Maps */}
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

							{/* Empty State for No Maps */}
							{filteredMaps.length === 0 && (
								<div className='py-20'>
									<div className='text-center max-w-lg mx-auto'>
										{searchQuery || filterBy !== 'all' ? (
											// Search/Filter Empty State
											<div className='space-y-6'>
												<div className='w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center'>
													<Search className='w-10 h-10 text-zinc-400' />
												</div>

												<div className='space-y-3'>
													<h2 className='text-2xl font-semibold text-white'>
														No maps found
													</h2>

													<p className='text-zinc-400 text-lg'>
														Try adjusting your search terms or filters to find
														what you&apos;re looking for.
													</p>
												</div>

												<div className='flex flex-col sm:flex-row gap-3 justify-center'>
													<Button
														onClick={() => {
															setSearchQuery('');
															setFilterBy('all');
														}}
														variant='outline'
														className='border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
													>
														Clear all filters
													</Button>

													<Button
														onClick={() => setShowCreateDialog(true)}
														className='bg-sky-600 hover:bg-sky-700'
													>
														<Plus className='w-4 h-4 mr-2' />
														Create new map
													</Button>
												</div>
											</div>
										) : (
											// Welcome Empty State
											<div className='space-y-8'>
												<div className='w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border-2 border-dashed border-sky-500/30'>
													<div className='w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center'>
														<Plus className='w-8 h-8 text-white' />
													</div>
												</div>

												<div className='space-y-4'>
													<h2 className='text-3xl font-bold text-white'>
														Welcome to your dashboard
													</h2>

													<p className='text-zinc-400 text-lg max-w-md mx-auto'>
														Create your first mind map to start organizing your
														thoughts, ideas, and projects visually.
													</p>
												</div>

												<div className='space-y-4'>
													<Button
														onClick={() => setShowCreateDialog(true)}
														size='lg'
														className='bg-sky-600 hover:bg-sky-700 text-lg px-8 py-3 h-auto'
														disabled={isCreatingMap}
													>
														<Plus className='w-5 h-5 mr-2' />
														Create your first map
													</Button>

													<div className='flex items-center gap-4 text-sm text-zinc-500'>
														<div className='flex items-center gap-2'>
															<div className='w-2 h-2 rounded-full bg-sky-500' />

															<span>Organize ideas visually</span>
														</div>

														<div className='flex items-center gap-2'>
															<div className='w-2 h-2 rounded-full bg-purple-500' />

															<span>Collaborate with teams</span>
														</div>

														<div className='flex items-center gap-2'>
															<div className='w-2 h-2 rounded-full bg-green-500' />

															<span>AI-powered suggestions</span>
														</div>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Create Map Dialog */}
			<CreateMapDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSubmit={handleCreateMap}
				disabled={isCreatingMap}
			/>
		</DashboardLayout>
	);
}

export default function DashboardPage() {
	return (
		<SidebarProvider>
			<DashboardContent />
		</SidebarProvider>
	);
}
