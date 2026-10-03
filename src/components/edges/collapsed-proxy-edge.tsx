'use client';

import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import type { NodeData } from '@/types/node-data';
import {
	BaseEdge,
	type Edge,
	EdgeLabelRenderer,
	type EdgeProps,
	getStraightPath,
	type Node,
	useInternalNode,
} from '@xyflow/react';
import { memo, useMemo } from 'react';

export const COLLAPSED_PROXY_EDGE_TYPE = 'collapsedProxy';

export type CollapsedProxyEdgeData = {
	label?: string | null;
	collapsedProxy: { originalEdgeIds: string[]; count: number };
};

/**
 * Display-only dashed edge: a cross-link whose endpoint is hidden inside a
 * collapsed branch is re-attached to the visible collapsed ancestor.
 * Derived in `getVisibleEdges`; never stored or editable.
 */
function CollapsedProxyEdgeComponent({
	id,
	source,
	target,
	data,
}: EdgeProps<Edge<CollapsedProxyEdgeData>>) {
	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const geometry = useMemo(() => {
		if (!sourceNode?.measured?.width || !targetNode?.measured?.width) return null;
		const { sourceX, sourceY, targetX, targetY } = getFloatingEdgePath(
			sourceNode,
			targetNode,
			4
		);
		const [path, labelX, labelY] = getStraightPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
		});
		return { path, labelX, labelY };
	}, [sourceNode, targetNode]);

	if (!geometry) return null;

	const count = data?.collapsedProxy.count ?? 1;
	const label = count > 1 ? `×${count}` : data?.label;

	return (
		<>
			<BaseEdge
				id={id}
				interactionWidth={0}
				path={geometry.path}
				style={{
					stroke: 'var(--color-border-strong)',
					strokeDasharray: '6 5',
					strokeWidth: 1.5,
					pointerEvents: 'none',
				}}
			/>

			{label && (
				<EdgeLabelRenderer>
					<div
						className='nodrag nopan pointer-events-none absolute rounded-full border border-border-default bg-elevated px-2 py-0.5 text-[11px] font-medium tabular-nums text-text-secondary'
						style={{
							transform: `translate(-50%, -50%) translate(${geometry.labelX}px, ${geometry.labelY}px)`,
						}}
					>
						{label}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}

const CollapsedProxyEdge = memo(CollapsedProxyEdgeComponent);
CollapsedProxyEdge.displayName = 'CollapsedProxyEdge';
export default CollapsedProxyEdge;
