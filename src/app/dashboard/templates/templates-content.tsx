'use client';

import {
	CARD_MENU_TRIGGER_CLASS,
	CardMenuIcon,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogEmptyState,
	CatalogGrid,
} from '@/components/dashboard/catalog-card';
import {
	CARD_BUTTON_CLASS,
	DashboardPage,
	PageHeading,
} from '@/components/dashboard/dashboard-page';
import { useDashboardSearch } from '@/components/dashboard/dashboard-shell-context';
import {
	CATEGORY_HUES,
	CATEGORY_ICONS,
} from '@/components/dashboard/template-category-style';
import {
	UnderlineTab,
	UnderlineTabsBar,
	UnderlineTabsList,
} from '@/components/dashboard/underline-tabs';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import { DeleteMapConfirmationDialog } from '@/components/mind-map/delete-map-confirmation-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs } from '@/components/ui/tabs';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { FileText, Pencil, Trash2 } from 'lucide-react';
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

// SWR fetcher with proper error handling
const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) {
		const errorBody = await res.text().catch(() => 'Unknown error');
		throw new Error(`HTTP ${res.status}: ${res.statusText || errorBody}`);
	}
	return res.json();
};

// Template Card Component
interface TemplateCardProps {
	template: TemplateFromAPI;
	onUse: (templateId: string) => void;
	onView: (templateDbId: string) => void;
	/** Admin-only; when set, the card gets an Edit/Delete menu. */
	onDelete?: (template: TemplateFromAPI) => void;
	isCreating: boolean;
	isAtMapLimit: boolean;
	viewMode: DashboardViewMode;
}

const TemplateCard = memo(function TemplateCard({
	template,
	onUse,
	onView,
	onDelete,
	isCreating,
	isAtMapLimit,
	viewMode,
}: TemplateCardProps) {
	return (
		<CatalogCard
			description={template.description}
			hue={CATEGORY_HUES[template.category] ?? 214}
			icon={CATEGORY_ICONS[template.category] ?? FileText}
			meta={`${template.nodeCount} nodes · ${template.usageCount} uses`}
			onOpen={() => onView(template.id)}
			title={template.name}
			viewMode={viewMode}
			action={
				<button
					className={CARD_BUTTON_CLASS}
					disabled={isCreating || isAtMapLimit}
					onClick={() => onUse(template.templateId)}
					type='button'
				>
					{isAtMapLimit ? 'Limit reached' : 'Use template'}
				</button>
			}
			chips={[{ label: TEMPLATE_CATEGORIES[template.category] }]}
			menu={
				onDelete ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label={`Options for ${template.name}`}
							className={CARD_MENU_TRIGGER_CLASS}
						>
							<CardMenuIcon />
						</DropdownMenuTrigger>

						<DropdownMenuContent align='end'>
							<DropdownMenuItem onClick={() => onView(template.id)}>
								<Pencil className='mr-2 size-4' />
								Edit template
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem
								onClick={() => onDelete(template)}
								variant='destructive'
							>
								<Trash2 className='mr-2 size-4' />
								Delete template
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : undefined
			}
		/>
	);
});

const TEMPLATES_INTRO =
	'Start from a ready-made structure. Pick one and it becomes your own map.';

/** The page before it mounts (templates/loading.tsx): same heading, empty tabs, card skeletons. */
export function TemplatesPageSkeleton() {
	return (
		<DashboardPage>
			<PageHeading intro={TEMPLATES_INTRO} title='Templates' />

			<div className='mt-9 h-11 border-b border-[#1d1f24]' />

			<CatalogGrid className='mt-6' viewMode='grid'>
				<CatalogCardSkeleton viewMode='grid' />
			</CatalogGrid>
		</DashboardPage>
	);
}

// Main Content Component
interface TemplatesContentProps {
	/** Resolved server-side from user_profiles.role; server routes re-check. */
	isAdmin?: boolean;
}

export function TemplatesContent({ isAdmin = false }: TemplatesContentProps) {
	const router = useRouter();
	const [viewMode, setViewMode] = useState<DashboardViewMode>('grid');
	const [selectedCategory, setSelectedCategory] = useState<
		TemplateCategory | 'all'
	>('all');
	// The field sits in the shell's top bar.
	const { query: searchQuery, setQuery: setSearchQuery } = useDashboardSearch();
	const [isCreating, setIsCreating] = useState(false);
	const [templateToDelete, setTemplateToDelete] =
		useState<TemplateFromAPI | null>(null);
	const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

	// Subscription limits for map creation
	const { isAtLimit, limits } = useSubscriptionLimits();
	const isAtMapLimit = isAtLimit('mindMaps');

	// Fetch templates
	const { data, error, isLoading, mutate } = useSWR<{
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

	// Admin: delete template (DELETE /api/maps/[id] admin branch)
	const handleConfirmDeleteTemplate = useCallback(async () => {
		if (!templateToDelete) return;

		setIsDeletingTemplate(true);
		try {
			const response = await fetch(`/api/maps/${templateToDelete.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
			});
			const result = await response.json().catch(() => null);

			if (!response.ok) {
				toast.error(result?.error || 'Failed to delete template.');
				return;
			}

			toast.success(`Deleted "${templateToDelete.name}" template`);
			setTemplateToDelete(null);
			await mutate();
		} catch (err) {
			console.error('Error deleting template:', err);
			toast.error('Network error. Please try again.');
		} finally {
			setIsDeletingTemplate(false);
		}
	}, [mutate, templateToDelete]);

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
		<DashboardPage>
			<PageHeading intro={TEMPLATES_INTRO} title='Templates' />

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
				<CatalogGrid className='mt-6' viewMode={viewMode}>
					{showSkeleton ? (
						<CatalogCardSkeleton viewMode={viewMode} />
					) : (
						filteredTemplates.map((template) => (
							<TemplateCard
								isAtMapLimit={isAtMapLimit}
								isCreating={isCreating}
								key={template.templateId}
								onUse={handleUseTemplate}
								onView={handleViewTemplate}
								onDelete={isAdmin ? setTemplateToDelete : undefined}
								template={template}
								viewMode={viewMode}
							/>
						))
					)}
				</CatalogGrid>
			)}

			{showEmpty && (
				<CatalogEmptyState
					actionLabel='Show all templates'
					hint='Try another category or search term.'
					onAction={clearFilters}
					title='No templates found'
				/>
			)}

			{isAdmin && (
				<DeleteMapConfirmationDialog
					edgeCount={templateToDelete?.edgeCount ?? 0}
					isDeleting={isDeletingTemplate}
					mapTitle={templateToDelete?.name ?? ''}
					nodeCount={templateToDelete?.nodeCount ?? 0}
					open={templateToDelete !== null}
					onConfirm={handleConfirmDeleteTemplate}
					onOpenChange={(open) => {
						if (!open && !isDeletingTemplate) setTemplateToDelete(null);
					}}
				/>
			)}
		</DashboardPage>
	);
}
