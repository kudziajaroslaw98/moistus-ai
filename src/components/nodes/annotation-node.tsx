'use client';

import { Button } from '@/components/ui/button';
import {
	computeAnchorOffset,
	findNearestAnchorHost,
} from '@/helpers/anchored-annotations';
import { usePermissions } from '@/hooks/collaboration/use-permissions';
import useAppStore from '@/store/mind-map-store';
import { Link2, Unlink } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { BaseNodeWrapper } from './base-node-wrapper';
import { AnnotationTypePicker } from './components/annotation-type-picker';
import { SharedNodeToolbar } from './components/node-toolbar';
import { ToolbarSeparator } from './components/toolbar-controls';
import {
	AnnotationContent,
	getAnnotationTypeInfo,
} from './content/annotation-content';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';
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
 * - Optional anchoring to a host node (follows host, dashed tether, no edges)
 * - Selection glow effect
 * - Hover glow effect
 * - Quote layout with decorative marks
 * - Toolbar with type picker and attach/detach
 */
const AnnotationNodeComponent = (props: AnnotationNodeProps) => {
	const { data, selected } = props;
	const { canEdit } = usePermissions();

	const { updateNode, selectedNodes, getNode, getVisibleNodes, hostLabel } =
		useAppStore(
			useShallow((state) => {
				const anchorNodeId = data.metadata?.anchorNodeId;
				const host = anchorNodeId
					? state.nodes.find((node) => node.id === anchorNodeId)
					: undefined;
				return {
					updateNode: state.updateNode,
					selectedNodes: state.selectedNodes,
					getNode: state.getNode,
					getVisibleNodes: state.getVisibleNodes,
					hostLabel: host
						? host.data.metadata?.title || host.data.content || 'node'
						: null,
				};
			})
		);
	// Anchored only while the host exists; a dangling anchor behaves as free.
	const isAnchored = hostLabel !== null;

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

	const handleToggleAnchor = useCallback(() => {
		if (isAnchored) {
			updateNode({
				nodeId: data.id,
				data: {
					metadata: {
						...data.metadata,
						anchorNodeId: undefined,
						anchorOffset: undefined,
					},
				},
			});
			return;
		}

		const self = getNode(data.id);
		if (!self) return;
		const host = findNearestAnchorHost(self, getVisibleNodes());
		if (!host) return;

		updateNode({
			nodeId: data.id,
			data: {
				metadata: {
					...data.metadata,
					anchorNodeId: host.id,
					anchorOffset: computeAnchorOffset(self.position, host.position),
				},
			},
		});
	}, [isAnchored, updateNode, data.id, data.metadata, getNode, getVisibleNodes]);

	const theme = GlassmorphismTheme;
	const anchorTitle = isAnchored
		? `Detach from "${truncate(hostLabel ?? '')}"`
		: 'Attach to nearest node';

	return (
		<>
			<SharedNodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
				readOnly={!canEdit}
			>
				<AnnotationTypePicker
					annotationType={annotationType}
					disabled={!canEdit}
					onTypeChange={handleTypeChange}
				/>

				<ToolbarSeparator />

				<Button
					aria-label={anchorTitle}
					aria-pressed={isAnchored}
					className='h-8 px-2 gap-1.5 text-xs'
					disabled={!canEdit}
					onClick={handleToggleAnchor}
					size='sm'
					title={anchorTitle}
					variant='outline'
					style={{
						backgroundColor: 'transparent',
						border: `1px solid ${theme.borders.hover}`,
						color: theme.text.medium,
					}}
				>
					{isAnchored ? (
						<Unlink className='size-3.5' />
					) : (
						<Link2 className='size-3.5' />
					)}

					{isAnchored ? 'Detach' : 'Attach'}
				</Button>
			</SharedNodeToolbar>

			<BaseNodeWrapper
				{...props}
				hideNodeType
				disableConnections={isAnchored}
				elevation={1}
				hideAddButton={isAnchored}
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

function truncate(value: string, max = 24): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = 'AnnotationNode';
export default AnnotationNode;
