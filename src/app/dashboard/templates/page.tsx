'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { cn } from '@/utils/cn';
import {
	BarChart,
	BookOpen,
	Briefcase,
	Calendar,
	Code,
	FileText,
	GraduationCap,
	Grid3x3,
	Lightbulb,
	List,
	Loader2,
	Plus,
	User,
	Zap,
	type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

// Category metadata
const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: LucideIcon }> = {
	creative: { label: 'Creative', icon: Lightbulb },
	productivity: { label: 'Productivity', icon: Zap },
	planning: { label: 'Planning', icon: Calendar },
	analysis: { label: 'Analysis', icon: BarChart },
	business: { label: 'Business', icon: Briefcase },
	education: { label: 'Education', icon: GraduationCap },
	personal: { label: 'Personal', icon: User },
	technical: { label: 'Technical', icon: Code },
};

// Category colors
const CATEGORY_COLORS: Record<TemplateCategory, string> = {
	productivity: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
	planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
	analysis: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
	creative: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
	business: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
	education: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
	personal: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
	technical: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
	Lightbulb,
	Calendar,
	BarChart,
	Zap,
	Briefcase,
	GraduationCap,
	User,
	Code,
	FileText,
	BookOpen,
};

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Template Card Component
interface TemplateCardProps {
	template: TemplateFromAPI;
	onUse: (templateId: string) => void;
	onView: (templateDbId: string) => void;
	isCreating: boolean;
	viewMode: 'grid' | 'list';
	index: number;
}

const TemplateCard = memo(function TemplateCard({
	template,
	onUse,
	onView,
	isCreating,
	viewMode,
	index,
}: TemplateCardProps) {
	const [isHovered, setIsHovered] = useState(false);
	const Icon = ICON_MAP[template.icon] || FileText;
	const CategoryIcon = TEMPLATE_CATEGORIES[template.category]?.icon || FileText;

	const gradientStyle = useMemo(() => {
		if (!template.previewColors?.length) {
			return { background: 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)' };
		}
		const colors = template.previewColors;
		return {
			background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 50%, ${colors[2] || colors[0]} 100%)`,
		};
	}, [template.previewColors]);

	const handleCardClick = () => {
		onView(template.id); // Use the DB id for navigation
	};

	const handleUseClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent card click
		onUse(template.templateId);
	};

	if (viewMode === 'list') {
		return (
			<motion.div
				initial={{ opacity: 0, x: -12 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: index * 0.02, duration: 0.2 }}
				onClick={handleCardClick}
				className={cn(
					'group flex items-center gap-4 p-4 rounded-xl cursor-pointer',
					'bg-zinc-900/50 border border-zinc-800/50',
					'hover:bg-zinc-800/50 hover:border-zinc-700/50',
					'transition-all duration-200'
				)}
			>
				{/* Icon */}
				<div
					className='w-12 h-12 rounded-lg flex items-center justify-center shrink-0'
					style={gradientStyle}
				>
					<Icon className='w-6 h-6 text-white' />
				</div>

				{/* Content */}
				<div className='flex-grow min-w-0'>
					<div className='flex items-center gap-2 mb-1'>
						<h3 className='font-medium text-white truncate'>{template.name}</h3>
						<span
							className={cn(
								'px-2 py-0.5 rounded-full text-xs font-medium border',
								CATEGORY_COLORS[template.category]
							)}
						>
							{TEMPLATE_CATEGORIES[template.category]?.label}
						</span>
					</div>
					<p className='text-sm text-zinc-400 line-clamp-1'>{template.description}</p>
				</div>

				{/* Stats */}
				<div className='hidden sm:flex items-center gap-4 text-xs text-zinc-500'>
					<span>{template.nodeCount} nodes</span>
					<span>{template.usageCount} uses</span>
				</div>

				{/* Action */}
				<Button
					size='sm'
					onClick={handleUseClick}
					disabled={isCreating}
					className='opacity-0 group-hover:opacity-100 transition-opacity'
				>
					<Plus className='w-4 h-4 mr-1' />
					Use
				</Button>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.03, duration: 0.2 }}
			onClick={handleCardClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={cn(
				'group relative rounded-xl overflow-hidden cursor-pointer',
				'bg-zinc-900/50 border border-zinc-800/50',
				'hover:border-zinc-700/50',
				'transition-all duration-200'
			)}
		>
			{/* Preview Header */}
			<div className='relative h-32' style={gradientStyle}>
				<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20' />

				{/* Icon */}
				<div
					className={cn(
						'absolute top-3 left-3 p-2 rounded-lg',
						'bg-black/30 backdrop-blur-sm',
						'transition-transform duration-200',
						isHovered && 'scale-110'
					)}
				>
					<Icon className='w-5 h-5 text-white/90' />
				</div>

				{/* Category Badge */}
				<div
					className={cn(
						'absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full',
						'text-xs font-medium border backdrop-blur-sm',
						CATEGORY_COLORS[template.category]
					)}
				>
					<CategoryIcon className='w-3 h-3' />
					{TEMPLATE_CATEGORIES[template.category]?.label}
				</div>

				{/* Title overlay */}
				<div className='absolute bottom-0 left-0 right-0 p-3'>
					<h3 className='text-white font-medium text-sm truncate'>{template.name}</h3>
				</div>
			</div>

			{/* Content */}
			<div className='p-3'>
				<p className='text-xs text-zinc-400 line-clamp-2 mb-3 min-h-[2.5rem]'>
					{template.description}
				</p>

				{/* Stats & Action */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3 text-xs text-zinc-500'>
						<span>{template.nodeCount} nodes</span>
						<span>•</span>
						<span>{template.usageCount} uses</span>
					</div>

					<Button
						size='sm'
						variant='ghost'
						onClick={handleUseClick}
						disabled={isCreating}
						className={cn(
							'h-7 px-2 text-xs',
							'opacity-0 group-hover:opacity-100',
							'transition-opacity duration-200'
						)}
					>
						<Plus className='w-3.5 h-3.5 mr-1' />
						Use
					</Button>
				</div>
			</div>
		</motion.div>
	);
});

// Category Filter Component
interface CategoryFilterProps {
	selectedCategory: TemplateCategory | 'all';
	onSelectCategory: (category: TemplateCategory | 'all') => void;
	templatesByCategory: Record<TemplateCategory, TemplateFromAPI[]>;
	totalCount: number;
}

const CategoryFilter = memo(function CategoryFilter({
	selectedCategory,
	onSelectCategory,
	templatesByCategory,
	totalCount,
}: CategoryFilterProps) {
	const categories = Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[];

	return (
		<div className='flex flex-wrap gap-2'>
			{/* All button */}
			<button
				onClick={() => onSelectCategory('all')}
				className={cn(
					'px-3 py-1.5 rounded-full text-sm font-medium',
					'transition-all duration-200',
					'border',
					selectedCategory === 'all'
						? 'bg-zinc-700 text-white border-zinc-600'
						: 'text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-300'
				)}
			>
				All ({totalCount})
			</button>

			{/* Category buttons */}
			{categories.map((category) => {
				const meta = TEMPLATE_CATEGORIES[category];
				const count = templatesByCategory[category]?.length || 0;
				if (count === 0) return null;

				const CategoryIcon = meta.icon;
				const isSelected = selectedCategory === category;

				return (
					<button
						key={category}
						onClick={() => onSelectCategory(category)}
						className={cn(
							'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
							'transition-all duration-200',
							'border',
							isSelected
								? CATEGORY_COLORS[category]
								: 'text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-300'
						)}
					>
						<CategoryIcon className='w-3.5 h-3.5' />
						<span>{meta.label}</span>
						<span className='text-xs opacity-60'>({count})</span>
					</button>
				);
			})}
		</div>
	);
});

// Main Page Component
function TemplatesPageContent() {
	const router = useRouter();
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
	const [isCreating, setIsCreating] = useState(false);

	// Auth check
	const { isChecking } = useAuthRedirect({
		blockAnonymous: true,
		redirectMessage: 'Please sign in to browse templates',
	});

	// Fetch templates
	const { data, error, isLoading } = useSWR<{ data: { templates: TemplateFromAPI[] } }>(
		'/api/templates',
		fetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 60000,
		}
	);

	const templates = data?.data?.templates || [];

	// Group by category
	const templatesByCategory = useMemo(() => {
		const grouped = {} as Record<TemplateCategory, TemplateFromAPI[]>;
		Object.keys(TEMPLATE_CATEGORIES).forEach((cat) => {
			grouped[cat as TemplateCategory] = [];
		});
		templates.forEach((t) => {
			if (grouped[t.category]) {
				grouped[t.category].push(t);
			}
		});
		return grouped;
	}, [templates]);

	// Filter templates
	const filteredTemplates = useMemo(() => {
		if (selectedCategory === 'all') return templates;
		return templatesByCategory[selectedCategory] || [];
	}, [selectedCategory, templates, templatesByCategory]);

	// View template (navigate to mind-map view)
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

				if (!response.ok) {
					throw new Error('Failed to create map');
				}

				const { data: responseData } = await response.json();
				toast.success(`Created "${template.name}" map!`);
				router.push(`/mind-map/${responseData.map?.id}`);
			} catch (err) {
				console.error('Error creating map from template:', err);
				toast.error('Failed to create map from template');
			} finally {
				setIsCreating(false);
			}
		},
		[templates, router]
	);

	if (isChecking) {
		return (
			<DashboardLayout>
				<div className='flex min-h-screen items-center justify-center'>
					<div className='h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-sky-500' />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className='p-6 md:p-8'>
				<div className='mx-auto max-w-7xl'>
					{/* Header */}
					<div className='mb-8'>
						<h1 className='text-3xl font-bold text-white tracking-tight mb-2'>
							Templates
						</h1>
						<p className='text-zinc-400'>
							Browse {templates.length} pre-built templates to jumpstart your mind maps
						</p>
					</div>

					{/* Toolbar */}
					<div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6'>
						{/* Category Filter */}
						<CategoryFilter
							selectedCategory={selectedCategory}
							onSelectCategory={setSelectedCategory}
							templatesByCategory={templatesByCategory}
							totalCount={templates.length}
						/>

						{/* View Mode */}
						<div className='flex items-center rounded-lg bg-zinc-800/30 border border-zinc-700/50 p-1'>
							<Button
								onClick={() => setViewMode('grid')}
								size='sm'
								variant='ghost'
								className={cn('h-8 px-3', viewMode === 'grid' && 'bg-zinc-700')}
							>
								<Grid3x3 className='h-4 w-4' />
							</Button>
							<Button
								onClick={() => setViewMode('list')}
								size='sm'
								variant='ghost'
								className={cn('h-8 px-3', viewMode === 'list' && 'bg-zinc-700')}
							>
								<List className='h-4 w-4' />
							</Button>
						</div>
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className='flex items-center justify-center h-64'>
							<Loader2 className='w-8 h-8 text-zinc-500 animate-spin' />
						</div>
					)}

					{/* Error State */}
					{error && (
						<div className='flex items-center justify-center h-64 text-zinc-500'>
							<p>Failed to load templates. Please try again.</p>
						</div>
					)}

					{/* Templates Grid/List */}
					{!isLoading && !error && (
						<AnimatePresence mode='popLayout'>
							<div
								className={cn(
									viewMode === 'grid'
										? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
										: 'space-y-2'
								)}
							>
								{filteredTemplates.map((template, index) => (
									<TemplateCard
										key={template.templateId}
										template={template}
										onUse={handleUseTemplate}
										onView={handleViewTemplate}
										isCreating={isCreating}
										viewMode={viewMode}
										index={index}
									/>
								))}
							</div>
						</AnimatePresence>
					)}

					{/* Empty State */}
					{!isLoading && !error && filteredTemplates.length === 0 && (
						<div className='flex flex-col items-center justify-center h-64 text-zinc-500'>
							<FileText className='w-12 h-12 mb-4 opacity-50' />
							<p>No templates found in this category</p>
							<Button
								variant='ghost'
								onClick={() => setSelectedCategory('all')}
								className='mt-2'
							>
								View all templates
							</Button>
						</div>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
}

export default function TemplatesPage() {
	return (
		<SidebarProvider>
			<TemplatesPageContent />
		</SidebarProvider>
	);
}
