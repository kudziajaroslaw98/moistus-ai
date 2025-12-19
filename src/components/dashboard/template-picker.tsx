'use client';

import { cn } from '@/utils/cn';
import {
	BarChart,
	BookOpen,
	BookText,
	Brain,
	Briefcase,
	Calendar,
	CheckCircle,
	ClipboardList,
	Code,
	Coffee,
	FileJson,
	FileText,
	FolderKanban,
	GraduationCap,
	Grid2x2,
	HelpCircle,
	Layers,
	LayoutGrid,
	Lightbulb,
	ListChecks,
	Loader2,
	Map,
	Network,
	PartyPopper,
	RotateCcw,
	Route,
	Scale,
	Target,
	Trophy,
	User,
	Users,
	Zap,
	type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

// Types for API response
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
const TEMPLATE_CATEGORIES: Record<
	TemplateCategory,
	{ label: string; icon: string }
> = {
	creative: { label: 'Creative', icon: 'Lightbulb' },
	productivity: { label: 'Productivity', icon: 'Zap' },
	planning: { label: 'Planning', icon: 'Calendar' },
	analysis: { label: 'Analysis', icon: 'BarChart' },
	business: { label: 'Business', icon: 'Briefcase' },
	education: { label: 'Education', icon: 'GraduationCap' },
	personal: { label: 'Personal', icon: 'User' },
	technical: { label: 'Technical', icon: 'Code' },
};

// Icon mapping for templates
const ICON_MAP: Record<string, LucideIcon> = {
	Lightbulb,
	FolderKanban,
	Calendar,
	Grid2x2,
	Users,
	FileText,
	LayoutGrid,
	Target,
	BookOpen,
	GraduationCap,
	ClipboardList,
	Trophy,
	Scale,
	CheckCircle,
	Network,
	FileJson,
	Layers,
	RotateCcw,
	BookText,
	ListChecks,
	HelpCircle,
	Map,
	PartyPopper,
	Brain,
	Route,
	Coffee,
	Zap,
	BarChart,
	Briefcase,
	Code,
	User,
};

// Category icon mapping
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
	Zap,
	Calendar,
	BarChart,
	Lightbulb,
	Briefcase,
	GraduationCap,
	User,
	Code,
};

// Category badge colors
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

// Category filter button colors
const CATEGORY_FILTER_COLORS: Record<TemplateCategory | 'all', string> = {
	all: 'data-[selected=true]:bg-zinc-700 data-[selected=true]:text-white',
	productivity:
		'data-[selected=true]:bg-emerald-500/20 data-[selected=true]:text-emerald-400',
	planning:
		'data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-400',
	analysis:
		'data-[selected=true]:bg-amber-500/20 data-[selected=true]:text-amber-400',
	creative:
		'data-[selected=true]:bg-purple-500/20 data-[selected=true]:text-purple-400',
	business:
		'data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-indigo-400',
	education:
		'data-[selected=true]:bg-cyan-500/20 data-[selected=true]:text-cyan-400',
	personal:
		'data-[selected=true]:bg-pink-500/20 data-[selected=true]:text-pink-400',
	technical:
		'data-[selected=true]:bg-slate-500/20 data-[selected=true]:text-slate-400',
};

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TemplateCardProps {
	template: TemplateFromAPI | null; // null = blank map
	isSelected: boolean;
	onSelect: (templateId: string | null) => void;
	index: number;
}

const TemplateCard = memo(function TemplateCard({
	template,
	isSelected,
	onSelect,
	index,
}: TemplateCardProps) {
	const [isHovered, setIsHovered] = useState(false);

	// Get icon component
	const Icon = template ? ICON_MAP[template.icon] || FileText : FileText;

	// Generate gradient from preview colors
	const gradientStyle = useMemo(() => {
		if (!template?.previewColors) {
			return {
				background: 'linear-gradient(135deg, #3f3f46 0%, #27272a 100%)',
			};
		}
		const colors = template.previewColors;
		return {
			background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 50%, ${colors[2] || colors[0]} 100%)`,
		};
	}, [template?.previewColors]);

	const handleClick = useCallback(() => {
		// Use templateId (slug) for selection, not the UUID
		onSelect(template?.templateId || null);
	}, [template?.templateId, onSelect]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onSelect(template?.templateId || null);
			}
		},
		[template?.templateId, onSelect]
	);

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -12 }}
			transition={{
				delay: index * 0.03,
				duration: 0.2,
				ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
			}}
			layoutId={template?.templateId || 'blank'}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			role='button'
			tabIndex={0}
			aria-pressed={isSelected}
			aria-label={
				template ? `Select ${template.name} template` : 'Start with blank map'
			}
			className={cn(
				'group relative cursor-pointer rounded-xl overflow-hidden',
				'transition-all duration-200',
				'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-950',
				isSelected && 'ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-950'
			)}
		>
			{/* Card background with gradient preview */}
			<div
				className={cn(
					'relative h-28 w-full',
					'transition-transform duration-200',
					(isHovered || isSelected) && 'scale-[1.02]'
				)}
				style={gradientStyle}
			>
				{/* Overlay for better text contrast */}
				<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20' />

				{/* Icon */}
				<div
					className={cn(
						'absolute top-2.5 left-2.5 p-1.5 rounded-lg',
						'bg-black/30 backdrop-blur-sm',
						'transition-transform duration-200',
						(isHovered || isSelected) && 'scale-110'
					)}
				>
					<Icon className='w-4 h-4 text-white/90' />
				</div>

				{/* Category badge */}
				{template && TEMPLATE_CATEGORIES[template.category] && (
					<div
						className={cn(
							'absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-full',
							'text-[9px] font-medium border backdrop-blur-sm',
							CATEGORY_COLORS[template.category]
						)}
					>
						{TEMPLATE_CATEGORIES[template.category].label}
					</div>
				)}

				{/* Content */}
				<div className='absolute bottom-0 left-0 right-0 p-2.5'>
					<h4 className='text-white font-medium text-xs mb-0.5 truncate'>
						{template?.name || 'Blank Map'}
					</h4>
					<p className='text-white/60 text-[10px] line-clamp-2 leading-tight'>
						{template?.description || 'Start from scratch with an empty canvas'}
					</p>
				</div>

				{/* Selection indicator */}
				{isSelected && (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: 'spring', stiffness: 500, damping: 30 }}
						className='absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center'
					>
						<svg
							className='w-2.5 h-2.5 text-white'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
							strokeWidth={3}
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d='M5 13l4 4L19 7'
							/>
						</svg>
					</motion.div>
				)}

				{/* Hover overlay */}
				<motion.div
					initial={false}
					animate={{ opacity: isHovered && !isSelected ? 1 : 0 }}
					transition={{ duration: 0.15 }}
					className='absolute inset-0 bg-sky-500/10 pointer-events-none'
				/>
			</div>
		</motion.div>
	);
});

interface CategoryFilterProps {
	selectedCategory: TemplateCategory | 'all';
	onSelectCategory: (category: TemplateCategory | 'all') => void;
	templates: TemplateFromAPI[];
	templatesByCategory: Record<TemplateCategory, TemplateFromAPI[]>;
}

const CategoryFilter = memo(function CategoryFilter({
	selectedCategory,
	onSelectCategory,
	templates,
	templatesByCategory,
}: CategoryFilterProps) {
	const categories = Object.keys(templatesByCategory) as TemplateCategory[];

	return (
		<div className='flex flex-wrap gap-1.5'>
			{/* All button */}
			<button
				onClick={() => onSelectCategory('all')}
				data-selected={selectedCategory === 'all'}
				className={cn(
					'px-2.5 py-1 rounded-full text-xs font-medium',
					'transition-all duration-200',
					'border border-transparent',
					'hover:bg-zinc-800',
					CATEGORY_FILTER_COLORS.all,
					selectedCategory !== 'all' && 'text-zinc-400'
				)}
			>
				All ({templates.length})
			</button>

			{/* Category buttons */}
			{categories.map((category) => {
				const categoryMeta = TEMPLATE_CATEGORIES[category];
				if (!categoryMeta) return null;

				const CategoryIcon =
					CATEGORY_ICON_MAP[categoryMeta.icon] || Lightbulb;
				const count = templatesByCategory[category]?.length || 0;

				return (
					<button
						key={category}
						onClick={() => onSelectCategory(category)}
						data-selected={selectedCategory === category}
						className={cn(
							'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
							'transition-all duration-200',
							'border border-transparent',
							'hover:bg-zinc-800',
							CATEGORY_FILTER_COLORS[category],
							selectedCategory !== category && 'text-zinc-400'
						)}
					>
						<CategoryIcon className='w-3 h-3' />
						<span>{categoryMeta.label}</span>
						<span className='text-[10px] opacity-60'>({count})</span>
					</button>
				);
			})}
		</div>
	);
});

interface TemplatePickerProps {
	selectedTemplateId: string | null;
	onSelectTemplate: (templateId: string | null) => void;
	className?: string;
}

export function TemplatePicker({
	selectedTemplateId,
	onSelectTemplate,
	className,
}: TemplatePickerProps) {
	const [selectedCategory, setSelectedCategory] = useState<
		TemplateCategory | 'all'
	>('all');

	// Fetch templates from API
	const { data, error, isLoading } = useSWR<{
		data: { templates: TemplateFromAPI[] };
	}>('/api/templates', fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60000, // Cache for 1 minute
	});

	const templates = data?.data?.templates || [];

	// Group templates by category
	const templatesByCategory = useMemo(() => {
		const grouped: Record<TemplateCategory, TemplateFromAPI[]> = {
			creative: [],
			productivity: [],
			planning: [],
			analysis: [],
			business: [],
			education: [],
			personal: [],
			technical: [],
		};

		templates.forEach((template) => {
			if (grouped[template.category]) {
				grouped[template.category].push(template);
			}
		});

		return grouped;
	}, [templates]);

	// Filter templates by category
	const filteredTemplates = useMemo(() => {
		if (selectedCategory === 'all') {
			return templates;
		}
		return templatesByCategory[selectedCategory] || [];
	}, [selectedCategory, templates, templatesByCategory]);

	// Loading state
	if (isLoading) {
		return (
			<div className={cn('space-y-3', className)}>
				<div className='flex items-center justify-center h-40'>
					<Loader2 className='w-6 h-6 text-zinc-500 animate-spin' />
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className={cn('space-y-3', className)}>
				<div className='flex items-center justify-center h-40 text-zinc-500'>
					<p className='text-sm'>Failed to load templates</p>
				</div>
			</div>
		);
	}

	const categoryCount = Object.values(templatesByCategory).filter(
		(arr) => arr.length > 0
	).length;

	return (
		<div className={cn('space-y-3', className)}>
			{/* Section header */}
			<div className='flex items-center justify-between'>
				<div>
					<h3 className='text-sm font-medium text-zinc-300'>
						Choose a template
					</h3>
					<p className='text-xs text-zinc-500 mt-0.5'>
						{templates.length} templates across {categoryCount} categories
					</p>
				</div>
			</div>

			{/* Category filter */}
			<CategoryFilter
				selectedCategory={selectedCategory}
				onSelectCategory={setSelectedCategory}
				templates={templates}
				templatesByCategory={templatesByCategory}
			/>

			{/* Template grid */}
			<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 p-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700'>
				{/* Blank map option - always first when showing all */}
				{selectedCategory === 'all' && (
					<TemplateCard
						key='blank'
						template={null}
						isSelected={selectedTemplateId === null}
						onSelect={onSelectTemplate}
						index={0}
					/>
				)}

				{/* Template options */}
				{filteredTemplates.map((template, index) => (
					<TemplateCard
						key={template.templateId}
						template={template}
						isSelected={selectedTemplateId === template.templateId}
						onSelect={onSelectTemplate}
						index={selectedCategory === 'all' ? index + 1 : index}
					/>
				))}
			</div>
		</div>
	);
}

export default TemplatePicker;
