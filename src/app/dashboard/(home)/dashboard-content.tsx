'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import { CreateMapCard } from '@/components/dashboard/create-map-card';
import { CreateMapDialog } from '@/components/dashboard/create-map-dialog';
import { DashboardFirstRun } from '@/components/dashboard/dashboard-first-run';
import {
	DashboardMapsLoadingSkeleton,
	RoomCodeJoinSkeleton,
	ShortcutsSkeleton,
} from '@/components/dashboard/dashboard-loading-skeleton';
import {
	useDashboardNewMapAction,
	useDashboardSearch,
} from '@/components/dashboard/dashboard-shell-context';
import { MindMapCard } from '@/components/dashboard/mind-map-card';
import { QuickCreateBar } from '@/components/dashboard/quick-create-bar';
import { RoomCodeJoin } from '@/components/dashboard/room-code-join';
import {
	UnderlineTab,
	UnderlineTabsBar,
	UnderlineTabsList,
} from '@/components/dashboard/underline-tabs';
import {
	DASHBOARD_MAPS_KEY,
	useDashboardMaps,
	useDashboardTemplates,
	type DashboardTemplate,
} from '@/components/dashboard/use-dashboard-data';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { formatUpdatedAt } from '@/helpers/dashboard/format-updated-at';
import { waitForSubscriptionActivation } from '@/helpers/subscription/wait-for-subscription-activation';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import { useTouchFirst } from '@/hooks/use-touch-first';
import useAppStore from '@/store/mind-map-store';
import type { DashboardMap, DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import { ChevronDown, Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { useShallow } from 'zustand/react/shallow';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

// Helper to refresh usage data from store
const refreshUsageData = () => {
	useAppStore.getState().fetchUsageData?.();
};

type FilterType = 'all' | 'owned' | 'shared';
type SortByType = 'updated' | 'created' | 'name';

const SORT_LABELS: Record<SortByType, string> = {
	updated: 'Last updated',
	created: 'Created',
	name: 'Name',
};

const SHORTCUTS = [
	{ keys: 'Ctrl N', label: 'New map' },
	{ keys: 'Ctrl F', label: 'Search' },
	{ keys: 'Ctrl 1 / 2', label: 'Grid / list' },
];

const MAP_LIMIT_MESSAGE = (max: number) =>
	`Mind map limit reached (${max} maps). Upgrade to Pro for unlimited maps.`;

/** "last edit 2 hours ago" but keep month names capitalized ("last edit Sep 28"). */
function lastEditLabel(iso: string) {
	const label = formatUpdatedAt(iso);
	return /^[A-Z][a-z]{2} \d/.test(label)
		? label
		: label.charAt(0).toLowerCase() + label.slice(1);
}

const noop = () => {};

/** The "N maps · last edit …" line while maps load; same height as the text line. */
function StatsLineSkeleton() {
	return (
		<div
			className='mt-2 flex h-5 items-center'
			data-testid='maps-stats-skeleton'
		>
			<Skeleton className='h-4 w-72 max-w-full bg-zinc-800/60' />
		</div>
	);
}

/**
 * Home before the page mounts ((home)/loading.tsx): the heading and the quick-create
 * bar are static, so they show right away; the stats line, the map grid, the room-code
 * box and the shortcut hints are skeletons.
 * The bar is `inert` so nothing typed here is lost when the real page replaces it.
 */
export function DashboardHomePageSkeleton() {
	const templates = useDashboardTemplates();
	const isTouchFirst = useTouchFirst();

	return (
		<div className='w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8'>
			<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em]'>
				Your maps
			</h1>

			<StatsLineSkeleton />

			<div inert>
				<QuickCreateBar
					onCreate={noop}
					onOpenDialog={noop}
					onPickTemplate={noop}
					templates={templates}
				/>
			</div>

			<div className='mt-9 h-11 border-b border-[#1d1f24]' />

			<div className='mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5'>
				<DashboardMapsLoadingSkeleton viewMode='grid' />
			</div>

			<RoomCodeJoinSkeleton />

			{!isTouchFirst && <ShortcutsSkeleton />}
		</div>
	);
}

export function DashboardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const checkoutActivationStarted = useRef(false);
	const createParamHandled = useRef(false);
	const isTouchFirst = useTouchFirst();
	const prefersReducedMotion = useReducedMotion() ?? false;

	// Handle checkout success redirect
	useEffect(() => {
		if (
			searchParams.get('checkout') !== 'success' ||
			checkoutActivationStarted.current
		) {
			return;
		}

		checkoutActivationStarted.current = true;
		let cancelled = false;

		void waitForSubscriptionActivation({
			refreshSubscription: () => useAppStore.getState().fetchUserSubscription(),
			isProUser: () => useAppStore.getState().isProUser(),
		}).then((activated) => {
			if (cancelled) {
				return;
			}

			if (activated) {
				toast.success('Subscription activated!', {
					description: 'Welcome to Shiko Pro. Your account has been upgraded.',
				});
				refreshUsageData();
				window.history.replaceState({}, '', '/dashboard');
				return;
			}

			toast.info('Payment received; activation is still pending.', {
				description:
					'We will enable Pro as soon as the signed billing update arrives. Refresh shortly.',
			});
			window.history.replaceState({}, '', '/dashboard');
		});

		return () => {
			cancelled = true;
		};
	}, [searchParams]);

	const { isTrialing, getTrialDaysRemaining, userProfile } = useAppStore(
		useShallow((state) => ({
			isTrialing: state.isTrialing,
			getTrialDaysRemaining: state.getTrialDaysRemaining,
			userProfile: state.userProfile,
		}))
	);

	const trialDays = getTrialDaysRemaining?.() ?? null;

	// Subscription limits for map creation
	const { isAtLimit, usage, limits } = useSubscriptionLimits();
	const isAtMapLimit = isAtLimit('mindMaps');
	const mapLimitInfo =
		limits.mindMaps !== -1
			? { current: usage.mindMaps, max: limits.mindMaps }
			: undefined;

	// State
	const [viewMode, setViewMode] = useState<DashboardViewMode>('grid');
	const [sortBy, setSortBy] = useState<SortByType>('updated');
	const [filterBy, setFilterBy] = useState<FilterType>('all');
	const [isCreatingMap, setIsCreatingMap] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [dialogTemplate, setDialogTemplate] =
		useState<DashboardTemplate | null>(null);
	const [showAnonymousUpgrade, setShowAnonymousUpgrade] = useState(false);

	const { maps, isLoading: mapsLoading } = useDashboardMaps();
	const templates = useDashboardTemplates();
	const showMapsSkeleton = mapsLoading && maps.length === 0;
	const isFirstRun = !showMapsSkeleton && maps.length === 0;
	// The field sits in the shell's top bar; there's nothing to search on first run.
	const { query: searchQuery, setQuery: setSearchQuery } = useDashboardSearch({
		hidden: isFirstRun,
	});

	const sharedCount = maps.filter((map) => map.is_shared).length;
	const filterCounts: Record<FilterType, number> = {
		all: maps.length,
		owned: maps.length - sharedCount,
		shared: sharedCount,
	};

	// Filter and sort maps
	const filteredMaps = maps
		.filter((map) => {
			if (filterBy === 'shared' && !map.is_shared) {
				return false;
			} else if (filterBy === 'owned' && map.is_shared) {
				return false;
			}

			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					map.title.toLowerCase().includes(query) ||
					map.description?.toLowerCase().includes(query)
				);
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

	const showLimitToast = useCallback(
		(max: number) => {
			toast.error(MAP_LIMIT_MESSAGE(max), {
				action: {
					label: 'Upgrade',
					onClick: () => router.push('/dashboard?settings=billing'),
				},
				duration: 8000,
			});
		},
		[router]
	);

	/** Anonymous and at-limit users get the matching upsell instead. */
	const canCreateMap = useCallback(() => {
		if (userProfile?.is_anonymous) {
			setShowAnonymousUpgrade(true);
			return false;
		}

		if (isAtMapLimit) {
			showLimitToast(mapLimitInfo?.max || 3);
			return false;
		}

		return true;
	}, [
		userProfile?.is_anonymous,
		isAtMapLimit,
		mapLimitInfo?.max,
		showLimitToast,
	]);

	const handleRequestCreateMap = useCallback(() => {
		if (!canCreateMap()) return;
		setDialogTemplate(null);
		setShowCreateDialog(true);
	}, [canCreateMap]);

	// Sidebar "New map" opens the dialog here instead of linking to ?create=1.
	useDashboardNewMapAction(handleRequestCreateMap);

	const handlePickTemplate = useCallback(
		(template: DashboardTemplate) => {
			if (!canCreateMap()) return;
			setDialogTemplate(template);
			setShowCreateDialog(true);
		},
		[canCreateMap]
	);

	// Sidebar "New map" on other dashboard pages links here with ?create=1.
	useEffect(() => {
		if (searchParams.get('create') !== '1' || createParamHandled.current) {
			return;
		}

		createParamHandled.current = true;
		window.history.replaceState({}, '', '/dashboard');
		handleRequestCreateMap();
	}, [searchParams, handleRequestCreateMap]);

	const handleCreateMap = async (data: {
		title: string;
		description?: string;
		templateId?: string;
	}) => {
		if (!data.title.trim() || isCreatingMap) return;

		setIsCreatingMap(true);

		try {
			const response = await fetch('/api/maps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: data.title.trim(),
					description: data.description?.trim() || undefined,
					template_id: data.templateId || undefined,
				}),
			});

			if (!response.ok) {
				if (response.status === 402) {
					const errorData = await response.json();
					showLimitToast(errorData.data?.limit || 3);
					setShowCreateDialog(false);
					return;
				}
				throw new Error('Failed to create new mind map.');
			}

			const { data: responseData } = await response.json();

			mutate(DASHBOARD_MAPS_KEY, { maps: [responseData.map, ...maps] }, false);

			refreshUsageData();

			toast.success('Map created successfully!');
			setShowCreateDialog(false);
			router.push(`/mind-map/${responseData.map?.id}`);
		} catch (err: unknown) {
			console.error('Error creating map:', err);
			toast.error('Failed to create map');
			throw err;
		} finally {
			setIsCreatingMap(false);
		}
	};

	/** Quick create from a typed thought: same API path, no dialog. */
	const handleQuickCreate = async (title: string) => {
		if (!canCreateMap()) return;

		try {
			await handleCreateMap({ title });
		} catch {
			// handleCreateMap already showed the error toast.
		}
	};

	const handleDeleteMap = useCallback(async (mapId: string) => {
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

			mutate(
				DASHBOARD_MAPS_KEY,
				(current?: { maps: DashboardMap[] }) => ({
					maps: (current?.maps ?? []).filter((map) => map.id !== mapId),
				}),
				false
			);

			refreshUsageData();
			toast.success('Map deleted successfully');
		} catch (err: unknown) {
			console.error('Error deleting map:', err);
			toast.error('Failed to delete map');
			mutate(DASHBOARD_MAPS_KEY);
		}
	}, []);

	const handleDuplicateMap = useCallback(async (mapId: string) => {
		try {
			const response = await fetch(`/api/maps/${mapId}/duplicate`, {
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error('Failed to duplicate mind map.');
			}

			mutate(DASHBOARD_MAPS_KEY);
			refreshUsageData();
			toast.success('Map duplicated successfully');
		} catch (err: unknown) {
			console.error('Error duplicating map:', err);
			toast.error('Failed to duplicate map');
		}
	}, []);

	// Keyboard navigation and shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case 'n':
						e.preventDefault();
						handleRequestCreateMap();
						break;
					// Ctrl/Cmd+F (focus search) is handled by the dashboard shell.
					case '1':
						e.preventDefault();
						setViewMode('grid');
						break;
					case '2':
						e.preventDefault();
						setViewMode('list');
						break;
				}
			} else if (e.key === 'Escape') {
				if (searchQuery) {
					setSearchQuery('');
				} else if (filterBy !== 'all') {
					setFilterBy('all');
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [searchQuery, setSearchQuery, filterBy, handleRequestCreateMap]);

	const firstName =
		(userProfile?.display_name || userProfile?.full_name)?.split(/\s+/)[0] ||
		null;
	const latestUpdate = maps.reduce<string | null>(
		(latest, map) =>
			!latest || map.updated_at > latest ? map.updated_at : latest,
		null
	);
	const statsLine = [
		`${maps.length} ${maps.length === 1 ? 'map' : 'maps'}`,
		sharedCount > 0 && `${sharedCount} shared with you`,
		latestUpdate && `last edit ${lastEditLabel(latestUpdate)}`,
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<>
			<div className='w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8'>
				{isTrialing?.() && trialDays !== null && (
					<div className='mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm'>
						<span className='font-medium text-violet-200'>
							{`Pro trial: ${trialDays} ${trialDays === 1 ? 'day' : 'days'} left`}
						</span>

						<span className='text-xs text-zinc-400'>Your trial ends soon.</span>
					</div>
				)}

				{isFirstRun ? (
					<DashboardFirstRun
						firstName={firstName}
						isCreating={isCreatingMap}
						onCreate={handleQuickCreate}
						onOpenDialog={handleRequestCreateMap}
						onPickTemplate={handlePickTemplate}
						templates={templates}
					/>
				) : (
					<>
						<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em]'>
							Your maps
						</h1>

						{showMapsSkeleton ? (
							<StatsLineSkeleton />
						) : (
							<p className='mt-2 h-5 text-sm text-zinc-400'>{statsLine}</p>
						)}

						<QuickCreateBar
							isCreating={isCreatingMap}
							onCreate={handleQuickCreate}
							onOpenDialog={handleRequestCreateMap}
							onPickTemplate={handlePickTemplate}
							templates={templates}
						/>

						<Tabs
							className='mt-9 gap-0'
							onValueChange={(value) => setFilterBy(value as FilterType)}
							value={filterBy}
						>
							<UnderlineTabsBar>
								<UnderlineTabsList aria-label='Filter maps'>
									{(
										[
											['all', 'All maps'],
											['owned', 'My maps'],
											['shared', 'Shared with me'],
										] as const
									).map(([value, label]) => (
										<UnderlineTab
											count={filterCounts[value]}
											key={value}
											value={value}
										>
											{label}
										</UnderlineTab>
									))}
								</UnderlineTabsList>

								<div className='flex w-full items-center justify-between gap-2 pb-1.5 sm:w-auto sm:justify-start'>
									<DropdownMenu>
										<DropdownMenuTrigger className='flex h-9 items-center gap-2 rounded-[9px] border border-[#1d1f24] bg-[#0e0f12] px-3 text-[13px] text-zinc-300 transition-colors duration-200 ease hover:border-[#2a2c33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'>
											<span className='text-zinc-500'>Sort</span>

											{SORT_LABELS[sortBy]}

											<ChevronDown
												aria-hidden='true'
												className='size-3 text-zinc-500'
											/>
										</DropdownMenuTrigger>

										<DropdownMenuContent align='end' className='w-44'>
											<DropdownMenuRadioGroup
												onValueChange={(value) =>
													setSortBy(value as SortByType)
												}
												value={sortBy}
											>
												{(Object.keys(SORT_LABELS) as SortByType[]).map(
													(key) => (
														<DropdownMenuRadioItem key={key} value={key}>
															{SORT_LABELS[key]}
														</DropdownMenuRadioItem>
													)
												)}
											</DropdownMenuRadioGroup>
										</DropdownMenuContent>
									</DropdownMenu>

									<ViewToggle onChange={setViewMode} value={viewMode} />
								</div>
							</UnderlineTabsBar>

							<TabsContent value={filterBy}>
								{!showMapsSkeleton && filteredMaps.length === 0 ? (
									<motion.div
										animate={{ opacity: 1, y: 0 }}
										className='flex flex-col items-center py-20 text-center'
										initial={
											prefersReducedMotion ? false : { opacity: 0, y: 8 }
										}
										transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
									>
										<span className='flex size-11 items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12]'>
											<Search
												aria-hidden='true'
												className='size-4 text-zinc-400'
											/>
										</span>

										<h2 className='mt-4 text-base font-semibold'>
											No maps found
										</h2>

										<p className='mt-1 text-sm text-zinc-400'>
											{searchQuery
												? `Nothing matches "${searchQuery}".`
												: filterBy === 'shared'
													? 'No one has shared a map with you yet.'
													: 'Try a different filter.'}
										</p>

										<button
											className='mt-5 h-9 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-4 text-sm text-white transition-colors duration-200 ease hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
											type='button'
											onClick={() => {
												setSearchQuery('');
												setFilterBy('all');
											}}
										>
											Clear filters
										</button>
									</motion.div>
								) : (
									<div
										// Remount on view switch so cards re-enter instead of
										// layout-animating from their grid positions.
										key={viewMode}
										className={cn(
											'mt-6',
											viewMode === 'grid'
												? 'grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5'
												: 'flex flex-col gap-2'
										)}
									>
										{showMapsSkeleton ? (
											<DashboardMapsLoadingSkeleton viewMode={viewMode} />
										) : (
											<>
												<AnimatePresence mode='popLayout'>
													{filteredMaps.map((map, index) => (
														<MindMapCard
															index={index}
															key={map.id}
															map={map}
															onDelete={handleDeleteMap}
															onDuplicate={handleDuplicateMap}
															viewMode={viewMode}
														/>
													))}
												</AnimatePresence>

												<CreateMapCard
													disabled={isAtMapLimit}
													limitInfo={mapLimitInfo}
													onClick={handleRequestCreateMap}
													viewMode={viewMode}
												/>
											</>
										)}
									</div>
								)}
							</TabsContent>
						</Tabs>

						<RoomCodeJoin />

						{!isTouchFirst && (
							<ul className='mt-8 hidden flex-wrap gap-x-6 gap-y-2.5 text-xs text-zinc-500 lg:flex'>
								{SHORTCUTS.map((shortcut) => (
									<li className='flex items-center gap-2' key={shortcut.keys}>
										<kbd className='rounded-[5px] border border-b-2 border-[#2a2c33] px-1.5 py-px font-mono text-[11px] text-zinc-300'>
											{shortcut.keys}
										</kbd>

										{shortcut.label}
									</li>
								))}
							</ul>
						)}
					</>
				)}
			</div>

			<CreateMapDialog
				disabled={isCreatingMap}
				initialTemplate={dialogTemplate}
				onSubmit={handleCreateMap}
				open={showCreateDialog}
				onOpenChange={(open) => {
					setShowCreateDialog(open);
					if (!open) setDialogTemplate(null);
				}}
			/>

			{/* Upgrade prompt for anonymous users */}
			{showAnonymousUpgrade && (
				<UpgradeAnonymousPrompt
					autoShowDelay={0}
					isAnonymous={true}
					onDismiss={() => setShowAnonymousUpgrade(false)}
					onUpgradeSuccess={() => router.refresh()}
					userDisplayName={userProfile?.display_name || userProfile?.full_name}
				/>
			)}
		</>
	);
}
