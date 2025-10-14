import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import type { NodeData } from '@/types/node-data';
import {
	ConnectionLineComponentProps,
	getBezierPath,
	Node,
	useConnection,
	type InternalNode,
} from '@xyflow/react';
import React from 'react';

const FloatingConnectionLine: React.FC<
	ConnectionLineComponentProps<Node<NodeData>>
> = ({ fromPosition, toPosition, toX, toY, fromNode }) => {
	const connection = useConnection();

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

	// Show text when dragging over pane (no target node)
	const isOverPane = connection.inProgress && !connection.toNode;

	return (
		<g>
			<path
				className='animate-dash-flow'
				d={edgePath}
				fill='none'
				stroke='#14b8a6'
				strokeWidth={2}
			/>

			<circle
				cx={targetX || toX}
				cy={targetY || toY}
				fill='#14b8a6'
				r={4}
				stroke='#14b8a6'
				strokeWidth={2}
			/>

			{isOverPane && (
				<g className='animate-in fade-in duration-200'>
					<text
						className='text-sm font-medium pointer-events-none'
						fill='#f4f4f5'
						fontSize={14}
						textAnchor='middle'
						x={targetX || toX}
						y={(targetY || toY) - 16}
					>
						Release to create new
					</text>
				</g>
			)}
		</g>
	);
};

export default FloatingConnectionLine;
