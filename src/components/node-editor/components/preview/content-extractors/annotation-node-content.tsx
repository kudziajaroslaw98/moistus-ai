'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
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

interface AnnotationNodeContentProps {
	data: NodeData;
}

// Refined color system for annotations
const annotationTypeInfo: Record<
	string,
	{
		icon: React.ElementType;
		colorRgb: string;
		bgOpacity: number;
		borderOpacity: number;
	}
> = {
	// Standard annotation types (from pattern-extractor)
	note: {
		icon: MessageSquare,
		colorRgb: '147, 197, 253',
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
	// Legacy annotation types (for backward compatibility)
	idea: {
		icon: Lightbulb,
		colorRgb: '251, 191, 36',
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
	quote: {
		icon: Quote,
		colorRgb: '167, 139, 250',
		bgOpacity: 0.06,
		borderOpacity: 0.15,
	},
	summary: {
		icon: AlignLeft,
		colorRgb: '52, 211, 153',
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

/**
 * Annotation Node Content - Styled annotations
 * Extracted from: src/components/nodes/annotation-node.tsx
 */
const AnnotationNodeContentComponent = ({ data }: AnnotationNodeContentProps) => {
	const fontSize = data.metadata?.fontSize as string | number | undefined;
	const fontWeight = data.metadata?.fontWeight as string | number | undefined;
	const annotationType = (data.metadata?.annotationType as string) || 'default';

	const contentStyle = useMemo(() => {
		const style: React.CSSProperties = {
			lineHeight: 1.6,
			letterSpacing: '0.01em',
		};

		if (fontSize) {
			style.fontSize =
				typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
		}

		if (fontWeight && annotationType !== 'quote') {
			style.fontWeight = fontWeight;
		}

		return style;
	}, [fontSize, fontWeight, annotationType]);

	const typeInfo =
		annotationTypeInfo[annotationType] || annotationTypeInfo.default;
	const TypeIcon = typeInfo.icon;
	const isQuote = annotationType === 'quote';

	const nodeStyles: React.CSSProperties = {
		backgroundColor: `rgba(${typeInfo.colorRgb}, ${typeInfo.bgOpacity})`,
		border: `1px solid rgba(${typeInfo.colorRgb}, ${typeInfo.borderOpacity})`,
		backdropFilter: 'blur(8px)',
		WebkitBackdropFilter: 'blur(8px)',
	};

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.95 }}
			style={nodeStyles}
			transition={{ duration: 0.2 }}
			className={cn([
				'relative flex h-full min-h-20 min-w-80 flex-col gap-2 rounded-lg p-3 text-center',
			])}
		>
			{isQuote ? (
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

					{/* Quote content */}
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
						{data.content || (
							<span
								style={{
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic',
								}}
							>
								Add quote...
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
					{data.metadata?.author && (
						<div className='mt-3 text-right w-full px-6'>
							<span
								style={{
									fontSize: '12px',
									color: `rgba(${typeInfo.colorRgb}, 0.87)`,
									fontWeight: 500,
								}}
							>
								— {data.metadata.author as string}
							</span>
						</div>
					)}
				</div>
			) : (
				<>
					{/* Default layout for other annotation types */}
					<div className='flex items-center justify-between mb-1'>
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
						{data.content || (
							<span
								style={{
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic',
									fontSize: '13px',
								}}
							>
								Add {annotationType}...
							</span>
						)}
					</div>
				</>
			)}
		</motion.div>
	);
};

export const AnnotationNodeContent = memo(AnnotationNodeContentComponent);
AnnotationNodeContent.displayName = 'AnnotationNodeContent';
