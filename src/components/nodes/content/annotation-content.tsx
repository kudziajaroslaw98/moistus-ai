'use client';

import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	AlignLeft,
	CheckCircle2,
	Info,
	Lightbulb,
	MessageSquare,
	Quote,
	XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useMemo } from 'react';

export interface AnnotationTypeInfo {
	icon: React.ElementType;
	colorRgb: string;
	bgOpacity: number;
	borderOpacity: number;
}

/**
 * Annotation type configurations
 * Includes both legacy types (note, idea, quote, summary)
 * and pattern-extractor types (warning, success, info, error)
 */
export const ANNOTATION_TYPES: Record<string, AnnotationTypeInfo> = {
	// Standard annotation types (from pattern-extractor)
	note: {
		icon: MessageSquare,
		colorRgb: '147, 197, 253', // Desaturated blue
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	warning: {
		icon: AlertTriangle,
		colorRgb: '251, 191, 36', // Amber
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	success: {
		icon: CheckCircle2,
		colorRgb: '52, 211, 153', // Green
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	info: {
		icon: Info,
		colorRgb: '59, 130, 246', // Blue
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	error: {
		icon: XCircle,
		colorRgb: '239, 68, 68', // Red
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	// Legacy annotation types
	idea: {
		icon: Lightbulb,
		colorRgb: '251, 191, 36', // Desaturated amber
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	quote: {
		icon: Quote,
		colorRgb: '167, 139, 250', // Desaturated violet
		bgOpacity: 0.06,
		borderOpacity: 0.15,
	},
	summary: {
		icon: AlignLeft,
		colorRgb: '52, 211, 153', // Desaturated emerald
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	default: {
		icon: MessageSquare,
		colorRgb: '255, 255, 255',
		bgOpacity: 0.05,
		borderOpacity: 0.1,
	},
};

export interface AnnotationContentProps {
	/** Content text */
	content?: string | null;
	/** Annotation type (note, idea, quote, warning, etc.) */
	annotationType?: string;
	/** Font size override */
	fontSize?: string | number;
	/** Font weight override */
	fontWeight?: string | number;
	/** Author attribution (for quotes) */
	author?: string;
	/** Timestamp to display */
	timestamp?: string | number;
	/** Placeholder text when no content */
	placeholder?: string;
	/** Whether the node is selected (adds glow effect) */
	selected?: boolean;
	/** Whether to show hover glow effect */
	showHoverEffect?: boolean;
	/** Additional class name */
	className?: string;
}

/**
 * Annotation Content Component
 *
 * Pure rendering component for annotations with type-based styling.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - 8 annotation types with unique colors/icons
 * - Special quote layout with decorative marks
 * - Optional selection glow and hover effects
 * - Author attribution for quotes
 * - Timestamp display
 */
const AnnotationContentComponent = ({
	content,
	annotationType = 'default',
	fontSize,
	fontWeight,
	author,
	timestamp,
	placeholder,
	selected = false,
	showHoverEffect = false,
	className,
}: AnnotationContentProps) => {
	const contentStyle = useMemo(() => {
		const style: React.CSSProperties = {
			lineHeight: 1.6,
			letterSpacing: '0.01em',
		};

		if (fontSize) {
			style.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
		}

		if (fontWeight && annotationType !== 'quote') {
			style.fontWeight = fontWeight;
		}

		return style;
	}, [fontSize, fontWeight, annotationType]);

	const typeInfo = ANNOTATION_TYPES[annotationType] || ANNOTATION_TYPES.default;
	const TypeIcon = typeInfo.icon;
	const isQuote = annotationType === 'quote';

	const nodeStyles: React.CSSProperties = {
		backgroundColor: `rgba(${typeInfo.colorRgb}, ${typeInfo.bgOpacity})`,
		border: `1px solid rgba(${typeInfo.colorRgb}, ${typeInfo.borderOpacity})`,
		backdropFilter: 'blur(8px)',
		WebkitBackdropFilter: 'blur(8px)',
		boxShadow: selected
			? `0 0 0 1px rgba(${typeInfo.colorRgb}, 0.4), inset 0 0 0 1px rgba(${typeInfo.colorRgb}, 0.2)`
			: 'none',
		transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
	};

	const defaultPlaceholder = isQuote ? 'Add quote...' : `Add ${annotationType}...`;

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.95 }}
			style={nodeStyles}
			transition={{ duration: 0.2 }}
			className={cn([
				'relative flex h-full min-h-20 min-w-80 flex-col gap-2 rounded-lg p-3 text-center',
				className,
			])}
		>
			{isQuote ? (
				// Quote-specific elegant layout
				<div className='relative flex flex-col items-center py-3 px-4'>
					{/* Large decorative quote marks */}
					<span
						aria-hidden='true'
						className='absolute -top-2 -left-2 pointer-events-none select-none'
						style={{
							fontSize: '48px',
							lineHeight: '1',
							color: `rgba(${typeInfo.colorRgb}, 0.1)`,
							fontFamily: 'Georgia, serif',
							fontWeight: 300,
						}}
					>
						&quot;
					</span>

					{/* Quote content with serif font */}
					<div
						className='relative z-10 px-6'
						style={{
							...contentStyle,
							fontFamily: 'Georgia, serif',
							fontStyle: 'italic',
							fontSize: fontSize || '15px',
							color: 'rgba(255, 255, 255, 0.87)',
							textAlign: 'center',
						}}
					>
						{content || (
							<span
								style={{
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic',
								}}
							>
								{placeholder || defaultPlaceholder}
							</span>
						)}
					</div>

					<span
						aria-hidden='true'
						className='absolute -bottom-2 -right-2 pointer-events-none select-none'
						style={{
							fontSize: '48px',
							lineHeight: '0.5',
							color: `rgba(${typeInfo.colorRgb}, 0.1)`,
							fontFamily: 'Georgia, serif',
							fontWeight: 300,
						}}
					>
						&quot;
					</span>

					{/* Attribution */}
					{author && (
						<div className='mt-3 text-right w-full px-6'>
							<span
								style={{
									fontSize: '12px',
									color: `rgba(${typeInfo.colorRgb}, 0.87)`,
									fontWeight: 500,
								}}
							>
								— {author}
							</span>
						</div>
					)}
				</div>
			) : (
				// Default layout for other annotation types
				<>
					<div className='flex items-center justify-between mb-1'>
						{/* Icon and type label */}
						<div className='flex items-center gap-2'>
							<div
								className='p-1.5 rounded'
								style={{
									backgroundColor: `rgba(${typeInfo.colorRgb}, 0.1)`,
									border: `1px solid rgba(${typeInfo.colorRgb}, 0.2)`,
								}}
							>
								<TypeIcon
									className='size-3.5'
									style={{ color: `rgba(${typeInfo.colorRgb}, 0.87)` }}
								/>
							</div>

							<span
								style={{
									fontSize: '11px',
									fontWeight: 500,
									letterSpacing: '0.05em',
									textTransform: 'uppercase',
									color: `rgba(${typeInfo.colorRgb}, 0.87)`,
								}}
							>
								{annotationType}
							</span>
						</div>

						{/* Timestamp */}
						{timestamp && (
							<span
								style={{
									fontSize: '11px',
									color: 'rgba(255, 255, 255, 0.38)',
								}}
							>
								{new Date(timestamp).toLocaleDateString()}
							</span>
						)}
					</div>

					{/* Content area */}
					<div
						className='text-left px-1'
						style={{
							...contentStyle,
							fontSize: fontSize || '14px',
							color:
								annotationType === 'idea'
									? 'rgba(255, 255, 255, 0.87)'
									: 'rgba(255, 255, 255, 0.60)',
						}}
					>
						{content || (
							<span
								style={{
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic',
									fontSize: '13px',
								}}
							>
								{placeholder || defaultPlaceholder}
							</span>
						)}
					</div>
				</>
			)}

			{/* Hover effect - subtle glow */}
			{showHoverEffect && (
				<motion.div
					className='absolute inset-0 rounded-lg pointer-events-none'
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					whileHover={{ opacity: 1 }}
					style={{
						background: `radial-gradient(circle at center, rgba(${typeInfo.colorRgb}, 0.05) 0%, transparent 70%)`,
						zIndex: -1,
					}}
				/>
			)}
		</motion.div>
	);
};

export const AnnotationContent = memo(AnnotationContentComponent);
AnnotationContent.displayName = 'AnnotationContent';

/**
 * Get annotation type info for external use
 * Useful for BaseNodeWrapper metadataColorOverrides
 */
export function getAnnotationTypeInfo(annotationType: string): AnnotationTypeInfo {
	return ANNOTATION_TYPES[annotationType] || ANNOTATION_TYPES.default;
}
