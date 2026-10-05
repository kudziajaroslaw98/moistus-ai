'use client';

import { getAnnotationTypeInfo } from '@/components/nodes/content/annotation-content';
import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import type { NodeData } from '@/types/node-data';
import {
	BaseEdge,
	type Edge,
	type EdgeProps,
	getStraightPath,
	type Node,
	useInternalNode,
} from '@xyflow/react';
import { memo, useMemo } from 'react';

export const ANNOTATION_TETHER_EDGE_TYPE = 'annotationTether';

export type AnnotationTetherEdgeData = {
	annotationType?: string;
};

/**
 * Display-only dashed connector between a host node (source) and its anchored
 * annotation (target). Derived in the canvas; never stored, persisted, laid out,
 * or sent to AI.
 */
function AnnotationTetherEdgeComponent({
	id,
	source,
	target,
	data,
}: EdgeProps<Edge<AnnotationTetherEdgeData>>) {
	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const path = useMemo(() => {
		if (!sourceNode?.measured?.width || !targetNode?.measured?.width) return null;
		const { sourceX, sourceY, targetX, targetY } = getFloatingEdgePath(
			sourceNode,
			targetNode,
			0
		);
		const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
		return edgePath;
	}, [sourceNode, targetNode]);

	if (!path) return null;

	const { colorRgb } = getAnnotationTypeInfo(data?.annotationType ?? 'default');

	return (
		<BaseEdge
			className='annotation-tether-edge'
			id={id}
			interactionWidth={0}
			path={path}
			style={{
				stroke: `rgba(${colorRgb}, 0.45)`,
				strokeDasharray: '4 4',
				strokeWidth: 1.25,
				pointerEvents: 'none',
			}}
		/>
	);
}

const AnnotationTetherEdge = memo(AnnotationTetherEdgeComponent);
AnnotationTetherEdge.displayName = 'AnnotationTetherEdge';
export default AnnotationTetherEdge;
