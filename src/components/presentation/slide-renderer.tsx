'use client';

/**
 * Slide Renderer Component
 *
 * Renders a single slide with content, animations, and styling.
 */

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { memo } from 'react';
import type { Slide } from '@/store/slices/presentation-slice';
import {
	Lightbulb,
	CheckSquare,
	Code,
	Link2,
	MessageSquare,
	FileText,
	HelpCircle,
	Image as ImageIcon,
	Layers,
	type LucideIcon,
} from 'lucide-react';

// Node type to icon mapping
const NODE_TYPE_ICONS: Record<string, LucideIcon> = {
	defaultNode: FileText,
	taskNode: CheckSquare,
	codeNode: Code,
	resourceNode: Link2,
	annotationNode: Lightbulb,
	questionNode: HelpCircle,
	imageNode: ImageIcon,
	groupNode: Layers,
	commentNode: MessageSquare,
};

// Depth-based colors for visual hierarchy
const DEPTH_COLORS = [
	{ bg: 'bg-gradient-to-br from-indigo-600 to-purple-700', text: 'text-white' },
	{ bg: 'bg-gradient-to-br from-sky-600 to-blue-700', text: 'text-white' },
	{ bg: 'bg-gradient-to-br from-emerald-600 to-teal-700', text: 'text-white' },
	{ bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-white' },
	{ bg: 'bg-gradient-to-br from-rose-500 to-pink-600', text: 'text-white' },
];

interface SlideRendererProps {
	slide: Slide;
	direction: number; // -1 for previous, 1 for next
	transitionDuration: number;
}

export const SlideRenderer = memo(function SlideRenderer({
	slide,
	direction,
	transitionDuration,
}: SlideRendererProps) {
	const Icon = NODE_TYPE_ICONS[slide.nodeType] || FileText;
	const colorScheme = DEPTH_COLORS[slide.depth % DEPTH_COLORS.length];

	// Determine if this is a title slide (depth 0)
	const isTitleSlide = slide.depth === 0;

	// Animation variants
	const variants = {
		enter: (dir: number) => ({
			x: dir > 0 ? '100%' : '-100%',
			opacity: 0,
		}),
		center: {
			x: 0,
			opacity: 1,
		},
		exit: (dir: number) => ({
			x: dir > 0 ? '-100%' : '100%',
			opacity: 0,
		}),
	};

	// Debug: log slide data
	console.log('[SlideRenderer] Rendering slide:', {
		id: slide.id,
		title: slide.title,
		content: slide.content,
		depth: slide.depth,
		nodeType: slide.nodeType,
		childSlides: slide.childSlides.length,
	});

	return (
		<div
			className={cn(
				'absolute inset-0 flex items-center justify-center',
				colorScheme.bg,
				colorScheme.text
			)}
		>
			<div
				className={cn(
					'max-w-4xl w-full mx-auto px-12',
					isTitleSlide ? 'text-center' : 'text-left'
				)}
			>
				{/* Node type indicator */}
				<div
					className={cn(
						'inline-flex items-center gap-2 mb-6',
						'px-3 py-1.5 rounded-full',
						'bg-white/10 backdrop-blur-sm'
					)}
				>
					<Icon className="w-4 h-4" />
					<span className="text-sm font-medium capitalize">
						{slide.nodeType.replace('Node', '')}
					</span>
				</div>

				{/* Title */}
				<h1
					className={cn(
						'font-bold mb-8 leading-tight',
						isTitleSlide ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'
					)}
				>
					{slide.title}
				</h1>

				{/* Content */}
				{slide.content && slide.content !== slide.title && (
					<div
						className={cn(
							'text-xl md:text-2xl opacity-90 leading-relaxed',
							'whitespace-pre-wrap'
						)}
					>
						{slide.content}
					</div>
				)}

				{/* Child slides preview (bullet points) */}
				{slide.childSlides.length > 0 && (
					<ul className="mt-8 space-y-3">
						{slide.childSlides.slice(0, 4).map((child) => (
							<li
								key={child.id}
								className="flex items-start gap-3 text-lg opacity-80"
							>
								<span className="text-2xl leading-none mt-0.5">•</span>
								<span>{child.title}</span>
							</li>
						))}
						{slide.childSlides.length > 4 && (
							<li className="text-lg opacity-60">
								... and {slide.childSlides.length - 4} more
							</li>
						)}
					</ul>
				)}

				{/* Metadata badges */}
				{slide.metadata && Object.keys(slide.metadata).length > 0 && (
					<div className="mt-8 flex flex-wrap gap-2">
						{'status' in slide.metadata && slide.metadata['status'] != null && (
							<span className="px-3 py-1 bg-white/20 rounded-full text-sm">
								{String(slide.metadata['status'])}
							</span>
						)}
						{'priority' in slide.metadata && slide.metadata['priority'] != null && (
							<span className="px-3 py-1 bg-white/20 rounded-full text-sm">
								Priority: {String(slide.metadata['priority'])}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
});
