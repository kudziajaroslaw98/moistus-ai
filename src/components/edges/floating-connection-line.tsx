import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import type { NodeData } from '@/types/node-data';
import {
	ConnectionLineComponentProps,
	getBezierPath,
	Node,
	type InternalNode,
} from '@xyflow/react';
import React from 'react';

const FloatingConnectionLine: React.FC<
	ConnectionLineComponentProps<Node<NodeData>>
> = ({ fromPosition, toPosition, toX, toY, fromNode }) => {
	if (!fromNode) {
		return null;
	}

	const targetNode = {
		id: 'connection-target',
		measured: {
			width: 1,
			height: 1,
		},
		internals: {
			positionAbsolute: { x: toX, y: toY },
		},
	} as InternalNode<Node<NodeData>>;

	const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } =
		getFloatingEdgePath(fromNode, targetNode);

	const [edgePath] = getBezierPath({
		sourceX: sourceX,
		sourceY: sourceY,
		sourcePosition: sourcePos || fromPosition,
		targetPosition: targetPos || toPosition,
		targetX: targetX || toX,
		targetY: targetY || toY,
	});

	return (
		<g>
			<path
				fill='none'
				stroke='#3b82f6'
				strokeWidth={2}
				className='animated'
				d={edgePath}
			/>

			<circle
				cx={targetX || toX}
				cy={targetY || toY}
				fill='#3b82f6'
				r={3}
				stroke='#3b82f6'
				strokeWidth={2}
			/>
		</g>
	);
};

export default FloatingConnectionLine;
