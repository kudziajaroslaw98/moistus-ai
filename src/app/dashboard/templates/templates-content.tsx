'use client';

import { useDashboardSearch } from '@/components/dashboard/dashboard-shell-context';
import { TemplateCover } from '@/components/dashboard/template-cover';
import {
	UnderlineTab,
	UnderlineTabsBar,
	UnderlineTabsList,
} from '@/components/dashboard/underline-tabs';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { cn } from '@/utils/cn';
import {
	BarChart,
	Briefcase,
	Calendar,
	Code,
	FileText,
	GraduationCap,
	Lightbulb,
	Search,
	User,
	Zap,
	type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

// Types
interface TemplateFromAPI {
	id: string;
	templateId: string;
	name: string;
	description: string;
	category: TemplateCategory;
	icon: string;
	previewColors: string[];
	nodeCount: number;
	edgeCount: number;
	usageCount: number;
}

type TemplateCategory =
	| 'creative'
	| 'productivity'
	| 'planning'
	| 'analysis'
	| 'business'
	| 'education'
	| 'personal'
	| 'technical';

const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
	creative: 'Creative',
	productivity: 'Productivity',
	planning: 'Planning',
	analysis: 'Analysis',
	business: 'Business',
	education: 'Education',
	personal: 'Personal',
	technical: 'Technical',
};

// One accent hue per category, shared by every template in it.
const CATEGORY_HUES: Record<TemplateCategory, number> = {
	creative: 270,
	productivity: 152,
	planning: 214,
	analysis: 38,
	business: 244,
	education: 188,
	personal: 330,
	technical: 14,
};

// Covers are icon-per-category: the `icon` stored on each template row is
// not used here.
const CATEGORY_ICONS: Record<TemplateCategory, LucideIcon> = {
	creative: Lightbulb,
	productivity: Zap,
	planning: Calendar,
	analysis: BarChart,
	business: Briefcase,
	education: GraduationCap,
	personal: User,
	technical: Code,
};

// SWR fetcher with proper error handling
const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		const errorBody = await res.text().catch(() => 'Unknown error');
		throw new Error(`HTTP ${res.status}: ${res.statusText || errorBody}`);
	}
	return res.json();
};

// Off-screen cards skip layout and paint; sizes keep the scrollbar stable.
const CARD_VISIBILITY = {
	grid: '[content-visibility:auto] [contain-intrinsic-size:auto_240px]',
	list: '[content-visibility:auto] [contain-intrinsic-size:auto_72px]',
} as const;

const USE_BUTTON_CLASS =
	'relative z-10 h-8 shrink-0 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-3 text-[13px] text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50';

// Stretches the title button over the whole card so the card is one target.
const TITLE_BUTTON_CLASS =
	'truncate text-left text-[15px] font-semibold text-white after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-sky-500';

// Template Card Component
interface TemplateCardProps {
	template: TemplateFromAPI;
	onUse: (templateId: string) => void;
	onView: (templateDbId: string) => void;
	isCreating: boolean;
	isAtMapLimit: boolean;
	viewMode: DashboardViewMode;
}

const TemplateCard = memo(function TemplateCard({
	template,
	onUse,
	onView,
	isCreating,
	isAtMapLimit,
	viewMode,
}: TemplateCardProps) {
	const Icon = CATEGORY_ICONS[template.category] ?? FileText;
	const categoryLabel = TEMPLATE_CATEGORIES[template.category];
	const meta = `${template.nodeCount} nodes · ${template.usageCount} uses`;

	const useButton = (
		<button
			className={USE_BUTTON_CLASS}
			disabled={isCreating || isAtMapLimit}
			onClick={() => onUse(template.templateId)}
			type='button'
		>
			{isAtMapLimit ? 'Limit reached' : 'Use template'}
		</button>
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
					icon={Icon}
					hue={CATEGORY_HUES[template.category] ?? 214}
				/>

				<div className='min-w-0 grow'>
					<div className='flex items-center gap-2'>
						<h3 className='min-w-0 truncate'>
							<button
								className={cn(TITLE_BUTTON_CLASS, 'after:rounded-xl')}
								onClick={() => onView(template.id)}
								type='button'
							>
								{template.name}
							</button>
						</h3>

						<span className='shrink-0 rounded-full border border-[#2a2c33] bg-[#0e0f12] px-2 py-px text-[11px] text-zinc-300'>
							{categoryLabel}
						</span>
					</div>

					<p className='mt-0.5 truncate text-[13px] text-zinc-400'>
						{template.description}
					</p>
				</div>

				<span className='hidden shrink-0 text-xs text-zinc-500 sm:block'>
					{meta}
				</span>

				{useButton}
			</article>
		);
	}

	return (
		<article
			className={cn(
				'relative overflow-hidden rounded-2xl border border-[#1d1f24] bg-[#0e0f12]',
				'transition-[border-color,box-shadow] duration-200 ease',
				'[@media(hover:hover)]:hover:border-[#34363e] [@media(hover:hover)]:hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]',
				CARD_VISIBILITY.grid
			)}
		>
			<div className='relative'>
				<TemplateCover
					className='h-[112px] border-b border-[#1d1f24]'
					icon={Icon}
					hue={CATEGORY_HUES[template.category] ?? 214}
				/>

				<span className='absolute left-2.5 top-2.5 rounded-full border border-[#2a2c33] bg-[#0e0f12] px-2 py-0.5 text-[11px] text-zinc-300'>
					{categoryLabel}
				</span>
			</div>

			<div className='px-4 pb-4 pt-3.5'>
				<h3 className='flex'>
					<button
						className={TITLE_BUTTON_CLASS}
						onClick={() => onView(template.id)}
						type='button'
					>
						{template.name}
					</button>
				</h3>

				<p className='mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-zinc-400'>
					{template.description}
				</p>

				<div className='mt-3.5 flex items-center justify-between gap-2'>
					<span className='truncate text-xs text-zinc-500'>{meta}</span>

					{useButton}
				</div>
			</div>
		</article>
	);
});

function TemplatesSkeleton({ viewMode }: { viewMode: DashboardViewMode }) {
	return (
		<>
			{Array.from({ length: 8 }).map((_, index) =>
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

const TEMPLATES_INTRO =
	'Start from a ready-made structure. Pick one and it becomes your own map.';

/** The page before it mounts (templates/loading.tsx): same heading, empty tabs, card skeletons. */
export function TemplatesPageSkeleton() {
	return (
		<div className='w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8'>
			<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em] text-white'>
				Templates
			</h1>

			<p className='mt-2 text-sm text-zinc-400'>{TEMPLATES_INTRO}</p>

			<div className='mt-9 h-11 border-b border-[#1d1f24]' />

			<div className='mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'>
				<TemplatesSkeleton viewMode='grid' />
			</div>
		</div>
	);
}

// Main Content Component
export function TemplatesContent() {
	const router = useRouter();
	const [viewMode, setViewMode] = useState<DashboardViewMode>('grid');
	const [selectedCategory, setSelectedCategory] = useState<
		TemplateCategory | 'all'
	>('all');
	// The field sits in the shell's top bar.
	const { query: searchQuery, setQuery: setSearchQuery } = useDashboardSearch();
	const [isCreating, setIsCreating] = useState(false);

	// Subscription limits for map creation
	const { isAtLimit, limits } = useSubscriptionLimits();
	const isAtMapLimit = isAtLimit('mindMaps');

	// Fetch templates
	const { data, error, isLoading } = useSWR<{
		data: { templates: TemplateFromAPI[] };
	}>('/api/templates', fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60000,
	});

	const templates = useMemo(() => data?.data?.templates ?? [], [data]);

	// Tabs only list categories that have templates
	const categoryCounts = useMemo(() => {
		const counts = new Map<TemplateCategory, number>();
		for (const t of templates) {
			counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
		}
		return counts;
	}, [templates]);

	const filteredTemplates = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return templates.filter((t) => {
			if (selectedCategory !== 'all' && t.category !== selectedCategory) {
				return false;
			}
			if (!query) return true;
			return (
				t.name.toLowerCase().includes(query) ||
				(t.description ?? '').toLowerCase().includes(query)
			);
		});
	}, [templates, selectedCategory, searchQuery]);

	// View template
	const handleViewTemplate = useCallback(
		(templateDbId: string) => {
			router.push(`/mind-map/${templateDbId}`);
		},
		[router]
	);

	// Create map from template
	const handleUseTemplate = useCallback(
		async (templateId: string) => {
			const template = templates.find((t) => t.templateId === templateId);
			if (!template) return;

			if (isAtMapLimit) {
				toast.error(
					`Mind map limit reached (${limits.mindMaps} maps). Upgrade to Pro for unlimited maps.`,
					{
						action: {
							label: 'Upgrade',
							onClick: () => router.push('/dashboard?settings=billing'),
						},
						duration: 8000,
					}
				);
				return;
			}

			setIsCreating(true);
			try {
				const response = await fetch('/api/maps', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: template.name,
						template_id: templateId,
					}),
				});

				const responseData = await response.json();

				// Handle HTTP errors
				if (!response.ok) {
					if (response.status === 402) {
						toast.error(
							responseData?.error ||
								'Mind map limit reached. Upgrade to Pro for unlimited maps.',
							{
								action: {
									label: 'Upgrade',
									onClick: () => router.push('/dashboard?settings=billing'),
								},
								duration: 8000,
							}
						);
						return;
					}
					const errorMessage =
						responseData?.error ||
						responseData?.message ||
						'Failed to create map';
					toast.error(errorMessage);
					return;
				}

				// Validate response has required data
				const mapId = responseData?.data?.map?.id;
				if (!mapId) {
					toast.error('Invalid response from server');
					return;
				}

				toast.success(`Created "${template.name}" map!`);
				router.push(`/mind-map/${mapId}`);
			} catch (err) {
				// Handle network/parsing errors
				console.error('Error creating map from template:', err);
				toast.error('Network error. Please try again.');
			} finally {
				setIsCreating(false);
			}
		},
		[templates, router, isAtMapLimit, limits.mindMaps]
	);

	const clearFilters = useCallback(() => {
		setSelectedCategory('all');
		setSearchQuery('');
	}, [setSearchQuery]);

	const tabs: ReadonlyArray<
		readonly [TemplateCategory | 'all', string, number]
	> = [
		['all', 'All', templates.length],
		...(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[])
			.filter((category) => categoryCounts.has(category))
			.map(
				(category) =>
					[
						category,
						TEMPLATE_CATEGORIES[category],
						categoryCounts.get(category) ?? 0,
					] as const
			),
	];

	const showSkeleton = isLoading && !error;
	const showEmpty = !isLoading && !error && filteredTemplates.length === 0;

	return (
		<div className='w-full max-w-[1760px] px-4 pb-12 pt-10 sm:px-8'>
			<h1 className='text-3xl font-bold leading-tight tracking-[-0.02em] text-white'>
				Templates
			</h1>

			<p className='mt-2 text-sm text-zinc-400'>{TEMPLATES_INTRO}</p>

			<Tabs
				className='mt-9 gap-0'
				value={selectedCategory}
				onValueChange={(value) =>
					setSelectedCategory(value as TemplateCategory | 'all')
				}
			>
				<UnderlineTabsBar>
					<UnderlineTabsList aria-label='Filter templates by category'>
						{tabs.map(([value, label, count]) => (
							<UnderlineTab count={count} key={value} value={value}>
								{label}
							</UnderlineTab>
						))}
					</UnderlineTabsList>

					<ViewToggle
						className='mb-1.5'
						onChange={setViewMode}
						value={viewMode}
					/>
				</UnderlineTabsBar>
			</Tabs>

			{error && (
				<div className='flex h-64 items-center justify-center text-zinc-500'>
					<p>Failed to load templates. Please try again.</p>
				</div>
			)}

			{!error && !showEmpty && (
				<div
					className={cn(
						'mt-6',
						viewMode === 'grid'
							? 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'
							: 'flex flex-col gap-2'
					)}
				>
					{showSkeleton ? (
						<TemplatesSkeleton viewMode={viewMode} />
					) : (
						filteredTemplates.map((template) => (
							<TemplateCard
								isAtMapLimit={isAtMapLimit}
								isCreating={isCreating}
								key={template.templateId}
								onUse={handleUseTemplate}
								onView={handleViewTemplate}
								template={template}
								viewMode={viewMode}
							/>
						))
					)}
				</div>
			)}

			{showEmpty && (
				<div className='flex flex-col items-center py-20 text-center'>
					<span className='flex size-11 items-center justify-center rounded-full border border-[#2a2c33] bg-[#0e0f12]'>
						<Search aria-hidden='true' className='size-4 text-zinc-400' />
					</span>

					<h2 className='mt-4 text-base font-semibold text-white'>
						No templates found
					</h2>

					<p className='mt-1 text-sm text-zinc-400'>
						Try another category or search term.
					</p>

					<button
						className='mt-5 h-9 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-4 text-sm text-white transition-colors duration-200 ease hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
						onClick={clearFilters}
						type='button'
					>
						Show all templates
					</button>
				</div>
			)}
		</div>
	);
}
