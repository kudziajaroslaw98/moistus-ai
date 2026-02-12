'use client';

import useAppStore from '@/store/mind-map-store';
import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { BaseNodeWrapper } from './base-node-wrapper';
import { AnnotationTypePicker } from './components/annotation-type-picker';
import { SharedNodeToolbar } from './components/node-toolbar';
import {
	AnnotationContent,
	getAnnotationTypeInfo,
} from './content/annotation-content';
import { type TypedNodeProps } from './core/types';
import type { NodeData } from '@/types/node-data';

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
 * - Toolbar with type picker
 */
const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { data, selected } = props;

	const { updateNode, selectedNodes } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
		}))
	);

	const annotationType = (data.metadata?.annotationType as string) || 'default';
	const typeInfo = getAnnotationTypeInfo(annotationType);
	const TypeIcon = typeInfo.icon;

	const handleTypeChange = useCallback(
		(type: string) => {
			updateNode({
				nodeId: data.id,
				data: {
					metadata: {
						...data.metadata,
						annotationType: type as NonNullable<NodeData['metadata']>['annotationType'],
					},
				},
			});
		},
		[updateNode, data.id, data.metadata]
	);

	return (
		<>
			<SharedNodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
			>
				<AnnotationTypePicker
					annotationType={annotationType}
					onTypeChange={handleTypeChange}
				/>
			</SharedNodeToolbar>

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
		</>
	);
};

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;
