'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { AlignLeft, Lightbulb, MessageSquare, Quote, Type } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Toggle } from '../ui/toggle';
import { BaseNodeWrapper } from './base-node-wrapper';

type AnnotationNodeProps = NodeProps<Node<NodeData>>;

const annotationTypeInfo = {
	comment: {
		icon: MessageSquare,
		textColorClass: 'text-zinc-400',
		label: 'Comment',
	},
	idea: { icon: Lightbulb, textColorClass: 'text-yellow-400', label: 'Idea' },
	quote: { icon: Quote, textColorClass: 'text-blue-300', label: 'Quote' },
	summary: {
		icon: AlignLeft,
		textColorClass: 'text-green-400',
		label: 'Summary',
	},
};

type AnnotationType = keyof typeof annotationTypeInfo;

const fontSizeOptions = [
	{ value: '12px', label: '12px' },
	{ value: '14px', label: '14px' },
	{ value: '16px', label: '16px' },
	{ value: '18px', label: '18px' },
	{ value: '20px', label: '20px' },
	{ value: '24px', label: '24px' },
];

const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { id, data, selected } = props;

	const { updateNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
		}))
	);

	const fontSize = data.metadata?.fontSize as string | undefined;
	const fontWeight = data.metadata?.fontWeight as string | number | undefined;
	const annotationType = (data.metadata?.annotationType as string) || 'comment';

	const handleNodeChange = useCallback(
		(change: Partial<NodeData['metadata']>) => {
			updateNode({
				nodeId: id,
				data: {
					metadata: {
						...data.metadata,
						...change,
					},
				},
			});
		},
		[updateNode, id, data.metadata]
	);

	const contentStyle = useMemo(() => {
		const style: React.CSSProperties = {};

		if (fontSize) {
			style.fontSize = fontSize;
		}

		if (fontWeight && annotationType !== 'quote') {
			style.fontWeight = fontWeight;
		}

		return style;
	}, [fontSize, fontWeight, annotationType]);

	const typeInfo =
		annotationTypeInfo[annotationType as AnnotationType] ||
		annotationTypeInfo.comment;
	const TypeIcon = typeInfo.icon;

	const isQuote = annotationType === 'quote';

	const toolbarContent = (
		<>
			{/* Font Size Selector */}
			<Select
				value={fontSize || '14px'}
				onValueChange={(value) => handleNodeChange({ fontSize: value })}
			>
				<SelectTrigger className='h-8 w-20' size='sm'>
					<SelectValue />
				</SelectTrigger>

				<SelectContent>
					{fontSizeOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Font Weight Toggle */}
			<Toggle
				size={'sm'}
				variant={'outline'}
				pressed={fontWeight === 'bold' || fontWeight === 600}
				onPressedChange={(pressed) => {
					handleNodeChange({
						fontWeight: pressed ? 'bold' : 'normal',
					});
				}}
				disabled={isQuote} // Quotes always use italic styling
			>
				<Type className='w-4 h-4' />
			</Toggle>

			{/* Annotation Type Selector */}
			<Select
				value={annotationType}
				onValueChange={(value: AnnotationType) =>
					handleNodeChange({ annotationType: value })
				}
			>
				<SelectTrigger className='h-8 w-24' size='sm'>
					<div className='flex items-center gap-1'>
						<TypeIcon className='w-3 h-3' />

						<SelectValue />
					</div>
				</SelectTrigger>

				<SelectContent>
					{Object.entries(annotationTypeInfo).map(([key, info]) => {
						if (key === 'default') return null;
						const Icon = info.icon;
						return (
							<SelectItem key={key} value={key}>
								<div className='flex items-center gap-2'>
									<Icon className='w-3 h-3' />

									{info.label}
								</div>
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</>
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName={cn(['annotation-node', typeInfo.textColorClass])}
			nodeType='Annotation'
			nodeIcon={<TypeIcon className='size-4' />}
			toolbarContent={toolbarContent}
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
						&quot;
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
						&quot;
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
		</BaseNodeWrapper>
	);
};

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;
