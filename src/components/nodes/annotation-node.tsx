'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps, NodeResizer } from '@xyflow/react';
import { AlignLeft, Lightbulb, MessageSquare, Quote } from 'lucide-react';
import { memo, useMemo } from 'react';

type AnnotationNodeProps = NodeProps<Node<NodeData>>;

const annotationTypeInfo: Record<
	string,
	{ icon: React.ElementType; textColorClass: string }
> = {
	comment: { icon: MessageSquare, textColorClass: 'text-zinc-400' },
	idea: { icon: Lightbulb, textColorClass: 'text-yellow-400' },
	quote: { icon: Quote, textColorClass: 'text-blue-300' },
	summary: { icon: AlignLeft, textColorClass: 'text-green-400' },
	default: { icon: MessageSquare, textColorClass: 'text-zinc-400' },
};

const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { id, data, selected } = props;

	const fontSize = data.metadata?.fontSize as string | number | undefined;
	const fontWeight = data.metadata?.fontWeight as string | number | undefined;
	const annotationType = (data.metadata?.annotationType as string) || 'default';

	const contentStyle = useMemo(() => {
		const style: React.CSSProperties = {};

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

	return (
		<div
			className={cn([
				'relative flex h-full min-h-20 min-w-80 flex-col gap-1 rounded p-2 text-center transition-all',

				selected && 'ring-1 ring-sky-600 ring-offset-2 ring-offset-zinc-900',
				typeInfo.textColorClass,
			])}
		>
			{/* --- Quote Specific Layout --- */}
			{isQuote ? (
				<div className='relative flex items-center py-2'>
					{/* Large Opening Quote */}
					<span
						aria-hidden='true'
						className='pointer-events-none absolute -top-4 -left-4 font-lora text-6xl text-current opacity-20'
						style={{ lineHeight: '1' }}
					>
						“
					</span>

					{/* Content */}
					<div
						className={cn([
							'font-lora text-base break-words whitespace-pre-wrap italic',
							typeInfo.textColorClass,
						])}
						style={contentStyle}
					>
						{data.content || (
							<span className='text-current italic opacity-60'>
								Add quote...
							</span>
						)}
					</div>

					<span
						aria-hidden='true'
						className='pointer-events-none absolute -right-4 -bottom-4 font-lora text-6xl text-current opacity-20'
						style={{ lineHeight: '0.5' }}
					>
						”
					</span>
				</div>
			) : (
				<>
					{/* --- Default Layout for other types --- */}
					<div className='mb-1 flex items-center justify-between'>
						{/* Icon and Type Label */}
						<div className='flex items-center gap-1.5 opacity-80'>
							<TypeIcon className='size-3.5 flex-shrink-0' />

							<span className='text-xs font-medium tracking-wider uppercase'>
								{annotationType}
							</span>
						</div>
					</div>

					{/* Content */}
					<div
						className={cn([
							'text-sm break-words whitespace-pre-wrap',
							typeInfo.textColorClass,
						])}
						style={contentStyle}
					>
						{data.content || (
							<span className='text-current italic opacity-60'>
								Add content...
							</span>
						)}
					</div>
				</>
			)}

			{/* No handles for annotation nodes */}

			<NodeResizer
				color='#0069a8'
				isVisible={selected}
				minWidth={100}
				minHeight={30}
			/>
		</div>
	);
};

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;
