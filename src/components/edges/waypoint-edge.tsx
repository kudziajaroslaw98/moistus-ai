import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import { getWaypointPath } from '@/helpers/get-waypoint-path';
import { findWaypointInsertIndex } from '@/helpers/insert-waypoint';
import useAppStore from '@/store/mind-map-store';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { Waypoint } from '@/types/path-types';
import { cn } from '@/utils/cn';
import generateUuid from '@/helpers/generate-uuid';
import {
	BaseEdge,
	EdgeLabelRenderer,
	EdgeProps,
	Position,
	useInternalNode,
	useReactFlow,
	type Edge,
	type Node,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';

interface WaypointHandleProps {
	waypoint: Waypoint;
	index: number;
	edgeId: string;
	color: string;
	onDragStart: () => void;
	onDrag: (waypointId: string, x: number, y: number) => void;
	onDragEnd: (shouldPersist: boolean) => void;
	onDelete: (waypointId: string) => void;
}

const WaypointHandle = memo(function WaypointHandle({
	waypoint,
	edgeId,
	color,
	onDragStart,
	onDrag,
	onDragEnd,
	onDelete,
}: WaypointHandleProps) {
	const [isDragging, setIsDragging] = useState(false);
	const { screenToFlowPosition } = useReactFlow();
	const lastClickTime = useRef<number>(0);
	const hasMoved = useRef<boolean>(false);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>) => {
			e.stopPropagation();
			e.preventDefault();
			(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
			setIsDragging(true);
			hasMoved.current = false; // Reset movement tracking
			onDragStart();
		},
		[onDragStart]
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<SVGCircleElement>) => {
			if (!isDragging) return;
			e.stopPropagation();

			hasMoved.current = true; // Mark that user actually moved
			const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
			onDrag(waypoint.id, position.x, position.y);
		},
		[isDragging, screenToFlowPosition, waypoint.id, onDrag]
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<SVGCircleElement>) => {
			(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
			setIsDragging(false);
			// Pass whether to persist (only if user actually moved)
			onDragEnd(hasMoved.current);
		},
		[onDragEnd]
	);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const now = Date.now();

			// Double-click detection (within 300ms)
			if (now - lastClickTime.current < 300) {
				onDelete(waypoint.id);
			}

			lastClickTime.current = now;
		},
		[waypoint.id, onDelete]
	);

	return (
		<motion.circle
			cx={waypoint.x}
			cy={waypoint.y}
			r={6}
			className={cn(
				'waypoint-handle nodrag nopan',
				isDragging ? 'cursor-grabbing' : 'cursor-grab'
			)}
			style={{
				fill: color,
				stroke: '#fff',
				strokeWidth: 2,
				filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
				pointerEvents: 'auto',
			}}
			initial={{ scale: 0, opacity: 0 }}
			animate={{
				scale: isDragging ? 1.3 : 1,
				opacity: 1,
			}}
			exit={{ scale: 0, opacity: 0 }}
			whileHover={{ scale: 1.2 }}
			transition={{
				type: 'spring',
				stiffness: 400,
				damping: 25,
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onClick={handleClick}
			onDoubleClick={(e) => e.stopPropagation()} // Prevent bubbling to edge
			data-edge-id={edgeId}
			data-waypoint-id={waypoint.id}
		/>
	);
});

const WaypointEdgeComponent = ({
	id,
	source,
	target,
	style = {},
	data,
	selected,
}: EdgeProps<Edge<EdgeData>>) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isDraggingWaypoint, setIsDraggingWaypoint] = useState(false);
	const { screenToFlowPosition } = useReactFlow();

	const { deleteEdges, updateEdge } = useAppStore(
		useShallow((state) => ({
			deleteEdges: state.deleteEdges,
			updateEdge: state.updateEdge,
		}))
	);

	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const strokeWidth = parseInt(data?.style?.strokeWidth?.toString() ?? '2') ?? 2;

	const storeWaypoints = useMemo(
		() => data?.metadata?.waypoints ?? [],
		[data?.metadata?.waypoints]
	);

	// Local waypoints for smooth dragging - only update store on drag end
	const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>(storeWaypoints);

	// Sync local state when store changes (but not during drag)
	useEffect(() => {
		if (!isDraggingWaypoint) {
			setLocalWaypoints(storeWaypoints);
		}
	}, [storeWaypoints, isDraggingWaypoint]);

	// Use local waypoints for rendering
	const waypoints = isDraggingWaypoint ? localWaypoints : storeWaypoints;

	const curveType = data?.metadata?.curveType ?? 'linear';

	const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } = useMemo(() => {
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

	const { path: edgePath, labelX, labelY } = useMemo(
		() => getWaypointPath(sourceX, sourceY, targetX, targetY, waypoints, curveType),
		[sourceX, sourceY, targetX, targetY, waypoints, curveType]
	);

	const color = selected ? '#3b82f6' : (data?.style?.stroke ?? '#6c757d');

	// Listen for custom event from React Flow's onEdgeDoubleClick handler
	useEffect(() => {
		const handleWaypointAddEvent = (e: Event) => {
			const { edgeId, clientX, clientY } = (e as CustomEvent).detail;
			if (edgeId !== id) return;

			const position = screenToFlowPosition({ x: clientX, y: clientY });

			const insertIndex = findWaypointInsertIndex(
				sourceX,
				sourceY,
				targetX,
				targetY,
				waypoints,
				position.x,
				position.y
			);

			const newWaypoint: Waypoint = {
				id: generateUuid(),
				x: position.x,
				y: position.y,
			};

			const newWaypoints = [...waypoints];
			newWaypoints.splice(insertIndex, 0, newWaypoint);

			updateEdge({
				edgeId: id,
				data: {
					metadata: {
						...data?.metadata,
						waypoints: newWaypoints,
					},
				},
			});
		};

		document.addEventListener('waypoint-edge-add', handleWaypointAddEvent);
		return () => document.removeEventListener('waypoint-edge-add', handleWaypointAddEvent);
	}, [id, screenToFlowPosition, sourceX, sourceY, targetX, targetY, waypoints, updateEdge, data?.metadata]);

	const handleDeleteEdge = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			deleteEdges([{ id, source, target, data }]);
		},
		[deleteEdges, id, source, target, data]
	);

	const handleWaypointDragStart = useCallback(() => {
		setIsDraggingWaypoint(true);
	}, []);

	// Update local state only during drag - no store updates for smooth 60fps
	const handleWaypointDrag = useCallback(
		(waypointId: string, x: number, y: number) => {
			setLocalWaypoints((prev) =>
				prev.map((wp) => (wp.id === waypointId ? { ...wp, x, y } : wp))
			);
		},
		[]
	);

	// Persist to store only on drag end (if user actually moved)
	const handleWaypointDragEnd = useCallback(
		(shouldPersist: boolean) => {
			setIsDraggingWaypoint(false);
			// Only persist if user actually moved the waypoint
			if (shouldPersist) {
				updateEdge({
					edgeId: id,
					data: {
						metadata: {
							...data?.metadata,
							waypoints: localWaypoints,
						},
					},
				});
			}
		},
		[updateEdge, id, data?.metadata, localWaypoints]
	);

	const handleWaypointDelete = useCallback(
		(waypointId: string) => {
			const newWaypoints = waypoints.filter((wp) => wp.id !== waypointId);

			updateEdge({
				edgeId: id,
				data: {
					metadata: {
						...data?.metadata,
						waypoints: newWaypoints,
					},
				},
			});
		},
		[waypoints, updateEdge, id, data?.metadata]
	);

	if (!sourceNode || !targetNode) {
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

				<marker
					id={`circle-start-${id}`}
					markerHeight={16}
					markerUnits='userSpaceOnUse'
					markerWidth={16}
					orient='auto'
					refX='0'
					refY='0'
					viewBox='-10 -10 20 20'
				>
					<circle
						r='5'
						style={{
							stroke: color,
							fill: color,
							strokeWidth,
						}}
					/>
				</marker>
			</defs>

			{/* Invisible wider path for easier hover detection */}
			<path
				d={edgePath}
				fill='none'
				stroke='rgba(0,0,0,0.001)'
				strokeWidth={20}
				className='cursor-pointer nodrag nopan'
				style={{ pointerEvents: 'stroke' }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			/>

			<BaseEdge
				id={id}
				markerEnd={`url(#arrow-end-${id})`}
				markerStart={`url(#circle-start-${id})`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				path={edgePath}
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
					pointerEvents: 'none', // Let the invisible path handle clicks
				}}
			/>

			{/* Waypoint handles - always visible when waypoints exist */}
			<g className='waypoint-handles' style={{ pointerEvents: 'auto' }}>
				<AnimatePresence>
					{waypoints.map((waypoint, index) => (
						<WaypointHandle
							key={waypoint.id}
							waypoint={waypoint}
							index={index}
							edgeId={id}
							color={color}
							onDragStart={handleWaypointDragStart}
							onDrag={handleWaypointDrag}
							onDragEnd={handleWaypointDragEnd}
							onDelete={handleWaypointDelete}
						/>
					))}
				</AnimatePresence>
			</g>

			<EdgeLabelRenderer>
				<div
					className='nodrag absolute z-[2] pointer-events-auto nopan flex items-center gap-2 text-xs text-zinc-200'
					style={{
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
					}}
				>
					{data?.label && (
						<div className='rounded bg-zinc-700 px-4 py-0.5 shadow-sm min-h-6 flex justify-center items-center cursor-pointer'>
							{data?.label}
						</div>
					)}

					{/* Animated Delete Button */}
					<Button
						className='!size-6'
						initial={{ opacity: 0, y: 10, scale: 0.8 }}
						onClick={handleDeleteEdge}
						size={'icon'}
						title='Delete connection'
						variant={'destructive'}
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
						<X className='w-3 h-3' />
					</Button>

					{/* Waypoint count indicator */}
					{waypoints.length > 0 && (isHovered || selected) && (
						<motion.div
							className='rounded bg-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300'
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
						>
							{waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}
						</motion.div>
					)}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};

const WaypointEdge = memo(WaypointEdgeComponent);
WaypointEdge.displayName = 'WaypointEdge';
export default WaypointEdge;
