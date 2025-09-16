'use client';

import { cn } from '@/utils/cn';
import { AlignLeft, Lightbulb, MessageSquare, Quote } from 'lucide-react';
import { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { BaseNodeWrapper } from './base-node-wrapper';

type AnnotationNodeProps = NodeProps<Node<NodeData>>;

// Refined color system for annotations - desaturated for dark theme
const annotationTypeInfo: Record<
	string,
	{ 
		icon: React.ElementType; 
		colorRgb: string; // Base RGB values for flexible opacity
		bgOpacity: number;
		borderOpacity: number;
	}
> = {
	comment: { 
		icon: MessageSquare, 
		colorRgb: '147, 197, 253', // Desaturated blue
		bgOpacity: 0.08,
		borderOpacity: 0.2,
	},
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

const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { id, data, selected } = props;

	const fontSize = data.metadata?.fontSize as string | number | undefined;
	const fontWeight = data.metadata?.fontWeight as string | number | undefined;
	const annotationType = (data.metadata?.annotationType as string) || 'default';

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

	const typeInfo = annotationTypeInfo[annotationType] || annotationTypeInfo.default;
	const TypeIcon = typeInfo.icon;
	const isQuote = annotationType === 'quote';

	// Create dynamic styles based on annotation type
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

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='annotation-node'
			nodeType='Annotation'
			nodeIcon={<TypeIcon className='size-4' />}
			hideNodeType
			elevation={1}
			includePadding={false}
		>
			{/* Custom annotation content with preserved styling */}
			<motion.div
				className={cn([
					'relative flex h-full min-h-20 min-w-80 flex-col gap-2 rounded-lg p-3 text-center',
				])}
				style={nodeStyles}
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.2 }}
			>
				{/* Quote-specific elegant layout */}
				{isQuote ? (
					<div className='relative flex flex-col items-center py-3 px-4'>
						{/* Large decorative quote marks - very subtle */}
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
							"
						</span>

						{/* Quote content with serif font for elegance */}
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
								<span style={{ 
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic' 
								}}>
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
							"
						</span>

						{/* Attribution line if available */}
						{data.metadata?.author && (
							<div className='mt-3 text-right w-full px-6'>
								<span style={{
									fontSize: '12px',
									color: `rgba(${typeInfo.colorRgb}, 0.87)`,
									fontWeight: 500,
								}}>
									— {data.metadata.author}
								</span>
							</div>
						)}
					</div>
				) : (
					<>
						{/* Default layout for other annotation types */}
						<div className='flex items-center justify-between mb-1'>
							{/* Icon and type label with refined styling */}
							<div className='flex items-center gap-2'>
								<div className='p-1.5 rounded'
									style={{
										backgroundColor: `rgba(${typeInfo.colorRgb}, 0.1)`,
										border: `1px solid rgba(${typeInfo.colorRgb}, 0.2)`,
									}}>
									<TypeIcon className='size-3.5' 
										style={{ color: `rgba(${typeInfo.colorRgb}, 0.87)` }} />
								</div>
								<span style={{
									fontSize: '11px',
									fontWeight: 500,
									letterSpacing: '0.05em',
									textTransform: 'uppercase',
									color: `rgba(${typeInfo.colorRgb}, 0.87)`,
								}}>
									{annotationType}
								</span>
							</div>

							{/* Timestamp if available */}
							{data.metadata?.timestamp && (
								<span style={{
									fontSize: '11px',
									color: 'rgba(255, 255, 255, 0.38)',
								}}>
									{new Date(data.metadata.timestamp).toLocaleDateString()}
								</span>
							)}
						</div>

						{/* Content area with proper text hierarchy */}
						<div
							className='text-left px-1'
							style={{
								...contentStyle,
								fontSize: fontSize || '14px',
								color: annotationType === 'idea' 
									? 'rgba(255, 255, 255, 0.87)' // High emphasis for ideas
									: 'rgba(255, 255, 255, 0.60)', // Medium emphasis for others
							}}
						>
							{data.content || (
								<span style={{ 
									color: 'rgba(255, 255, 255, 0.38)',
									fontStyle: 'italic',
									fontSize: '13px',
								}}>
									Add {annotationType}...
								</span>
							)}
						</div>

						{/* Priority or importance indicator for ideas */}
						{annotationType === 'idea' && data.metadata?.priority && (
							<div className='mt-2 flex items-center gap-1'>
								{[...Array(3)].map((_, i) => (
									<div
										key={i}
										className='w-1.5 h-1.5 rounded-full'
										style={{
											backgroundColor: i < (data.metadata?.priority as number)
												? `rgba(${typeInfo.colorRgb}, 0.6)`
												: 'rgba(255, 255, 255, 0.1)',
										}}
									/>
								))}
								<span style={{
									fontSize: '11px',
									color: 'rgba(255, 255, 255, 0.38)',
									marginLeft: '4px',
								}}>
									Priority
								</span>
							</div>
						)}

						{/* Tag system for better organization */}
						{data.metadata?.tags && Array.isArray(data.metadata.tags) && (
							<div className='flex flex-wrap gap-1 mt-2'>
								{data.metadata.tags.map((tag: string, index: number) => (
									<span
										key={index}
										className='px-2 py-0.5 rounded-full'
										style={{
											fontSize: '11px',
											backgroundColor: 'rgba(255, 255, 255, 0.05)',
											border: '1px solid rgba(255, 255, 255, 0.1)',
											color: 'rgba(255, 255, 255, 0.6)',
										}}
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</>
				)}

				{/* Hover effect - subtle glow */}
				<motion.div
					className='absolute inset-0 rounded-lg pointer-events-none'
					initial={{ opacity: 0 }}
					whileHover={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
					style={{
						background: `radial-gradient(circle at center, rgba(${typeInfo.colorRgb}, 0.05) 0%, transparent 70%)`,
						zIndex: -1,
					}}
				/>
			</motion.div>
		</BaseNodeWrapper>
	);
};

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;