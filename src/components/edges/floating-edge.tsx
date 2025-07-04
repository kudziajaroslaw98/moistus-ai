import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import useAppStore from '@/store/mind-map-store';
import { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { PathType } from '@/types/path-types';
import { cn } from '@/utils/cn';
import {
	BaseEdge,
	EdgeLabelRenderer,
	EdgeProps,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	Node,
	Position,
	useInternalNode,
	type Edge,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';

// Helper function to get the appropriate path calculation function
const getPathFunction = (pathType?: PathType) => {
	switch (pathType) {
		case 'bezier':
			return getBezierPath;
		case 'straight':
			return getStraightPath;
		case 'step':
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return (params: any) => getSmoothStepPath({ ...params, borderRadius: 0 });
		case 'smoothstep':
		default:
			return getSmoothStepPath;
	}
};

const FloatingEdgeComponent = ({
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

	const pathFunction = useMemo(
		() => getPathFunction(data?.metadata?.pathType),
		[data?.metadata?.pathType]
	);
	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const strokeWidth =
		parseInt(data?.style?.strokeWidth?.toString() ?? '2') ?? 2;

	const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } =
		useMemo(() => {
			if (!sourceNode || !targetNode) {
				return {
					sourceX: 0,
					sourceY: 0,
					targetX: 0,
					targetY: 0,
					sourcePos: Position.Top,
					targetPos: Position.Top,
				};
			}

			return getFloatingEdgePath(sourceNode, targetNode, strokeWidth * 2);
		}, [sourceNode, targetNode, strokeWidth]);

	const [edgePath, labelX, labelY] = useMemo(
		() =>
			pathFunction({
				sourceX,
				sourceY,
				sourcePosition: sourcePos,
				targetX,
				targetY,
				targetPosition: targetPos,
			}),
		[pathFunction, sourceX, sourceY, sourcePos, targetX, targetY, targetPos]
	);

	const color = selected ? '#3b82f6' : (data?.style?.stroke ?? '#6c757d');

	const handleDeleteEdge = (e: React.MouseEvent) => {
		e.stopPropagation();
		deleteEdges([{ id, source, target, data }]);
	};

	if (!sourceNode || !targetNode) {
		return null;
	}

	return (
		<>
			<defs>
				<marker
					markerWidth={16}
					markerHeight={16}
					id={`arrow-end-${id}`}
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
					orient='auto'
					markerUnits='userSpaceOnUse'
				>
					<polyline
						style={{
							stroke: color,
							fill: color,
							strokeWidth,
						}}
						strokeLinecap='round'
						strokeLinejoin='round'
						points='-5,-4 0,0 -5,4 -5,-4'
					/>
				</marker>

				{/* add marker circle start */}
				<marker
					markerWidth={16}
					markerHeight={16}
					id={`circle-start-${id}`}
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
					orient='auto'
					markerUnits='userSpaceOnUse'
				>
					<circle
						style={{
							stroke: color,
							fill: color,
							strokeWidth,
						}}
						r='5'
					/>
				</marker>
			</defs>

			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					...style,
					...data?.style,
					stroke: color,
					strokeWidth,
				}}
				className={cn(
					'react-flow__edge-path',
					'cursor-pointer',
					'transition-all duration-200 ease-in-out',
					selected && 'animate-pulse'
				)}
				markerStart={`url(#circle-start-${id}`}
				markerEnd={`url(#arrow-end-${id})`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<EdgeLabelRenderer>
					<div
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						}}
						className='nodrag absolute z-[2] pointer-events-auto nopan flex items-center gap-2 text-xs text-zinc-200'
					>
						{data?.label && (
							<div className='rounded bg-zinc-700 px-4 py-0.5 shadow-sm min-h-6 flex justify-center items-center cursor-pointer'>
								{data?.label}
							</div>
						)}

						{/* Animated Delete Button */}
						<Button
							variant={'destructive'}
							size={'icon'}
							initial={{ opacity: 0, y: 10, scale: 0.8 }}
							animate={
								isHovered || selected
									? { opacity: 1, y: 0, scale: 1 }
									: { opacity: 0, y: 10, scale: 0.8 }
							}
							transition={{
								duration: 0.2,
								ease: 'easeOut',
							}}
							onClick={handleDeleteEdge}
							title='Delete connection'
							className='!size-6'
						>
							<X className='w-3 h-3' />
						</Button>
					</div>
				</EdgeLabelRenderer>
			</BaseEdge>
		</>
	);
};

const FloatingEdge = memo(FloatingEdgeComponent);
FloatingEdge.displayName = 'FloatingEdge';
export default FloatingEdge;
