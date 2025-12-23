'use client';

import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import {
	AnnotationContent,
	getAnnotationTypeInfo,
} from './content/annotation-content';
import { type TypedNodeProps } from './core/types';

type AnnotationNodeProps = TypedNodeProps<'annotationNode'>;

/**
 * Annotation Node Component
 *
 * Displays styled annotations with type-based colors and icons.
 * Uses shared AnnotationContent from content/annotation-content.tsx
 *
 * Features:
 * - 8 annotation types with unique styling
 * - Selection glow effect
 * - Hover glow effect
 * - Quote layout with decorative marks
 */
const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { data, selected } = props;

	const annotationType = (data.metadata?.annotationType as string) || 'default';
	const typeInfo = getAnnotationTypeInfo(annotationType);
	const TypeIcon = typeInfo.icon;

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			includePadding={false}
			nodeClassName='annotation-node'
			nodeIcon={<TypeIcon className='size-4' />}
			nodeType='Annotation'
			metadataColorOverrides={{
				accentColor: typeInfo.colorRgb,
				bgOpacity: typeInfo.bgOpacity,
				borderOpacity: typeInfo.borderOpacity,
			}}
		>
			<AnnotationContent
				content={data.content}
				annotationType={annotationType}
				fontSize={data.metadata?.fontSize as string | number | undefined}
				fontWeight={data.metadata?.fontWeight as string | number | undefined}
				author={data.metadata?.author as string | undefined}
				timestamp={data.metadata?.timestamp as string | number | undefined}
				selected={selected}
				showHoverEffect={true}
			/>
		</BaseNodeWrapper>
	);
};

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;
