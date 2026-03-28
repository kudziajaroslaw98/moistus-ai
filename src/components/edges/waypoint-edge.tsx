import {
	createDefaultAnchor,
	getAnchorPosition,
} from '@/helpers/get-anchor-position';
import { getWaypointPath } from '@/helpers/get-waypoint-path';
import useAppStore from '@/store/mind-map-store';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { EdgeAnchor } from '@/types/path-types';
import { cn } from '@/utils/cn';
import {
	BaseEdge,
	EdgeLabelRenderer,
	EdgeProps,
	Node,
	useInternalNode,
	type Edge,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';

interface NodeWithMeasurements {
	internals: { positionAbsolute: { x: number; y: number } };
	measured?: { width?: number; height?: number };
}

function isNodeWithMeasurements(
	node: Node<NodeData> | undefined | null
): node is Node<NodeData> & NodeWithMeasurements {
	return (
		node !== null &&
		node !== undefined &&
		'internals' in node &&
		node.internals !== null &&
		typeof node.internals === 'object' &&
		'positionAbsolute' in node.internals
	);
}

function getFallbackAnchors(
	sourceNode: Node<NodeData> & NodeWithMeasurements,
	targetNode: Node<NodeData> & NodeWithMeasurements
): {
	sourceAnchor: EdgeAnchor;
	targetAnchor: EdgeAnchor;
} {
	const sourceCenterX =
		sourceNode.internals.positionAbsolute.x +
		(sourceNode.measured?.width ?? 0) / 2;
	const sourceCenterY =
		sourceNode.internals.positionAbsolute.y +
		(sourceNode.measured?.height ?? 0) / 2;
	const targetCenterX =
		targetNode.internals.positionAbsolute.x +
		(targetNode.measured?.width ?? 0) / 2;
	const targetCenterY =
		targetNode.internals.positionAbsolute.y +
		(targetNode.measured?.height ?? 0) / 2;
	const deltaX = targetCenterX - sourceCenterX;
	const deltaY = targetCenterY - sourceCenterY;

	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX >= 0
			? {
					sourceAnchor: createDefaultAnchor('right'),
					targetAnchor: createDefaultAnchor('left'),
				}
			: {
					sourceAnchor: createDefaultAnchor('left'),
					targetAnchor: createDefaultAnchor('right'),
				};
	}

	return deltaY >= 0
		? {
				sourceAnchor: createDefaultAnchor('bottom'),
				targetAnchor: createDefaultAnchor('top'),
			}
		: {
				sourceAnchor: createDefaultAnchor('top'),
				targetAnchor: createDefaultAnchor('bottom'),
			};
}

const WaypointEdgeComponent = ({
	id,
	source,
	target,
	style = {},
	data,
	selected,
}: EdgeProps<Edge<EdgeData>>) => {
	const [isHovered, setIsHovered] = useState(false);
	const { deleteEdges } = useAppStore(
		useShallow((state) => ({
			deleteEdges: state.deleteEdges,
		}))
	);
	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const strokeWidth =
		parseInt(data?.style?.strokeWidth?.toString() ?? '2', 10) || 2;

	const routedGeometry = useMemo(() => {
		if (
			!isNodeWithMeasurements(sourceNode) ||
			!isNodeWithMeasurements(targetNode)
		) {
			return null;
		}

		const fallbackAnchors = getFallbackAnchors(sourceNode, targetNode);
		const sourceAnchor =
			data?.metadata?.sourceAnchor ?? fallbackAnchors.sourceAnchor;
		const targetAnchor =
			data?.metadata?.targetAnchor ?? fallbackAnchors.targetAnchor;
		const sourcePoint = getAnchorPosition(sourceNode, sourceAnchor);
		const targetPoint = getAnchorPosition(targetNode, targetAnchor);

		return {
			sourceX: sourcePoint.x,
			sourceY: sourcePoint.y,
			targetX: targetPoint.x,
			targetY: targetPoint.y,
		};
	}, [
		data?.metadata?.sourceAnchor,
		data?.metadata?.targetAnchor,
		sourceNode,
		targetNode,
	]);

	const waypoints = useMemo(
		() => data?.metadata?.waypoints ?? [],
		[data?.metadata?.waypoints]
	);
	const curveType = data?.metadata?.curveType ?? 'smoothstep';
	const pathResult = useMemo(() => {
		if (!routedGeometry) {
			return null;
		}

		return getWaypointPath(
			routedGeometry.sourceX,
			routedGeometry.sourceY,
			routedGeometry.targetX,
			routedGeometry.targetY,
			waypoints,
			curveType
		);
	}, [curveType, routedGeometry, waypoints]);

	const color = selected ? '#3b82f6' : (data?.style?.stroke ?? '#6c757d');

	const handleDeleteEdge = (event: React.MouseEvent) => {
		event.stopPropagation();
		deleteEdges([{ id, source, target, data }]);
	};

	if (!routedGeometry || !pathResult) {
		return null;
	}

	return (
		<>
			<defs>
				<marker
					id={`arrow-end-${id}`}
					markerHeight={16}
					markerUnits='userSpaceOnUse'
					markerWidth={16}
					orient='auto'
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
				>
					<polyline
						points='-5,-4 0,0 -5,4 -5,-4'
						strokeLinecap='round'
						strokeLinejoin='round'
						style={{
							stroke: color,
							fill: color,
							strokeWidth,
						}}
					/>
				</marker>
			</defs>

			<BaseEdge
				id={id}
				markerEnd={`url(#arrow-end-${id})`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				path={pathResult.path}
				className={cn(
					'react-flow__edge-path',
					'cursor-pointer',
					'transition-all duration-200 ease-in-out',
					selected && 'animate-pulse'
				)}
				style={{
					...style,
					...data?.style,
					stroke: color,
					strokeWidth,
				}}
			/>
			<EdgeLabelRenderer>
				<div
					className='nodrag absolute z-[2] pointer-events-auto nopan flex items-center gap-2 text-xs text-zinc-200'
					style={{
						transform: `translate(-50%, -50%) translate(${pathResult.labelX}px,${pathResult.labelY}px)`,
					}}
				>
					{data?.label && (
						<div className='min-h-6 cursor-pointer rounded bg-zinc-700 px-4 py-0.5 shadow-sm'>
							{data.label}
						</div>
					)}

					<Button
						className='!size-6'
						initial={{ opacity: 0, y: 10, scale: 0.8 }}
						onClick={handleDeleteEdge}
						size='icon'
						title='Delete connection'
						variant='destructive'
						animate={
							isHovered || selected
								? { opacity: 1, y: 0, scale: 1 }
								: { opacity: 0, y: 10, scale: 0.8 }
						}
						transition={{
							duration: 0.2,
							ease: 'easeOut' as const,
						}}
					>
						<X className='h-3 w-3' />
					</Button>
				</div>
			</EdgeLabelRenderer>
		</>
	);
};

const WaypointEdge = memo(WaypointEdgeComponent);
WaypointEdge.displayName = 'WaypointEdge';
export default WaypointEdge;
